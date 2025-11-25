const { Client, GatewayIntentBits } = require('discord.js');
const cron = require('node-cron');
const express = require('express');

// Configuration
const CONFIG = {
    TOKEN: 'YOUR_BOT_TOKEN_HERE',
    GUILD_ID: 'YOUR_GUILD_ID_HERE',
    ROLE_ID: 'YOUR_ROLE_ID_HERE',
    BOT_ROLE_ID: 'YOUR_BOT_ROLE_ID_HERE',
    // Cron expression for 12:01 AM daily (1 0 * * *)
    CRON_SCHEDULE: '1 0 * * *'
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
        // const channel = await guild.channels.fetch('CHANNEL_ID_HERE');
        // await channel.send(`🎉 ${randomMember} has been selected for the daily role!`);

    } catch (error) {
        console.error('Error assigning role:', error);
    }
}

// Bot ready event
client.once('ready', async () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);

    // Assign bot its own role
    try {
        const guild = await client.guilds.fetch(CONFIG.GUILD_ID);
        const botMember = await guild.members.fetch(client.user.id);
        const botRole = await guild.roles.fetch(CONFIG.BOT_ROLE_ID);

        if (botRole && !botMember.roles.cache.has(CONFIG.BOT_ROLE_ID)) {
            await botMember.roles.add(botRole);
            console.log(`✅ Bot assigned role: ${botRole.name}`);
        }
    } catch (error) {
        console.error('Error assigning bot role:', error);
    }

    console.log(`⏰ Cron job scheduled for 12:01 AM daily`);

    // Schedule the cron job
    cron.schedule(CONFIG.CRON_SCHEDULE, () => {
        console.log('🕐 Running daily role assignment...');
        assignRandomRole();
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