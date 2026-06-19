const {
    Client,
    GatewayIntentBits,
    PermissionsBitField
} = require("discord.js");

const PREFIX = ",";

// ---------------- ECONOMY STORAGE ----------------
const economy = new Map();
const cooldowns = new Map();

// ---------------- MODERATION STORAGE ----------------
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

// ---------------- MESSAGE HANDLER ----------------
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = (args.shift() || "").toLowerCase();

    const user = message.mentions.users.first();
    const member = message.mentions.members.first();

    try {

        // ================= AUTO MOD =================

        const now = Date.now();
        const last = spamCooldown.get(message.author.id) || 0;

        // spam protection
        if (now - last < 1500) {
            return message.delete().catch(() => {});
        }
        spamCooldown.set(message.author.id, now);

        // link protection
        if (message.content.includes("http")) {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                await message.delete().catch(() => {});
                return message.reply("🚫 Links are not allowed.");
            }
        }

        // ================= COMMANDS =================
        if (!message.content.startsWith(PREFIX)) return;

        if (cmd === "commands") {
            return message.channel.send(
`📜 **Commands**

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
,r add @user RoleName
,r remove @user RoleName

🔐 System:
,setlog`
            );
        }

        // ================= WARN SYSTEM =================
        if (cmd === "warn") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                return message.reply("❌ No permission.");
            }

            if (!member) return message.reply("Mention someone.");

            const id = member.id;
            const count = (warns.get(id) || 0) + 1;
            warns.set(id, count);

            message.channel.send(`⚠️ ${member.user.tag} warned (${count}/3)`);

            // auto punish
            if (count >= 3) {
                await member.ban({ reason: "3 warns reached" });
                warns.delete(id);
                message.channel.send(`🔨 Auto-banned ${member.user.tag}`);
            }
        }

        // ================= MOD LOG =================
        if (cmd === "setlog") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.reply("❌ No permission.");
            }

            logChannelId = message.channel.id;
            return message.reply("📋 Log channel set.");
        }

        // ================= FUN =================
        if (cmd === "hug") return message.channel.send(`🤗 ${message.author} hugs ${user || "someone"}`);
        if (cmd === "kiss") return message.channel.send(`💋 ${message.author} kisses ${user || "someone"}`);
        if (cmd === "slap") return message.channel.send(`👋 ${message.author} slaps ${user || "someone"}`);
        if (cmd === "shoot") return message.channel.send(`🔫 ${message.author} shoots ${user || "someone"} 💥`);

        // ================= GAMES =================
        if (cmd === "coinflip") {
            return message.channel.send(Math.random() < 0.5 ? "🪙 Heads" : "🪙 Tails");
        }

        if (cmd === "roll") {
            return message.channel.send(`🎲 ${Math.floor(Math.random() * 100) + 1}`);
        }

        if (cmd === "8ball") {
            const answers = ["Yes", "No", "Maybe", "Definitely", "Ask again", "Nope"];
            return message.channel.send(`🎱 ${answers[Math.floor(Math.random() * answers.length)]}`);
        }

        // ================= ECONOMY =================
        if (cmd === "balance") {
            const bal = economy.get(message.author.id) || 0;
            return message.reply(`💰 Balance: $${bal}`);
        }

        if (cmd === "work") {
            const amount = Math.floor(Math.random() * 200) + 50;
            economy.set(message.author.id, (economy.get(message.author.id) || 0) + amount);
            return message.reply(`💼 +$${amount}`);
        }

        if (cmd === "daily") {
            const last = cooldowns.get(message.author.id) || 0;
            const now2 = Date.now();

            if (now2 - last < 86400000) {
                return message.reply("⏳ Already claimed daily.");
            }

            economy.set(message.author.id, (economy.get(message.author.id) || 0) + 500);
            cooldowns.set(message.author.id, now2);

            return message.reply("🎁 +$500 daily reward");
        }

        // ================= MODERATION =================
        if (cmd === "kick") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                return message.reply("❌ No permission.");
            }

            if (!member) return message.reply("Mention someone.");
            await member.kick();
            return message.channel.send(`👢 Kicked ${member.user.tag}`);
        }

        if (cmd === "ban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return message.reply("❌ No permission.");
            }

            if (!member) return message.reply("Mention someone.");
            await member.ban();
            return message.channel.send(`🔨 Banned ${member.user.tag}`);
        }

        // ================= ROLE SYSTEM =================
        if (cmd === "r") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                return message.reply("❌ No permission.");
            }

            if (args[0] === "create") {
                const name = args.slice(1).join(" ");
                const role = await message.guild.roles.create({ name });
                return message.channel.send(`🎭 Created role ${role.name}`);
            }

            if (args[0] === "add") {
                const roleName = args.slice(2).join(" ");
                const role = message.guild.roles.cache.find(r => r.name === roleName);

                if (!member || !role) return message.reply("Usage error.");
                await member.roles.add(role);
                return message.channel.send(`➕ Added ${role.name}`);
            }

            if (args[0] === "remove") {
                const roleName = args.slice(2).join(" ");
                const role = message.guild.roles.cache.find(r => r.name === roleName);

                if (!member || !role) return message.reply("Usage error.");
                await member.roles.remove(role);
                return message.channel.send(`➖ Removed ${role.name}`);
            }
        }

    } catch (err) {
        console.log(err);
        message.reply("❌ Something went wrong.");
    }
});

// ---------------- LOGIN ----------------
client.login(process.env.DISCORD_TOKEN);
