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
            return message.reply(`📊 Level: **${getLevel(xp)}** | ⭐ XP: **${xp}**`);
        }

        /* ================= LEADERBOARD ================= */
        if (cmd === "g.m") {
            const sorted = Object.entries(db.xp)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            if (!sorted.length) return message.channel.send("❌ No XP data yet.");

            let msg = "🏆 **LEVEL LEADERBOARD**\n\n";

            sorted.forEach((u, i) => {
                msg += `${i + 1}. <@${u[0]}> — Level ${getLevel(u[1])} (${u[1]} XP)\n`;
            });

            return message.channel.send(msg);
        }

        /* ================= ECONOMY ================= */
        if (cmd === "balance") {
            return message.reply(`💰 $${db.economy[message.author.id] || 0}`);
        }

        if (cmd === "work") {
            const amount = Math.floor(Math.random() * 200) + 50;
            db.economy[message.author.id] = (db.economy[message.author.id] || 0) + amount;
            saveDB();
            return message.reply(`💼 +$${amount}`);
        }

        /* ================= WARN (FIXED) ================= */
        if (cmd === "warn") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
                return message.reply("❌ No permission.");

            if (!member) return message.reply("❌ Mention someone.");

            const reason = args.join(" ") || "No reason";

            db.warns[member.id] = (db.warns[member.id] || 0) + 1;
            saveDB();

            const count = db.warns[member.id];

            message.channel.send(`⚠️ ${member.user.tag} warned (${count}/4)\nReason: ${reason}`);

            if (count >= 4) {
                const target = await message.guild.members.fetch(member.id).catch(() => null);
                if (target && target.bannable) {
                    await target.ban({ reason: "4 warns" }).catch(() => {});
                    db.warns[member.id] = 0;
                    saveDB();
                }
            }
        }

        /* ================= MODERATION (FIXED) ================= */

        if (cmd === "kick") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
                return message.reply("❌ No permission.");

            if (!member) return message.reply("❌ Mention a user.");

            const target = await message.guild.members.fetch(member.id).catch(() => null);
            if (!target) return message.reply("❌ User not found.");
            if (!target.kickable) return message.reply("❌ Cannot kick this user.");

            await target.kick();
            return message.channel.send(`👢 Kicked **${target.user.tag}**`);
        }

        if (cmd === "ban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
                return message.reply("❌ No permission.");

            if (!member) return message.reply("❌ Mention a user.");

            const target = await message.guild.members.fetch(member.id).catch(() => null);
            if (!target) return message.reply("❌ User not found.");
            if (!target.bannable) return message.reply("❌ Cannot ban this user.");

            await target.ban();
            return message.channel.send(`🔨 Banned **${target.user.tag}**`);
        }

        if (cmd === "unban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
                return message.reply("❌ No permission.");

            const userId = args[0];
            if (!userId) return message.reply("Usage: ,unban <userID>");

            await message.guild.members.unban(userId);
            return message.channel.send(`✅ Unbanned <@${userId}>`);
        }

        /* ================= FUN (FIXED WORKING ALWAYS) ================= */

        if (cmd === "hug") return message.channel.send(`🤗 ${message.author} hugs ${user?.toString() || "someone"}`);
        if (cmd === "kiss") return message.channel.send(`💋 ${message.author} kisses ${user?.toString() || "someone"}`);
        if (cmd === "slap") return message.channel.send(`👋 ${message.author} slaps ${user?.toString() || "someone"}`);
        if (cmd === "shoot") return message.channel.send(`🔫 ${message.author} shoots ${user?.toString() || "someone"} 💥`);

        /* ================= ROLE SYSTEM (FIXED) ================= */

        if (cmd === "r") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
                return message.reply("❌ No permission.");

            const sub = args[0];

            if (sub === "create") {
                const name = args.slice(1).join(" ");
                const role = await message.guild.roles.create({ name });
                return message.channel.send(`🎭 Created role **${role.name}**`);
            }

            if (sub === "color") {
                const roleName = args.slice(1).join(" ");
                const color = args[1];

                const role = message.guild.roles.cache.find(r => r.name === roleName);
                if (!role) return message.reply("❌ Role not found.");

                await role.setColor(color);
                return message.channel.send(`🎨 Updated color for **${role.name}**`);
            }

            if (sub === "add") {
                const target = message.mentions.members.first();
                const roleName = args.slice(2).join(" ");
                const role = message.guild.roles.cache.find(r => r.name === roleName);

                if (!target || !role) return message.reply("❌ Missing user/role.");

                await target.roles.add(role);
                return message.channel.send(`➕ Added **${role.name}** to ${target.user.tag}`);
            }

            if (sub === "remove") {
                const target = message.mentions.members.first();
                const roleName = args.slice(2).join(" ");
                const role = message.guild.roles.cache.find(r => r.name === roleName);

                if (!target || !role) return message.reply("❌ Missing user/role.");

                await target.roles.remove(role);
                return message.channel.send(`➖ Removed **${role.name}** from ${target.user.tag}`);
            }

            if (sub === "delete") {
                const roleName = args.slice(1).join(" ");
                const role = message.guild.roles.cache.find(r => r.name === roleName);

                if (!role) return message.reply("❌ Role not found.");

                await role.delete();
                return message.channel.send(`🗑️ Deleted role **${role.name}**`);
            }
        }

        /* ================= GIVEAWAY (FIXED) ================= */

        if (cmd === "g") {
            const sub = args[0];

            if (sub === "create") {
                const prize = args[1];
                const duration = parseDuration(args[2]);
                const req = args.slice(3).join(" ") || "None";

                if (!prize || !duration) return message.reply("Usage: ,g create <prize> <duration> <req>");

                const end = Date.now() + duration;

                const gw = await message.channel.send(
`🎉 GIVEAWAY 🎉

Prize: **${prize}**
Requirement: **${req}**
Ends: <t:${Math.floor(end / 1000)}:R>

React 🎉 to enter!`
                );

                await gw.react("🎉");

                db.giveaways[gw.id] = {
                    prize,
                    end,
                    channelId: message.channel.id
                };

                saveDB();

                setTimeout(async () => {
                    const msg = await message.channel.messages.fetch(gw.id).catch(() => null);
                    if (!msg) return;

                    const users = await msg.reactions.cache.get("🎉").users.fetch();
                    const filtered = users.filter(u => !u.bot);

                    const winner = filtered.random();
                    if (!winner) return message.channel.send("No valid entries.");

                    message.channel.send(`🏆 Winner: ${winner} | Prize: **${prize}**`);
                }, duration);
            }

            if (sub === "reroll") {
                const messageId = args[1];
                const gw = await message.channel.messages.fetch(messageId).catch(() => null);
                if (!gw) return message.reply("❌ Giveaway not found.");

                const users = await gw.reactions.cache.get("🎉").users.fetch();
                const filtered = users.filter(u => !u.bot);

                const winner = filtered.random();
                if (!winner) return message.channel.send("No valid entries.");

                return message.channel.send(`🔁 New winner: ${winner}`);
            }
        }

    } catch (err) {
        console.log(err);
    }
});

/* =========================================================
   🔐 LOGIN
========================================================= */

client.login(process.env.DISCORD_TOKEN);
