const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
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
        console.log("❌ Failed to load database, using fresh DB.");
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

// ---------------- UTILITIES ----------------
function getLevel(xp) {
    return Math.floor(Math.sqrt(xp / 100));
}

function addXP(userId) {
    const gain = Math.floor(Math.random() * 11) + 5;
    db.xp[userId] = (db.xp[userId] || 0) + gain;
    saveDB();
}

function getMember(message) {
    return message.mentions.members.first();
}

function getUser(message) {
    return message.mentions.users.first();
}

// ---------------- READY ----------------
client.once("ready", () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// ---------------- MAIN HANDLER ----------------
client.on("messageCreate", async (message) => {
    try {
        if (!message.guild || message.author.bot) return;
        if (!message.content.startsWith(PREFIX)) return;

        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const cmd = (args.shift() || "").toLowerCase();

        const user = getUser(message);
        const member = getMember(message);

        addXP(message.author.id);

        // ---------------- COMMANDS LIST ----------------
        if (cmd === "commands") {
            return message.channel.send(
`📜 **Commands**

💰 Economy:
,balance
,work

⚠️ Moderation:
,warn
,kick
,ban
,unban

📊 Leveling:
,rank
,g.m

🎉 Giveaway:
,g create
,g reroll

💖 Fun:
,hug
,kiss
,slap
,shoot`
            );
        }

        // ---------------- LEVEL ----------------
        if (cmd === "rank") {
            const xp = db.xp[message.author.id] || 0;
            return message.reply(`📊 Level: **${getLevel(xp)}** | ⭐ XP: **${xp}**`);
        }

        if (cmd === "g.m") {
            const sorted = Object.entries(db.xp)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            if (!sorted.length) return message.channel.send("❌ No XP data.");

            return message.channel.send(
                "🏆 **LEADERBOARD**\n\n" +
                sorted.map((u, i) =>
                    `${i + 1}. <@${u[0]}> — Level ${getLevel(u[1])} (${u[1]} XP)`
                ).join("\n")
            );
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

        // ---------------- WARN SYSTEM ----------------
        if (cmd === "warn") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                return message.reply("❌ No permission.");
            }

            if (!member) return message.reply("❌ Mention someone.");

            const reason = args.join(" ") || "No reason";

            db.warns[member.id] = (db.warns[member.id] || 0) + 1;
            saveDB();

            const count = db.warns[member.id];

            await message.channel.send(
                `⚠️ **${member.user.tag} warned (${count}/4)**\nReason: ${reason}`
            );

            if (count >= 4) {
                const target = await message.guild.members.fetch(member.id).catch(() => null);

                if (target?.bannable) {
                    await target.ban({ reason: "4 warns" }).catch(() => {});
                    db.warns[member.id] = 0;
                    saveDB();
                    message.channel.send(`🔨 Auto-banned ${member.user.tag}`);
                }
            }
        }

        // ---------------- MODERATION ----------------
        if (cmd === "kick") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
                return message.reply("❌ No permission.");

            if (!member) return message.reply("❌ Mention a user.");

            const target = await message.guild.members.fetch(member.id).catch(() => null);
            if (!target) return message.reply("❌ User not found.");
            if (!target.kickable) return message.reply("❌ I cannot kick this user.");

            await target.kick("Bot command");
            return message.channel.send(`👢 Kicked **${target.user.tag}**`);
        }

        if (cmd === "ban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
                return message.reply("❌ No permission.");

            if (!member) return message.reply("❌ Mention a user.");

            const target = await message.guild.members.fetch(member.id).catch(() => null);
            if (!target) return message.reply("❌ User not found.");
            if (!target.bannable) return message.reply("❌ I cannot ban this user.");

            await target.ban({ reason: "Bot command" });
            return message.channel.send(`🔨 Banned **${target.user.tag}**`);
        }

        if (cmd === "unban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
                return message.reply("❌ No permission.");

            const id = args[0];
            if (!id) return message.reply("Usage: ,unban <userID>");

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
