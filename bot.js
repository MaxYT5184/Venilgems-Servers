const { Client, GatewayIntentBits, Partials, Events, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField, ChannelType, AuditLogEvent, ButtonBuilder, ButtonStyle } = require('discord.js');
const { config } = require('dotenv');
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
config();

// Make client globally accessible for dashboard
global.client = null;

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration
  ],
  partials: [Partials.Channel]
});

// Make client globally accessible for dashboard
global.client = client;

// In-memory storage for logs
global.botLogs = [];

// Product key data structure
const productKeys = new Map(); // Store valid product keys
const productTypes = [
  '100 followers',
  '1k followers',
  '5k followers',
  '10k followers',
  '50k followers',
  '75k followers',
  '100k followers'
];

// Path to product keys file
const PRODUCT_KEYS_FILE = path.join(__dirname, 'product-keys.json');

// Generate a random product key
function generateProductKey(type) {
  const prefix = type.split(' ')[0].toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  return `${prefix}-${randomPart}-${timestamp}`;
}

// Save product keys to file
async function saveProductKeys() {
  try {
    // Convert Map to array for JSON serialization
    const keysArray = Array.from(productKeys.values());
    const data = JSON.stringify(keysArray, null, 2);
    await fs.writeFile(PRODUCT_KEYS_FILE, data);
    console.log(`Saved ${productKeys.size} product keys to file`);
  } catch (error) {
    console.error('Error saving product keys:', error);
  }
}

// Load product keys from file
async function loadProductKeys() {
  try {
    const data = await fs.readFile(PRODUCT_KEYS_FILE, 'utf8');
    const keysArray = JSON.parse(data);
    
    // Clear existing keys
    productKeys.clear();
    
    // Load keys from file
    keysArray.forEach(keyData => {
      // Convert date strings back to Date objects
      keyData.createdAt = new Date(keyData.createdAt);
      if (keyData.usedAt) {
        keyData.usedAt = new Date(keyData.usedAt);
      }
      productKeys.set(keyData.key, keyData);
    });
    
    console.log(`Loaded ${productKeys.size} product keys from file`);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('Product keys file not found, will generate new keys');
      return false;
    }
    console.error('Error loading product keys:', error);
    return false;
  }
}

// Initialize product keys (100 of each type)
async function initializeProductKeys() {
  console.log('Initializing product keys...');
  
  // Try to load existing keys
  const loaded = await loadProductKeys();
  
  if (!loaded) {
    // Generate 100 keys for each product type if no file exists
    productTypes.forEach(type => {
      for (let i = 0; i < 100; i++) {
        const key = generateProductKey(type);
        productKeys.set(key, {
          type: type,
          key: key,
          createdAt: new Date(),
          used: false,
          usedBy: null,
          usedAt: null
        });
      }
    });
    
    // Save the newly generated keys
    await saveProductKeys();
    console.log(`Generated and saved ${productKeys.size} product keys`);
  }
}

// Initialize product keys on startup
initializeProductKeys();

// Create dashboard server
const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
const session = require('express-session');
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
    discordToken: process.env.DISCORD_TOKEN || '',
    clientId: process.env.CLIENT_ID || '',
    guildId: process.env.GUILD_ID || '',
    logChannelId: process.env.LOG_CHANNEL_ID || '',
    welcomeChannelId: process.env.WELCOME_CHANNEL_ID || '',
    giveawayChannelId: process.env.GIVEAWAY_CHANNEL_ID || '',
    adminPassword: process.env.ADMIN_PASSWORD || '',
    memberRoleId: process.env.MEMBER_ROLE_ID || '',
    dashboardPort: process.env.DASHBOARD_PORT || '3000'
  };
  
  res.render('settings', { settings });
});

app.get('/logs', requireAuth, (req, res) => {
  // Send real logs (this would come from the global log storage)
  res.render('logs', { logs: global.botLogs || [] });
});

app.get('/users', requireAuth, async (req, res) => {
  try {
    // Get guild members
    const guild = global.client.guilds.cache.first();
    if (!guild) {
      return res.render('users', { users: [], error: 'Bot is not in any guild' });
    }
    
    // Fetch members (limited to 100 for performance)
    const members = await guild.members.fetch({ limit: 100 });
    const users = members.map(member => ({
      id: member.user.id,
      username: member.user.username,
      discriminator: member.user.discriminator,
      avatar: member.user.displayAvatarURL(),
      roles: member.roles.cache.map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor
      })),
      joinedAt: member.joinedAt,
      isBot: member.user.bot,
      isTimeout: member.isCommunicationDisabled(),
      timeoutUntil: member.communicationDisabledUntil
    }));
    
    res.render('users', { users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.render('users', { users: [], error: 'Failed to fetch users' });
  }
});

app.post('/users/:userId/:action', requireAuth, async (req, res) => {
  try {
    const { userId, action } = req.params;
    const { reason, duration } = req.body;
    
    const guild = global.client.guilds.cache.first();
    if (!guild) {
      return res.json({ success: false, error: 'Bot is not in any guild' });
    }
    
    const member = await guild.members.fetch(userId);
    if (!member) {
      return res.json({ success: false, error: 'User not found' });
    }
    
    switch (action) {
      case 'ban':
        await member.ban({ reason });
        logEvent('info', `User ${member.user.tag} banned by dashboard`);
        break;
      case 'kick':
        await member.kick(reason);
        logEvent('info', `User ${member.user.tag} kicked by dashboard`);
        break;
      case 'timeout':
        const timeoutDuration = parseInt(duration) * 60 * 1000; // Convert minutes to milliseconds
        await member.timeout(timeoutDuration, reason);
        logEvent('info', `User ${member.user.tag} timed out by dashboard for ${duration} minutes`);
        break;
      case 'untimeout':
        await member.timeout(null, reason);
        logEvent('info', `User ${member.user.tag} timeout removed by dashboard`);
        break;
      case 'warn':
        // In a real implementation, you would store warnings in a database
        logEvent('warn', `User ${member.user.tag} warned by dashboard: ${reason}`);
        break;
      default:
        return res.json({ success: false, error: 'Invalid action' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error performing user action:', error);
    res.json({ success: false, error: error.message });
  }
});

// Start dashboard server
app.listen(PORT, () => {
  console.log(`Dashboard server running on http://localhost:${PORT}`);
});

// Store active giveaways
const giveaways = new Map();

// Store cooldowns for ping command (user ID -> timestamp)
const pingCooldowns = new Map();

// Cooldown duration (5 minutes)
const PING_COOLDOWN = 5 * 60 * 1000;

// Function to send logs to the log channel
function sendLog(embed) {
  const logChannelId = process.env.LOG_CHANNEL_ID;
  if (logChannelId) {
    const logChannel = client.channels.cache.get(logChannelId);
    if (logChannel) {
      return logChannel.send({ embeds: [embed] });
    }
  }
  return null;
}

// Function to send logs to both Discord and dashboard
function logEvent(level, message, embed = null) {
  // Send to dashboard if available
  if (global.botLogs) {
    global.botLogs.unshift({
      timestamp: new Date(),
      level: level,
      message: message
    });
    
    // Keep only the last 100 logs
    if (global.botLogs.length > 100) {
      global.botLogs = global.botLogs.slice(0, 100);
    }
  }
  
  // Send to Discord if embed is provided
  if (embed) {
    sendLog(embed);
  }
}

// Function to send welcome messages
function sendWelcome(embed) {
  const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
  if (welcomeChannelId) {
    const welcomeChannel = client.channels.cache.get(welcomeChannelId);
    if (welcomeChannel) {
      return welcomeChannel.send({ embeds: [embed] });
    }
  }
  return null;
}

// Function to send giveaways
function sendGiveaway(options) {
  const giveawayChannelId = process.env.GIVEAWAY_CHANNEL_ID;
  if (giveawayChannelId) {
    const giveawayChannel = client.channels.cache.get(giveawayChannelId);
    if (giveawayChannel) {
      return giveawayChannel.send(options);
    }
  }
  return null;
}

// Ticket dropdown menu component
class TicketSelectMenu {
  static get() {
    return new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ticketType')
          .setPlaceholder('Select a ticket type...')
          .addOptions(
            {
              label: 'Purchasing',
              description: 'Need help with a purchase',
              emoji: '💰',
              value: 'purchasing',
            },
            {
              label: 'Support',
              description: 'Technical support',
              emoji: '🔧',
              value: 'support',
            },
            {
              label: 'Questions',
              description: 'General questions',
              emoji: '❓',
              value: 'questions',
            },
            {
              label: "Didn't get account",
              description: 'Account delivery issues (1+ days)',
              emoji: '⏰',
              value: 'account_issues',
            }
          )
      );
  }
}

// Giveaway button component
class GiveawayButtons {
  static get() {
    return new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('giveawayEnter')
          .setLabel('Enter Giveaway')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('giveawayLeave')
          .setLabel('Leave Giveaway')
          .setStyle(ButtonStyle.Secondary)
      );
  }
}


// Handle message events
client.on(Events.MessageCreate, async message => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Log message
  const logEmbed = new EmbedBuilder()
    .setTitle('Message Log')
    .setDescription(`**Author:** ${message.author}
**Channel:** ${message.channel}
**Content:** ${message.content}`)
    .setColor(0x00FF00)
    .setTimestamp();
  logEvent('info', `Message from ${message.author.tag} in #${message.channel.name}: ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`, logEmbed);
});

// Handle member join events
client.on(Events.GuildMemberAdd, async member => {
  // Log member join
  const logEmbed = new EmbedBuilder()
    .setTitle('Member Joined')
    .setDescription(`${member} (${member.user.tag}) joined the server.`)
    .setColor(0x0000FF)
    .setTimestamp();
  logEvent('info', `Member ${member.user.tag} joined the server`, logEmbed);
  
  // Auto-role assignment
  try {
    const roleId = process.env.MEMBER_ROLE_ID;
    if (roleId) {
      const role = member.guild.roles.cache.get(roleId);
      if (role) {
        await member.roles.add(role);
        
        // Log role assignment
        const roleLogEmbed = new EmbedBuilder()
          .setTitle('Auto-Role Assigned')
          .setDescription(`${member} (${member.user.tag}) was automatically assigned the ${role.name} role.`)
          .setColor(0x00FF00)
          .setTimestamp();
        logEvent('info', `Auto-role assigned to ${member.user.tag}`, roleLogEmbed);
      }
    }
  } catch (error) {
    console.error('Error assigning auto-role:', error);
    
    // Log role assignment error
    const errorLogEmbed = new EmbedBuilder()
      .setTitle('Auto-Role Error')
      .setDescription(`Failed to assign auto-role to ${member} (${member.user.tag}): ${error.message}`)
      .setColor(0xFF0000)
      .setTimestamp();
    logEvent('error', `Failed to assign auto-role to ${member.user.tag}: ${error.message}`, errorLogEmbed);
  }
  
  // Send welcome message to channel
  const welcomeEmbed = new EmbedBuilder()
    .setTitle('Welcome to Our Server!')
    .setDescription(`Hello ${member}! Welcome to our community! 🎉\n\nWe're glad to have you here. Please take a moment to read our rules and enjoy your stay!\n\n**Member Count:** ${member.guild.memberCount}`)
    .setColor(0x00FF00)
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp()
    .setFooter({ text: 'Venilgem Services', iconURL: client.user.displayAvatarURL() });
  
  sendWelcome(welcomeEmbed);
});

// Handle member leave events
client.on(Events.GuildMemberRemove, async member => {
  // Log member leave
  const logEmbed = new EmbedBuilder()
    .setTitle('Member Left')
    .setDescription(`${member} (${member.user.tag}) left the server.`)
    .setColor(0xFF0000)
    .setTimestamp();
  logEvent('info', `Member ${member.user.tag} left the server`, logEmbed);
});

// Handle voice state updates
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  // Log voice channel changes
  if (oldState.channelId !== newState.channelId) {
    if (newState.channelId) {
      // User joined a voice channel
      const logEmbed = new EmbedBuilder()
        .setTitle('Voice Channel Join')
        .setDescription(`${newState.member} joined voice channel <#${newState.channelId}>`)
        .setColor(0x800080)
        .setTimestamp();
      logEvent('info', `${newState.member.user.tag} joined voice channel #${newState.channel?.name || newState.channelId}`, logEmbed);
    } else if (oldState.channelId) {
      // User left a voice channel
      const logEmbed = new EmbedBuilder()
        .setTitle('Voice Channel Leave')
        .setDescription(`${oldState.member} left voice channel <#${oldState.channelId}>`)
        .setColor(0xFFA500)
        .setTimestamp();
      logEvent('info', `${oldState.member.user.tag} left voice channel #${oldState.channel?.name || oldState.channelId}`, logEmbed);
    }
  }
});

// Handle channel create events
client.on(Events.ChannelCreate, async channel => {
  const logEmbed = new EmbedBuilder()
    .setTitle('Channel Created')
    .setDescription(`**Channel:** ${channel}
**Type:** ${channel.type}
**ID:** ${channel.id}`)
    .setColor(0x00FF00)
    .setTimestamp();
  logEvent('info', `Channel #${channel.name} created`, logEmbed);
});

// Handle channel delete events
client.on(Events.ChannelDelete, async channel => {
  const logEmbed = new EmbedBuilder()
    .setTitle('Channel Deleted')
    .setDescription(`**Channel Name:** #${channel.name}
**Type:** ${channel.type}
**ID:** ${channel.id}`)
    .setColor(0xFF0000)
    .setTimestamp();
  logEvent('info', `Channel #${channel.name} deleted`, logEmbed);
});

// Handle role create events
client.on(Events.GuildRoleCreate, async role => {
  const logEmbed = new EmbedBuilder()
    .setTitle('Role Created')
    .setDescription(`**Role:** ${role}
**ID:** ${role.id}
**Color:** ${role.hexColor}`)
    .setColor(0x00FF00)
    .setTimestamp();
  logEvent('info', `Role ${role.name} created`, logEmbed);
});

// Handle role delete events
client.on(Events.GuildRoleDelete, async role => {
  const logEmbed = new EmbedBuilder()
    .setTitle('Role Deleted')
    .setDescription(`**Role Name:** ${role.name}
**ID:** ${role.id}`)
    .setColor(0xFF0000)
    .setTimestamp();
  logEvent('info', `Role ${role.name} deleted`, logEmbed);
});

// Handle role update events
client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
  const logEmbed = new EmbedBuilder()
    .setTitle('Role Updated')
    .setDescription(`**Role:** ${newRole}
**ID:** ${newRole.id}`)
    .setColor(0xFFFF00)
    .setTimestamp();
  logEvent('info', `Role ${newRole.name} updated`, logEmbed);
});

// Handle guild ban events
client.on(Events.GuildBanAdd, async ban => {
  const logEmbed = new EmbedBuilder()
    .setTitle('User Banned')
    .setDescription(`**User:** ${ban.user}
**ID:** ${ban.user.id}
**Tag:** ${ban.user.tag}`)
    .setColor(0xFF0000)
    .setTimestamp();
  logEvent('info', `User ${ban.user.tag} banned`, logEmbed);
});

// Handle guild unban events
client.on(Events.GuildBanRemove, async ban => {
  const logEmbed = new EmbedBuilder()
    .setTitle('User Unbanned')
    .setDescription(`**User:** ${ban.user}
**ID:** ${ban.user.id}
**Tag:** ${ban.user.tag}`)
    .setColor(0x00FF00)
    .setTimestamp();
  logEvent('info', `User ${ban.user.tag} unbanned`, logEmbed);
});

// Handle interaction events (slash commands and buttons)
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu() && !interaction.isButton()) return;
  
  
  // Handle giveaway buttons
  if (interaction.isButton()) {
    if (interaction.customId === 'giveawayEnter') {
      // Find the giveaway this button is for
      let giveawayId = null;
      for (const [id, giveaway] of giveaways) {
        if (giveaway.messageId === interaction.message.id) {
          giveawayId = id;
          break;
        }
      }
      
      if (giveawayId) {
        const giveaway = giveaways.get(giveawayId);
        
        // Check if user is already entered
        if (giveaway.participants.includes(interaction.user.id)) {
          return await interaction.reply({ content: 'You are already entered in this giveaway!', flags: [1 << 6] });
        }
        
        // Add user to participants
        giveaway.participants.push(interaction.user.id);
        
        // Update the embed
        const updatedEmbed = new EmbedBuilder()
          .setTitle(giveaway.title)
          .setDescription(`React with the button to enter!\n\n**Prize:** ${giveaway.prize}\n**Winners:** ${giveaway.winners}\n**Ends:** <t:${Math.floor(giveaway.endTime / 1000)}:R>\n\n**Participants:** ${giveaway.participants.length}`)
          .setColor(0x0099FF)
          .setTimestamp();
        
        await interaction.update({ embeds: [updatedEmbed] });
        await interaction.followUp({ content: 'You have been entered into the giveaway!', flags: [1 << 6] });
      } else {
        await interaction.reply({ content: 'This giveaway has ended or is no longer active.', flags: [1 << 6] });
      }
      return;
    } else if (interaction.customId === 'giveawayLeave') {
      // Find the giveaway this button is for
      let giveawayId = null;
      for (const [id, giveaway] of giveaways) {
        if (giveaway.messageId === interaction.message.id) {
          giveawayId = id;
          break;
        }
      }
      
      if (giveawayId) {
        const giveaway = giveaways.get(giveawayId);
        
        // Check if user is entered
        const index = giveaway.participants.indexOf(interaction.user.id);
        if (index === -1) {
          return await interaction.reply({ content: 'You are not entered in this giveaway!', flags: [1 << 6] });
        }
        
        // Remove user from participants
        giveaway.participants.splice(index, 1);
        
        // Update the embed
        const updatedEmbed = new EmbedBuilder()
          .setTitle(giveaway.title)
          .setDescription(`React with the button to enter!\n\n**Prize:** ${giveaway.prize}\n**Winners:** ${giveaway.winners}\n**Ends:** <t:${Math.floor(giveaway.endTime / 1000)}:R>\n\n**Participants:** ${giveaway.participants.length}`)
          .setColor(0x0099FF)
          .setTimestamp();
        
        await interaction.update({ embeds: [updatedEmbed] });
        await interaction.followUp({ content: 'You have been removed from the giveaway.', flags: [1 << 6] });
      } else {
        await interaction.reply({ content: 'This giveaway has ended or is no longer active.', flags: [1 << 6] });
      }
      return;
    }
  }
  
  // Handle ticket creation via dropdown
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticketType') {
    await interaction.deferReply({ flags: [1 << 6] });
    
    const selectedOption = interaction.values[0];
    const guild = interaction.guild;
    
    // Get or create ticket category
    let category = guild.channels.cache.find(c => c.name === 'Tickets' && c.type === ChannelType.GuildCategory);
    if (!category) {
      category = await guild.channels.create({
        name: 'Tickets',
        type: ChannelType.GuildCategory
      });
    }
    
    // Create ticket channel
    const ticketChannel = await guild.channels.create({
      name: `ticket-${selectedOption}-${interaction.user.id}`,
      type: ChannelType.GuildText,
      parent: category.id,
      topic: `Ticket for ${interaction.user.tag} - ${selectedOption}`
    });
    
    // Set permissions
    await ticketChannel.permissionOverwrites.create(interaction.user, {
      ViewChannel: true,
      SendMessages: true
    });
    
    await ticketChannel.permissionOverwrites.create(guild.roles.everyone, {
      ViewChannel: false
    });
    
    // Add bot permissions
    await ticketChannel.permissionOverwrites.create(client.user, {
      ViewChannel: true,
      SendMessages: true
    });
    
    // Send confirmation to user
    await interaction.editReply({
      content: `Your ticket has been created: ${ticketChannel}`
    });
    
    // Send welcome message in ticket channel
    const optionLabels = {
      'purchasing': 'Purchasing',
      'support': 'Support',
      'questions': 'Questions',
      'account_issues': "Didn't get account"
    };
    
    const welcomeEmbed = new EmbedBuilder()
      .setTitle(`${optionLabels[selectedOption]} Ticket`)
      .setDescription(`Hello ${interaction.user}, thank you for creating a ticket.

**Issue Type:** ${optionLabels[selectedOption]}
A staff member will assist you shortly.`)
      .setColor(0x0000FF)
      .setFooter({ text: 'Venilgem Services Ticket System' });
    
    await ticketChannel.send({
      content: `${interaction.user}`, 
      embeds: [welcomeEmbed]
    });
    
    // Log ticket creation
    const logEmbed = new EmbedBuilder()
      .setTitle('New Ticket Created')
      .setDescription(`**User:** ${interaction.user}
**Type:** ${optionLabels[selectedOption]}
**Channel:** ${ticketChannel}`)
      .setColor(0x800080)
      .setTimestamp();
    sendLog(logEmbed);
    
    return;
  }
  
  // Handle slash commands
  const { commandName } = interaction;
  
  if (commandName === 'ticket') {
    const embed = new EmbedBuilder()
      .setTitle('Venilgem Services Ticket System')
      .setDescription('Please select a ticket type from the dropdown menu below:')
      .setColor(0x0000FF)
      .addFields(
        { name: 'Options', value: '💰 Purchasing\n🔧 Support\n❓ Questions\n⏰ Didn\'t get account (1+ days)', inline: false }
      );
    
    await interaction.reply({
      embeds: [embed],
      components: [TicketSelectMenu.get()],
      flags: [1 << 6]
    });
  } else if (commandName === 'setup_ticket') {
    const embed = new EmbedBuilder()
      .setTitle('Venilgem Services Ticket System')
      .setDescription('Please select a ticket type from the dropdown menu below:')
      .setColor(0x0000FF)
      .addFields(
        { name: 'Options', value: '💰 Purchasing\n🔧 Support\n❓ Questions\n⏰ Didn\'t get account (1+ days)', inline: false }
      );
    
    await interaction.channel.send({
      embeds: [embed],
      components: [TicketSelectMenu.get()]
    });
    
    await interaction.reply({
      content: 'Ticket system has been set up in this channel!',
      flags: [1 << 6]
    });
  } else if (commandName === 'logs') {
    const logEmbed = new EmbedBuilder()
      .setTitle('Test Log Entry')
      .setDescription(`This is a test log entry sent by ${interaction.user}`)
      .setColor(0xFFA500)
      .setTimestamp();
    
    await sendLog(logEmbed);
    await interaction.reply({
      content: 'Test log entry sent to the log channel!',
      flags: [1 << 6]
    });
  } else if (commandName === 'close_ticket') {
    if (interaction.channel.name.startsWith('ticket-')) {
      // Log ticket closure
      const logEmbed = new EmbedBuilder()
        .setTitle('Ticket Closed')
        .setDescription(`Ticket channel ${interaction.channel} closed by ${interaction.user}`)
        .setColor(0xFF0000)
        .setTimestamp();
      
      await sendLog(logEmbed);
      await interaction.reply('This ticket will be closed in 5 seconds...');
      
      // Close ticket after 5 seconds
      setTimeout(() => {
        interaction.channel.delete().catch(console.error);
      }, 5000);
    } else {
      await interaction.reply({
        content: 'This command can only be used in ticket channels!',
        flags: [1 << 6]
      });
    }
  } else if (commandName === 'ban') {
    // Check permissions
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return await interaction.reply({ content: 'You do not have permission to ban members!', flags: [1 << 6] });
    }
    
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    try {
      const member = await interaction.guild.members.fetch(user.id);
      await member.ban({ reason });
      
      const logEmbed = new EmbedBuilder()
        .setTitle('User Banned')
        .setDescription(`**User:** ${user}\n**Banned by:** ${interaction.user}\n**Reason:** ${reason}`)
        .setColor(0xFF0000)
        .setTimestamp();
      sendLog(logEmbed);
      
      await interaction.reply({ content: `${user.tag} has been banned.`, flags: [1 << 6] });
    } catch (error) {
      await interaction.reply({ content: `Failed to ban ${user.tag}.`, flags: [1 << 6] });
    }
  } else if (commandName === 'kick') {
    // Check permissions
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return await interaction.reply({ content: 'You do not have permission to kick members!', flags: [1 << 6] });
    }
    
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    try {
      const member = await interaction.guild.members.fetch(user.id);
      await member.kick(reason);
      
      const logEmbed = new EmbedBuilder()
        .setTitle('User Kicked')
        .setDescription(`**User:** ${user}\n**Kicked by:** ${interaction.user}\n**Reason:** ${reason}`)
        .setColor(0xFFA500)
        .setTimestamp();
      sendLog(logEmbed);
      
      await interaction.reply({ content: `${user.tag} has been kicked.`, flags: [1 << 6] });
    } catch (error) {
      await interaction.reply({ content: `Failed to kick ${user.tag}.`, flags: [1 << 6] });
    }
  } else if (commandName === 'timeout') {
    // Check permissions
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return await interaction.reply({ content: 'You do not have permission to timeout members!', flags: [1 << 6] });
    }
    
    const user = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration') || 3600; // Default 1 hour
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    try {
      const member = await interaction.guild.members.fetch(user.id);
      await member.timeout(duration * 1000, reason); // Convert to milliseconds
      
      const logEmbed = new EmbedBuilder()
        .setTitle('User Timed Out')
        .setDescription(`**User:** ${user}\n**Timed out by:** ${interaction.user}\n**Duration:** ${duration} seconds\n**Reason:** ${reason}`)
        .setColor(0xFFFF00)
        .setTimestamp();
      sendLog(logEmbed);
      
      await interaction.reply({ content: `${user.tag} has been timed out for ${duration} seconds.`, flags: [1 << 6] });
    } catch (error) {
      await interaction.reply({ content: `Failed to timeout ${user.tag}.`, flags: [1 << 6] });
    }
  } else if (commandName === 'giveaway_start') {
    // Check permissions
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return await interaction.reply({ content: 'You do not have permission to start giveaways!', flags: [1 << 6] });
    }
    
    const prize = interaction.options.getString('prize');
    const duration = interaction.options.getInteger('duration'); // in minutes
    const winners = interaction.options.getInteger('winners') || 1;
    
    try {
      // Create the giveaway embed
      const endTime = Date.now() + (duration * 60 * 1000);
      const giveawayEmbed = new EmbedBuilder()
        .setTitle('🎉 Giveaway! 🎉')
        .setDescription(`React with the button to enter!\n\n**Prize:** ${prize}\n**Winners:** ${winners}\n**Ends:** <t:${Math.floor(endTime / 1000)}:R>\n\n**Participants:** 0`)
        .setColor(0x0099FF)
        .setTimestamp();
      
      // Send the giveaway message
      const giveawayMessage = await sendGiveaway({ embeds: [giveawayEmbed], components: [GiveawayButtons.get()] });
      
      if (!giveawayMessage) {
        return await interaction.reply({ content: 'Failed to send giveaway message. Please check the giveaway channel configuration.', flags: [1 << 6] });
      }
      
      // Store the giveaway
      const giveawayId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      giveaways.set(giveawayId, {
        messageId: giveawayMessage.id,
        channelId: giveawayMessage.channel.id,
        guildId: interaction.guild.id,
        prize: prize,
        winners: winners,
        endTime: endTime,
        participants: [],
        title: '🎉 Giveaway! 🎉',
        hostedBy: interaction.user.id
      });
      
      // Schedule the giveaway end
      setTimeout(async () => {
        endGiveaway(giveawayId);
      }, duration * 60 * 1000);
      
      await interaction.reply({ content: `Giveaway started! Message ID: ${giveawayMessage.id}`, flags: [1 << 6] });
    } catch (error) {
      console.error('Error starting giveaway:', error);
      await interaction.reply({ content: 'Failed to start giveaway. Please try again.', flags: [1 << 6] });
    }
  } else if (commandName === 'giveaway_end') {
    try {
      // Check permissions
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return await interaction.reply({ content: 'You do not have permission to end giveaways!', flags: [1 << 6] });
      }
      
      const messageId = interaction.options.getString('message_id');
      
      // Find the giveaway
      let giveawayId = null;
      for (const [id, giveaway] of giveaways) {
        if (giveaway.messageId === messageId) {
          giveawayId = id;
          break;
        }
      }
      
      if (!giveawayId) {
        return await interaction.reply({ content: 'Giveaway not found or already ended.', flags: [1 << 6] });
      }
      
      // End the giveaway immediately
      endGiveaway(giveawayId);
      await interaction.reply({ content: 'Giveaway ended!', flags: [1 << 6] });
    } catch (error) {
      console.error('Error ending giveaway:', error);
      await interaction.reply({ content: 'Failed to end giveaway. Please try again.', flags: [1 << 6] });
    }
  } else if (commandName === 'giveaway_reroll') {
    try {
      // Check permissions
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return await interaction.reply({ content: 'You do not have permission to reroll giveaways!', flags: [1 << 6] });
      }
      
      const messageId = interaction.options.getString('message_id');
      
      // Find the giveaway
      let giveawayId = null;
      for (const [id, giveaway] of giveaways) {
        if (giveaway.messageId === messageId) {
          giveawayId = id;
          break;
        }
      }
      
      if (!giveawayId) {
        return await interaction.reply({ content: 'Giveaway not found.', flags: [1 << 6] });
      }
      
      // Reroll winners
      const giveaway = giveaways.get(giveawayId);
      if (giveaway.participants.length === 0) {
        return await interaction.reply({ content: 'No participants in this giveaway.', flags: [1 << 6] });
      }
      
      // Select new winners
      const winners = [];
      const participants = [...giveaway.participants];
      
      for (let i = 0; i < Math.min(giveaway.winners, participants.length); i++) {
        const randomIndex = Math.floor(Math.random() * participants.length);
        winners.push(participants[randomIndex]);
        participants.splice(randomIndex, 1);
      }
      
      // Announce new winners
      const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
      const channel = client.channels.cache.get(giveaway.channelId);
      if (channel) {
        await channel.send(`🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}** (Reroll)!`);
      }
      
      await interaction.reply({ content: `Rerolled winners: ${winnerMentions}`, flags: [1 << 6] });
    } catch (error) {
      console.error('Error rerolling giveaway:', error);
      await interaction.reply({ content: 'Failed to reroll giveaway. Please try again.', flags: [1 << 6] });
    }
  } else if (commandName === 'restock') {
    try {
      // Check permissions
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return await interaction.reply({ content: 'You do not have permission to announce restocks!', flags: [1 << 6] });
      }
      
      const channelId = interaction.options.getString('channel_id');
      const amount = interaction.options.getInteger('amount');
      
      // Validate channel ID
      const channel = client.channels.cache.get(channelId);
      if (!channel) {
        return await interaction.reply({ content: 'Invalid channel ID provided.', flags: [1 << 6] });
      }
      
      // Create advanced modern restock embed
      const restockEmbed = new EmbedBuilder()
        .setTitle('🚨 **RESTOCK ALERT** 🚨')
        .setDescription(`🔥 **HOT RESTOCK** 🔥\n\n📦 **${amount}x** New items just dropped!\n\n⚡ **Limited Quantity Available** ⚡\n\n🛒 **First Come, First Served** 🛒`)
        .setColor(0x00FF00)
        .setTimestamp()
        .setFooter({ text: 'Venilgem Services Restock System', iconURL: client.user.displayAvatarURL() })
        .setThumbnail('https://cdn.discordapp.com/attachments/1437275449917964330/1437275449917964330/restock.png')
        .addFields(
          { name: '📍 Location', value: `#${channel.name}`, inline: true },
          { name: '⏰ Restocked At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: '💎 Status', value: '🟢 Available Now', inline: true },
          { name: '⚡ Speed', value: '⚡ Lightning Fast', inline: true },
          { name: '\u200B', value: '\u200B', inline: true }
        );
      
      // Send restock announcement to the specified channel with everyone ping
      const restockMessage = await channel.send({ content: '@everyone', embeds: [restockEmbed] });
      
      // Add reactions for quick actions
      await restockMessage.react('🛒');
      await restockMessage.react('⏰');
      await restockMessage.react('✅');
      
      // Create confirmation embed
      const confirmEmbed = new EmbedBuilder()
        .setTitle('✅ Restock Announcement Sent')
        .setDescription(`Successfully announced restock of **${amount}** items in ${channel}\n\n[View Announcement](${restockMessage.url})`)
        .setColor(0x00FF00)
        .setTimestamp();
      
      await interaction.reply({ embeds: [confirmEmbed], flags: [1 << 6] });
      
      // Log the restock
      const logEmbed = new EmbedBuilder()
        .setTitle('Restock Announced')
        .setDescription(`**User:** ${interaction.user}\n**Channel:** ${channel}\n**Amount:** ${amount}\n**Message:** [View](${restockMessage.url})`)
        .setColor(0x00FF00)
        .setTimestamp();
      sendLog(logEmbed);
    } catch (error) {
      console.error('Error announcing restock:', error);
      await interaction.reply({ content: 'Failed to announce restock. Please try again.', flags: [1 << 6] });
    }
  } else if (commandName === 'pingeveryone') {
    try {
      // Check if user is on cooldown
      const lastPing = pingCooldowns.get(interaction.user.id);
      const now = Date.now();
      
      if (lastPing && (now - lastPing) < PING_COOLDOWN) {
        const remaining = PING_COOLDOWN - (now - lastPing);
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        return await interaction.reply({ 
          content: `You're on cooldown! Please wait ${minutes}m ${seconds}s before using this command again.`, 
          flags: [1 << 6] 
        });
      }
      
      const password = interaction.options.getString('password');
      const message = interaction.options.getString('message');
      
      // Check password (you should set this in your .env file)
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        return await interaction.reply({ 
          content: 'Admin password not configured. Please contact the bot owner.', 
          flags: [1 << 6] 
        });
      }
      
      if (password !== adminPassword) {
        return await interaction.reply({ 
          content: 'Invalid password!', 
          flags: [1 << 6] 
        });
      }
      
      // Set cooldown
      pingCooldowns.set(interaction.user.id, now);
      
      // Get all guild members
      const members = await interaction.guild.members.fetch();
      
      // Filter out bots and send messages one by one
      const humanMembers = members.filter(member => !member.user.bot);
      
      // Create embed for the message
      const pingEmbed = new EmbedBuilder()
        .setTitle('📢 Server Announcement')
        .setDescription(message)
        .setColor(0xFF0000)
        .setTimestamp()
        .setFooter({ text: `Sent by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
      
      // Send confirmation to the admin
      const confirmEmbed = new EmbedBuilder()
        .setTitle('✅ Mass Message Sent')
        .setDescription(`Sending message to ${humanMembers.size} members...\n\n**Message:** ${message}`)
        .setColor(0x00FF00)
        .setTimestamp();
      
      await interaction.reply({ embeds: [confirmEmbed], flags: [1 << 6] });
      
      // Send messages with a delay to avoid rate limits
      let sentCount = 0;
      const errors = [];
      
      for (const [id, member] of humanMembers) {
        try {
          await member.send({ embeds: [pingEmbed] });
          sentCount++;
          
          // Add a small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          errors.push({ user: member.user.tag, error: error.message });
        }
      }
      
      // Send summary to log channel
      const logEmbed = new EmbedBuilder()
        .setTitle('Mass Message Sent')
        .setDescription(`**Sent by:** ${interaction.user}\n**Message:** ${message}\n**Recipients:** ${sentCount}/${humanMembers.size}`)
        .setColor(0x00FF00)
        .setTimestamp();
      
      if (errors.length > 0) {
        logEmbed.addFields({ 
          name: 'Errors', 
          value: `Failed to send to ${errors.length} users.`, 
          inline: false 
        });
      }
      
      sendLog(logEmbed);
      
    } catch (error) {
      console.error('Error sending mass message:', error);
      // Remove from cooldown if there was an error
      pingCooldowns.delete(interaction.user.id);
      await interaction.followUp({ content: 'Failed to send mass message. Please try again.', flags: [1 << 6] });
    }
  } else if (commandName === 'pullmembers') {
    try {
      // Check permissions
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return await interaction.reply({ content: 'You do not have permission to use this command!', flags: [1 << 6] });
      }
      
      // Get all guild members
      const members = await interaction.guild.members.fetch();
      
      // Count total members
      const totalMembers = members.size;
      
      // Create response embed
      const pullEmbed = new EmbedBuilder()
        .setTitle('Server Members Report')
        .setDescription(`Server members analysis completed.`)
        .setColor(0x00FF00)
        .addFields(
          { name: 'Total Members', value: `${totalMembers}`, inline: true },
          { name: 'Online Members', value: `${members.filter(m => m.presence?.status !== 'offline').size}`, inline: true },
          { name: 'Bot Accounts', value: `${members.filter(m => m.user.bot).size}`, inline: true }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [pullEmbed], flags: [1 << 6] });
      
      // Log the action
      logEvent('info', `Pull members command executed by ${interaction.user.tag}`);
    } catch (error) {
      console.error('Error in pullmembers command:', error);
      await interaction.reply({ content: 'Failed to execute pullmembers command. Please try again.', flags: [1 << 6] });
    }
  } else if (commandName === 'check-product-key') {
    try {
      const productKey = interaction.options.getString('key');
      
      // Check if the product key exists
      const productInfo = productKeys.get(productKey);
      
      if (productInfo) {
        // Valid product key
        const keyEmbed = new EmbedBuilder()
          .setTitle('✅ Valid Product Key')
          .setDescription(`This is a valid product key!`)
          .setColor(0x00FF00)
          .addFields(
            { name: 'Product Type', value: productInfo.type, inline: true },
            { name: 'Key', value: `||${productKey}||`, inline: true },
            { name: 'Status', value: productInfo.used ? '🔴 Used' : '🟢 Unused', inline: true },
            { name: 'Created', value: `<t:${Math.floor(productInfo.createdAt.getTime() / 1000)}:R>`, inline: true }
          )
          .setTimestamp();
        
        // If the key has been used, show who used it
        if (productInfo.used) {
          keyEmbed.addFields(
            { name: 'Used By', value: productInfo.usedBy || 'Unknown', inline: true },
            { name: 'Used At', value: `<t:${Math.floor(productInfo.usedAt.getTime() / 1000)}:R>`, inline: true }
          );
        }
        
        await interaction.reply({ embeds: [keyEmbed], flags: [1 << 6] });
      } else {
        // Invalid product key
        const errorEmbed = new EmbedBuilder()
          .setTitle('❌ Invalid Product Key')
          .setDescription('This is not a valid product key.')
          .setColor(0xFF0000)
          .addFields(
            { name: 'Key Provided', value: `||${productKey}||` },
            { name: 'Status', value: 'This key does not exist in our database.' }
          )
          .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: [1 << 6] });
      }
      
      // Log the action
      logEvent('info', `Product key check performed by ${interaction.user.tag} for key: ${productKey}`);
      
      // Save keys to file (in case any changes were made)
      await saveProductKeys();
    } catch (error) {
      console.error('Error in check-product-key command:', error);
      await interaction.reply({ content: 'Failed to check product key. Please try again.', flags: [1 << 6] });
    }
  } else if (commandName === 'generate-product-keys') {
    try {
      // Check permissions - only admins can generate keys
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return await interaction.reply({ content: 'You do not have permission to generate product keys!', flags: [1 << 6] });
      }
      
      const productType = interaction.options.getString('type');
      const quantity = interaction.options.getInteger('quantity') || 1;
      
      // Limit quantity to prevent abuse
      if (quantity > 10) {
        return await interaction.reply({ content: 'You can only generate up to 10 keys at a time.', flags: [1 << 6] });
      }
      
      // Generate new keys
      const newKeys = [];
      for (let i = 0; i < quantity; i++) {
        const key = generateProductKey(productType);
        productKeys.set(key, {
          type: productType,
          key: key,
          createdAt: new Date(),
          used: false,
          usedBy: null,
          usedAt: null
        });
        newKeys.push(key);
      }
      
      // Save keys to file
      await saveProductKeys();
      
      // Create embed with generated keys
      const keysEmbed = new EmbedBuilder()
        .setTitle('🔑 Product Keys Generated')
        .setDescription(`Successfully generated ${quantity} ${productType} key(s)`)
        .setColor(0x0099FF)
        .addFields(
          { name: 'Product Type', value: productType, inline: true },
          { name: 'Keys Generated', value: quantity.toString(), inline: true },
          { name: 'Total Keys Now', value: productKeys.size.toString(), inline: true }
        )
        .setTimestamp();
      
      // Add keys to embed (but hide them for security)
      if (newKeys.length <= 5) {
        // If few keys, show them directly
        keysEmbed.addFields(
          { name: 'Generated Keys', value: newKeys.map((key, index) => `${index + 1}. ||${key}||`).join('\n') }
        );
      } else {
        // If many keys, provide them in a follow-up message
        keysEmbed.addFields(
          { name: 'Generated Keys', value: `See follow-up message for your keys.` }
        );
      }
      
      await interaction.reply({ embeds: [keysEmbed], flags: [1 << 6] });
      
      // If we have many keys, send them in a follow-up DM for security
      if (newKeys.length > 5) {
        try {
          const keysList = newKeys.map((key, index) => `${index + 1}. ${key}`).join('\n');
          await interaction.user.send({
            content: `**Generated Product Keys (${productType})**\n\n${keysList}`
          });
        } catch (dmError) {
          // If DM fails, send as follow-up
          await interaction.followUp({ 
            content: `Here are your generated keys:\n${newKeys.map((key, index) => `${index + 1}. ${key}`).join('\n')}`, 
            ephemeral: true 
          });
        }
      }
      
      // Log the action
      logEvent('info', `Generated ${quantity} ${productType} keys for ${interaction.user.tag}`);
    } catch (error) {
      console.error('Error in generate-product-keys command:', error);
      await interaction.reply({ content: 'Failed to generate product keys. Please try again.', flags: [1 << 6] });
    }
  } else if (commandName === 'use-product-key') {
    try {
      // Check permissions - only admins can mark keys as used
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return await interaction.reply({ content: 'You do not have permission to mark product keys as used!', flags: [1 << 6] });
      }
      
      const productKey = interaction.options.getString('key');
      
      // Check if the product key exists
      const productInfo = productKeys.get(productKey);
      
      if (productInfo) {
        if (productInfo.used) {
          // Key already used
          const errorEmbed = new EmbedBuilder()
            .setTitle('⚠️ Key Already Used')
            .setDescription('This product key has already been used.')
            .setColor(0xFFA500)
            .addFields(
              { name: 'Product Type', value: productInfo.type, inline: true },
              { name: 'Key', value: `||${productKey}||`, inline: true },
              { name: 'Used By', value: productInfo.usedBy || 'Unknown', inline: true },
              { name: 'Used At', value: `<t:${Math.floor(productInfo.usedAt.getTime() / 1000)}:R>`, inline: true }
            )
            .setTimestamp();
          
          await interaction.reply({ embeds: [errorEmbed], flags: [1 << 6] });
        } else {
          // Mark key as used
          productInfo.used = true;
          productInfo.usedBy = interaction.user.tag;
          productInfo.usedAt = new Date();
          
          // Save keys to file
          await saveProductKeys();
          
          // Valid product key - now marked as used
          const keyEmbed = new EmbedBuilder()
            .setTitle('✅ Product Key Used')
            .setDescription(`This product key has been successfully marked as used!`)
            .setColor(0x00FF00)
            .addFields(
              { name: 'Product Type', value: productInfo.type, inline: true },
              { name: 'Key', value: `||${productKey}||`, inline: true },
              { name: 'Status', value: '🔴 Used', inline: true },
              { name: 'Used By', value: interaction.user.tag, inline: true },
              { name: 'Used At', value: `<t:${Math.floor(productInfo.usedAt.getTime() / 1000)}:R>`, inline: true }
            )
            .setTimestamp();
          
          await interaction.reply({ embeds: [keyEmbed], flags: [1 << 6] });
        }
      } else {
        // Invalid product key
        const errorEmbed = new EmbedBuilder()
          .setTitle('❌ Invalid Product Key')
          .setDescription('This is not a valid product key.')
          .setColor(0xFF0000)
          .addFields(
            { name: 'Key Provided', value: `||${productKey}||` },
            { name: 'Status', value: 'This key does not exist in our database.' }
          )
          .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: [1 << 6] });
      }
      
      // Log the action
      logEvent('info', `Product key marked as used by ${interaction.user.tag} for key: ${productKey}`);
    } catch (error) {
      console.error('Error in use-product-key command:', error);
      await interaction.reply({ content: 'Failed to mark product key as used. Please try again.', flags: [1 << 6] });
    }
  }
});

// Register slash commands
async function registerCommands() {
  try {
    const { REST, Routes } = require('discord.js');
    const clientId = process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID;
    
    if (!clientId || !guildId) {
      console.error('CLIENT_ID or GUILD_ID not found in environment variables');
      return;
    }
    
    const commands = [
      {
        name: 'ticket',
        description: 'Create a new ticket'
      },
      {
        name: 'setup_ticket',
        description: 'Set up the ticket system in this channel'
      },
      {
        name: 'logs',
        description: 'Send a test log entry'
      },
      {
        name: 'close_ticket',
        description: 'Close the current ticket channel'
      },
      {
        name: 'ban',
        description: 'Ban a user from the server',
        options: [
          {
            name: 'user',
            type: 6, // USER
            description: 'The user to ban',
            required: true
          },
          {
            name: 'reason',
            type: 3, // STRING
            description: 'Reason for the ban',
            required: false
          }
        ]
      },
      {
        name: 'kick',
        description: 'Kick a user from the server',
        options: [
          {
            name: 'user',
            type: 6, // USER
            description: 'The user to kick',
            required: true
          },
          {
            name: 'reason',
            type: 3, // STRING
            description: 'Reason for the kick',
            required: false
          }
        ]
      },
      {
        name: 'timeout',
        description: 'Timeout a user',
        options: [
          {
            name: 'user',
            type: 6, // USER
            description: 'The user to timeout',
            required: true
          },
          {
            name: 'duration',
            type: 4, // INTEGER
            description: 'Duration in seconds (default: 3600)',
            required: false
          },
          {
            name: 'reason',
            type: 3, // STRING
            description: 'Reason for the timeout',
            required: false
          }
        ]
      },
      {
        name: 'giveaway_start',
        description: 'Start a new giveaway',
        options: [
          {
            name: 'prize',
            type: 3, // STRING
            description: 'The prize for the giveaway',
            required: true
          },
          {
            name: 'duration',
            type: 4, // INTEGER
            description: 'Duration in minutes',
            required: true
          },
          {
            name: 'winners',
            type: 4, // INTEGER
            description: 'Number of winners (default: 1)',
            required: false
          }
        ]
      },
      {
        name: 'giveaway_end',
        description: 'End a giveaway early',
        options: [
          {
            name: 'message_id',
            type: 3, // STRING
            description: 'The message ID of the giveaway',
            required: true
          }
        ]
      },
      {
        name: 'giveaway_reroll',
        description: 'Reroll a giveaway winner',
        options: [
          {
            name: 'message_id',
            type: 3, // STRING
            description: 'The message ID of the giveaway',
            required: true
          }
        ]
      },
      {
        name: 'restock',
        description: 'Announce a product restock',
        options: [
          {
            name: 'channel_id',
            type: 3, // STRING
            description: 'The channel ID where the product is restocked',
            required: true
          },
          {
            name: 'amount',
            type: 4, // INTEGER
            description: 'The amount of products restocked',
            required: true
          }
        ]
      },
      {
        name: 'pingeveryone',
        description: 'Send a message to all server members (cooldown protected)',
        options: [
          {
            name: 'password',
            type: 3, // STRING
            description: 'Admin password for authentication',
            required: true
          },
          {
            name: 'message',
            type: 3, // STRING
            description: 'The message to send to all members',
            required: true
          }
        ]
      },
      {
        name: 'pullmembers',
        description: 'Add verified users back to the server'
      },
      {
        name: 'check-product-key',
        description: 'Check if a product key is valid',
        options: [
          {
            name: 'key',
            type: 3, // STRING
            description: 'The product key to check',
            required: true
          }
        ]
      },
      {
        name: 'generate-product-keys',
        description: 'Generate product keys for distribution',
        options: [
          {
            name: 'type',
            type: 3, // STRING
            description: 'Product type (100 followers, 1k followers, etc.)',
            required: true,
            choices: [
              { name: '100 followers', value: '100 followers' },
              { name: '1k followers', value: '1k followers' },
              { name: '5k followers', value: '5k followers' },
              { name: '10k followers', value: '10k followers' },
              { name: '50k followers', value: '50k followers' },
              { name: '75k followers', value: '75k followers' },
              { name: '100k followers', value: '100k followers' }
            ]
          },
          {
            name: 'quantity',
            type: 4, // INTEGER
            description: 'Number of keys to generate (max 10)',
            required: false
          }
        ]
      },
      {
        name: 'use-product-key',
        description: 'Mark a product key as used',
        options: [
          {
            name: 'key',
            type: 3, // STRING
            description: 'The product key to mark as used',
            required: true
          }
        ]
      }
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
    
    // Try to log the error
    try {
      const logEmbed = new EmbedBuilder()
        .setTitle('Command Registration Error')
        .setDescription(`Failed to register commands: ${error.message}`)
        .setColor(0xFF0000)
        .setTimestamp();
      sendLog(logEmbed);
    } catch (logError) {
      console.error('Failed to log command registration error:', logError);
    }
  }
}

// Register commands on startup
client.once(Events.ClientReady, async () => {
  try {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    
    // Set bot status to Idle
    client.user.setPresence({
      status: 'idle',
      activities: [{
        name: 'for restocks 🔍',
        type: 3 // WATCHING
      }]
    });
    
    // Log bot startup
    const logEmbed = new EmbedBuilder()
      .setTitle('Bot Started')
      .setDescription(`${client.user.tag} is now online and ready! Status: Idle`)
      .setColor(0x00FF00)
      .setTimestamp();
    sendLog(logEmbed);
    
    await registerCommands();
  } catch (error) {
    console.error('Error during client ready:', error);
  }
});

// Function to end a giveaway
async function endGiveaway(giveawayId) {
  try {
    const giveaway = giveaways.get(giveawayId);
    if (!giveaway) return;
    
    // Remove the giveaway from the map
    giveaways.delete(giveawayId);
    
    // Get the channel
    const channel = client.channels.cache.get(giveaway.channelId);
    if (!channel) return;
    
    // Fetch the message
    const message = await channel.messages.fetch(giveaway.messageId);
    
    // Select winners
    let winners = [];
    if (giveaway.participants.length > 0) {
      const participants = [...giveaway.participants];
      
      for (let i = 0; i < Math.min(giveaway.winners, participants.length); i++) {
        const randomIndex = Math.floor(Math.random() * participants.length);
        winners.push(participants[randomIndex]);
        participants.splice(randomIndex, 1);
      }
    }
    
    // Create the end embed
    const endEmbed = new EmbedBuilder()
      .setTitle('🎉 Giveaway Ended! 🎉')
      .setDescription(`**Prize:** ${giveaway.prize}\n**Hosted by:** <@${giveaway.hostedBy}>\n**Entries:** ${giveaway.participants.length}`)
      .setColor(0xFF0000)
      .setTimestamp();
    
    if (winners.length > 0) {
      const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
      endEmbed.addFields({ name: 'Winner(s)', value: winnerMentions });
      
      // Send winner announcement
      await channel.send(`🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`);
    } else {
      endEmbed.addFields({ name: 'Winner(s)', value: 'No participants' });
    }
    
    // Update the message
    await message.edit({ embeds: [endEmbed], components: [] });
    
    // Log the giveaway end
    const logEmbed = new EmbedBuilder()
      .setTitle('Giveaway Ended')
      .setDescription(`**Prize:** ${giveaway.prize}\n**Winners:** ${winners.length}\n**Message ID:** ${giveaway.messageId}`)
      .setColor(0xFF0000)
      .setTimestamp();
    sendLog(logEmbed);
  } catch (error) {
    console.error('Error ending giveaway:', error);
    
    // Try to log the error
    try {
      const logEmbed = new EmbedBuilder()
        .setTitle('Giveaway Error')
        .setDescription(`Failed to end giveaway: ${error.message}\nGiveaway ID: ${giveawayId}`)
        .setColor(0xFF0000)
        .setTimestamp();
      sendLog(logEmbed);
    } catch (logError) {
      console.error('Failed to log giveaway error:', logError);
    }
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  console.error('Uncaught exception:', error);
});

// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
