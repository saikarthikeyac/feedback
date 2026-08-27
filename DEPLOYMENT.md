# TechOps Feedback Service - Deployment Guide

This guide explains how to deploy **only the feedback functionality** to the internet while keeping your main TechOps platform local.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  track.saikarthikeya.com  (Render/Railway + React)              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  - Express.js Backend (Node.js)                          │   │
│  │  - React Frontend (CustomerTrackingScreen)               │   │
│  │  - PostgreSQL Database (for feedback data)               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

LOCAL (Your Machine - Completely Unchanged)
┌─────────────────────────────────────────────────────────────────┐
│  Docker Compose (All services unchanged)                        │
│  - API Gateway (8085)                                           │
│  - All microservices                                            │
│  - MySQL & PostgreSQL databases                                │
└─────────────────────────────────────────────────────────────────┘
```

## What Changed?

✅ **Created** `feedback-service/` - new, independent service  
✅ **No changes** to existing microservices  
✅ **No changes** to docker-compose.yml  
✅ **No changes** to your local setup  
✅ **Isolated database** on Render PostgreSQL (separate from local)  

## Step-by-Step Deployment

### 1. Create Render Account & PostgreSQL Database

1. Go to [render.com](https://render.com)
2. Sign up or log in
3. Create a **PostgreSQL Database**:
   - Click **+ New** → **PostgreSQL**
   - Name: `techops-feedback`
   - Region: Choose closest to your location
   - PostgreSQL Version: 15
   - Pricing: Free tier (suitable for feedback data)
   - Click **Create Database**

4. Copy the **Internal Database URL** and **External Database URL**
   - You'll use the External URL for the feedback service

### 2. Prepare Feedback Service for Deployment

1. **Build the React frontend**:
   ```bash
   cd feedback-service
   npm install
   npm run build
   ```

2. **Create `.env` file** in feedback-service/:
   ```
   DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[dbname]
   PORT=3000
   NODE_ENV=production
   CORS_ORIGIN=https://track.saikarthikeya.com
   ```
   
   Replace with your Render PostgreSQL credentials.

3. **Test locally** (optional):
   ```bash
   npm install
   npm run build
   npm start
   ```
   
   Visit `http://localhost:3000` to test.

### 3. Deploy to Render

1. **Push code to GitHub**:
   ```bash
   cd techops-platform
   git add feedback-service/
   git commit -m "Add feedback service"
   git push origin main
   ```

2. **Create Render Web Service**:
   - Go to Render Dashboard
   - Click **+ New** → **Web Service**
   - Connect your GitHub repository
   - Select branch: `main`
   - Choose the `feedback-service/` folder as root directory
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

3. **Add Environment Variables**:
   - In Render dashboard:
   - Copy `.env.example` values to Environment section
   - **DATABASE_URL**: Your Render PostgreSQL URL
   - **PORT**: `3000`
   - **NODE_ENV**: `production`

4. **Deploy**:
   - Click **Create Web Service**
   - Render will build and deploy automatically
   - Wait for deployment to complete (green "Live" status)
   - You'll get a URL like: `https://techops-feedback-xyz.onrender.com`

### 4. Initialize Feedback Database

1. **Connect to Render PostgreSQL** using psql or pgAdmin
2. **Run migration**:
   ```bash
   psql -U [user] -h [host] -d feedbackdb -f feedback-service/db/init.sql
   ```

3. **Verify tables created**:
   ```sql
   \dt  -- should show 'bookings' table
   ```

### 5. Configure Custom Domain (DNS)

1. **Add Custom Domain to Render**:
   - In Render Web Service settings
   - Scroll to **Custom Domains**
   - Add: `track.saikarthikeya.com`
   - Note the CNAME record Render provides

2. **Update DNS on Hostinger**:
   - Log in to Hostinger
   - Go to **DNS Settings** for `saikarthikeya.com`
   - Create CNAME record:
     - Name: `track`
     - Type: `CNAME`
     - Value: `[render-provided-cname]`
     - TTL: 3600
   - Save

3. **Wait for DNS Propagation** (5-15 minutes)
   - Test: `ping track.saikarthikeya.com`
   - Or visit: `https://track.saikarthikeya.com`

### 6. Sync Feedback to Local Database (Optional)

If you want feedback data synced to your local MySQL booking database:

**Option A: Manual Sync (Scheduled)**
- Create a simple script that reads from Render PostgreSQL
- Writes to local MySQL `bookings` table
- Run via cron job or AWS Lambda

**Option B: Automatic Sync (Kafka/Message Queue)**
- Use AWS SNS/SQS or Redis to publish feedback events
- Local service subscribes and stores in MySQL

**Option C: Local Read Replica**
- Set up PostgreSQL replication from Render
- Local services can read/write freely

For now, feedback data lives in Render PostgreSQL only.

### 7. Update Resend Email Links

Update your Resend email template to point to the public domain:

**Before**:
```
https://localhost:3000/track/{trackingToken}
```

**After**:
```
https://track.saikarthikeya.com?token={trackingToken}
```

Example in your mail template service:
```java
String trackingLink = "https://track.saikarthikeya.com?token=" + booking.getTrackingToken();
// Use in email body
```

## Verification Checklist

- [ ] `feedback-service/` created with all files
- [ ] Render PostgreSQL database created
- [ ] React app builds successfully (`npm run build`)
- [ ] Express server starts (`npm start`)
- [ ] Render Web Service deployed (green status)
- [ ] Custom domain `track.saikarthikeya.com` configured
- [ ] DNS CNAME record added on Hostinger
- [ ] Can access `https://track.saikarthikeya.com` from internet
- [ ] Feedback table created in Render PostgreSQL
- [ ] Rating/feedback submission works
- [ ] Resend emails send correct tracking links

## Troubleshooting

### Build fails on Render
```
npm ERR! npm ERR! code ENOENT
```
- Ensure `package.json` exists in feedback-service root
- Check build command: `npm install && npm run build`

### Database connection error
```
error: connect ECONNREFUSED
```
- Verify `DATABASE_URL` in Render environment
- Check PostgreSQL is running
- Ensure firewall allows connection

### Domain not resolving
```
nslookup track.saikarthikeya.com
```
- Wait for DNS propagation (5-15 minutes)
- Verify CNAME record on Hostinger
- Check TTL is low (3600 or less)

### CORS errors
- Update `CORS_ORIGIN` env var in Render
- Currently set to: `https://track.saikarthikeya.com`

## Local Testing Before Deployment

### 1. Test feedback-service locally
```bash
cd feedback-service
npm install
npm run build

# Create .env.local with local PostgreSQL
cat > .env << EOF
DATABASE_URL=postgresql://postgres:root123@localhost:5433/feedbackdb
PORT=3000
NODE_ENV=development
EOF

npm start
```

### 2. Access locally
- Visit: `http://localhost:3000?token=test-token-123`

### 3. Test database
```bash
psql postgresql://postgres:root123@localhost:5433/feedbackdb
```

## Important Notes

⚠️ **Data Isolation**:
- Feedback data lives in Render PostgreSQL
- Your main TechOps data stays in local MySQL/PostgreSQL
- No automatic sync (choose Option A/B/C above if needed)

⚠️ **Costs**:
- Render free tier: Suitable for feedback service
- Might need paid tier after 100+ daily requests

⚠️ **Security**:
- No authentication on `/api/bookings/track/*` endpoints (by design)
- Tracking tokens act as access control
- Make tokens long and random (at least 32 chars)

⚠️ **No Breaking Changes**:
- Your existing platform is completely untouched
- feedback-service is independent
- Can deploy/remove anytime

## Next Steps

1. Customers click link in Resend email
2. Link: `https://track.saikarthikeya.com?token=abc123xyz`
3. React component loads feedback page
4. Customer rates service (1-5 stars) + feedback
5. Data stored in Render PostgreSQL
6. ✅ Done! No local machine dependency.

For questions or issues, check Render logs:
- Render Dashboard → Web Service → Logs tab
