# Court Reservation Automation System

An automated system for managing court reservations with continuous rotation of user groups.

## Features

- 🏸 **Automated Court Reservations**: Creates 12 users and manages court bookings
- ⏰ **30-Minute Rotations**: Automatically rotates user groups every 30 minutes
- 📱 **Mobile-Friendly**: Optimized for iPhone control
- 🤖 **Serverless**: Runs completely on Vercel with KV storage
- 🔄 **Continuous Operation**: Set duration and let it run autonomously

## System Architecture

- **Frontend**: Next.js with real-time status monitoring
- **Backend**: Serverless API routes with Vercel KV storage
- **Automation**: Vercel Cron Jobs for 30-minute rotations
- **User Management**: Automatic user creation, approval, and rotation

## API Endpoints

- `/api/start-automation` - Initialize automation with court and duration
- `/api/status` - Get current automation status
- `/api/stop-automation` - Stop running automation
- `/api/list-courts` - Fetch available courts
- `/api/cron/rotate-reservation` - Handle automated rotations (cron)

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

## Deployment

See the step-by-step deployment guide below for complete setup instructions including Vercel KV and Cron configuration.
