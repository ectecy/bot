const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const PREFIX = ",";

// ---------------- DATABASE ----------------
let db = {
    economy: {},
    warns: {},
    giveaways: {},
    xp: {}
};

if (fs.existsSync("./data.json")) {
    try {
        db = JSON.parse(fs.readFileSync("./data.json", "utf8"));
    } catch (e) {
        console.log("❌ DB load error, using fresh database");
    }
}

function saveDB() {
    fs.writeFileSync("./data.json", JSON.stringify(db, null, 2));
}

// ---------------- CLIENT ----------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// ---------------- LEVEL SYSTEM ----------------
function getLevel(xp) {
    return Math.floor(Math.sqrt(xp / 100));
}

function addXP(userId) {
    db.xp[userId] = (db.xp[userId] || 0) + Math.floor(Math.random() * 11) + 5;
    saveDB();
}

// ---------------- READY ----------------
client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// ---------------- MESSAGE ----------------
client.on("messageCreate", async (message) => {
    try {
        if (!message.guild || message.author.bot) return;
        if (!message.content.startsWith(PREFIX)) return;

        const args = message.content.slice(PREFIX).trim().split(/ +/);
        const cmd = (args.shift() || "").toLowerCase();

        const user = message.mentions.users.first();
        const member = message.mentions.members.first();

        addXP(message.author.id);

        // ---------------- COMMANDS (FIXED + SAFE) ----------------
        if (cmd === "commands") {
            const embed = new EmbedBuilder()
                .setColor("#2b2d31")
                .setTitle("📜 Command Menu")
                .setDescription(
`💰 Economy
,balance
,work

📊 Leveling
,rank
,g.m

⚠️ Moderation
,warn
,kick
,ban
,unban

🎉 Giveaway
,g create
,g reroll

💖 Fun
,hug
,kiss
,slap
,shoot`
                )
                .setFooter({ text: "Prefix: ," });

            return message.channel.send({ embeds: [embed] });
        }

        // ---------------- RANK ----------------
        if (cmd === "rank") {
            const xp = db.xp[message.author.id] || 0;

            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#2b2d31")
                        .setTitle("📊 Your Rank")
                        .setDescription(`Level: **${getLevel(xp)}**\nXP: **${xp}**`)
                ]
            });
        }

        // ---------------- LEADERBOARD ----------------
        if (cmd === "g.m") {
            const sorted = Object.entries(db.xp)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#2b2d31")
                        .setTitle("🏆 Leaderboard")
                        .setDescription(
                            sorted.length
                                ? sorted.map((u, i) =>
                                    `**${i + 1}.** <@${u[0]}> — Level **${getLevel(u[1])}** (${u[1]} XP)`
                                ).join("\n")
                                : "No data yet."
                        )
                ]
            });
        }

        // ---------------- ECONOMY ----------------
        if (cmd === "balance") {
            return message.reply(`💰 $${db.economy[message.author.id] || 0}`);
        }

        if (cmd === "work") {
            const amount = Math.floor(Math.random() * 200) + 50;
            db.economy[message.author.id] = (db.economy[message.author.id] || 0) + amount;
            saveDB();
            return message.reply(`💼 +$${amount}`);
        }

        // ---------------- WARN ----------------
        if (cmd === "warn") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
                return message.reply("❌ No permission.");

            if (!member) return message.reply("❌ Mention someone.");

            const reason = args.join(" ") || "No reason";

            db.warns[member.id] = (db.warns[member.id] || 0) + 1;
            saveDB();

            const count = db.warns[member.id];

            message.channel.send(
                `⚠️ **${member.user.tag} warned (${count}/4)**\nReason: ${reason}`
            );

            if (count >= 4 && member.bannable) {
                await member.ban({ reason: "4 warns" }).catch(() => {});
                db.warns[member.id] = 0;
                saveDB();
                message.channel.send(`🔨 Auto-banned ${member.user.tag}`);
            }
        }

        // ---------------- KICK ----------------
        if (cmd === "kick") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
                return;

            if (!member) return;

            const target = await message.guild.members.fetch(member.id).catch(() => null);
            if (!target || !target.kickable) return;

            await target.kick();
            return message.channel.send(`👢 Kicked **${target.user.tag}**`);
        }

        // ---------------- BAN ----------------
        if (cmd === "ban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
                return;

            if (!member) return;

            const target = await message.guild.members.fetch(member.id).catch(() => null);
            if (!target || !target.bannable) return;

            await target.ban();
            return message.channel.send(`🔨 Banned **${target.user.tag}**`);
        }

        // ---------------- UNBAN ----------------
        if (cmd === "unban") {
            const id = args[0];
            if (!id) return;

            await message.guild.members.unban(id).catch(() => {});
            return message.channel.send(`✅ Unbanned <@${id}>`);
        }

        // ---------------- FUN ----------------
        if (cmd === "hug") return message.channel.send(`🤗 ${message.author} hugs ${user || "someone"}`);
        if (cmd === "kiss") return message.channel.send(`💋 ${message.author} kisses ${user || "someone"}`);
        if (cmd === "slap") return message.channel.send(`👋 ${message.author} slaps ${user || "someone"}`);
        if (cmd === "shoot") return message.channel.send(`🔫 ${message.author} shoots ${user || "someone"} 💥`);

    } catch (err) {
        console.log("❌ Error:", err);
    }
});

// ---------------- LOGIN ----------------
client.login(process.env.DISCORD_TOKEN);
