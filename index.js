const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");

const PREFIX = ",";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = (args.shift() || "").toLowerCase();

    const user = message.mentions.users.first();
    const member = message.mentions.members.first();

    // ---------------- COMMANDS ----------------
    if (cmd === "commands") {
        return message.channel.send(
`📜 **Commands**

💖 Fun:
,hug @user
,kiss @user
,slap @user
,shoot @user

🛡 Moderation:
,kick @user
,ban @user

🎭 Roles:
,r create RoleName

🏓 Utility:
,ping`
        );
    }

    // ---------------- PING ----------------
    if (cmd === "ping") {
        return message.reply("🏓 Pong!");
    }

    // ---------------- FUN ----------------
    if (cmd === "hug") {
        if (!user) return message.reply("Mention someone!");
        return message.channel.send(`🤗 ${message.author} hugs ${user}`);
    }

    if (cmd === "kiss") {
        if (!user) return message.reply("Mention someone!");
        return message.channel.send(`💋 ${message.author} kisses ${user}`);
    }

    if (cmd === "slap") {
        if (!user) return message.reply("Mention someone!");
        return message.channel.send(`👋 ${message.author} slaps ${user}`);
    }

    if (cmd === "shoot") {
        if (!user) return message.reply("Mention someone!");
        return message.channel.send(`🔫 ${message.author} shoots ${user}`);
    }

    // ---------------- KICK ----------------
    if (cmd === "kick") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return message.reply("❌ No permission.");
        }

        if (!member) return message.reply("Mention someone.");
        if (!member.kickable) return message.reply("❌ I can't kick this user.");

        try {
            await member.kick();
            return message.channel.send(`👢 Kicked ${member.user.tag}`);
        } catch (err) {
            console.log(err);
            return message.reply("❌ Failed to kick.");
        }
    }

    // ---------------- BAN ----------------
    if (cmd === "ban") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.reply("❌ No permission.");
        }

        if (!member) return message.reply("Mention someone.");
        if (!member.bannable) return message.reply("❌ I can't ban this user.");

        try {
            await member.ban();
            return message.channel.send(`🔨 Banned ${member.user.tag}`);
        } catch (err) {
            console.log(err);
            return message.reply("❌ Failed to ban.");
        }
    }

    // ---------------- ROLE SYSTEM ----------------
    if (cmd === "r") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return message.reply("❌ You need Manage Roles permission.");
        }

        if (args[0] === "create") {
            const roleName = args.slice(1).join(" ");

            if (!roleName) {
                return message.reply("❌ Usage: ,r create RoleName");
            }

            try {
                const role = await message.guild.roles.create({
                    name: roleName,
                    reason: `Created by ${message.author.tag}`
                });

                return message.channel.send(`🎭 Role created: **${role.name}**`);
            } catch (err) {
                console.log(err);
                return message.reply("❌ Failed to create role (check bot permissions + role hierarchy).");
            }
        }
    }
});

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);