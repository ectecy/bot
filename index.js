const { Client, GatewayIntentBits } = require("discord.js");

const PREFIX = ",";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.on("messageCreate", (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ,ping
    if (command === "ping") {
        return message.reply("Pong!");
    }

    // ,hug @user
    if (command === "hug") {
        const user = message.mentions.users.first();
        if (!user) return message.reply("Mention someone!");
        return message.channel.send(`🤗 ${message.author} hugs ${user}`);
    }
});

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);