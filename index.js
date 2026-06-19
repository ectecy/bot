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
,unban

🎉 Giveaway:
,g create

💖 Fun:
,hug
,kiss
,slap
,shoot`
            );
        }

        // ---------------- ECONOMY ----------------
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

        // ---------------- WARN ----------------
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

        // ---------------- KICK ----------------
        if (cmd === "kick") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return;
            if (!member) return;

            await member.kick().catch(() => {});
            return message.channel.send(`👢 Kicked ${member.user.tag}`);
        }

        // ---------------- BAN ----------------
        if (cmd === "ban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
            if (!member) return;

            await member.ban().catch(() => {});
            return message.channel.send(`🔨 Banned ${member.user.tag}`);
        }

        // ---------------- UNBAN (NEW ADDED) ----------------
        if (cmd === "unban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return message.reply("❌ No permission.");
            }

            const userId = args[0];
            if (!userId) return message.reply("Usage: ,unban <userID>");

            try {
                await message.guild.members.unban(userId);
                return message.channel.send(`✅ Unbanned <@${userId}>`);
            } catch (err) {
                console.log(err);
                return message.reply("❌ Could not unban user.");
            }
        }

        // ---------------- FUN ----------------
        if (cmd === "hug") return message.channel.send(`🤗 ${message.author} hugs ${user || "someone"}`);
        if (cmd === "kiss") return message.channel.send(`💋 ${message.author} kisses ${user || "someone"}`);
        if (cmd === "slap") return message.channel.send(`👋 ${message.author} slaps ${user || "someone"}`);
        if (cmd === "shoot") return message.channel.send(`🔫 ${message.author} shoots ${user || "someone"} 💥`);

        // ---------------- GIVEAWAY ----------------
        if (cmd === "g") {
            if (args[0] === "create") {
                await message.channel.send(
`🎉 Giveaway setup coming next update`
                );
            }
        }

    } catch (err) {
        console.log(err);
    }
});

// ---------------- LOGIN ----------------
client.login(process.env.DISCORD_TOKEN);
