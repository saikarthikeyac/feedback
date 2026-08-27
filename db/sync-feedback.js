const { Pool } = require('pg');
const mysql = require('mysql2/promise');

/**
 * Sync Feedback Service (Render PostgreSQL) → Local MySQL Booking Database
 * 
 * Run this script via:
 *   1. Node.js: node db/sync-feedback.js
 *   2. Cron (every 5 minutes): */5 * * * * cd /path/to/techops && node feedback-service/db/sync-feedback.js
 *   3. Docker: docker-compose exec feedback-sync node sync-feedback.js
 */

const remotePool = new Pool({
  connectionString: process.env.REMOTE_DATABASE_URL || 'postgresql://user:pass@render.com/feedbackdb'
});

const localPool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DB || 'bookingdb',
  port: process.env.MYSQL_PORT || 3307,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function syncFeedback() {
  console.log('Starting feedback sync...');
  
  try {
    // Fetch all ratings from remote feedback database
    const remoteResult = await remotePool.query(
      `SELECT booking_id, rating, feedback, rated_at 
       FROM bookings 
       WHERE rating IS NOT NULL 
       AND updated_at > NOW() - INTERVAL '1 hour'`
    );

    const feedbackRecords = remoteResult.rows;
    console.log(`Found ${feedbackRecords.length} feedback records to sync`);

    if (feedbackRecords.length === 0) {
      console.log('No new feedback to sync');
      return;
    }

    const connection = await localPool.getConnection();

    for (const record of feedbackRecords) {
      try {
        // Update local booking with feedback
        await connection.execute(
          `UPDATE bookings 
           SET rating = ?, feedback = ?, feedback_updated_at = NOW()
           WHERE id = (SELECT id FROM bookings WHERE booking_id = ?)`,
          [record.rating, record.feedback, record.booking_id]
        );

        console.log(`✓ Synced feedback for booking ${record.booking_id}`);
      } catch (err) {
        console.error(`✗ Failed to sync booking ${record.booking_id}:`, err.message);
      }
    }

    connection.release();
    console.log('Feedback sync completed');

  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  } finally {
    await remotePool.end();
    await localPool.end();
  }
}

// Run sync
syncFeedback().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
