const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    EmbedBuilder
} = require("discord.js");

const fs = require("fs");

const PREFIX = ",";

/* ================= DATABASE ================= */

let db = {
    economy: {},
    warns: {},
    xp: {}
};

if (fs.existsSync("./data.json")) {
    db = JSON.parse(fs.readFileSync("./data.json", "utf8"));
}

function saveDB() {
    fs.writeFileSync("./data.json", JSON.stringify(db, null, 2));
}

/* ================= CLIENT ================= */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

/* ================= LEVEL SYSTEM ================= */

function getLevel(xp) {
    return Math.floor(Math.sqrt(xp / 100));
}

/* ================= READY ================= */

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

/* ================= MESSAGE ================= */

client.on("messageCreate", async (message) => {

    if (!message.guild || message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    const member = message.mentions.members.first();
    const user = message.mentions.users.first();

    /* ================= XP ================= */

    if (!db.xp[message.author.id]) db.xp[message.author.id] = 0;
    db.xp[message.author.id] += Math.floor(Math.random() * 10) + 5;
    saveDB();

    /* ================= HELP ================= */

    if (cmd === "help") {
        return message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("📜 Bot Commands")
                    .setDescription(`
,help
,rank
,balance
,work
,warn
,kick
,ban
,hug
,kiss
                    `)
            ]
        });
    }

    /* ================= RANK ================= */

    if (cmd === "rank") {
        const xp = db.xp[message.author.id];
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("📊 Rank")
                    .addFields(
                        { name: "Level", value: `${getLevel(xp)}`, inline: true },
                        { name: "XP", value: `${xp}`, inline: true }
                    )
            ]
        });
    }

    /* ================= ECONOMY ================= */

    if (cmd === "balance") {
        return message.reply(`💰 $${db.economy[message.author.id] || 0}`);
    }

    if (cmd === "work") {
        const earn = Math.floor(Math.random() * 200) + 50;
        db.economy[message.author.id] = (db.economy[message.author.id] || 0) + earn;
        saveDB();

        return message.reply(`💼 You earned $${earn}`);
    }

    /* ================= MODERATION ================= */

    if (cmd === "kick") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
            return message.reply("No permission.");

        if (!member)
            return message.reply("Mention a user.");

        await member.kick();
        return message.channel.send(`👢 Kicked ${member.user.tag}`);
    }

    if (cmd === "ban") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
            return message.reply("No permission.");

        if (!member)
            return message.reply("Mention a user.");

        await member.ban();
        return message.channel.send(`🔨 Banned ${member.user.tag}`);
    }

    /* ================= FUN ================= */

    if (cmd === "hug") {
        if (!user) return message.reply("Mention someone!");

        return message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor("Pink")
                    .setDescription(`${message.author} hugs ${user} 🤗`)
            ]
        });
    }

    if (cmd === "kiss") {
        if (!user) return message.reply("Mention someone!");

        return message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor("Pink")
                    .setDescription(`${message.author} kisses ${user} 💋`)
            ]
        });
    }
});

/* ================= LOGIN ================= */

client.login("YOUR_BOT_TOKEN_HERE");
