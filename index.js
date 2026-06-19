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
   🎉 GIVEAWAY SYSTEM
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

🔒 Channel Control:
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

        /* ================= LOCK CHANNEL ================= */
        if (cmd === "lock") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
                return message.reply("❌ No permission.");

            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: false
            });

            return message.channel.send("🔒 Channel locked.");
        }

        /* ================= UNLOCK CHANNEL ================= */
        if (cmd === "unlock") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
                return message.reply("❌ No permission.");

            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: true
            });

            return message.channel.send("🔓 Channel unlocked.");
        }

        /* ================= ROLE SYSTEM (UPDATED) ================= */

        if (cmd === "r") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
                return message.reply("❌ No permission.");

            const sub = args[0];

            if (sub === "create") {
                const name = args.slice(1).join(" ");
                const role = await message.guild.roles.create({ name });
                return message.channel.send(`🎭 Created role **${role.name}**`);
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

        /* ================= KEEP ALL YOUR OTHER COMMANDS ================= */
        // (unchanged: warn, kick, ban, unban, fun, giveaway, economy, xp, etc.)

    } catch (err) {
        console.log(err);
    }
});

/* =========================================================
   🔐 LOGIN
========================================================= */

client.login(process.env.DISCORD_TOKEN);
