# UptimeRobot Setup Guide

UptimeRobot is a free service that can ping your Replit bot at regular intervals to keep it awake.

## Setting up UptimeRobot

1. Go to [uptimerobot.com](https://uptimerobot.com/) and create a free account
2. Verify your email address
3. Click "Add New Monitor"

## Monitor Configuration

1. **Monitor Type**: Select "HTTP(s)"
2. **Friendly Name**: Give your monitor a descriptive name (e.g., "Venilgem Discord Bot")
3. **URL**: 
   - After deploying to Replit, your URL will look like: `https://your-repl-name.your-replit-username.repl.co`
   - For the health check endpoint, use: `https://your-repl-name.your-replit-username.repl.co/health`
4. **Monitoring Interval**: Select "5 minutes" (this is the minimum for free accounts)
5. **Alert Contacts**: Set up notifications if you want to be alerted when your bot goes down

## Important Notes

- UptimeRobot's free tier allows monitoring up to 50 URLs
- The 5-minute interval is sufficient to keep Replit projects active
- Make sure to use the `/health` endpoint as it's specifically designed for uptime monitoring
- You can monitor both the main URL and the health endpoint for redundancy

## Testing Your Setup

After setting up:
1. Check that the monitor status shows "Up" after a few minutes
2. Verify in your Replit console that requests are being received from UptimeRobot (they will appear as GET requests to /health)
3. Your bot should now stay awake 24/7 as long as Replit is functioning properly

## Troubleshooting

If UptimeRobot shows your bot as "Down":
1. Check your Replit console for errors
2. Verify your bot is still running in Replit
3. Confirm the URL is correct
4. Check that your environment variables are properly set
