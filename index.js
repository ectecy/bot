require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// load modules
require("./events/guildMemberRemove")(client);

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// ---------------- PREFIX COMMAND HANDLER ----------------
client.on("messageCreate", async (message) => {
    if (!message.content.startsWith(",")) return;
    if (message.author.bot) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // ---------------- ECONOMY ----------------
    const { getBalance, addBalance } = require("./database");

    if (cmd === "work") {
        const amount = Math.floor(Math.random() * 200) + 50;
        addBalance(message.author.id, amount);
        return message.reply(`💰 You earned $${amount}`);
    }

    if (cmd === "balance") {
        const bal = getBalance(message.author.id);
        return message.reply(`💳 Balance: $${bal}`);
    }

    if (cmd === "daily") {
        addBalance(message.author.id, 500);
        return message.reply("🎁 You claimed $500 daily reward!");
    }

    // ---------------- MODERATION ----------------
    if (cmd === "kick") {
        if (!message.member.permissions.has("KickMembers")) return;

        const user = message.mentions.members.first();
        if (!user) return message.reply("Mention a user.");

        await user.kick();
        return message.channel.send(`Kicked ${user.user.tag}`);
    }

    if (cmd === "ban") {
        if (!message.member.permissions.has("BanMembers")) return;

        const user = message.mentions.members.first();
        if (!user) return message.reply("Mention a user.");

        await user.ban();
        return message.channel.send(`Banned ${user.user.tag}`);
    }

    if (cmd === "purge") {
        if (!message.member.permissions.has("ManageMessages")) return;

        const amount = parseInt(args[0]);
        if (!amount) return message.reply("Give number.");

        await message.channel.bulkDelete(amount, true);
        return message.channel.send(`Deleted ${amount} messages`);
    }

    // ---------------- TICKET ----------------
    if (cmd === "ticket") {
        const channel = await message.guild.channels.create({
            name: `ticket-${message.author.username}`,
            permissionOverwrites: [
                { id: message.guild.id, deny: ["ViewChannel"] },
                { id: message.author.id, allow: ["ViewChannel", "SendMessages"] }
            ]
        });

        channel.send(`Hello ${message.author}, support will help you soon.`);
        return message.reply("Ticket created!");
    }

    if (cmd === "close") {
        if (message.channel.name.startsWith("ticket-")) {
            await message.reply("Closing ticket...");
            setTimeout(() => message.channel.delete(), 2000);
        }
    }
});

client.login(process.env.TOKEN);