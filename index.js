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

client.on("ready", () => {
  console.log(`${client.user.tag} is online!`);
});

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ---------------- FUN COMMANDS ----------------

  if (command === "kiss") {
    const user = message.mentions.users.first();
    if (!user) return message.reply("Mention someone to kiss!");
    return message.channel.send(`${message.author} kissed ${user} 💋`);
  }

  if (command === "slap") {
    const user = message.mentions.users.first();
    if (!user) return message.reply("Mention someone to slap!");
    return message.channel.send(`${message.author} slapped ${user} 👋`);
  }

  if (command === "shoot") {
    const user = message.mentions.users.first();
    if (!user) return message.reply("Mention someone to shoot!");
    return message.channel.send(`${message.author} shot ${user} 🔫`);
  }

  if (command === "hug") {
    const user = message.mentions.users.first();
    if (!user) return message.reply("Mention someone to hug!");
    return message.channel.send(`${message.author} hugged ${user} 🤗`);
  }

  // ---------------- ROLE CREATE ----------------

  if (command === "r") {
    if (args[0] !== "create") return;

    const roleName = args.slice(1).join(" ");
    if (!roleName) return message.reply("Provide a role name!");

    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply("You don't have permission to create roles.");
    }

    try {
      const role = await message.guild.roles.create({
        name: roleName,
        reason: `Role created by ${message.author.tag}`,
      });

      message.channel.send(`Role created: **${role.name}**`);
    } catch (err) {
      console.error(err);
      message.reply("Failed to create role.");
    }
  }

  // ---------------- MODERATION ----------------

  if (command === "ban") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply("No permission to ban members.");
    }

    const user = message.mentions.members.first();
    if (!user) return message.reply("Mention someone to ban!");

    try {
      await user.ban();
      message.channel.send(`${user.user.tag} was banned 🔨`);
    } catch {
      message.reply("Failed to ban user.");
    }
  }

  if (command === "kick") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return message.reply("No permission to kick members.");
    }

    const user = message.mentions.members.first();
    if (!user) return message.reply("Mention someone to kick!");

    try {
      await user.kick();
      message.channel.send(`${user.user.tag} was kicked 👢`);
    } catch {
      message.reply("Failed to kick user.");
    }
  }

  if (command === "timeout") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply("No permission to timeout members.");
    }

    const user = message.mentions.members.first();
    const time = args[1]; // in minutes

    if (!user || !time) {
      return message.reply("Usage: ,timeout @user <minutes>");
    }

    try {
      await user.timeout(time * 60 * 1000, "Timeout command used");
      message.channel.send(`${user.user.tag} timed out for ${time} minutes ⏳`);
    } catch {
      message.reply("Failed to timeout user.");
    }
  }
});

client.login("YOUR_BOT_TOKEN_HERE");