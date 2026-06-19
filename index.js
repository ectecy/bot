const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});
client.on("messageCreate", (message) => {
    console.log("GOT:", message.content);
});
const cooldown = new Map();

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(",")) return;

    const now = Date.now();
    const last = cooldown.get(message.author.id) || 0;

    if (now - last < 1000) return;
    cooldown.set(message.author.id, now);

    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    const user = message.mentions.users.first();

    // HUG
    if (cmd === "hug") {
        if (!user) return message.reply("Mention someone to hug!");
        return message.channel.send(`🤗 ${message.author} hugs ${user}!`);
    }

    // KISS
    if (cmd === "kiss") {
        if (!user) return message.reply("Mention someone to kiss!");
        return message.channel.send(`💋 ${message.author} kisses ${user}!`);
    }

    // SLAP
    if (cmd === "slap") {
        if (!user) return message.reply("Mention someone to slap!");
        return message.channel.send(`👋 ${message.author} slaps ${user}!`);
    }

    // SHOOT
    if (cmd === "shoot") {
        if (!user) return message.reply("Mention someone to shoot!");
        return message.channel.send(`🔫 ${message.author} shoots ${user}! *ouch*`);
    }
});

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);