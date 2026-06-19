const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.on("messageCreate", (message) => {
    console.log("MESSAGE RECEIVED:", message.content);
});

client.once("ready", () => {
    console.log("BOT ONLINE");
});

client.login(process.env.DISCORD_TOKEN);