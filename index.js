const {
    Client,
    GatewayIntentBits,
    PermissionsBitField
} = require("discord.js");

const fs = require("fs");

const PREFIX = ",";

// ---------------- PERSISTENT STORAGE ----------------
let db = {
    economy: {},
    warns: {},
    giveaways: {}
};

if (fs.existsSync("./data.json")) {
    db = JSON.parse(fs.readFileSync("./data.json", "utf8"));
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

// ---------------- READY ----------------
client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// ---------------- MESSAGE ----------------
client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = (args.shift() || "").toLowerCase();

    const user = message.mentions.users.first();
    const member = message.mentions.members.first();

    try {

        // ---------------- COMMANDS ----------------
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

        // ---------------- ECONOMY ----------------
        if (cmd === "balance") {
            return message.reply(`💰 $${db.economy[message.author.id] || 0}`);
        }

        if (cmd === "work") {
            const amount = Math.floor(Math.random() * 200) + 50;

            db.economy[message.author.id] =
                (db.economy[message.author.id] || 0) + amount;

            saveDB();

            return message.reply(`💼 +$${amount}`);
        }

        // ---------------- WARN ----------------
        if (cmd === "warn") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                return message.reply("❌ No permission.");
            }

            if (!member) return message.reply("❌ Mention someone.");

            const reason = args.join(" ") || "No reason";

            db.warns[member.id] = (db.warns[member.id] || 0) + 1;
            saveDB();

            const count = db.warns[member.id];

            message.channel.send(`⚠️ ${member.user.tag} warned (${count}/4)\nReason: ${reason}`);

            if (count >= 4) {
                if (member.bannable) {
                    await member.ban({ reason: "4 warns" }).catch(() => {});
                    db.warns[member.id] = 0;
                    saveDB();
                    message.channel.send(`🔨 Auto-banned ${member.user.tag}`);
                }
            }
        }

        // ---------------- MODERATION ----------------
        if (cmd === "kick") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return;
            if (!member) return;

            await member.kick().catch(() => {});
            return message.channel.send(`👢 Kicked ${member.user.tag}`);
        }

        if (cmd === "ban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
            if (!member) return;

            await member.ban().catch(() => {});
            return message.channel.send(`🔨 Banned ${member.user.tag}`);
        }

        if (cmd === "unban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return message.reply("❌ No permission.");
            }

            const userId = args[0];
            if (!userId) return message.reply("Usage: ,unban <userID>");

            try {
                await message.guild.members.unban(userId);
                return message.channel.send(`✅ Unbanned <@${userId}>`);
            } catch {
                return message.reply("❌ Could not unban user.");
            }
        }

        // ---------------- FUN ----------------
        if (cmd === "hug") return message.channel.send(`🤗 ${message.author} hugs ${user || "someone"}`);
        if (cmd === "kiss") return message.channel.send(`💋 ${message.author} kisses ${user || "someone"}`);
        if (cmd === "slap") return message.channel.send(`👋 ${message.author} slaps ${user || "someone"}`);
        if (cmd === "shoot") return message.channel.send(`🔫 ${message.author} shoots ${user || "someone"} 💥`);

        // ---------------- GIVEAWAY SYSTEM (UPDATED) ----------------
        if (cmd === "g") {

            // ---------------- CREATE ----------------
            if (args[0] === "create") {

                const ask = async (q) => {
                    await message.channel.send(q);

                    const collected = await message.channel.awaitMessages({
                        filter: m => m.author.id === message.author.id,
                        max: 1,
                        time: 60000
                    }).catch(() => null);

                    if (!collected || !collected.first()) return null;
                    return collected.first().content;
                };

                const prize = await ask("🎁 What is the prize?");
                if (!prize) return message.reply("❌ Cancelled.");

                const duration = await ask("⏱ Duration? (10m / 1h / 30s)");
                if (!duration) return message.reply("❌ Cancelled.");

                const req = await ask("📋 Requirements? (type 'none' if nothing)");
                if (!req) return message.reply("❌ Cancelled.");

                const ms = parseDuration(duration);
                if (!ms) return message.reply("❌ Invalid duration.");

                const end = Date.now() + ms;

                const msg = await message.channel.send(
`🎉 **GIVEAWAY**

🎁 Prize: **${prize}**
📋 Requirements: **${req}**
⏱ Ends: <t:${Math.floor(end / 1000)}:R>

React 🎉 to join!`
                );

                await msg.react("🎉");

                db.giveaways[msg.id] = {
                    entries: []
                };

                saveDB();

                setTimeout(() => endGiveaway(msg.id, message.channel), ms);

                return;
            }

            // ---------------- REROLL ----------------
            if (args[0] === "reroll") {
                const msgId = args[1];
                const g = db.giveaways[msgId];

                if (!g) return message.reply("❌ Giveaway not found.");
                if (!g.entries || g.entries.length === 0) {
                    return message.reply("❌ No entries.");
                }

                const winner = g.entries[Math.floor(Math.random() * g.entries.length)];

                return message.channel.send(`🎉 New winner: <@${winner}>`);
            }
        }

    } catch (err) {
        console.log(err);
    }
});

// ---------------- REACTIONS ----------------
client.on("messageReactionAdd", (reaction, user) => {
    if (user.bot) return;

    const g = db.giveaways[reaction.message.id];
    if (!g) return;

    if (reaction.emoji.name === "🎉") {
        if (!g.entries.includes(user.id)) {
            g.entries.push(user.id);
            saveDB();
        }
    }
});

// ---------------- GIVEAWAY END ----------------
function endGiveaway(id, channel) {
    const g = db.giveaways[id];
    if (!g) return;

    if (!g.entries.length) {
        channel.send("❌ No entries.");
        delete db.giveaways[id];
        saveDB();
        return;
    }

    const winner = g.entries[Math.floor(Math.random() * g.entries.length)];

    channel.send(`🎉 Winner: <@${winner}>`);

    delete db.giveaways[id];
    saveDB();
}

// ---------------- DURATION PARSER ----------------
function parseDuration(str) {
    if (!str) return null;

    const m = str.match(/(\d+)(s|m|h)/);
    if (!m) return null;

    const n = parseInt(m[1]);

    if (m[2] === "s") return n * 1000;
    if (m[2] === "m") return n * 60000;
    if (m[2] === "h") return n * 3600000;

    return null;
}

// ---------------- LOGIN ----------------
client.login(process.env.DISCORD_TOKEN);
