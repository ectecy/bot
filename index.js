const {
    Client,
    GatewayIntentBits,
    PermissionsBitField
} = require("discord.js");

const PREFIX = ",";

// ---------------- STORAGE ----------------
const economy = new Map();
const warns = new Map();
const spamCooldown = new Map();
let logChannelId = null;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// ---------------- MESSAGE ----------------
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = (args.shift() || "").toLowerCase();
    const user = message.mentions.users.first();
    const member = message.mentions.members.first();

    // MUST start with prefix
    if (!message.content.startsWith(PREFIX)) return;

    try {

        // ---------------- AUTO MOD ----------------
        const last = spamCooldown.get(message.author.id) || 0;
        const now = Date.now();

        if (now - last < 1500) {
            return message.delete().catch(() => {});
        }
        spamCooldown.set(message.author.id, now);

        if (message.content.includes("http")) {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                await message.delete().catch(() => {});
                return message.reply("🚫 Links not allowed.");
            }
        }

        // ---------------- VERIFICATION GATE ----------------
        if (!message.member.roles.cache.some(r => r.name === "Verified")) {
            if (cmd !== "verify") return message.reply("🔒 You must verify first.");
        }

        // ---------------- COMMANDS MENU ----------------
        if (cmd === "commands") {
            return message.channel.send(
`📜 **Bot Commands**

💖 Fun:
,hug @user
,kiss @user
,slap @user
,shoot @user

🎲 Games:
,coinflip
,roll
,8ball

💰 Economy:
,balance
,work
,daily

🛡 Moderation:
,kick @user
,ban @user
,warn @user

🎭 Roles:
,r create RoleName

🔐 System:
,verify
,setlog`
            );
        }

        // ---------------- VERIFY ----------------
        if (cmd === "verify") {
            const role = message.guild.roles.cache.find(r => r.name === "Verified");
            if (!role) return message.reply("No Verified role found.");

            await message.member.roles.add(role);
            return message.reply("✅ Verified!");
        }

        // ---------------- LOG CHANNEL ----------------
        if (cmd === "setlog") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.reply("❌ No permission.");
            }

            logChannelId = message.channel.id;
            return message.reply("📋 Log channel set.");
        }

        // ---------------- FUN ----------------
        if (cmd === "hug") return message.channel.send(`🤗 ${message.author} hugs ${user || "someone"}`);
        if (cmd === "kiss") return message.channel.send(`💋 ${message.author} kisses ${user || "someone"}`);
        if (cmd === "slap") return message.channel.send(`👋 ${message.author} slaps ${user || "someone"}`);
        if (cmd === "shoot") return message.channel.send(`🔫 ${message.author} shoots ${user || "someone"} 💥`);

        // ---------------- GAMES ----------------
        if (cmd === "coinflip") {
            return message.channel.send(Math.random() < 0.5 ? "🪙 Heads" : "🪙 Tails");
        }

        if (cmd === "roll") {
            return message.channel.send(`🎲 ${Math.floor(Math.random() * 100) + 1}`);
        }

        if (cmd === "8ball") {
            const a = ["Yes", "No", "Maybe", "Definitely", "Ask again", "Nope"];
            return message.channel.send(`🎱 ${a[Math.floor(Math.random() * a.length)]}`);
        }

        // ---------------- ECONOMY ----------------
        if (cmd === "balance") {
            return message.reply(`💰 $${economy.get(message.author.id) || 0}`);
        }

        if (cmd === "work") {
            const amt = Math.floor(Math.random() * 200) + 50;
            economy.set(message.author.id, (economy.get(message.author.id) || 0) + amt);
            return message.reply(`💼 +$${amt}`);
        }

        if (cmd === "daily") {
            const last = warns.get(message.author.id + "_daily") || 0;
            if (Date.now() - last < 86400000) return message.reply("⏳ Already claimed.");

            economy.set(message.author.id, (economy.get(message.author.id) || 0) + 500);
            warns.set(message.author.id + "_daily", Date.now());

            return message.reply("🎁 +$500 daily reward");
        }

        // ---------------- WARN SYSTEM ----------------
        if (cmd === "warn") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                return message.reply("❌ No permission.");
            }

            if (!member) return message.reply("Mention someone.");

            const id = member.id;
            const count = (warns.get(id) || 0) + 1;
            warns.set(id, count);

            message.channel.send(`⚠️ ${member.user.tag} warned (${count}/3)`);

            if (count >= 3) {
                await member.ban({ reason: "3 warnings" });
                warns.delete(id);
                message.channel.send(`🔨 Auto-banned ${member.user.tag}`);
            }
        }

        // ---------------- KICK ----------------
        if (cmd === "kick") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                return message.reply("❌ No permission.");
            }

            if (!member) return message.reply("Mention someone.");
            await member.kick();
            return message.channel.send(`👢 Kicked ${member.user.tag}`);
        }

        // ---------------- BAN ----------------
        if (cmd === "ban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return message.reply("❌ No permission.");
            }

            if (!member) return message.reply("Mention someone.");
            await member.ban();
            return message.channel.send(`🔨 Banned ${member.user.tag}`);
        }

        // ---------------- ROLE SYSTEM ----------------
        if (cmd === "r") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                return message.reply("❌ No permission.");
            }

            if (args[0] === "create") {
                const name = args.slice(1).join(" ");
                const role = await message.guild.roles.create({ name });
                return message.channel.send(`🎭 Created role ${role.name}`);
            }
        }

    } catch (err) {
        console.log(err);
        message.reply("❌ Error occurred.");
    }
});

// ---------------- LOGIN ----------------
client.login(process.env.DISCORD_TOKEN);
