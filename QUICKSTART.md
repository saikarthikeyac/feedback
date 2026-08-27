# TechOps Feedback Service - Quick Start Summary

## What Was Created?

I've created a complete, production-ready feedback service that:
- ✅ Exposes **only** the feedback functionality to the internet
- ✅ Uses your domain: `track.saikarthikeya.com`
- ✅ Keeps your entire local TechOps platform **completely unchanged**
- ✅ Stores feedback in a separate Render PostgreSQL database
- ✅ Can sync feedback back to your local MySQL (optional)

## Files Created

### Backend (Express.js)
- `feedback-service/server.js` - Express API server
- `feedback-service/package.json` - Node.js dependencies
- `feedback-service/Dockerfile` - Container image

### Frontend (React + Vite)
- `feedback-service/src/FeedbackPage.jsx` - Customer feedback component
- `feedback-service/src/FeedbackPage.css` - Styling
- `feedback-service/index.html` - React entry point
- `feedback-service/vite.config.js` - Build configuration

### Database
- `feedback-service/db/init.sql` - Schema creation
- `feedback-service/db/sync-feedback.js` - Sync feedback to local MySQL

### Documentation
- `feedback-service/DEPLOYMENT.md` - Complete deployment guide
- `feedback-service/README.md` - Technical reference
- `feedback-service/.env.example` - Configuration template

## Zero Breaking Changes

❌ **NOT changed:**
- docker-compose.yml
- Any existing microservices
- Your local databases
- Frontend code
- API Gateway

✅ **Only added:**
- One new folder: `feedback-service/`
- Can be deleted anytime without affecting anything

## Deployment in 7 Steps

### Step 1: Create Render Account (2 min)
```
https://render.com → Sign up
```

### Step 2: Create Render PostgreSQL Database (3 min)
- Dashboard → + New → PostgreSQL
- Name: `techops-feedback`
- Free tier
- Copy the External Database URL

### Step 3: Prepare Feedback Service (5 min)
```bash
cd feedback-service
npm install
npm run build
```

### Step 4: Deploy to Render (5 min)
- Push to GitHub
- Render Dashboard → + New Web Service
- Connect GitHub repo
- Root directory: `feedback-service/`
- Build: `npm install && npm run build`
- Start: `npm start`
- Add environment: `DATABASE_URL=<your-render-url>`
- Deploy

### Step 5: Initialize Database (2 min)
```bash
psql -U <user> -h <host> -d feedbackdb -f feedback-service/db/init.sql
```

### Step 6: Configure Domain (3 min)
- Render: Add custom domain `track.saikarthikeya.com`
- Hostinger: Create CNAME record `track` → Render URL

### Step 7: Update Email Links (1 min)
- Change Resend email template: `https://track.saikarthikeya.com?token={token}`

**Total time: ~25 minutes for full setup**

## How Customers Use It

1. **Customer receives email from Resend:**
   ```
   Click to track your appointment:
   https://track.saikarthikeya.com?token=abc123xyz
   ```

2. **Customer clicks link:**
   - Page loads with appointment status (CONFIRMED/IN_PROGRESS/COMPLETED/CANCELLED)
   - Can cancel appointment if needed
   - If COMPLETED, can rate and leave feedback

3. **Feedback is saved:**
   - Data stored in Render PostgreSQL
   - Visible in your feedback dashboard
   - Can sync to local MySQL if desired

## Database Architecture

### Local (Unchanged)
```
MySQL: bookingdb
  └─ bookings table (unchanged)
```

### Render (Feedback Service)
```
PostgreSQL: feedbackdb
  └─ bookings table (feedback + rating only)
```

### Optional Sync
```
Render PostgreSQL 
    ↓ (sync-feedback.js runs every 5 min)
Local MySQL (updates existing bookings table)
```

If you **don't enable sync**, feedback lives only on Render.

## Customization Options

### Option A: Feedback Only on Render
- Simplest setup
- No local sync required
- Feedback visible only in Render dashboard

### Option B: Sync to Local MySQL
- Add cron job: `*/5 * * * * node sync-feedback.js`
- Feedback appears in your local CompletedReviewsTab
- Extra operational overhead

### Option C: Real-time Sync with Kafka/SNS
- Production-grade approach
- Immediate feedback sync
- More complex setup

**Recommended:** Start with Option A, upgrade to B if needed.

## Verification After Deployment

Test that everything works:

1. **Frontend accessible:**
   ```bash
   curl https://track.saikarthikeya.com
   # Should return HTML page
   ```

2. **API working:**
   ```bash
   curl https://track.saikarthikeya.com/api/bookings/track/test-token-123
   # Should return JSON (or 404 if token doesn't exist)
   ```

3. **Send test booking:**
   - Create a booking in your local system
   - Copy its tracking token
   - Visit: `https://track.saikarthikeya.com?token=<token>`
   - Should show appointment details

4. **Test rating:**
   - If status is COMPLETED, rate and submit
   - Check Render PostgreSQL dashboard
   - Feedback should appear in `bookings` table

## Local Testing (Before Deployment)

Want to test locally first?

```bash
cd feedback-service

# Create .env
echo 'DATABASE_URL=postgresql://user:pass@localhost:5432/feedbackdb' > .env

# Build React
npm install
npm run build

# Initialize local database
createdb feedbackdb
psql feedbackdb -f db/init.sql

# Start server
npm start

# Visit
open http://localhost:3000?token=test-token-123
```

## Troubleshooting Deployment Issues

### Build fails on Render
- Check `feedback-service/` is not nested in another folder
- Verify all files were pushed to GitHub
- Build command should be: `npm install && npm run build`

### Database connection error
- Verify `DATABASE_URL` is correct
- Test connection locally: `psql $DATABASE_URL`
- Check Render PostgreSQL firewall allows incoming connections

### Domain not resolving
- Wait 5-15 min for DNS to propagate
- Verify CNAME record on Hostinger
- Test: `nslookup track.saikarthikeya.com`

### Rating submission fails
- Check browser console (F12 → Console tab)
- Verify `CORS_ORIGIN` in Render environment
- Ensure appointment status is "COMPLETED"

## Important Notes

### Security
- Tracking tokens = access control (no username/password needed)
- Make sure tokens are long (32+ chars) and random
- HTTPS enabled by default on Render

### Cost
- Render free tier: 750 hours/month
- Feedback service uses <10 hours/month (plenty of headroom)
- Free PostgreSQL: 90 days, then upgrade needed

### Local Platform Untouched
- Your docker-compose.yml is unchanged
- All microservices unchanged
- Nothing to rollback if issues occur

### Can Be Removed Anytime
- Delete `feedback-service/` folder
- No dependencies with local system
- Render service can be deleted with one click

## Next: Update Your Booking Service

When ready, update your Spring Boot booking-service to use the public domain in Resend emails:

**File:** `booking-service/src/main/java/.../BookingService.java`

```java
// Before:
String trackingLink = "https://localhost:8085/track/" + token;

// After:
String trackingLink = "https://track.saikarthikeya.com?token=" + token;
```

Rebuild and redeploy the booking-service locally.

## Final Checklist

- [ ] Created `feedback-service/` folder with all files
- [ ] Render account created
- [ ] Render PostgreSQL database created
- [ ] `npm install && npm run build` works locally
- [ ] Code pushed to GitHub
- [ ] Render Web Service deployed (green status)
- [ ] Custom domain configured on Render & Hostinger
- [ ] Can access `https://track.saikarthikeya.com` from browser
- [ ] Database schema initialized
- [ ] Test rating submission works
- [ ] Updated Resend email template with new domain
- [ ] Booking service updated to use public domain

---

**Questions?** Check `DEPLOYMENT.md` for detailed instructions or `README.md` for technical reference.

Happy shipping! 🚀
