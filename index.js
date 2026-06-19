const {
    Client,
    GatewayIntentBits,
    PermissionsBitField
} = require("discord.js");

const PREFIX = ",";

// ---------------- ECONOMY STORAGE ----------------
const economy = new Map();
const cooldowns = new Map();

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

🎭 Roles:
,r create RoleName
,r add @user RoleName
,r remove @user RoleName

🏓 Utility:
,ping`
            );
        }

        // ---------------- PING ----------------
        if (cmd === "ping") {
            return message.reply("🏓 Pong!");
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
            return message.channel.send(`🎲 You rolled ${Math.floor(Math.random() * 100) + 1}`);
        }

        if (cmd === "8ball") {
            const answers = ["Yes", "No", "Maybe", "Definitely", "Ask again", "Absolutely not"];
            return message.channel.send(`🎱 ${answers[Math.floor(Math.random() * answers.length)]}`);
        }

        // ---------------- ECONOMY ----------------
        if (cmd === "balance") {
            const bal = economy.get(message.author.id) || 0;
            return message.reply(`💰 Balance: $${bal}`);
        }

        if (cmd === "work") {
            const amount = Math.floor(Math.random() * 200) + 50;
            economy.set(message.author.id, (economy.get(message.author.id) || 0) + amount);
            return message.reply(`💼 You worked and earned $${amount}`);
        }

        if (cmd === "daily") {
            const last = cooldowns.get(message.author.id) || 0;
            const now = Date.now();

            if (now - last < 86400000) {
                return message.reply("⏳ You already claimed daily today!");
            }

            const reward = 500;
            economy.set(message.author.id, (economy.get(message.author.id) || 0) + reward);
            cooldowns.set(message.author.id, now);

            return message.reply(`🎁 Daily claimed: $${reward}`);
        }

        // ---------------- MODERATION ----------------
        if (cmd === "kick") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                return message.reply("❌ No permission.");
            }

            if (!member) return message.reply("Mention someone.");
            if (!member.kickable) return message.reply("❌ I can't kick this user.");

            await member.kick();
            return message.channel.send(`👢 Kicked ${member.user.tag}`);
        }

        if (cmd === "ban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return message.reply("❌ No permission.");
            }

            if (!member) return message.reply("Mention someone.");
            if (!member.bannable) return message.reply("❌ I can't ban this user.");

            await member.ban();
            return message.channel.send(`🔨 Banned ${member.user.tag}`);
        }

        // ---------------- ROLE SYSTEM ----------------
        if (cmd === "r") {

            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                return message.reply("❌ No permission.");
            }

            // CREATE ROLE
            if (args[0] === "create") {
                const roleName = args.slice(1).join(" ");
                if (!roleName) return message.reply("Usage: ,r create RoleName");

                const role = await message.guild.roles.create({ name: roleName });
                return message.channel.send(`🎭 Created role: ${role.name}`);
            }

            // ADD ROLE
            if (args[0] === "add") {
                const roleName = args.slice(2).join(" ");
                const role = message.guild.roles.cache.find(r => r.name === roleName);

                if (!member || !role) return message.reply("Usage: ,r add @user RoleName");

                await member.roles.add(role);
                return message.channel.send(`➕ Added ${role.name} to ${member.user.tag}`);
            }

            // REMOVE ROLE
            if (args[0] === "remove") {
                const roleName = args.slice(2).join(" ");
                const role = message.guild.roles.cache.find(r => r.name === roleName);

                if (!member || !role) return message.reply("Usage: ,r remove @user RoleName");

                await member.roles.remove(role);
                return message.channel.send(`➖ Removed ${role.name} from ${member.user.tag}`);
            }
        }

    } catch (err) {
        console.log(err);
        message.reply("❌ Something went wrong.");
    }
});

// ---------------- LOGIN ----------------
client.login(process.env.DISCORD_TOKEN);
