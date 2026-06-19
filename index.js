const {
    Client,
    GatewayIntentBits,
    PermissionsBitField
} = require("discord.js");

const { Pool } = require("pg");

// ---------------- DATABASE ----------------
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = ",";

// ---------------- GIVEAWAYS ----------------
const giveaways = new Map();

// ---------------- READY ----------------
client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// ---------------- DB HELPERS ----------------
async function getUser(id) {
    const res = await db.query(
        "SELECT * FROM users WHERE user_id=$1",
        [id]
    );
    return res.rows[0];
}

async function createUser(id) {
    await db.query(`
        INSERT INTO users (user_id, balance, hugs, kisses, slaps, shoots, warns)
        VALUES ($1, 0, 0, 0, 0, 0, 0)
        ON CONFLICT (user_id) DO NOTHING
    `, [id]);
}

async function addMoney(id, amt) {
    await createUser(id);
    await db.query(`
        UPDATE users SET balance = balance + $2 WHERE user_id=$1
    `, [id, amt]);
}

async function addStat(id, field) {
    await createUser(id);
    await db.query(`
        UPDATE users SET ${field} = ${field} + 1 WHERE user_id=$1
    `, [id]);
}

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
`📜 **BOT COMMANDS**

💰 Economy:
,balance
,work
,leaderboard

💖 Fun (tracked):
,hug
,kiss
,slap
,shoot

🛡 Moderation:
,warn
,kick
,ban

🎉 Giveaway:
,g create
,g reroll`
            );
        }

        // ---------------- ECONOMY ----------------
        if (cmd === "balance") {
            const u = await getUser(message.author.id);
            return message.reply(`💰 $${u?.balance || 0}`);
        }

        if (cmd === "work") {
            const amt = Math.floor(Math.random() * 200) + 50;
            await addMoney(message.author.id, amt);
            return message.reply(`💼 +$${amt}`);
        }

        // ---------------- LEADERBOARD ----------------
        if (cmd === "leaderboard") {
            const res = await db.query(
                "SELECT user_id, balance FROM users ORDER BY balance DESC LIMIT 10"
            );

            let msg = "🏆 **LEADERBOARD**\n\n";

            res.rows.forEach((u, i) => {
                msg += `${i + 1}. <@${u.user_id}> - $${u.balance}\n`;
            });

            return message.channel.send(msg);
        }

        // ---------------- FUN (WITH COUNTERS) ----------------
        if (cmd === "hug") {
            await addStat(message.author.id, "hugs");
            return message.channel.send(`🤗 ${message.author} hugs ${user || "someone"}`);
        }

        if (cmd === "kiss") {
            await addStat(message.author.id, "kisses");
            return message.channel.send(`💋 ${message.author} kisses ${user || "someone"}`);
        }

        if (cmd === "slap") {
            await addStat(message.author.id, "slaps");
            return message.channel.send(`👋 ${message.author} slaps ${user || "someone"}`);
        }

        if (cmd === "shoot") {
            await addStat(message.author.id, "shoots");
            return message.channel.send(`🔫 ${message.author} shoots ${user || "someone"} 💥`);
        }

        // ---------------- WARN SYSTEM ----------------
        if (cmd === "warn") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                return message.reply("❌ No permission.");
            }

            if (!member) return message.reply("Mention someone.");

            const reason = args.slice(1).join(" ") || "No reason";

            await db.query(`
                UPDATE users SET warns = warns + 1 WHERE user_id=$1
            `, [member.id]);

            const u = await getUser(member.id);

            message.channel.send(`⚠️ Warned ${member.user.tag} (${u.warns}/4)`);

            if (u.warns >= 4) {
                await member.ban({ reason: "4 warns" });
                await db.query(`UPDATE users SET warns = 0 WHERE user_id=$1`, [member.id]);
                message.channel.send(`🔨 Auto-banned ${member.user.tag}`);
            }
        }

        // ---------------- GIVEAWAY SYSTEM ----------------
        if (cmd === "g") {

            if (args[0] === "create") {

                const prize = await ask(message, "🎁 Prize?");
                const duration = await ask(message, "⏱ Duration? (1m 10m 1h)");
                const req = await ask(message, "📋 Requirements? (or none)");

                const ms = parseDuration(duration);
                if (!ms) return message.reply("❌ Invalid duration");

                const end = Date.now() + ms;

                const msg = await message.channel.send(
`🎉 **GIVEAWAY**

🎁 Prize: ${prize}
📋 Req: ${req}
⏱ Ends: <t:${Math.floor(end / 1000)}:R>

React 🎉 to join!`
                );

                await msg.react("🎉");

                giveaways.set(msg.id, {
                    prize,
                    entries: new Set(),
                    end
                });

                setTimeout(() => endGiveaway(msg.id, message.channel), ms);

                return;
            }

            if (args[0] === "reroll") {
                const id = args[1];
                const g = giveaways.get(id);

                if (!g) return message.reply("❌ Not found");

                const users = [...g.entries];
                const winner = users[Math.floor(Math.random() * users.length)];

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

    const g = giveaways.get(reaction.message.id);
    if (!g) return;

    if (reaction.emoji.name === "🎉") {
        g.entries.add(user.id);
    }
});

// ---------------- HELPERS ----------------
async function ask(message, q) {
    await message.channel.send(q);

    const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000
    });

    return collected.first()?.content;
}

function parseDuration(str) {
    const m = str.match(/(\d+)(s|m|h)/);
    if (!m) return null;

    const n = parseInt(m[1]);
    if (m[2] === "s") return n * 1000;
    if (m[2] === "m") return n * 60000;
    if (m[2] === "h") return n * 3600000;
}

async function endGiveaway(id, channel) {
    const g = giveaways.get(id);
    if (!g) return;

    const users = [...g.entries];
    if (!users.length) return channel.send("❌ No entries");

    const winner = users[Math.floor(Math.random() * users.length)];

    channel.send(`🎉 Winner: <@${winner}>`);
    giveaways.delete(id);
}

// ---------------- LOGIN ----------------
client.login(process.env.DISCORD_TOKEN);
