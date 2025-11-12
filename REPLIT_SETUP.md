# Replit Setup Guide for Discord Bot

This guide will help you set up your Discord bot on Replit with UptimeRobot for 24/7 hosting.

## Step 1: Create a Replit Account

1. Go to [replit.com](https://replit.com/) and sign up for a free account
2. Verify your email address

## Step 2: Import Your Bot to Replit

1. Click the "+ Create Repl" button
2. Choose "Import from GitHub"
3. Paste your repository URL
4. Select "Node.js" as the template
5. Click "Import from GitHub"

## Step 3: Configure Environment Variables

1. In your Replit project, click on the "Secrets" tab in the left sidebar (the lock icon)
2. Add the following environment variables:
   - `DISCORD_TOKEN`: Your bot's token from the Discord Developer Portal
   - `CLIENT_ID`: Your bot's client ID from the Discord Developer Portal
   - `GUILD_ID`: The ID of your Discord server
   - `LOG_CHANNEL_ID`: The ID of your log channel
   - `WELCOME_CHANNEL_ID`: The ID of your welcome channel
   - `GIVEAWAY_CHANNEL_ID`: The ID of your giveaway channel
   - `ADMIN_PASSWORD`: A secure password for admin commands
   - `MEMBER_ROLE_ID`: The ID of the role to assign to new members
   - `DASHBOARD_PORT`: 3000 (required for the web dashboard)

## Step 4: Run Your Bot

1. Click the "Run" button at the top of the Replit interface
2. Your bot should start and connect to Discord

## Step 5: Set Up UptimeRobot

1. Go to [uptimerobot.com](https://uptimerobot.com/) and create a free account
2. Click "Add New Monitor"
3. Select "HTTP(s)" as the monitor type
4. Get your Replit project's URL (it will look like `https://your-project-name.your-username.repl.co`)
5. Paste this URL into the "URL (or IP)" field
6. Set the monitoring interval to 5 minutes
7. Click "Create Monitor"

## Important Notes

- Replit's free tier has some limitations, but should be sufficient for most Discord bots
- The keep_alive.js file helps prevent Replit from putting your bot to sleep
- UptimeRobot pings your bot every 5 minutes to keep it active
- Make sure to add proper error handling in your bot code for disconnections

## Troubleshooting

If your bot goes offline:
1. Check the Replit console for error messages
2. Verify all environment variables are correctly set
3. Check that your bot token is valid
4. Ensure UptimeRobot is properly configured
