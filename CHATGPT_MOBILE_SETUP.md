# ChatGPT Mobile Setup Guide
## Control Your Court Reservations from Your Phone

This guide shows you how to create a Custom GPT that connects to your Railway-deployed court reservation system, allowing you to control court automation from the ChatGPT mobile app.

## Prerequisites ✅

- [ ] **ChatGPT Plus Subscription** (required to create Custom GPTs)
- [ ] **App deployed on Railway** (you should have this already)
- [ ] **Railway app URL** (find it in your Railway dashboard)
- [ ] **ChatGPT mobile app installed** (iOS/Android)

## Part A: Create Your Custom GPT (Desktop/Web)

### Step 1: Get Your Railway URL

1. Go to [railway.app](https://railway.app) and log in
2. Navigate to your Can-Am project
3. Click on your deployment
4. Copy the domain URL (e.g., `https://can-am-script-production.up.railway.app`)
5. **Keep this URL handy** - you'll need it in Step 6

### Step 2: Access GPT Builder

1. Open your web browser and go to [chat.openai.com](https://chat.openai.com)
2. Make sure you're logged in with a ChatGPT Plus account
3. Click **"Explore GPTs"** in the left sidebar
4. Click **"Create a GPT"** at the top

### Step 3: Configure Your GPT

In the GPT Builder, fill out these sections:

**Name:**
```
Can-Am Court Assistant
```

**Description:**
```
Automated court reservation manager for Can-Am badminton courts. Start/stop automation, check status, and manage multi-court bookings with user group rotations.
```

**Instructions:**
```
You are an expert assistant for the Can-Am Badminton Court Reservation System. You help users manage automated court reservations with rotating user groups.

### System Overview
- **Court System**: 20 badminton courts (Court 1-20), some may be hidden from public view
- **Automation**: Creates 12 users per court, splits into 3 groups of 4 users each
- **Rotation**: Groups rotate every 30 minutes (current court → waitlist, next waitlist → court)
- **Duration**: User sets automation duration (1-24 hours)
- **Multi-Court**: Can manage multiple courts simultaneously with separate user groups

### Your Capabilities
1. **List Available Courts**: Show courts ready for reservation
2. **Start Single Court Automation**: Set up one court with 3 rotating groups
3. **Start Multi-Court Automation**: Set up multiple courts simultaneously
4. **Stop Automation**: End any running automation
5. **Check Status**: View current automation state, user groups, and timing

### User Interaction Guidelines

**When users want to start automation:**
- Always list available courts first if they don't specify a court ID
- Explain that automation creates 12 users automatically
- Confirm duration (suggest 2-4 hours for typical sessions)
- For multi-court requests, help them select optimal courts

**When explaining status:**
- Show which group is currently playing vs. on waitlist
- Display next rotation time and remaining duration
- Explain user names (they're auto-generated animal names)
- Highlight key timing information clearly

**When users ask about courts:**
- Available courts can accept immediate reservations
- Each court needs 12 users (4 playing + 8 in waitlist)
- Groups rotate automatically every 30 minutes
- The system handles all user management automatically

### Important Notes
- Court IDs are MongoDB ObjectIds (long strings like "6841fbeda6e050ee8a23c901")
- Users don't need to register manually - the system creates them automatically
- Each court in multi-court setup gets its own separate set of 12 users
- Automation continues until duration expires or manually stopped
- The system is designed for continuous operation without manual intervention

### Response Style
- Be concise but informative
- Use emojis to make responses visually appealing
- Format timing information clearly (e.g., "⏰ Next rotation: 15 minutes")
- Group related information logically
- Always confirm successful actions

### Error Handling
- If automation is already running, explain current status before suggesting changes
- If courts are unavailable, show alternatives
- If API calls fail, suggest checking the system status first
```

**Conversation Starters:**
```
🏸 Show available courts
▶️ Start automation for 3 hours
📊 Check current status
⏹️ Stop automation
```

### Step 4: Upload Profile Picture (Optional)

Upload a badminton or court-related image to make your GPT easily recognizable.

### Step 5: Configure Actions

1. Click **"Create new action"**
2. **Important**: Copy the contents of `openapi.yaml` from your project
3. Paste the entire OpenAPI specification into the Schema box

### Step 6: Update Server URL

**This is crucial!** In the OpenAPI schema you just pasted:

1. Find this line near the top:
   ```yaml
   servers:
     - url: https://your-railway-app.up.railway.app
   ```

2. Replace `https://your-railway-app.up.railway.app` with your actual Railway URL from Step 1
   ```yaml
   servers:
     - url: https://can-am-script-production.up.railway.app
   ```

3. Click **"Test"** to verify the connection works

### Step 7: Test Your Actions

1. Click **"Test"** next to each action to make sure they work:
   - **listAvailableCourts**: Should return a list of available courts
   - **getAutomationStatus**: Should return status (likely "No automation running")
   - **startAutomation**: Test with a court ID and short duration (like 1 hour)
   - **stopAutomation**: Should stop any running automation

2. If tests fail, double-check your Railway URL is correct and your app is running

### Step 8: Publish Your GPT

1. Click **"Publish"**
2. Choose **"Only me"** (private) or **"Anyone with the link"** if you want to share
3. Click **"Confirm"**

🎉 **Your Custom GPT is now created!**

## Part B: Use on Mobile

### Step 9: Access Your GPT on Mobile

1. **Open ChatGPT mobile app** (iOS or Android)
2. **Tap your profile picture** (top-right corner)
3. **Tap "My GPTs"**
4. **Find and tap "Can-Am Court Assistant"**

### Step 10: Start Using Commands

You can now control your court reservations with natural language:

**Common Commands:**
- *"Show me available courts"*
- *"Start automation for court 11 for 3 hours"*
- *"What's the current status?"*
- *"Start automation for courts 11, 12, and 13 for 2 hours"*
- *"Stop the automation"*

**Example Conversation:**
```
You: Show available courts
AI: 🏸 Here are the available courts:
   • Court 11 - Available
   • Court 12 - Available
   • Court 13 - Available
   [... more courts]

You: Start automation for court 11 for 3 hours
AI: ✅ Starting automation for Court 11...
   📝 Creating 12 users automatically
   ⏱️ Duration: 3 hours
   🔄 Groups will rotate every 30 minutes

   Automation started successfully! 🎉
```

## Troubleshooting

### "Actions not working"
- Check that your Railway app is running and accessible
- Verify the Railway URL in your OpenAPI schema is correct
- Try testing the actions in the GPT builder again

### "GPT not showing on mobile"
- Make sure you're logged in with the same account that created the GPT
- Try refreshing the My GPTs section
- Check that the GPT was successfully published

### "Commands not understood"
- Use natural language - the AI will interpret your intent
- Try the conversation starters as examples
- Be specific about court numbers or IDs when possible

### "Railway app not responding"
- Check your Railway dashboard for deployment status
- Ensure your app hasn't gone to sleep (Railway may sleep inactive apps)
- Visit your Railway URL in a browser to wake it up

## Usage Tips

### 🎯 **Best Practices**
- Start with shorter durations (1-2 hours) when testing
- Check status regularly to monitor rotations
- Use specific court numbers when possible (e.g., "Court 11" vs just "a court")

### 📱 **Mobile Optimization**
- Conversation starters are perfect for quick actions
- Voice input works great: just dictate your commands
- Pin the GPT for easy access from your chat history

### 🔄 **Understanding Rotations**
- Each court has 3 groups of 4 users
- Groups rotate every 30 minutes automatically
- Current group plays, other 2 groups wait in queue
- System handles all user management automatically

### 🏟️ **Multi-Court Management**
- Each court gets its own set of 12 users (no conflicts)
- All courts rotate on the same 30-minute schedule
- You can stop all courts at once or let them run independently

## Advanced Features

### Sharing Your GPT
If you want team members to use the same GPT:
1. Change privacy setting to "Anyone with the link"
2. Share the GPT link with your team
3. They can access it from their ChatGPT mobile apps

### Integration with Shortcuts (iOS)
You can create Siri shortcuts that open specific GPT conversations for even faster access.

## Support

If you run into issues:
1. Check the troubleshooting section above
2. Test your API endpoints directly in a browser
3. Verify your Railway deployment is active
4. Review the OpenAPI schema for any syntax errors

---

🎉 **You're all set!** You can now manage your court reservations from anywhere using your phone. The system will handle all the complex automation while you control it with simple voice or text commands.