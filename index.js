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

// load saved data
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

🎉 Giveaway:
,g create

💖 Fun:
,hug
,kiss
,slap
,shoot`
            );
        }

        // ---------------- ECONOMY (PERSISTENT) ----------------
        if (cmd === "balance") {
            const bal = db.economy[message.author.id] || 0;
            return message.reply(`💰 $${bal}`);
        }

        if (cmd === "work") {
            const amount = Math.floor(Math.random() * 200) + 50;

            db.economy[message.author.id] =
                (db.economy[message.author.id] || 0) + amount;

            saveDB();

            return message.reply(`💼 +$${amount}`);
        }

        // ---------------- WARN SYSTEM (FIXED) ----------------
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

        // ---------------- FUN ----------------
        if (cmd === "hug") return message.channel.send(`🤗 ${message.author} hugs ${user || "someone"}`);
        if (cmd === "kiss") return message.channel.send(`💋 ${message.author} kisses ${user || "someone"}`);
        if (cmd === "slap") return message.channel.send(`👋 ${message.author} slaps ${user || "someone"}`);
        if (cmd === "shoot") return message.channel.send(`🔫 ${message.author} shoots ${user || "someone"} 💥`);

        // ---------------- GIVEAWAY (FIXED INPUT FORMAT) ----------------
        if (cmd === "g") {

            if (args[0] === "create") {

                await message.channel.send(
`🎉 Setup Giveaway:

Format:
prize | duration | requirements

Example:
Nitro | 10m | none`
                );

                const collected = await message.channel.awaitMessages({
                    filter: m => m.author.id === message.author.id,
                    max: 1,
                    time: 60000
                });

                if (!collected.size) return message.reply("❌ Timed out.");

                const input = collected.first().content.split("|").map(x => x.trim());

                const prize = input[0];
                const duration = input[1];
                const req = input[2] || "none";

                const ms = parseDuration(duration);
                if (!ms) return message.reply("❌ Invalid duration");

                const msg = await message.channel.send(
`🎉 **GIVEAWAY**

🎁 Prize: ${prize}
📋 Req: ${req}
⏱ Ends soon

React 🎉 to join!`
                );

                await msg.react("🎉");

                db.giveaways[msg.id] = {
                    entries: []
                };

                saveDB();

                setTimeout(() => {
                    endGiveaway(msg.id, message.channel);
                }, ms);

                return;
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
        return channel.send("❌ No entries.");
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
}

// ---------------- LOGIN ----------------
client.login(process.env.DISCORD_TOKEN);
