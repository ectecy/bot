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
    xp: {}
};

if (fs.existsSync("./data.json")) {
    db = JSON.parse(fs.readFileSync("./data.json", "utf8"));
}

function saveDB() {
    fs.writeFileSync("./data.json", JSON.stringify(db, null, 2));
}

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
   HELPERS
========================================================= */

async function getTargetMember(message, member) {
    if (!member) return null;
    return await message.guild.members.fetch(member.id).catch(() => null);
}

/* =========================================================
   💬 MESSAGE HANDLER
========================================================= */

client.on("messageCreate", async (message) => {

    if (!message.guild || message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = (args.shift() || "").toLowerCase();

    const member = message.mentions.members.first();
    const user = message.mentions.users.first();

    try {

        addXP(message.author.id);

        /* ================= COMMANDS ================= */

        if (cmd === "commands") {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#5865F2")
                        .setTitle("📜 Command List")
                        .setDescription(`
💰 Economy: ,balance ,work  
⚠️ Moderation: ,warn ,kick ,ban ,unban  
🔒 Channel: ,lock ,unlock  
📊 Leveling: ,rank ,g.m  
💖 Fun: ,hug ,kiss ,slap ,shoot
                        `)
                ]
            });
        }

        /* ================= RANK ================= */

        if (cmd === "rank") {
            const xp = db.xp[message.author.id] || 0;

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

        /* ================= LEADERBOARD ================= */

        if (cmd === "g.m") {
            const sorted = Object.entries(db.xp)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            let desc = "";

            sorted.forEach(([id, xp], i) => {
                desc += `**${i + 1}.** <@${id}> — Level ${getLevel(xp)} (${xp} XP)\n`;
            });

            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Gold")
                        .setTitle("🏆 Leaderboard")
                        .setDescription(desc || "No data")
                ]
            });
        }

        /* ================= ECONOMY ================= */

        if (cmd === "balance") {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Gold")
                        .setTitle("💰 Balance")
                        .setDescription(`$${db.economy[message.author.id] || 0}`)
                ]
            });
        }

        if (cmd === "work") {
            const amount = Math.floor(Math.random() * 200) + 50;

            db.economy[message.author.id] =
                (db.economy[message.author.id] || 0) + amount;

            saveDB();

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("💼 Work")
                        .setDescription(`You earned $${amount}`)
                ]
            });
        }

        /* ================= WARN ================= */

        if (cmd === "warn") {

            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
                return message.reply("❌ No permission.");

            const target = await getTargetMember(message, member);
            if (!target) return message.reply("❌ Mention someone.");

            const reason = args.join(" ") || "No reason";

            db.warns[target.id] = (db.warns[target.id] || 0) + 1;
            saveDB();

            const count = db.warns[target.id];

            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Orange")
                        .setTitle("⚠️ Warn Issued")
                        .addFields(
                            { name: "User", value: target.user.tag },
                            { name: "Warnings", value: `${count}/4` },
                            { name: "Reason", value: reason }
                        )
                ]
            });
        }

        /* ================= KICK ================= */

        if (cmd === "kick") {

            if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
                return message.reply("❌ No permission.");

            const target = await getTargetMember(message, member);
            if (!target) return message.reply("❌ User not found.");
            if (!target.kickable) return message.reply("❌ Cannot kick.");

            await target.kick();

            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Orange")
                        .setTitle("👢 Kicked")
                        .setDescription(`${target.user.tag}`)
                ]
            });
        }

        /* ================= BAN ================= */

        if (cmd === "ban") {

            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
                return message.reply("❌ No permission.");

            const target = await getTargetMember(message, member);
            if (!target) return message.reply("❌ User not found.");
            if (!target.bannable) return message.reply("❌ Cannot ban.");

            await target.ban();

            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("🔨 Banned")
                        .setDescription(`${target.user.tag}`)
                ]
            });
        }

        /* ================= UNBAN ================= */

        if (cmd === "unban") {

            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
                return message.reply("❌ No permission.");

            const userId = args[0];
            if (!userId) return message.reply("Usage: ,unban <userID>");

            await message.guild.members.unban(userId);

            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Unbanned")
                        .setDescription(userId)
                ]
            });
        }

        /* =========================================================
           💖 FIXED FUN COMMANDS (NOW REQUIRE MENTION)
        ========================================================= */

        if (cmd === "hug") {
            if (!user)
                return message.reply("❌ You must mention someone to hug!");

            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Pink")
                        .setDescription(`🤗 ${message.author} hugs ${user}`)
                ]
            });
        }

        if (cmd === "kiss") {
            if (!user)
                return message.reply("❌ You must mention someone to kiss!");

            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Pink")
                        .setDescription(`💋 ${message.author} kisses ${user}`)
                ]
            });
        }

        if (cmd === "slap") {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Yellow")
                        .setDescription(`👋 ${message.author} slaps ${user || "someone"}`)
                ]
            });
        }

        if (cmd === "shoot") {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("DarkRed")
                        .setDescription(`🔫 ${message.author} shoots ${user || "someone"} 💥`)
                ]
            });
        }

    } catch (err) {
        console.log(err);
    }
});

/* =========================================================
   🔐 LOGIN
========================================================= */

client.login(process.env.DISCORD_TOKEN);