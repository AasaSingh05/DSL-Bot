//imports and requirements setup
require('dotenv').config();
const { REST, Routes } = require('discord.js'); 
const fs = require('fs');
const path = require('path');

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
});

//handling interactions with / in disc
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true});
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true});
        }
    }
});

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

        const embed = new EmbedBuilder()
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
            content: `Forwarded from <#${msg.channel.id}>`,
            embeds: [embed],
            components: [jumpRow]
        });

        forwardedMap.set(msg.id, sent.id);
    } catch (err) {
        console.error('Starboard handler error:', err);
    }
});

//Logging into the bot itself
client.login(process.env.BOT_TOKEN);