# Venilgem Services Bot Configuration Guide (Node.js Version)

This guide will help you configure your Venilgem Services Discord bot.

## Getting Your Bot Token

1. Go to https://discord.com/developers/applications
2. Click "New Application" and give it a name (e.g., "Venilgem Services")
3. Go to the "Bot" tab on the left
4. Click "Add Bot" and confirm
5. Under "Token", click "Reset Token" and copy the token
6. Paste this token in your `.env` file as `DISCORD_TOKEN=your_token_here`

## Getting Your Application Client ID

1. In the same application page, go to the "General Information" tab
2. Copy the "Application ID"
3. Paste this ID in your `.env` file as `CLIENT_ID=your_client_id_here`

## Getting Your Guild ID

1. Open Discord settings
2. Go to "Advanced" under "App Settings"
3. Enable "Developer Mode"
4. Right-click on your server icon
5. Click "Copy ID"
6. Paste this ID in your `.env` file as `GUILD_ID=your_guild_id_here`

## Setting Up Channels

### Log Channel
1. Create a channel for logs (e.g., #bot-logs)
2. Right-click on the channel and copy its ID
3. Paste this ID in your `.env` file as `LOG_CHANNEL_ID=your_log_channel_id_here`

### Welcome Channel
1. Create a channel for welcome messages (e.g., #welcome)
2. Right-click on the channel and copy its ID
3. Paste this ID in your `.env` file as `WELCOME_CHANNEL_ID=your_welcome_channel_id_here`

### Giveaway Channel
1. Create a channel for giveaways (e.g., #giveaways)
2. Right-click on the channel and copy its ID
3. Paste this ID in your `.env` file as `GIVEAWAY_CHANNEL_ID=your_giveaway_channel_id_here`

### Admin Password
1. Set a secure password in your `.env` file as `ADMIN_PASSWORD=your_secure_password`
2. This password is required to use the `/pingeveryone` command

## Required Bot Permissions

Make sure your bot has these permissions:
- View Channels
- Send Messages
- Manage Channels
- Manage Permissions
- Read Message History
- Add Reactions
- Use Slash Commands
- Ban Members
- Kick Members
- Moderate Members
- Manage Messages (for giveaways, restocks, and mass messages)
- Send Messages to Members (for direct messages)

## Bot Status

The bot will appear as "Idle" with the status "Watching for restocks 🔍" when online.

## Inviting Your Bot

1. Go back to your bot application page
2. Go to "OAuth2" > "URL Generator"
3. Under "Scopes", select:
   - bot
   - applications.commands
4. Under "Bot Permissions", select:
   - Administrator (or the specific permissions listed above)
5. Copy the generated URL and open it in your browser
6. Select your server and click "Authorize"
