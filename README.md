# Feedback Service

A standalone, publicly accessible feedback and rating portal for TechOps customer tracking links.

## Overview

This service provides:
- ✅ **Public tracking page** for customers to rate & review appointments
- ✅ **Separate PostgreSQL database** (on Render) - no local DB changes
- ✅ **React + Express.js** - lightweight, scalable
- ✅ **HTTPS support** via custom domain `track.saikarthikeya.com`
- ✅ **Automatic feedback sync** to local MySQL (optional)

## Folder Structure

```
feedback-service/
├── db/
│   ├── init.sql               # Database schema initialization
│   └── sync-feedback.js       # Sync script (Render → Local MySQL)
├── src/
│   ├── main.jsx              # React entry point
│   ├── FeedbackPage.jsx       # Main feedback component
│   ├── FeedbackPage.css       # Styling
│   └── index.css              # Global styles
├── public/                     # Built React app (after npm run build)
├── index.html                  # HTML template
├── vite.config.js             # Vite build config
├── server.js                   # Express.js backend
├── package.json               # Dependencies
├── Dockerfile                 # Docker image for deployment
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules
├── DEPLOYMENT.md              # Deployment instructions
└── README.md                  # This file
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, CSS3 |
| Backend | Node.js, Express.js |
| Database | PostgreSQL 15 (Render) |
| Hosting | Render Web Service |
| Domain | Hostinger DNS |

## Local Development

### Setup

```bash
cd feedback-service
npm install
```

### Build React App

```bash
npm run build
```

This creates `public/` folder with optimized React build.

### Run Locally

**Option 1: Production Mode**
```bash
npm start
```
- Serves React app from `public/`
- API runs on port 3000
- Visit: http://localhost:3000

**Option 2: Development Mode**
```bash
npm run dev
```
- Runs Vite (React hot reload) + Node server concurrently
- React dev server: http://localhost:5173
- Node API: http://localhost:3000

### Local Database Testing

To test with a local PostgreSQL:

```bash
# Create .env.local
DATABASE_URL=postgresql://postgres:password@localhost:5432/feedbackdb

# Initialize schema
psql -U postgres -f db/init.sql

# Start server
npm start
```

## API Endpoints

All endpoints are **public** (no authentication required). Tracking tokens act as access control.

### 1. Get Booking Details
```
GET /api/bookings/track/:token
```

**Response:**
```json
{
  "id": 1,
  "booking_id": "BK001",
  "customer_name": "John Doe",
  "appointment_date": "2026-08-27T10:00:00",
  "work_type": "Installation",
  "status": "COMPLETED",
  "rating": 5,
  "feedback": "Great service!",
  "rated_at": "2026-08-27T15:30:00"
}
```

### 2. Submit Rating & Feedback
```
POST /api/bookings/track/:token/rate
Content-Type: application/json

{
  "rating": 5,
  "feedback": "Excellent work, very satisfied"
}
```

**Response:** Updated booking object

### 3. Cancel Appointment
```
POST /api/bookings/track/:token/cancel
```

**Response:** Updated booking with `status: "CANCELLED"`

## Environment Variables

Create `.env` file:

```env
# Database (Render PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/feedbackdb

# Server
PORT=3000
NODE_ENV=production

# CORS
CORS_ORIGIN=https://track.saikarthikeya.com
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete step-by-step instructions.

### Quick Deploy to Render

1. Push to GitHub:
   ```bash
   git add feedback-service/
   git commit -m "Add feedback service"
   git push
   ```

2. Create Render Web Service:
   - Root directory: `feedback-service`
   - Build: `npm install && npm run build`
   - Start: `npm start`
   - Environment: Add `DATABASE_URL`

3. Configure domain:
   - Add custom domain: `track.saikarthikeya.com`
   - Update Hostinger DNS CNAME

## Syncing to Local Database

To sync feedback from Render PostgreSQL → Local MySQL:

```bash
# Set environment variables
export REMOTE_DATABASE_URL="postgresql://..."  # Render PostgreSQL
export MYSQL_HOST="localhost"
export MYSQL_USER="root"
export MYSQL_PASSWORD="root"
export MYSQL_DB="bookingdb"

# Run sync
node db/sync-feedback.js
```

### Automated Sync (Cron)

Add to crontab to run every 5 minutes:

```bash
*/5 * * * * cd /path/to/techops-platform && node feedback-service/db/sync-feedback.js >> /var/log/feedback-sync.log 2>&1
```

### Sync in Docker

Add to docker-compose.yml:

```yaml
feedback-sync:
  image: node:18-alpine
  working_dir: /app
  volumes:
    - .:/app
  environment:
    REMOTE_DATABASE_URL: ${FEEDBACK_DB_URL}
    MYSQL_HOST: mysql
    MYSQL_USER: root
    MYSQL_PASSWORD: root
  command: node feedback-service/db/sync-feedback.js
  depends_on:
    - mysql
  restart: on-failure
```

## Troubleshooting

### React not loading
- Ensure `npm run build` completed successfully
- Check `public/` folder exists and contains `index.html`

### Database connection error
```
error: connect ECONNREFUSED
```
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is accessible
- Check firewall rules

### CORS errors
```
Access to XMLHttpRequest blocked by CORS policy
```
- Update `CORS_ORIGIN` in environment
- Ensure domain matches in `.env`

### Rating not submitting
- Check tracking token is valid
- Verify appointment status is "COMPLETED"
- Check browser console for API errors

## Important Considerations

⚠️ **Data Isolation**
- Feedback data lives in Render PostgreSQL
- Local MySQL is untouched until sync runs
- Choose sync strategy based on your needs

⚠️ **Security**
- No authentication on endpoints (by design - tracking tokens provide access control)
- Tokens should be 32+ characters, random and unique
- Use HTTPS only in production

⚠️ **Costs**
- Render free tier: 750 hours/month
- Suitable for feedback service (low traffic)
- Monitor usage and upgrade if needed

⚠️ **No Breaking Changes**
- Your local TechOps stack is completely unchanged
- This is an add-on service
- Can be deployed/removed independently

## Integration with Local Services

### Update Resend Email Links

In your `BookingServiceImpl` (Spring Boot):

```java
// Before: http://localhost:3000/track/{token}
// After: https://track.saikarthikeya.com?token={token}

String trackingLink = "https://track.saikarthikeya.com?token=" + booking.getTrackingToken();
```

### Update Frontend References

In your local React frontend, tracking links should point to:
```
https://track.saikarthikeya.com?token={trackingToken}
```

## Support

For deployment issues, check:
1. Render dashboard logs
2. PostgreSQL connectivity
3. Environment variables
4. DNS records (Hostinger)

## License

Proprietary - TechOps Platform
