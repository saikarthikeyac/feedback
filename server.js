import cors from 'cors';
import express from 'express';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

const BOOKING_SYNC_KEY = process.env.BOOKING_SYNC_KEY || '';

function requireSyncKey(req, res, next) {
  const provided = req.get('X-Booking-Sync-Key') || '';
  if (!BOOKING_SYNC_KEY || provided !== BOOKING_SYNC_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

// PostgreSQL Connection Pool (will use Render PostgreSQL in production)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:root123@localhost:5433/feedbackdb',
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        booking_id VARCHAR(255) UNIQUE NOT NULL,
        technician_id INTEGER,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255),
        appointment_date TIMESTAMP,
        work_type VARCHAR(255),
        status VARCHAR(50) DEFAULT 'CONFIRMED',
        tracking_token VARCHAR(255) UNIQUE NOT NULL,
        rating INTEGER,
        feedback TEXT,
        rated_at TIMESTAMP,
        cancelled_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ bookings table verified");
  } catch (err) {
    console.error("Table creation failed:", err);
  }
})();

// ============================================
// FEEDBACK API ENDPOINTS
// ============================================

// Register/sync a booking from the local booking-service
app.post('/api/bookings/register', requireSyncKey, async (req, res) => {
  try {
    const {
      bookingId,
      technicianId,
      customerName,
      customerEmail,
      appointmentDate,
      workType,
      status,
      trackingToken
    } = req.body;

    if (!bookingId || !customerName || !trackingToken) {
      return res.status(400).json({
        message: 'bookingId, customerName and trackingToken are required'
      });
    }

    const result = await pool.query(
      `
      INSERT INTO bookings (
        booking_id,
        technician_id,
        customer_name,
        customer_email,
        appointment_date,
        work_type,
        status,
        tracking_token
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)

      ON CONFLICT (tracking_token)
      DO UPDATE SET
        booking_id = EXCLUDED.booking_id,
        technician_id = EXCLUDED.technician_id,
        customer_name = EXCLUDED.customer_name,
        customer_email = EXCLUDED.customer_email,
        appointment_date = EXCLUDED.appointment_date,
        work_type = EXCLUDED.work_type,
        status = EXCLUDED.status,
        updated_at = NOW()

      RETURNING *
      `,
      [
        String(bookingId),
        technicianId || null,
        customerName,
        customerEmail || null,
        appointmentDate || null,
        workType || null,
        status || 'CONFIRMED',
        trackingToken
      ]
    );

    console.log(
      `Booking registered in Render DB: ${bookingId}, token: ${trackingToken}`
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Booking registration failed:', err);
    return res.status(500).json({
      message: 'Failed to register booking'
    });
  }
});




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

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
    }
    if (feedback && String(feedback).length > 2000) {
      return res.status(400).json({ message: 'Feedback must be 2000 characters or fewer' });
    }

    const result = await pool.query(
      `UPDATE bookings 
       SET rating = $1, feedback = $2, rated_at = NOW() 
       WHERE tracking_token = $3 AND status = 'COMPLETED'
       RETURNING *`,
      [rating, feedback || '', token]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ message: 'Rating is only allowed after job completion' });
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
       WHERE tracking_token = $1 AND status = 'CONFIRMED'
       RETURNING *`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ message: 'Booking not found or cannot be cancelled in its current status' });
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
