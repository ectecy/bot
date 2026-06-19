const { Client, GatewayIntentBits, Collection } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();

// -------------------- ANTI-SPAM --------------------
const cooldown = new Map();

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const now = Date.now();
    const last = cooldown.get(message.author.id) || 0;

    if (now - last < 1500) {
        return message.reply("Stop spamming.");
    }

    cooldown.set(message.author.id, now);
});

// -------------------- COMMANDS --------------------
client.on("messageCreate", async (message) => {
    if (!message.content.startsWith("!") || message.author.bot) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // PING
    if (command === "ping") {
        return message.reply("Pong 🏓");
    }

    // KICK
    if (command === "kick") {
        if (!message.member.permissions.has("KickMembers")) {
            return message.reply("You don't have permission.");
        }

        const member = message.mentions.members.first();
        if (!member) return message.reply("Mention a user.");

        await member.kick("Kicked by bot command");
        message.channel.send(`Kicked ${member.user.tag}`);
    }

    // BAN
    if (command === "ban") {
        if (!message.member.permissions.has("BanMembers")) {
            return message.reply("You don't have permission.");
        }

        const member = message.mentions.members.first();
        if (!member) return message.reply("Mention a user.");

        await member.ban({ reason: "Banned by bot command" });
        message.channel.send(`Banned ${member.user.tag}`);
    }

    // PURGE
    if (command === "purge") {
        if (!message.member.permissions.has("ManageMessages")) {
            return message.reply("You don't have permission.");
        }

        const amount = parseInt(args[0]);
        if (!amount) return message.reply("Provide a number.");

        await message.channel.bulkDelete(amount, true);
        message.channel.send(`Deleted ${amount} messages`).then(m =>
            setTimeout(() => m.delete(), 3000)
        );
    }

    // WORK (simple economy placeholder)
    if (command === "work") {
        return message.reply("You worked and earned $100 💰 (add database later)");
    }

    // BALANCE (placeholder)
    if (command === "balance") {
        return message.reply("Your balance system is not connected yet (needs database.js)");
    }

    // TICKET
    if (command === "ticket") {
        const channel = await message.guild.channels.create({
            name: `ticket-${message.author.username}`,
            permissionOverwrites: [
                {
                    id: message.guild.id,
                    deny: ["ViewChannel"]
                },
                {
                    id: message.author.id,
                    allow: ["ViewChannel", "SendMessages"]
                }
            ]
        });

        channel.send(`Hello ${message.author}, support will be with you soon.`);
        message.reply("Ticket created!");
    }

    // CLOSE TICKET
    if (command === "close") {
        if (message.channel.name.startsWith("ticket-")) {
            message.channel.send("Closing ticket...");
            setTimeout(() => message.channel.delete(), 2000);
        }
    }
});

// -------------------- LOGIN --------------------
client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);