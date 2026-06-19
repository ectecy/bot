const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const fs = require("fs");

const PREFIX = ",";

/* =========================================================
   📦 PERSISTENT STORAGE
========================================================= */

let db = {
    economy: {},
    warns: {},
    giveaways: {},
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
    console.log(`Logged in as ${client.user.tag}`);
});

/* =========================================================
   💬 MESSAGE HANDLER
========================================================= */

client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = (args.shift() || "").toLowerCase();

    const user = message.mentions.users.first();
    const member = message.mentions.members.first();

    try {

        addXP(message.author.id);

        /* ================= COMMANDS ================= */
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

🎭 Roles:
,r create
,r color
,r add
,r remove
,r delete

🎉 Giveaway:
,g create
,g reroll

📊 Leveling:
,rank
,g.m

💖 Fun:
,hug
,kiss
,slap
,shoot`
            );
        }

        /* ================= GIVEAWAYS (FIXED) ================= */
        if (cmd === "g") {
            const sub = args[0];

            // CREATE GIVEAWAY
            if (sub === "create") {
                const prize = args.slice(1).join(" ");
                if (!prize) return message.reply("❌ Usage: ,g create <prize>");

                const msg = await message.channel.send(
`🎉 **GIVEAWAY**

🎁 Prize: **${prize}**
👤 Hosted by: ${message.author}

React with 🎉 to enter!`
                );

                await msg.react("🎉");

                db.giveaways[msg.id] = {
                    prize,
                    entries: []
                };

                saveDB();
                return;
            }

            // REROLL GIVEAWAY
            if (sub === "reroll") {
                const msgId = args[1];
                if (!msgId) return message.reply("❌ Usage: ,g reroll <messageID>");

                const giveaway = db.giveaways[msgId];
                if (!giveaway) return message.reply("❌ Giveaway not found.");

                const entries = giveaway.entries;

                if (!entries || entries.length === 0) {
                    return message.reply("❌ No entries found.");
                }

                const winner = entries[Math.floor(Math.random() * entries.length)];

                return message.channel.send(`🎉 New winner: <@${winner}>`);
            }
        }

        /* ================= GIVEAWAY TRACKING ================= */
        client.on("messageReactionAdd", (reaction, user) => {
            if (user.bot) return;

            const giveaway = db.giveaways[reaction.message.id];
            if (!giveaway) return;

            if (reaction.emoji.name === "🎉") {
                if (!giveaway.entries.includes(user.id)) {
                    giveaway.entries.push(user.id);
                    saveDB();
                }
            }
        });

        /* ================= OTHER COMMANDS ================= */

        if (cmd === "rank") {
            const xp = db.xp[message.author.id] || 0;
            const level = getLevel(xp);
            return message.reply(`📊 Level: **${level}** | ⭐ XP: **${xp}**`);
        }

        if (cmd === "g.m") {
            const sorted = Object.entries(db.xp)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            if (!sorted.length) return message.channel.send("❌ No XP data yet.");

            let msg = "🏆 **LEVEL LEADERBOARD**\n\n";

            sorted.forEach((u, i) => {
                const xp = u[1];
                const level = getLevel(xp);
                msg += `${i + 1}. <@${u[0]}> — Level ${level} (${xp} XP)\n`;
            });

            return message.channel.send(msg);
        }

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

        if (cmd === "warn") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                return message.reply("❌ No permission.");
            }

            if (!member) return message.reply("❌ Mention someone.");

            const reason = args.join(" ") || "No reason";

            db.warns[member.id] = (db.warns[member.id] || 0) + 1;
            saveDB();

            const count = db.warns[member.id];

            message.channel.send(
                `⚠️ ${member.user.tag} warned (${count}/4)\nReason: ${reason}`
            );
        }

        if (cmd === "kick") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return;
            const target = await message.guild.members.fetch(member.id).catch(() => null);
            if (!target) return;
            await target.kick();
            return message.channel.send(`👢 Kicked **${target.user.tag}**`);
        }

        if (cmd === "ban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
            const target = await message.guild.members.fetch(member.id).catch(() => null);
            if (!target) return;
            await target.ban();
            return message.channel.send(`🔨 Banned **${target.user.tag}**`);
        }

        if (cmd === "unban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
            const userId = args[0];
            await message.guild.members.unban(userId);
            return message.channel.send(`✅ Unbanned <@${userId}>`);
        }

        if (cmd === "hug") return message.channel.send(`🤗 ${message.author} hugs ${user || "someone"}`);
        if (cmd === "kiss") return message.channel.send(`💋 ${message.author} kisses ${user || "someone"}`);
        if (cmd === "slap") return message.channel.send(`👋 ${message.author} slaps ${user || "someone"}`);
        if (cmd === "shoot") return message.channel.send(`🔫 ${message.author} shoots ${user || "someone"} 💥`);

    } catch (err) {
        console.log(err);
    }
});

/* =========================================================
   🔐 LOGIN
========================================================= */

client.login(process.env.DISCORD_TOKEN);
