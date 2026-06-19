const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const { Pool } = require("pg");

const PREFIX = ",";

// PostgreSQL setup
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function query(text, params) {
    return pool.query(text, params);
}

// create table if not exists
(async () => {
    await query(`
        CREATE TABLE IF NOT EXISTS economy (
            user_id TEXT PRIMARY KEY,
            balance BIGINT DEFAULT 0
        )
    `);
})();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const cooldown = new Map();

// helper: get balance
async function getBalance(userId) {
    const res = await query("SELECT balance FROM economy WHERE user_id=$1", [userId]);
    if (res.rows.length === 0) {
        await query("INSERT INTO economy (user_id, balance) VALUES ($1, 0)", [userId]);
        return 0;
    }
    return parseInt(res.rows[0].balance);
}

// helper: add money
async function addBalance(userId, amount) {
    await query(`
        INSERT INTO economy (user_id, balance)
        VALUES ($1, $2)
        ON CONFLICT (user_id)
        DO UPDATE SET balance = economy.balance + $2
    `, [userId, amount]);
}

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    const user = message.mentions.users.first();
    const member = message.mentions.members.first();

    // cooldown
    const now = Date.now();
    const last = cooldown.get(message.author.id) || 0;
    if (now - last < 800) return;
    cooldown.set(message.author.id, now);

    // ---------------- COMMANDS ----------------
    if (cmd === "commands") {
        return message.channel.send(`
📜 **Commands**

❤️ Fun:
,hug @user
,kiss @user
,slap @user
,shoot @user

🎲 Games:
,coinflip
,roll
,8ball
,rps
,guess

🛡 Moderation:
,kick @user
,ban @user
,clear 10

🎭 Roles:
,r create name
,r @user role

💰 Economy:
,balance
,daily
,work
,gamble 10
,rob @user
        `);
    }

    // ---------------- FUN ----------------
    if (cmd === "hug") return message.channel.send(`🤗 ${message.author} hugs ${user || "someone"}`);
    if (cmd === "kiss") return message.channel.send(`💋 ${message.author} kisses ${user || "someone"}`);
    if (cmd === "slap") return message.channel.send(`👋 ${message.author} slaps ${user || "someone"}`);
    if (cmd === "shoot") return message.channel.send(`🔫 ${message.author} shoots ${user || "someone"}`);

    // ---------------- GAMES ----------------
    if (cmd === "coinflip") {
        return message.channel.send(Math.random() < 0.5 ? "🪙 Heads" : "🪙 Tails");
    }

    if (cmd === "roll") {
        return message.channel.send(`🎲 ${Math.floor(Math.random() * 100) + 1}`);
    }

    if (cmd === "8ball") {
        const answers = ["Yes", "No", "Maybe", "Definitely", "Ask again"];
        return message.channel.send(`🎱 ${answers[Math.floor(Math.random() * answers.length)]}`);
    }

    // ---------------- MODERATION ----------------
    if (cmd === "kick") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
            return message.reply("No permission");

        if (!member) return message.reply("Mention user");
        await member.kick();
        return message.channel.send(`👢 Kicked ${member.user.tag}`);
    }

    if (cmd === "ban") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
            return message.reply("No permission");

        if (!member) return message.reply("Mention user");
        await member.ban();
        return message.channel.send(`🔨 Banned ${member.user.tag}`);
    }

    if (cmd === "clear") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
            return message.reply("No permission");

        const amount = parseInt(args[0]);
        if (!amount) return message.reply("Enter number");

        await message.channel.bulkDelete(amount);
        return message.channel.send(`🧹 Deleted ${amount} messages`);
    }

    // ---------------- ROLE SYSTEM ----------------
    if (cmd === "r") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
            return message.reply("No permission");

        if (args[0] === "create") {
            const roleName = args.slice(1).join(" ");
            await message.guild.roles.create({ name: roleName });
            return message.channel.send(`🎭 Created role ${roleName}`);
        }

        const roleName = args.slice(1).join(" ");
        const role = message.guild.roles.cache.find(r => r.name === roleName);
        if (!role) return message.reply("Role not found");

        if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role);
            return message.channel.send(`➖ Removed role`);
        } else {
            await member.roles.add(role);
            return message.channel.send(`➕ Added role`);
        }
    }

    // ---------------- ECONOMY ----------------
    if (cmd === "balance") {
        const bal = await getBalance(message.author.id);
        return message.channel.send(`💰 ${bal} coins`);
    }

    if (cmd === "daily") {
        const amount = Math.floor(Math.random() * 500) + 100;
        await addBalance(message.author.id, amount);
        return message.channel.send(`💰 You got ${amount}`);
    }

    if (cmd === "work") {
        const amount = Math.floor(Math.random() * 200) + 50;
        await addBalance(message.author.id, amount);
        return message.channel.send(`💼 You worked and earned ${amount}`);
    }

    if (cmd === "gamble") {
        const amount = parseInt(args[0]);
        if (!amount) return message.reply("Enter amount");

        const win = Math.random() > 0.5;

        if (win) {
            await addBalance(message.author.id, amount);
            return message.channel.send(`🎉 You won ${amount}`);
        } else {
            await addBalance(message.author.id, -amount);
            return message.channel.send(`💀 You lost ${amount}`);
        }
    }
});

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);