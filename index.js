const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const fs = require("fs");

const PREFIX = ",";

// ---------------- PERSISTENT STORAGE ----------------
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

// ---------------- COMMAND SYSTEM ----------------
const commands = new Map();

function add(name, fn) {
    commands.set(name, fn);
}

/* =========================================================
   💰 ECONOMY
========================================================= */

add("balance", (m) => {
    return m.reply(`💰 $${db.economy[m.author.id] || 0}`);
});

add("work", (m) => {
    const amount = Math.floor(Math.random() * 200) + 50;
    db.economy[m.author.id] = (db.economy[m.author.id] || 0) + amount;
    saveDB();
    return m.reply(`💼 +$${amount}`);
});

add("pay", (m, args) => {
    const user = m.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!user || isNaN(amount)) return m.reply("Usage: ,pay @user amount");

    db.economy[m.author.id] = (db.economy[m.author.id] || 0) - amount;
    db.economy[user.id] = (db.economy[user.id] || 0) + amount;
    saveDB();

    return m.reply(`💸 Sent $${amount} to ${user.username}`);
});

/* =========================================================
   📊 LEVELING
========================================================= */

add("rank", (m) => {
    const xp = db.xp[m.author.id] || 0;
    return m.reply(`📊 Level ${getLevel(xp)} | XP ${xp}`);
});

add("g.m", (m) => {
    const top = Object.entries(db.xp)
        .sort((a,b)=>b[1]-a[1])
        .slice(0,10);

    return m.channel.send(
        "🏆 **LEADERBOARD**\n\n" +
        top.map((u,i)=>`${i+1}. <@${u[0]}> — Level ${getLevel(u[1])}`).join("\n")
    );
});

/* =========================================================
   ⚠️ MODERATION
========================================================= */

add("warn", (m, args, member) => {
    if (!m.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
        return m.reply("❌ No permission.");

    if (!member) return m.reply("❌ Mention user.");

    db.warns[member.id] = (db.warns[member.id] || 0) + 1;
    saveDB();

    const count = db.warns[member.id];

    m.channel.send(`⚠️ ${member.user.tag} warned (${count}/4)`);

    if (count >= 4 && member.bannable) {
        member.ban({ reason: "4 warns" });
        db.warns[member.id] = 0;
        saveDB();
    }
});

add("kick", async (m, args, member) => {
    if (!m.member.permissions.has(PermissionsBitField.Flags.KickMembers))
        return;

    if (!member) return;

    const target = await m.guild.members.fetch(member.id).catch(() => null);
    if (!target || !target.kickable) return;

    await target.kick();
    return m.channel.send(`👢 Kicked ${target.user.tag}`);
});

add("ban", async (m, args, member) => {
    if (!m.member.permissions.has(PermissionsBitField.Flags.BanMembers))
        return;

    if (!member) return;

    const target = await m.guild.members.fetch(member.id).catch(() => null);
    if (!target || !target.bannable) return;

    await target.ban();
    return m.channel.send(`🔨 Banned ${target.user.tag}`);
});

add("unban", async (m, args) => {
    const id = args[0];
    if (!id) return;

    await m.guild.members.unban(id).catch(() => {});
    return m.channel.send(`✅ Unbanned <@${id}>`);
});

/* =========================================================
   🎮 GAMES
========================================================= */

add("coinflip", (m) => {
    return m.channel.send(Math.random() < 0.5 ? "🪙 Heads" : "🪙 Tails");
});

add("roll", (m) => {
    return m.channel.send(`🎲 ${Math.floor(Math.random()*100)+1}`);
});

add("8ball", (m) => {
    const a = ["Yes","No","Maybe","Definitely","Ask again","No idea"];
    return m.channel.send(`🎱 ${a[Math.floor(Math.random()*a.length)]}`);
});

/* =========================================================
   💖 FUN
========================================================= */

add("hug", (m) => m.channel.send(`🤗 ${m.author} hugs someone`));
add("kiss", (m) => m.channel.send(`💋 ${m.author} kisses someone`));
add("slap", (m) => m.channel.send(`👋 ${m.author} slaps someone`));
add("shoot", (m) => m.channel.send(`🔫 ${m.author} shoots someone 💥`));

/* =========================================================
   🎉 GIVEAWAY (BASIC)
========================================================= */

add("g.create", (m, args) => {
    const prize = args.join(" ");
    if (!prize) return m.reply("Usage: ,g.create prize");

    m.channel.send(`🎉 Giveaway: **${prize}**`);

    db.giveaways[m.id] = {
        prize,
        entries: []
    };

    saveDB();
});

add("g.reroll", (m, args) => {
    const g = db.giveaways[args[0]];
    if (!g || !g.entries.length) return m.reply("❌ No giveaway.");

    const winner = g.entries[Math.floor(Math.random() * g.entries.length)];
    m.channel.send(`🎉 Winner: <@${winner}>`);
});

/* =========================================================
   ⚙️ COMMAND HANDLER
========================================================= */

client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX).trim().split(/ +/);
    const cmd = (args.shift() || "").toLowerCase();

    const member = message.mentions.members.first();

    try {
        addXP(message.author.id);

        if (commands.has(cmd)) {
            return commands.get(cmd)(message, args, member);
        }

    } catch (err) {
        console.log(err);
    }
});

// ---------------- LOGIN ----------------
client.login(process.env.DISCORD_TOKEN);
