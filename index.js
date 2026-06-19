const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const prefix = ",";

client.once("ready", () => {
  console.log(`${client.user.tag} is online`);
});

client.on("messageCreate", async (message) => {
  try {
    if (!message.guild || message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();

    // FUN COMMANDS
    const user = message.mentions.users.first();

    if (command === "kiss") {
      if (!user) return message.reply("Mention someone!");
      return message.channel.send(`${message.author} kissed ${user} 💋`);
    }

    if (command === "slap") {
      if (!user) return message.reply("Mention someone!");
      return message.channel.send(`${message.author} slapped ${user} 👋`);
    }

    if (command === "shoot") {
      if (!user) return message.reply("Mention someone!");
      return message.channel.send(`${message.author} shot ${user} 🔫`);
    }

    if (command === "hug") {
      if (!user) return message.reply("Mention someone!");
      return message.channel.send(`${message.author} hugged ${user} 🤗`);
    }

    // ROLE CREATE
    if (command === "r" && args[0] === "create") {
      const roleName = args.slice(1).join(" ");

      if (!roleName) return message.reply("Provide a role name!");

      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return message.reply("Missing Manage Roles permission.");
      }

      const role = await message.guild.roles.create({
        name: roleName,
        reason: `Created by ${message.author.tag}`,
      });

      return message.channel.send(`Created role: **${role.name}**`);
    }

    // BAN
    if (command === "ban") {
      const member = message.mentions.members.first();
      if (!member) return message.reply("Mention a user!");

      if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return message.reply("Missing Ban Members permission.");
      }

      await member.ban();
      return message.channel.send(`Banned ${member.user.tag}`);
    }

    // KICK
    if (command === "kick") {
      const member = message.mentions.members.first();
      if (!member) return message.reply("Mention a user!");

      if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply("Missing Kick Members permission.");
      }

      await member.kick();
      return message.channel.send(`Kicked ${member.user.tag}`);
    }

    // TIMEOUT
    if (command === "timeout") {
      const member = message.mentions.members.first();
      const minutes = parseInt(args[1]);

      if (!member || isNaN(minutes)) {
        return message.reply("Usage: ,timeout @user <minutes>");
      }

      if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return message.reply("Missing Moderate Members permission.");
      }

      await member.timeout(minutes * 60 * 1000);
      return message.channel.send(`Timed out ${member.user.tag} for ${minutes} minutes`);
    }

  } catch (err) {
    console.error("Bot error:", err);
  }
});

client.login("YOUR_BOT_TOKEN_HERE");