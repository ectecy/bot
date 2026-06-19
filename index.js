const { Client, GatewayIntentBits } = require("discord.js");

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
    const cmd = args.shift().toLowerCase();

    const user = message.mentions.users.first();
    const member = message.mentions.members.first();

    // ---------------- HELP / COMMANDS ----------------
    if (cmd === "commands") {
        return message.channel.send(
`📜 **Commands List**
\`,commands\` - shows this menu

💖 Fun:
\`,hug @user\`
\`,kiss @user\`
\`,slap @user\`
\`,shoot @user\`

🛡 Moderation:
\`,kick @user\`
\`,ban @user\`

🎭 Roles:
\`,r create roleName\`
`
        );
    }

    // ---------------- HUG ----------------
    if (cmd === "hug") {
        if (!user) return message.reply("Mention someone to hug!");
        return message.channel.send(`🤗 ${message.author} hugs ${user}!`);
    }

    // ---------------- KISS ----------------
    if (cmd === "kiss") {
        if (!user) return message.reply("Mention someone to kiss!");
        return message.channel.send(`💋 ${message.author} kisses ${user}!`);
    }

    // ---------------- SLAP ----------------
    if (cmd === "slap") {
        if (!user) return message.reply("Mention someone to slap!");
        return message.channel.send(`👋 ${message.author} slaps ${user}!`);
    }

    // ---------------- SHOOT ----------------
    if (cmd === "shoot") {
        if (!user) return message.reply("Mention someone to shoot!");
        return message.channel.send(`🔫 ${message.author} shoots ${user}! *ouch*`);
    }

    // ---------------- KICK ----------------
    if (cmd === "kick") {
        if (!message.member.permissions.has("KickMembers")) {
            return message.reply("❌ You don't have permission to kick members.");
        }

        if (!member) return message.reply("Mention someone to kick!");
        if (!member.kickable) return message.reply("❌ I can't kick this user.");

        await member.kick().catch(() => {});
        return message.channel.send(`👢 Kicked ${member.user.tag}`);
    }

    // ---------------- BAN ----------------
    if (cmd === "ban") {
        if (!message.member.permissions.has("BanMembers")) {
            return message.reply("❌ You don't have permission to ban members.");
        }

        if (!member) return message.reply("Mention someone to ban!");
        if (!member.bannable) return message.reply("❌ I can't ban this user.");

        await member.ban().catch(() => {});
        return message.channel.send(`🔨 Banned ${member.user.tag}`);
    }

    // ---------------- ROLE CREATE ----------------
    if (cmd === "r") {
    console.log("ROLE COMMAND TRIGGERED");

    if (!message.member.permissions.has("ManageRoles")) {
        return message.reply("NO PERMISSION");
    }

    if (args[0] === "create") {
        const roleName = args.slice(1).join(" ");

        console.log("ROLE NAME:", roleName);

        const role = await message.guild.roles.create({
            name: roleName || "test-role",
        });

        return message.channel.send("ROLE CREATED: " + role.name);
    }
}
            });

            return message.channel.send(`🎭 Created role: **${roleName}**`);
        }
    }

    // ---------------- PING ----------------
    if (cmd === "ping") {
        return message.reply("🏓 Pong!");
    }
});

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);