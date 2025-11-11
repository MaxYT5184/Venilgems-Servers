const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'venilgem-dashboard-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Simple in-memory user storage (in production, use a database)
const users = [
  {
    id: 1,
    username: 'admin',
    // Password is 'admin123' hashed with bcrypt
    password: '$2b$10$87gTsCqxHiirbGxgq9Hzt.CHf9tynySv0VSMk0k4yklfjSIZMvlmC' // bcrypt hash of 'admin123'
  }
];

// In-memory storage for logs (in production, use a database)
let botLogs = [];

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Routes
app.get('/', requireAuth, (req, res) => {
  res.render('dashboard');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Find user
  const user = users.find(u => u.username === username);
  
  if (user && await bcrypt.compare(password, user.password)) {
    req.session = req.session || {};
    req.session.userId = user.id;
    res.redirect('/');
  } else {
    res.render('login', { error: 'Invalid username or password' });
  }
});

app.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

app.get('/settings', requireAuth, (req, res) => {
  // Load current settings from environment variables
  const settings = {
    discordToken: process.env.DISCORD_TOKEN ? '********' : '',
    clientId: process.env.CLIENT_ID || '',
    guildId: process.env.GUILD_ID || '',
    logChannelId: process.env.LOG_CHANNEL_ID || '',
    welcomeChannelId: process.env.WELCOME_CHANNEL_ID || '',
    giveawayChannelId: process.env.GIVEAWAY_CHANNEL_ID || '',
    adminPassword: process.env.ADMIN_PASSWORD ? '********' : '',
    memberRoleId: process.env.MEMBER_ROLE_ID || '',
    dashboardPort: process.env.DASHBOARD_PORT || '3000'
  };
  
  res.render('settings', { settings });
});

app.get('/logs', requireAuth, (req, res) => {
  // Send real logs (this would come from a database in production)
  res.render('logs', { logs: botLogs });
});

app.get('/users', requireAuth, (req, res) => {
  // In a real implementation with a database, you would fetch users here
  res.render('users', { users: [] });
});

// API endpoint to get real-time data
app.get('/api/stats', (req, res) => {
  const stats = {
    serverStatus: 'Online',
    memberCount: 0, // This would come from your bot
    commandCount: 12,
    uptime: 0 // This would come from your bot
  };
  
  res.json(stats);
});

// Start server
app.listen(PORT, () => {
  console.log(`Dashboard server running on http://localhost:${PORT}`);
});

module.exports = app;
