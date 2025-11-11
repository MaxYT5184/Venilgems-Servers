# Venilgem Services Discord Bot (Node.js Version)

A Discord bot for handling server logs, slash commands, and ticket system.

## Features

- Comprehensive server logging system (messages, joins, leaves, voice activity, channel changes, role changes, bans)
- Modern welcome embed system
- Slash commands support
- Ticket system with dropdown menu
- Automatic ticket channel creation
- Ticket closing functionality
- Moderation commands (/ban, /kick, /timeout)
- Detailed logging of all bot activities
- Web-based dashboard for bot management
- Auto-role assignment for new members

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a Discord bot application at https://discord.com/developers/applications

3. Copy your bot token and add it to the `.env` file

4. Update the `.env` file with your:
   - Discord Bot Token
   - Application Client ID
   - Guild ID
   - Log Channel ID
   - Welcome Channel ID
   - Member Role ID (for auto-role assignment)
   - Dashboard Port (optional, default: 3000)
   - Session Secret (for dashboard authentication)

5. Run the bot:
   ```
   ./start.sh
   ```
   Or manually:
   ```
   node bot.js
   ```

## Commands

### Slash Commands

- `/ticket` - Create a new ticket
- `/setup_ticket` - Set up the ticket system in the current channel
- `/logs` - Send a test log entry to the log channel
- `/close_ticket` - Close the current ticket channel (only works in ticket channels)
- `/ban <user> [reason]` - Ban a user from the server
- `/kick <user> [reason]` - Kick a user from the server
- `/timeout <user> [duration] [reason]` - Timeout a user
- `/giveaway_start <prize> <duration> [winners]` - Start a new giveaway
- `/giveaway_end <message_id>` - End a giveaway early
- `/giveaway_reroll <message_id>` - Reroll a giveaway winner
- `/restock <channel_id> <amount>` - Announce a product restock
- `/pingeveryone <password> <message>` - Send a message to all server members (cooldown protected)

## Ticket System

The ticket system allows users to create tickets with the following options:

- 💰 Purchasing - Need help with a purchase
- 🔧 Support - Technical support
- ❓ Questions - General questions
- ⏰ Didn't get account - Account delivery issues (1+ days)

When a user creates a ticket:
1. A new channel is created in the "Tickets" category
2. The user gets permission to access only that channel
3. A welcome message is sent in the ticket channel
4. The ticket creation is logged in the log channel

To close a ticket, use the `/close_ticket` command in the ticket channel.

## Welcome System

When a user joins the server, they will receive a modern welcome embed message in the designated welcome channel with:
- A personalized greeting
- Server member count
- User avatar thumbnail
- Professional styling

## Dashboard

The bot includes a web-based dashboard for easy management:

- **Dashboard Overview**: View bot status, server statistics, and recent activity
- **Settings Management**: Configure bot settings through a web interface
- **Logs Viewer**: Monitor bot activity and events
- **User Authentication**: Secure login system for authorized access

To access the dashboard, navigate to `http://localhost:3000` (or your configured port) after starting the bot.
Default login credentials are `admin` / `admin123`.

For more detailed information about the dashboard, see [README_DASHBOARD.md](README_DASHBOARD.md).

## Ping Everyone System

The bot includes a secure ping everyone system with the following features:
- Password-protected mass messaging
- Cooldown system to prevent spam
- One-by-one message delivery to avoid rate limits
- Detailed logging of all mass messages
- Error handling and reporting

### Ping Everyone Command

- `/pingeveryone <password> <message>` - Send a message to all server members
  - `password`: Admin password for authentication
  - `message`: The message to send to all members

### Features

1. **Password Protection**: Requires admin password for security
2. **Cooldown System**: 5-minute cooldown per user
3. **Sequential Delivery**: Messages sent one-by-one with delays
4. **Error Handling**: Failed deliveries are logged
5. **Comprehensive Logging**: All mass messages are logged

## Restock System

The bot includes an advanced restock announcement system with the following features:
- Modern, eye-catching embed design with emojis and formatting
- Automatic channel tagging
- Timestamps for restock notifications
- Reaction buttons for quick actions
- Detailed logging of all restock announcements
- Permission-based access control

### Restock Command

- `/restock <channel_id> <amount>` - Announce a product restock
  - `channel_id`: The ID of the channel where the product is restocked
  - `amount`: The number of items restocked

### Features

1. **Advanced Embed Design**: Professional, modern embed with emojis, colors, and structured information
2. **Reaction System**: Automatic addition of reaction buttons for user interaction
3. **Confirmation Message**: Staff receive confirmation with a link to the announcement
4. **Activity Status**: Bot shows "Watching for restocks" in its status
5. **Comprehensive Logging**: All restock announcements are logged

## Giveaway System

The bot includes a full-featured giveaway system with the following capabilities:
- Start giveaways with custom prizes, durations, and winner counts
- Users can enter/leave giveaways with dedicated buttons
- Automatic winner selection when giveaways end
- Manual ending of giveaways early
- Rerolling of winners
- All giveaway activity is logged
- Comprehensive error handling to prevent bot crashes
- Unique giveaway IDs to prevent conflicts

### Giveaway Commands

- `/giveaway_start <prize> <duration> [winners]` - Start a new giveaway
  - `prize`: The prize to be won
  - `duration`: Duration in minutes
  - `winners`: Number of winners (default: 1)
- `/giveaway_end <message_id>` - End a giveaway early
  - `message_id`: The message ID of the giveaway to end
- `/giveaway_reroll <message_id>` - Reroll giveaway winners
  - `message_id`: The message ID of the giveaway to reroll

### How Giveaways Work

1. Staff members use `/giveaway_start` to create a new giveaway
2. The bot posts the giveaway in the designated giveaway channel
3. Users click "Enter Giveaway" or "Leave Giveaway" buttons to participate
4. When the timer expires, winners are randomly selected
5. Winners are announced in the giveaway channel
