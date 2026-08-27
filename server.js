const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL Connection Pool (will use Render PostgreSQL in production)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:root123@localhost:5433/feedbackdb'
});

// ============================================
// FEEDBACK API ENDPOINTS
// ============================================

// 1. Get booking by tracking token (public)
app.get('/api/bookings/track/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const result = await pool.query(
      'SELECT id, booking_id, technician_id, customer_name, status, rating, feedback, appointment_date, work_type FROM bookings WHERE tracking_token = $1',
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
});

// 2. Submit rating/feedback (public)
app.post('/api/bookings/track/:token/rate', async (req, res) => {
  try {
    const { token } = req.params;
    const { rating, feedback } = req.body;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const result = await pool.query(
      `UPDATE bookings 
       SET rating = $1, feedback = $2, rated_at = NOW() 
       WHERE tracking_token = $3 
       RETURNING *`,
      [rating, feedback || '', token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to submit rating' });
  }
});

// 3. Cancel booking by token (public)
app.post('/api/bookings/track/:token/cancel', async (req, res) => {
  try {
    const { token } = req.params;

    const result = await pool.query(
      `UPDATE bookings 
       SET status = 'CANCELLED', cancelled_at = NOW() 
       WHERE tracking_token = $1 AND status != 'COMPLETED'
       RETURNING *`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found or already completed' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to cancel booking' });
  }
});

// ============================================
// SERVE REACT STATIC FILES
// ============================================

app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Feedback Service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  pool.end(() => {
    process.exit(0);
  });
});
