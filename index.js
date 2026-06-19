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
   🎉 GIVEAWAY HELPERS
========================================================= */

/* ================= GIVEAWAY (FIXED) ================= */

if (cmd === "g") {
    const sub = args[0];

    /* ---------------- CREATE ---------------- */
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

        db.giveaways[gw.id] = {
            prize,
            end,
            channelId: message.channel.id
        };

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

    /* ---------------- REROLL ---------------- */
    if (sub === "reroll") {
        const messageId = args[1];

        if (!messageId) {
            return message.reply("Usage: ,g reroll <messageID>");
        }

        try {
            const msg = await message.channel.messages.fetch(messageId);
            const reaction = msg.reactions.cache.get("🎉");

            if (!reaction) {
                return message.reply("❌ No reactions found on this giveaway.");
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
    if (!message.guild || message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = (args.shift() || "").toLowerCase();

    const member = message.mentions.members.first();
    const user = message.mentions.users.first();

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

🔒 Channel:
,lock
,unlock

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

        /* ================= LOCK / UNLOCK ================= */

        if (cmd === "lock") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
                return message.reply("❌ No permission.");

            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: false
            });

            return message.channel.send("🔒 Channel locked.");
        }

        if (cmd === "unlock") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
                return message.reply("❌ No permission.");

            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: true
            });

            return message.channel.send("🔓 Channel unlocked.");
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

            for (const [id, xp] of sorted) {
                msg += `• <@${id}> — Level ${getLevel(xp)} (${xp} XP)\n`;
            }

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

        /* ================= WARN (FIXED SAFE) ================= */

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

        /* ================= KICK (FIXED SAFE) ================= */

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

        /* ================= BAN (FIXED SAFE) ================= */

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

        /* ================= UNBAN ================= */

        if (cmd === "unban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
                return message.reply("❌ No permission.");

            const userId = args[0];
            if (!userId) return message.reply("Usage: ,unban <userID>");

            await message.guild.members.unban(userId);
            return message.channel.send(`✅ Unbanned <@${userId}>`);
        }

        /* ================= FUN ================= */

        if (cmd === "hug") return message.channel.send(`🤗 ${message.author} hugs ${user || "someone"}`);
        if (cmd === "kiss") return message.channel.send(`💋 ${message.author} kisses ${user || "someone"}`);
        if (cmd === "slap") return message.channel.send(`👋 ${message.author} slaps ${user || "someone"}`);
        if (cmd === "shoot") return message.channel.send(`🔫 ${message.author} shoots ${user || "someone"} 💥`);

        /* ================= ROLE SYSTEM (SAFE FIXED) ================= */

        if (cmd === "r") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
                return message.reply("❌ No permission.");

            const sub = args[0];

            if (sub === "create") {
                const name = args.slice(1).join(" ");
                if (!name) return message.reply("❌ Provide role name.");

                const role = await message.guild.roles.create({ name });
                return message.channel.send(`🎭 Created role **${role.name}**`);
            }

            if (sub === "add") {
                if (!member) return message.reply("❌ Mention user.");

                const roleName = args.slice(2).join(" ");
                const role = message.guild.roles.cache.find(r => r.name === roleName);
                if (!role) return message.reply("❌ Role not found.");

                await member.roles.add(role);
                return message.channel.send(`➕ Added **${role.name}** to ${member.user.tag}`);
            }

            if (sub === "remove") {
                if (!member) return message.reply("❌ Mention user.");

                const roleName = args.slice(2).join(" ");
                const role = message.guild.roles.cache.find(r => r.name === roleName);
                if (!role) return message.reply("❌ Role not found.");

                await member.roles.remove(role);
                return message.channel.send(`➖ Removed **${role.name}** from ${member.user.tag}`);
            }

            if (sub === "delete") {
                const roleName = args.slice(1).join(" ");
                const role = message.guild.roles.cache.find(r => r.name === roleName);
                if (!role) return message.reply("❌ Role not found.");

                await role.delete();
                return message.channel.send(`🗑️ Deleted role **${role.name}**`);
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
