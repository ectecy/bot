const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    EmbedBuilder
} = require("discord.js");

const fs = require("fs");

const PREFIX = ",";

/* =========================================================
   📦 DATABASE
========================================================= */

let db = {
    economy: {},
    warns: {},
    xp: {},
    afk: {}
};

if (fs.existsSync("./data.json")) {
    db = JSON.parse(fs.readFileSync("./data.json", "utf8"));
}

function saveDB() {
    fs.writeFileSync("./data.json", JSON.stringify(db, null, 2));
}

/* =========================================================
   ⚡ COOLDOWN SYSTEM
========================================================= */

const cooldowns = new Map();
const COOLDOWN_TIME = 3000;

/* =========================================================
   🤖 CLIENT
========================================================= */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ]
});

/* =========================================================
   📊 LEVEL SYSTEM
========================================================= */

function getLevel(xp) {
    return Math.floor(Math.sqrt(xp / 100));
}

function addXP(userId) {
    const gain = Math.floor(Math.random() * 11) + 5;
    if (!db.xp[userId]) db.xp[userId] = 0;
    db.xp[userId] += gain;
    saveDB();
}

/* =========================================================
   🟢 READY
========================================================= */

client.once("ready", () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

/* =========================================================
   💬 MESSAGE HANDLER
========================================================= */

client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    /* =================================================
       💤 AFK MENTION CHECK
    ================================================= */

    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach(user => {
            const afkData = db.afk[user.id];
            if (afkData) {
                message.reply(`💤 ${user.tag} is AFK: **${afkData.reason}**`);
            }
        });
    }

    /* =================================================
       💤 REMOVE AFK ON TALK
    ================================================= */

    if (db.afk[message.author.id]) {
        delete db.afk[message.author.id];
        saveDB();
        message.reply("👋 Welcome back! AFK removed.");
    }

    /* =================================================
       COMMAND CHECK
    ================================================= */

    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = (args.shift() || "").toLowerCase();

    const member = message.mentions.members.first();

    /* =================================================
       ⚡ COOLDOWN CHECK (COMMANDS ONLY)
    ================================================= */

    const now = Date.now();

    if (cooldowns.has(message.author.id)) {
        const last = cooldowns.get(message.author.id);
        if (now - last < COOLDOWN_TIME) return;
    }

    cooldowns.set(message.author.id, now);

    try {

        /* =================================================
           XP GAIN
        ================================================= */

        addXP(message.author.id);

        /* =================================================
           📜 COMMANDS MENU
        ================================================= */

        if (cmd === "commands") {
            const embed = new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle("📜 Command Center")
                .setDescription("Available commands")
                .addFields(
                    { name: "💰 Economy", value: "` ,balance `\n` ,work `", inline: true },
                    { name: "⚠️ Moderation", value: "` ,warn `\n` ,kick `\n` ,ban `\n` ,unban `", inline: true },
                    { name: "🔒 Channel", value: "` ,lock `\n` ,unlock `", inline: true },
                    { name: "🎭 Roles", value: "` ,r create `\n` ,r add `\n` ,r remove `\n` ,r delete `", inline: true },
                    { name: "📊 Leveling", value: "` ,rank `\n` ,g.m `", inline: true },
                    { name: "💤 AFK", value: "` ,afk `", inline: true },
                    { name: "💖 Fun", value: "` ,kiss `\n` ,slap `\n` ,shoot `", inline: true }
                )
                .setThumbnail(client.user.displayAvatarURL())
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }

        /* =================================================
           💤 AFK COMMAND
        ================================================= */

        if (cmd === "afk") {
            const reason = args.join(" ") || "AFK";

            db.afk[message.author.id] = {
                reason,
                time: Date.now()
            };

            saveDB();

            return message.reply(`💤 You are now AFK: **${reason}**`);
        }

        /* =================================================
           📊 RANK
        ================================================= */

        if (cmd === "rank") {
            const xp = db.xp[message.author.id] || 0;
            const level = getLevel(xp);

            const embed = new EmbedBuilder()
                .setColor("#00BFFF")
                .setTitle("📊 Rank Information")
                .setThumbnail(message.author.displayAvatarURL())
                .addFields(
                    { name: "⭐ Level", value: `${level}`, inline: true },
                    { name: "✨ XP", value: `${xp}`, inline: true }
                )
                .setFooter({ text: message.author.tag });

            return message.reply({ embeds: [embed] });
        }

        /* =================================================
           💰 BALANCE
        ================================================= */

        if (cmd === "balance") {
            const balance = db.economy[message.author.id] || 0;

            const embed = new EmbedBuilder()
                .setColor("Gold")
                .setTitle("💰 Wallet")
                .setDescription(`You currently have **$${balance}**`);

            return message.reply({ embeds: [embed] });
        }

        /* =================================================
           💼 WORK
        ================================================= */

        if (cmd === "work") {
            const amount = Math.floor(Math.random() * 200) + 50;

            db.economy[message.author.id] =
                (db.economy[message.author.id] || 0) + amount;

            saveDB();

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("💼 Work Complete")
                        .setDescription(`You earned **$${amount}**`)
                ]
            });
        }

        /* =================================================
           ⚠️ WARN SYSTEM
        ================================================= */

        if (cmd === "warn") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
                return message.reply("❌ No permission.");

            if (!member)
                return message.reply("❌ Mention someone.");

            const reason = args.join(" ") || "No reason";

            db.warns[member.id] = (db.warns[member.id] || 0) + 1;
            saveDB();

            const count = db.warns[member.id];

            await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Orange")
                        .setTitle("⚠️ User Warned")
                        .addFields(
                            { name: "User", value: `${member.user.tag}`, inline: true },
                            { name: "Warnings", value: `${count}/4`, inline: true },
                            { name: "Reason", value: reason }
                        )
                ]
            });

            if (count >= 4) {
                const target = await message.guild.members.fetch(member.id).catch(() => null);
                if (target && target.bannable) {
                    await target.ban({ reason: "4 warns reached" });
                    db.warns[member.id] = 0;
                    saveDB();
                }
            }
        }

        /* =================================================
           (KEEP REST OF YOUR COMMANDS SAME)
           kick, ban, unban, lock, unlock, roles, fun...
        ================================================= */

    } catch (err) {
        console.log(err);
    }
});

/* =========================================================
   🔐 LOGIN
========================================================= */

client.login(process.env.DISCORD_TOKEN);