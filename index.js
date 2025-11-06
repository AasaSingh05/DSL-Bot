//imports and requirements setup
require('dotenv').config({ debug: true });
const { REST, Routes } = require('discord.js'); 
const fs = require('fs');
const path = require('path');
const { Jimp, intToRGBA } = require('jimp');

//const global function
const deployCommands = async () => {
    try {
        const commands = [];

        const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(`./commands/${file}`);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            } else {
                console.log(`WARNING: The command at ${file} is missing a required 'data' or 'execute' property.`);
            }
        }
    

    const rest = new REST().setToken(process.env.BOT_TOKEN);

    console.log(`Started refreshing application slash commands globally.`);

    const data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
    );

    console.log('Successfully reloaded all commands!');
    } catch (error) {
        console.error('Error deploying commands:', error)
    }
}


//client vars initialization
const {
    Client,
    GatewayIntentBits,
    Partials,
    Collection,
    ActivityType,
    PresenceUpdateStatus,
    Events,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

//client instance loading
const client = new Client({
    intents : [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
    ],
    partials:[
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember,
        Partials.GuildMessageReactions,
    ]
}); 

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandsFiles = fs.readdirSync(commandsPath)
                        .filter( file => file.endsWith('.js'));

//commands data and execute property check
for (const file of commandsFiles){
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`The command ${filePath} is missing a required "data" or "execute" property`);
    }
}

//deployment and bot status code
client.once(Events.ClientReady, async () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    // Deploy commands / other startup tasks (existing code runs here)
    //deploy commmnds
    await deployCommands();
    console.log("Commands deployed globally!");
    
    
    //setting bot status
    const statusType = process.env.BOT_STATUS || 'online';
    const activityType = process.env.ACTIVITY_TYPE || 'PLAYING';
    const activityName = process.env.ACTIVITY_NAME || 'Discord';
    
    //mapping the type string to a enum
    const activityTypeMap = {
        'PLAYING':ActivityType.Playing,
        'WATCHING':ActivityType.Watching,
        'LISTENING':ActivityType.Listening,
        'STREAMING':ActivityType.Streaming,
        'COMPETING':ActivityType.Competing
    };

    const statusMap = {
        'online': PresenceUpdateStatus.Online,
        'idle': PresenceUpdateStatus.Idle,
        'dnd': PresenceUpdateStatus.DoNotDisturb,
        'invisible': PresenceUpdateStatus.Invisible
    };

    //setting bot status
    client.user.setPresence({
        status: statusMap[statusType.toLowerCase()] || PresenceUpdateStatus.Online,
        activities: [{
            name: activityName,
            type: activityTypeMap[activityType] || ActivityType.Playing
        }]
    });

    console.log(`Status and activity has been set to : \n ${statusType} \t ${activityType} \t ${activityName} `);

    // ---- Improved dynamic presence (rotating, contextual, natural) ----
    // Helper: nice number formatting
    const nf = (n) => Intl.NumberFormat('en-US').format(n);

    // Build activity suppliers so values refresh each tick
    const activitySuppliers = [
        // Playing a fun message with uptime in hours (keeps the "House Party" vibe but accurate)
        () => ({ name: `House Party • ${ (process.uptime() / 3600).toFixed(1) } hrs`, type: ActivityType.Playing }),

        // Watching server count (useful & looks real)
        () => ({ name: `watching ${nf(client.guilds.cache.size)} servers`, type: ActivityType.Watching }),

        // Listening hint for commands (looks like a bot doing work)
        () => ({ name: `listening to ${process.env.PREFIX ?? '/'}help`, type: ActivityType.Listening }),

        // Playing with user count (shows scale)
        () => ({ name: `playing with ${nf(client.users.cache.size)} users`, type: ActivityType.Playing }),

        // Competitive/streaming style line to add variety
        () => ({ name: `competing for attention`, type: ActivityType.Competing }),
    ];

    // Choose initial status (can be ONLINE, IDLE, DND) — randomize a bit for realism
    const statusPool = [PresenceUpdateStatus.Online, PresenceUpdateStatus.Idle];
    const initialStatus = statusPool[Math.floor(Math.random() * statusPool.length)];

    // Apply presence safely
    const applyPresence = async (activityObj, status = initialStatus) => {
        try {
            await client.user.setPresence({
                activities: [activityObj],
                status
            });
        } catch (err) {
            console.error('Failed to set presence:', err);
        }
    };

    // Rotate activities every 30s with a small random jitter to avoid looking robotic
    let idx = Math.floor(Math.random() * activitySuppliers.length);
    const tick = async () => {
        const supplier = activitySuppliers[idx % activitySuppliers.length];
        const activity = supplier();
        await applyPresence(activity);
        idx++;
    };

    // start now and schedule
    await tick();
    const intervalMs = 30_000 + Math.floor(Math.random() * 7_000); // 30-37s
    const presenceTimer = setInterval(tick, intervalMs);

    // clear on process exit so it doesn't hang weirdly in tests or restarts
    process.once('exit', () => clearInterval(presenceTimer));
    process.once('SIGINT', () => process.exit());
    process.once('SIGTERM', () => process.exit());

    console.log('Dynamic presence rotation started.');
});

// parse a pipe-separated env variable into an array (preserves commas in phrases)
function parsePresenceList(envKey) {
    const val = process.env[envKey];
    if (!val) return [];
    return val.split('|').map(s => s.trim()).filter(Boolean);
}

// load lists (user will populate these later)
const playingList = parsePresenceList('PRESENCE_PLAYING');
const listeningList = parsePresenceList('PRESENCE_LISTENING');

// ensure there's at least one entry per type to avoid empty presence
const defaultPlaying = ['House Party'];
const defaultListening = ['the vibes'];

const pools = [
    { type: ActivityType.Playing, list: playingList.length ? playingList : defaultPlaying },
    { type: ActivityType.Listening, list: listeningList.length ? listeningList : defaultListening }
];

// indices to remember position in each pool (round-robin)
const indices = pools.map(() => 0);

// rotation interval (ms)
const intervalMs = Math.max(5_000, parseInt(process.env.PRESENCE_INTERVAL_MS || '30000', 10));

// apply presence safely
async function applyPresenceFromPool(poolIndex) {
    try {
        const poolIdx = poolIndex % pools.length;
        const pool = pools[poolIdx];
        const i = indices[poolIdx] % pool.list.length;
        const name = pool.list[i];
        indices[poolIdx] = (indices[poolIdx] + 1) % pool.list.length;

        const activity = { name, type: pool.type };

        await client.user.setPresence({
            activities: [activity],
            status: PresenceUpdateStatus.Online
        });
    } catch (err) {
        console.error('Failed to set presence:', err);
    }
}

// start presence rotation only once the client is ready
function startPresenceRotation() {
    let presenceStep = Math.floor(Math.random() * pools.length);

    // run one immediately and then schedule
    applyPresenceFromPool(presenceStep).catch(() => {});
    presenceStep = (presenceStep + 1) % pools.length;

    const presenceTimer = setInterval(async () => {
        await applyPresenceFromPool(presenceStep);
        presenceStep = (presenceStep + 1) % pools.length;
    }, intervalMs);

    // cleanup on shutdown
    process.once('exit', () => clearInterval(presenceTimer));
    process.once('SIGINT', () => process.exit());
    process.once('SIGTERM', () => process.exit());

    return presenceTimer;
}

client.once(Events.ClientReady, async () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    // Deploy commands / other startup tasks (existing code runs here)
    //deploy commmnds
    await deployCommands();
    console.log("Commands deployed globally!");
    
    
    //setting bot status
    const statusType = process.env.BOT_STATUS || 'online';
    const activityType = process.env.ACTIVITY_TYPE || 'PLAYING';
    const activityName = process.env.ACTIVITY_NAME || 'Discord';
    
    //mapping the type string to a enum
    const activityTypeMap = {
        'PLAYING':ActivityType.Playing,
        'WATCHING':ActivityType.Watching,
        'LISTENING':ActivityType.Listening,
        'STREAMING':ActivityType.Streaming,
        'COMPETING':ActivityType.Competing
    };

    const statusMap = {
        'online': PresenceUpdateStatus.Online,
        'idle': PresenceUpdateStatus.Idle,
        'dnd': PresenceUpdateStatus.DoNotDisturb,
        'invisible': PresenceUpdateStatus.Invisible
    };

    //setting bot status
    client.user.setPresence({
        status: statusMap[statusType.toLowerCase()] || PresenceUpdateStatus.Online,
        activities: [{
            name: activityName,
            type: activityTypeMap[activityType] || ActivityType.Playing
        }]
    });

    console.log(`Status and activity has been set to : \n ${statusType} \t ${activityType} \t ${activityName} `);

    // start the presence rotation now that client.user is available
    startPresenceRotation();
});

// ---------------------- ⭐ STAR BOARD ⭐ ---------------------- //
// Starboard: forward messages that reach the ⭐ threshold
const STAR_THRESHOLD = (() => {
    const parsed = parseInt(process.env.STAR_THRESHOLD, 10);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
    if (process.env.STAR_THRESHOLD !== undefined) {
        console.warn(`Invalid STAR_THRESHOLD "${process.env.STAR_THRESHOLD}" in .env — using default 2`);
    }
    return 2;
})();

const STARBOARD_CHANNEL_ID = process.env.STARBOARD_CHANNEL_ID; // set this in .env
const forwardedMap = new Map(); // originalMessageId -> starboardMessageId

// helper: get dominant color from avatar by resizing to 1x1 (Jimp v1 API)
async function getDominantColorFromAvatar(url) {
    try {
        if (!url) return null;
        const image = await Jimp.read(url);
        await image.resize({ w: 1, h: 1 }); // v1 uses an options object
        const hexNum = image.getPixelColor(0, 0);
        const { r, g, b } = intToRGBA(hexNum); // v1 moved this to a named export
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    } catch (err) {
        console.warn('Failed to get avatar color:', err);
        return null;
    }
}

client.on(Events.MessageReactionAdd, async (reaction, user) => {
    try {
        if (user?.bot) return; // ignore bot reactions
        // ensure we have full objects
        if (reaction.partial) await reaction.fetch();
        if (reaction.message.partial) await reaction.message.fetch();

        if (reaction.emoji?.name !== '⭐') return;
        const msg = reaction.message;

        // reaction.count is available after fetch
        const starCount = reaction.count ?? msg.reactions.cache.get('⭐')?.count ?? 0;
        if (starCount < STAR_THRESHOLD) return;

        // already forwarded?
        if (forwardedMap.has(msg.id)) return;

        if (!STARBOARD_CHANNEL_ID) {
            console.error('STARBOARD_CHANNEL_ID is not set in .env — cannot post starboard messages.');
            return;
        }

        const starChannel = await client.channels.fetch(STARBOARD_CHANNEL_ID).catch(() => null);
        if (!starChannel || !starChannel.isTextBased?.()) {
            console.error('Starboard channel not found or not a text channel:', STARBOARD_CHANNEL_ID);
            return;
        }

        // determine embed color from author's avatar (fallback to default)
        const avatarUrl = msg.author?.displayAvatarURL?.({ extension: 'png', size: 128 }) ?? null;
        const embedColor = (await getDominantColorFromAvatar(avatarUrl)) || '#2f3136';

        const embed = new EmbedBuilder()
            .setColor(embedColor) // set color from avatar
            .setAuthor({
                name: msg.author?.tag ?? 'Unknown',
                iconURL: msg.author?.displayAvatarURL?.() ?? undefined
            })
            .setDescription(msg.content?.slice(0, 4096) ?? '')
            .setTimestamp(msg.createdAt)
            .setFooter({ text: `⭐ ${starCount} • from #${msg.channel?.name ?? 'unknown'}` });

        // attach first image if present
        const firstAttachment = msg.attachments?.first?.();
        if (firstAttachment && firstAttachment.url) {
            // if attachment is an image, set as image
            embed.setImage(firstAttachment.url);
        }

        // create a link button that jumps to the original message
        const jumpRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Jump to message')
                .setStyle(ButtonStyle.Link)
                .setURL(msg.url)
        );

        const sent = await starChannel.send({
            content: `⭐ | <#${msg.channelId}> | ⭐`,
            embeds: [embed],
            components: [jumpRow]
        });

        forwardedMap.set(msg.id, sent.id);
    } catch (err) {
        console.error('Starboard handler error:', err);
    }
});


// ---------------------- TEXT REACTIONS ---------------------- //
//-------------- DO IT GIF --------------//
client.on(Events.MessageCreate, async (message) => {
    try {
        if (message.author?.bot) return;
        const gifUrl = process.env.DO_IT_GIF || 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExZm51NWExa213ODF3dmd6bWxpMm5uZXVqbDYxc3Qya2kyMHdmMnN3ZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/pTQUOfSmjo2hG/giphy.gif';
        // match "do it" (any whitespace, case-insensitive) OR the single word "dewit"
        if (/\b(?:do\s+it|dewit)\b/i.test(message.content ?? '')) {
            await message.reply({ content: gifUrl });
        }
    } catch (err) {
        console.error('do-it handler error:', err);
    }
});

//-------------- YOUR MOM RESPONSE --------------//
client.on(Events.MessageCreate, async (message) => {
    try {
        // ignore bot messages
        if (message.author?.bot) return;

        // command prefix and trimmed content
        const prefix = '&';
        const content = (message.content ?? '').trim();

        // not a command -> ignore
        if (!content.startsWith(prefix)) return;

        // extract command name after '&' (e.g. &yourmom -> 'yourmom', &ym -> 'ym')
        const [, cmd] = content.match(/^&([^\s]+)/) || [];
        if (!cmd) return; // nothing after '&'

        // handle the 'yourmom' command and shorthand 'ym'
        const normalized = cmd.toLowerCase();
        if (normalized !== 'yourmom' && normalized !== 'ym') return;

        // must be a reply — get referenced message id
        const refId = message.reference?.messageId;
        if (!refId) {
            await message.reply({ content: 'Reply to a message with `&yourmom` or `&ym` to use this.' });
            return;
        }

        // fetch the original message (might fail if deleted / not accessible)
        const original = await message.channel.messages.fetch(refId).catch(() => null);
        if (!original) {
            await message.reply({ content: 'Could not fetch the referenced message.' });
            return;
        }

        // get original content (fallback if empty)
        const originalText = original.content?.trim() || '[no text]';

        // reply to the original message with the formatted string
        await original.reply({ content: `your mom is a ${originalText}` });
    } catch (err) {
        // handler error logging
        console.error('yourmom handler error:', err);
    }
});

//Logging into the bot itself
client.login(process.env.BOT_TOKEN);