# Court Reservation Automation System

An automated system for managing court reservations with continuous rotation of user groups.

## Features

- 🏸 **Automated Court Reservations**: Creates 12 users and manages court bookings
- ⏰ **30-Minute Rotations**: Automatically rotates user groups every 30 minutes
- 📱 **Mobile-Friendly**: Optimized for iPhone control
- 🤖 **Persistent Server**: Runs on Railway with Redis storage
- 🔄 **Continuous Operation**: Set duration and let it run autonomously

## System Architecture

- **Frontend**: Next.js with real-time status monitoring
- **Backend**: Node.js server with Redis storage
- **Automation**: Built-in cron service for 30-minute rotations
- **User Management**: Automatic user creation, approval, and rotation
- **Database**: Redis for session state and user data

## API Endpoints

- `/api/start-automation` - Initialize automation with court and duration
- `/api/status` - Get current automation status
- `/api/stop-automation` - Stop running automation
- `/api/list-courts` - Fetch available courts
- Built-in cron service handles rotations automatically

## User Flow

1. **Setup**: Creates 12 users with random phone numbers
2. **Initial Reservation**: First 4 users book the court
3. **Waitlist**: Remaining 8 users join waitlist in groups of 4
4. **Rotation**: Every 30 minutes, groups rotate (court → waitlist → court)
5. **Duration**: Continues for specified hours, then automatically stops

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Deployment on Railway

### Quick Deploy

1. **Create Railway Account** at [railway.app](https://railway.app)
2. **Connect GitHub** repository `YinchuanHe/can-am-script`
3. **Deploy** - Railway automatically:
   - Detects Next.js app
   - Provisions Redis database
   - Sets up environment variables
   - Deploys with custom server
4. **Get URL** from Railway dashboard

### Environment Variables (Auto-configured)

- `REDIS_URL` - Automatically set by Railway Redis
- `PORT` - Automatically set by Railway

### Features

✅ **Real persistent server** (not serverless functions)  
✅ **Built-in 30-minute cron** (no external dependencies)  
✅ **Redis database included** (no extra setup)  
✅ **$5/month free credit** covers this app  
✅ **Auto-deploy on git push**  

### Manual Setup (if needed)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up
```

Your app will be live with full cron automation! 🎉
