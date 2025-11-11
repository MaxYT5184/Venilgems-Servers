# Venilgem Services Dashboard

This is a web-based dashboard for managing the Venilgem Services Discord bot.

## Features

- **Dashboard Overview**: View bot status, server statistics, and recent activity
- **Settings Management**: Configure bot settings through a web interface
- **Logs Viewer**: Monitor bot activity and events
- **User Authentication**: Secure login system for authorized access

## Setup

1. Make sure all dependencies are installed:
   ```
   npm install
   ```

2. Configure environment variables in `.env`:
   - `DASHBOARD_PORT`: Port for the dashboard server (default: 3000)
   - `SESSION_SECRET`: Secret key for session management

3. Start the bot and dashboard:
   ```
   npm start
   ```

   Or start just the dashboard:
   ```
   npm run dashboard
   ```

## Access

- **Dashboard**: http://localhost:3000 (or your configured port)
- **Default Login**: admin / admin123

## Security

For production use, make sure to:
1. Change the default admin password
2. Set a strong SESSION_SECRET
3. Use HTTPS in production
4. Implement proper user management

## API Integration

The dashboard integrates with the Discord bot through:
- Shared environment variables
- Real-time status updates
- Log aggregation

For any issues or feature requests, please contact the development team.
