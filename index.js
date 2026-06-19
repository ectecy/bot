lconst { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const PREFIX = ",";

client.once("ready", () => {
    console.log(`BOT ONLINE: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // ONLY COMMAND: ,r create RoleName
    if (cmd === "r") {
        if (args[0] !== "create") return;

        const roleName = args.slice(1).join(" ");

        if (!roleName) {
            return message.reply("Usage: ,r create RoleName");
        }

        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return message.reply("❌ No Manage Roles permission.");
        }

        try {
            const role = await message.guild.roles.create({
                name: roleName,
                reason: `Created by ${message.author.tag}`
            });

            return message.channel.send(`🎭 Role created: **${role.name}**`);
        } catch (err) {
            console.log(err);
            return message.reply("❌ Failed to create role.");
        }
    }
});

client.login(process.env.DISCORD_TOKEN);