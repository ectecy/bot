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

        /* ================= COMMAND LIST ================= */
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

        /* =========================================================
           ⚠️ FIXED WARN SYSTEM (BUG FIXED)
        ========================================================= */
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
                const target = await message.guild.members.fetch(member.id).catch(() => null);

                if (target && target.bannable) {
                    await target.ban({ reason: "4 warns" }).catch(() => {});
                    db.warns[member.id] = 0;
                    saveDB();
                    message.channel.send(`🔨 Auto-banned ${member.user.tag}`);
                }
            }
        }

        /* =========================================================
           🔧 FIXED KICK / BAN (ROLE HIERARCHY BUG FIXED)
        ========================================================= */

        if (cmd === "kick") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                return message.reply("❌ No permission.");
            }

            if (!member) return message.reply("❌ Mention a user.");

            const target = await message.guild.members.fetch(member.id).catch(() => null);
            if (!target) return message.reply("❌ User not found.");

            if (!target.kickable) return message.reply("❌ I cannot kick this user.");

            await target.kick();
            return message.channel.send(`👢 Kicked **${target.user.tag}**`);
        }

        if (cmd === "ban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return message.reply("❌ No permission.");
            }

            if (!member) return message.reply("❌ Mention a user.");

            const target = await message.guild.members.fetch(member.id).catch(() => null);
            if (!target) return message.reply("❌ User not found.");

            if (!target.bannable) return message.reply("❌ I cannot ban this user.");

            await target.ban();
            return message.channel.send(`🔨 Banned **${target.user.tag}**`);
        }

        if (cmd === "unban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return message.reply("❌ No permission.");
            }

            const userId = args[0];
            if (!userId) return message.reply("Usage: ,unban <userID>");

            await message.guild.members.unban(userId);
            return message.channel.send(`✅ Unbanned <@${userId}>`);
        }

        /* =========================================================
           🎭 FIXED ROLE SYSTEM (THIS WAS YOUR MAIN ISSUE)
        ========================================================= */
        if (cmd === "r") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                return message.reply("❌ No permission.");
            }

            const sub = args[0];

            if (sub === "create") {
                const name = args.slice(1).join(" ");
                const role = await message.guild.roles.create({ name });
                return message.channel.send(`🎭 Created role **${role.name}**`);
            }

            if (sub === "color") {
                const hex = args[1];
                const roleName = args.slice(2).join(" ");

                const role = message.guild.roles.cache.find(r => r.name === roleName);
                if (!role) return message.reply("❌ Role not found.");

                await role.setColor(hex);
                return message.channel.send(`🎨 Updated **${role.name}** color`);
            }

            if (sub === "add") {
                const target = message.mentions.members.first();
                const roleName = args.slice(2).join(" ");

                const role = message.guild.roles.cache.find(r => r.name === roleName);
                if (!role || !target) return message.reply("❌ Missing role or user.");

                await target.roles.add(role);
                return message.channel.send(`➕ Added **${role.name}** to ${target.user.tag}`);
            }

            if (sub === "remove") {
                const target = message.mentions.members.first();
                const roleName = args.slice(2).join(" ");

                const role = message.guild.roles.cache.find(r => r.name === roleName);
                if (!role || !target) return message.reply("❌ Missing role or user.");

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

            return message.reply("❌ Usage: create, color, add, remove, delete");
        }

    } catch (err) {
        console.log(err);
    }
});

/* =========================================================
   🔐 LOGIN
========================================================= */

client.login(process.env.DISCORD_TOKEN);
