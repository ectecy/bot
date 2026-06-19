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
   🎉 GIVEAWAYS HELPERS
========================================================= */

function parseDuration(str) {
    if (!str) return 0;

    const match = str.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return 0;

    const time = parseInt(match[1]);
    const unit = match[2];

    const map = {
        s: 1000,
        m: 60000,
        h: 3600000,
        d: 86400000
    };

    return time * map[unit];
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

        /* ================= RANK ================= */
        if (cmd === "rank") {
            const xp = db.xp[message.author.id] || 0;
            const level = getLevel(xp);
            return message.reply(`📊 Level: **${level}** | ⭐ XP: **${xp}**`);
        }

        /* ================= LEADERBOARD ================= */
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

        /* ================= ECONOMY ================= */
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

        /* ================= MODERATION FIXED ================= */

        if (cmd === "kick") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
                return message.reply("❌ No permission.");

            const target = member;
            if (!target) return message.reply("❌ Mention a user.");

            const fetched = await message.guild.members.fetch(target.id).catch(() => null);
            if (!fetched) return message.reply("❌ User not found.");

            if (!fetched.kickable) return message.reply("❌ Cannot kick this user.");

            await fetched.kick();
            return message.channel.send(`👢 Kicked **${fetched.user.tag}**`);
        }

        if (cmd === "ban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
                return message.reply("❌ No permission.");

            const target = member;
            if (!target) return message.reply("❌ Mention a user.");

            const fetched = await message.guild.members.fetch(target.id).catch(() => null);
            if (!fetched) return message.reply("❌ User not found.");

            if (!fetched.bannable) return message.reply("❌ Cannot ban this user.");

            await fetched.ban();
            return message.channel.send(`🔨 Banned **${fetched.user.tag}**`);
        }

        if (cmd === "unban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
                return message.reply("❌ No permission.");

            const userId = args[0];
            if (!userId) return message.reply("Usage: ,unban <userID>");

            await message.guild.members.unban(userId);
            return message.channel.send(`✅ Unbanned <@${userId}>`);
        }

        /* ================= ROLE SYSTEM FIXED ================= */

        if (cmd === "r") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
                return message.reply("❌ No permission.");

            const sub = args[0];

            if (sub === "create") {
                const name = args.slice(1).join(" ");
                if (!name) return message.reply("❌ Role name required.");

                const role = await message.guild.roles.create({ name });
                return message.channel.send(`🎭 Created **${role.name}**`);
            }

            if (sub === "color") {
                const hex = args[1];
                const roleName = args.slice(2).join(" ");

                const role = message.guild.roles.cache.find(r => r.name === roleName);
                if (!role) return message.reply("❌ Role not found.");

                await role.setColor(hex);
                return message.channel.send(`🎨 Updated **${role.name}**`);
            }

            if (sub === "add") {
                const target = member;
                const roleName = args.slice(2).join(" ");

                const role = message.guild.roles.cache.find(r => r.name === roleName);
                if (!target || !role) return message.reply("❌ Missing user or role.");

                await target.roles.add(role);
                return message.channel.send(`➕ Added **${role.name}** to ${target.user.tag}`);
            }

            if (sub === "remove") {
                const target = member;
                const roleName = args.slice(2).join(" ");

                const role = message.guild.roles.cache.find(r => r.name === roleName);
                if (!target || !role) return message.reply("❌ Missing user or role.");

                await target.roles.remove(role);
                return message.channel.send(`➖ Removed **${role.name}** from ${target.user.tag}`);
            }

            if (sub === "delete") {
                const roleName = args.slice(1).join(" ");

                const role = message.guild.roles.cache.find(r => r.name === roleName);
                if (!role) return message.reply("❌ Role not found.");

                await role.delete();
                return message.channel.send(`🗑️ Deleted **${role.name}**`);
            }
        }

        /* ================= GIVEAWAYS FIXED ================= */

        if (cmd === "g") {
            const sub = args[0];

            if (sub === "create") {
                const duration = args[1];
                const prize = args[2];
                const requirement = args.slice(3).join(" ") || "None";

                if (!duration || !prize)
                    return message.reply("Usage: ,g create <time> <prize> [requirement]");

                const ms = parseDuration(duration);
                if (!ms) return message.reply("❌ Invalid duration (s/m/h/d)");

                const giveawayId = Date.now().toString();

                const msg = await message.channel.send(
`🎉 **GIVEAWAY**
Prize: **${prize}**
Requirement: ${requirement}
Ends in: ${duration}

React 🎉 to enter!`
                );

                await msg.react("🎉");

                db.giveaways[giveawayId] = {
                    messageId: msg.id,
                    channelId: message.channel.id,
                    prize,
                    endsAt: Date.now() + ms
                };

                saveDB();

                setTimeout(async () => {
                    const fetched = await message.channel.messages.fetch(msg.id).catch(() => null);
                    if (!fetched) return;

                    const users = await fetched.reactions.cache.get("🎉")?.users.fetch();
                    if (!users) return;

                    const valid = users.filter(u => !u.bot);
                    const winner = valid.random();

                    if (winner) {
                        message.channel.send(`🏆 Winner: ${winner} won **${prize}**`);
                    }
                }, ms);
            }

            if (sub === "reroll") {
                const messageId = args[1];
                if (!messageId) return message.reply("Usage: ,g reroll <messageId>");

                const msg = await message.channel.messages.fetch(messageId).catch(() => null);
                if (!msg) return message.reply("❌ Giveaway not found.");

                const users = await msg.reactions.cache.get("🎉")?.users.fetch();
                const valid = users?.filter(u => !u.bot);

                const winner = valid?.random();
                if (!winner) return message.reply("❌ No valid entries.");

                return message.channel.send(`🔁 New winner: ${winner}`);
            }
        }

        /* ================= FUN ================= */

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
