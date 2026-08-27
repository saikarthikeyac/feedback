-- Initialize feedback database schema

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

CREATE INDEX idx_tracking_token ON bookings(tracking_token);
CREATE INDEX idx_booking_id ON bookings(booking_id);
CREATE INDEX idx_status ON bookings(status);

-- Optional: Add sync trigger or schedule for syncing with local MySQL
-- This will be handled by your sync service
