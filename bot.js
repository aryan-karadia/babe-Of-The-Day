const { Client, GatewayIntentBits } = require('discord.js');
const cron = require('node-cron');
const express = require('express');
const { config } = require('dotenv');


config(); // Load environment variables from .env file
// Configuration
const CONFIG = {
    TOKEN: process.env.BOT_TOKEN,
    GUILD_ID: process.env.GUILD_ID,
    ROLE_ID: process.env.ROLE_ID,
    BOT_ROLE_ID: process.env.BOT_ROLE_ID,
    CHANNEL_ID: process.env.CHANNEL_ID,
    // Cron expression for 12:01 AM daily (1 0 * * *)
    CRON_SCHEDULE: '1 0 * * *',
    PORT: process.env.PORT || 3000,
    // timezone
    TIMEZONE: process.env.TIMEZONE || 'America/Edmonton' // Default timezone
};

// Create Express app to keep service alive
const app = express();

app.get('/', (req, res) => {
    res.send('Discord bot is running!');
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        bot: client.user ? client.user.tag : 'not logged in'
    });
});

app.listen(CONFIG.PORT, () => {
    console.log(`🌐 Health server running on port ${CONFIG.PORT}`);
});

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// Function to assign role to random user
async function assignRandomRole() {
    try {
        const guild = await client.guilds.fetch(CONFIG.GUILD_ID);
        const role = await guild.roles.fetch(CONFIG.ROLE_ID);

        if (!role) {
            console.error('Role not found!');
            return;
        }

        // Fetch all members
        const members = await guild.members.fetch();

        // Filter out bots and users who already have the role
        const eligibleMembers = members.filter(
            member => !member.user.bot && !member.roles.cache.has(CONFIG.ROLE_ID)
        );

        if (eligibleMembers.size === 0) {
            console.log('No eligible members found.');
            return;
        }

        // Remove role from all previous holders
        const currentHolders = members.filter(
            member => member.roles.cache.has(CONFIG.ROLE_ID)
        );

        for (const [, member] of currentHolders) {
            await member.roles.remove(role);
            console.log(`Removed role from ${member.user.tag}`);
        }

        // Select random member
        const randomMember = eligibleMembers.random();

        // Assign role
        await randomMember.roles.add(role);
        console.log(`✅ Assigned role "${role.name}" to ${randomMember.user.tag}`);


        // Optional: Send a message to a channel
        const channel = await guild.channels.fetch(CONFIG.CHANNEL_ID);
        // error handling if channel not found
        if (!channel || !channel.isTextBased()) {
            console.error('Channel not found or is not text-based!');
            return;
        }
        await channel.send(`Babe of the Day is: <@${randomMember.user.id}>`);

    } catch (error) {
        console.error('Error assigning role:', error);
    }
}

// Bot ready event
client.once('clientReady', async () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);

    console.log(`⏰ Cron job scheduled for 12:01 AM daily`);

    // Schedule the cron job
    cron.schedule(CONFIG.CRON_SCHEDULE, () => {
        console.log('🕐 Running daily role assignment...');
        assignRandomRole();
    }, {
        timezone: CONFIG.TIMEZONE
    });
});

// Error handling
client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login(CONFIG.TOKEN);