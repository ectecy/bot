const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once("ready", () => {
    console.log("BOT ONLINE");
});

client.on("messageCreate", (message) => {
    console.log("MSG:", message.content);

    if (message.content === ",ping") {
        message.reply("WORKS");
    }
});

client.login(process.env.DISCORD_TOKEN);