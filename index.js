const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once("ready", () => {
    console.log("BOT IS ONLINE");
});

client.on("messageCreate", (message) => {
    console.log("GOT MESSAGE:", message.content);
});

client.login(process.env.DISCORD_TOKEN);