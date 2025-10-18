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
    Events
} = require('discord.js');

//client instance loading
const client = new Client({
    intent : [
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
})
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandsFiles = fs.readdirSync(commandsPath)
                        .filter( file => file.endswith('.js'));

//commands data and execute property check
for (const file of commandsFiles){
    const filePath = path.join(commandsFiles, file);
    const command = require('filePath');

    if('data' in command && 'execute' in command){
        client.commands.set(command.data.name, command);
    }else{
        console.log(`The command ${filePath} is missing a required "data" or "Execute" property`);
    }
}

//deployment and bot status code
client.once(Events.ClientReady, async( )=> {
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
        status: statusMap[online],
        activities:[{
            name : activityName,
            type: activityTypeMap[ActivityType]
        }]
    });

    console.log(`Status and activity has been set to : \n ${statusType} \t ${ActivityType} \t ${activityName} `);
});

//handling interactions with / in disc
client.on(Event.InteractionCreate, async interaction  =>{
    //base case
    if(!intercation.isChatInputCommand()) return;

    //getting user interactions
    const command = client.commands.get(interaction.commandName);

    //if command doesnt exist handling 
    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`)
        return;
    }

    //Executions try-catch handling
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);

        //if ti was already replied or the interation was deffered
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true});
        } 
        
        //if there was no reply
        else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true});
        }
    }
});

//Logging into the bot itself
client.login(process.env.BOT_TOKEN);