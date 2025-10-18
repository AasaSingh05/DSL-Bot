//imports and requirements setup
require('dotenv').config();
const { REST, Routes } = require('discord.js'); 
const fs = require('fs');
const path = require('path');

//const global function
const deployCommands = async () => {
    //call logic goes here
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
