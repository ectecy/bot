const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const fs = require("fs");

const PREFIX = ",";

/* =========================================================
   📦 DATABASE
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
   🎉 GIVEAWAY SYSTEM (FIXED)
========================================================= */

function parseDuration(str) {
    if (!str) return 0;
    const match = str.match(/(\d+)(s|m|h|d)/);
    if (!match) return 0;

    const num = parseInt(match[1]);
    const type = match[2];

    if (type === "s") return num * 1000;
    if (type === "m") return num * 60 * 1000;
    if (type === "h") return num * 60 * 60 * 1000;
    if (type === "d") return num * 24 * 60 * 60 * 1000;

    return 0;
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

        /* ================= GIVEAWAY (FIXED) ================= */

        if (cmd === "g") {
            const sub = args[0];

            // CREATE GIVEAWAY
            if (sub === "create") {
                const prize = args[1];
                const duration = parseDuration(args[2]);
                const req = args.slice(3).join(" ") || "None";

                if (!prize || !duration) {
                    return message.reply("Usage: ,g create <prize> <duration> <requirement>");
                }

                const end = Date.now() + duration;

                const gw = await message.channel.send(
`🎉 **GIVEAWAY**

🏆 Prize: **${prize}**
📌 Requirement: **${req}**
⏰ Ends: <t:${Math.floor(end / 1000)}:R>

React 🎉 to enter!`
                );

                await gw.react("🎉");

                db.giveaways[gw.id] = { prize, end, channelId: message.channel.id };
                saveDB();

                setTimeout(async () => {
                    try {
                        const msg = await message.channel.messages.fetch(gw.id);
                        const reaction = msg.reactions.cache.get("🎉");

                        if (!reaction) {
                            return message.channel.send("❌ No entries for giveaway.");
                        }

                        const users = await reaction.users.fetch();
                        const valid = users.filter(u => !u.bot);

                        const winner = valid.random();
                        if (!winner) {
                            return message.channel.send("❌ No valid winner.");
                        }

                        message.channel.send(`🏆 Winner: ${winner} | Prize: **${prize}**`);

                        delete db.giveaways[gw.id];
                        saveDB();

                    } catch (err) {
                        console.log("Giveaway error:", err);
                    }
                }, duration);
            }

            // REROLL GIVEAWAY
            if (sub === "reroll") {
                const messageId = args[1];

                if (!messageId) {
                    return message.reply("Usage: ,g reroll <messageID>");
                }

                try {
                    const msg = await message.channel.messages.fetch(messageId);
                    const reaction = msg.reactions.cache.get("🎉");

                    if (!reaction) {
                        return message.reply("❌ No reactions found.");
                    }

                    const users = await reaction.users.fetch();
                    const valid = users.filter(u => !u.bot);

                    const winner = valid.random();
                    if (!winner) {
                        return message.channel.send("❌ No valid entries.");
                    }

                    return message.channel.send(`🔁 New winner: ${winner}`);

                } catch (err) {
                    console.log(err);
                    return message.reply("❌ Could not reroll giveaway.");
                }
            }
        }

        /* ================= (YOUR OTHER COMMANDS STAY EXACTLY SAME) ================= */

    } catch (err) {
        console.log(err);
    }
});

/* =========================================================
   🔐 LOGIN
========================================================= */

client.login(process.env.DISCORD_TOKEN);
