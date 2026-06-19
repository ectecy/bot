const {
    Client,
    GatewayIntentBits,
    PermissionsBitField
} = require("discord.js");

const PREFIX = ",";

// ---------------- ECONOMY STORAGE ----------------
const economy = new Map();
const cooldowns = new Map();

// ---------------- GIVEAWAYS ----------------
const giveaways = new Map(); 

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
,leaderboard

🎉 Giveaway:
,g create <prize>
,g reroll <messageID>

🛡 Moderation:
,kick @user
,ban @user

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
            return message.channel.send(`🎲 ${Math.floor(Math.random() * 100) + 1}`);
        }

        if (cmd === "8ball") {
            const answers = ["Yes", "No", "Maybe", "Definitely", "Ask again", "Nope"];
            return message.channel.send(`🎱 ${answers[Math.floor(Math.random() * answers.length)]}`);
        }

        // ---------------- ECONOMY ----------------
        if (cmd === "balance") {
            return message.reply(`💰 $${economy.get(message.author.id) || 0}`);
        }

        if (cmd === "work") {
            const amount = Math.floor(Math.random() * 200) + 50;
            economy.set(message.author.id, (economy.get(message.author.id) || 0) + amount);
            return message.reply(`💼 +$${amount}`);
        }

        if (cmd === "daily") {
            const last = cooldowns.get(message.author.id) || 0;
            const now = Date.now();

            if (now - last < 86400000) {
                return message.reply("⏳ Already claimed daily!");
            }

            const reward = 500;
            economy.set(message.author.id, (economy.get(message.author.id) || 0) + reward);
            cooldowns.set(message.author.id, now);

            return message.reply(`🎁 +$${reward}`);
        }

        // ---------------- LEADERBOARD (NEW) ----------------
        if (cmd === "leaderboard") {

            if (economy.size === 0) {
                return message.channel.send("❌ No data yet.");
            }

            const sorted = [...economy.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            let msg = "🏆 **RICH LEADERBOARD**\n\n";

            sorted.forEach((u, i) => {
                msg += `${i + 1}. <@${u[0]}> - $${u[1]}\n`;
            });

            return message.channel.send(msg);
        }

        // ---------------- MODERATION ----------------
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

        // ---------------- GIVEAWAY SYSTEM ----------------
        if (cmd === "g") {

            if (args[0] === "create") {
                const prize = args.slice(1).join(" ");
                if (!prize) return message.reply("Usage: ,g create <prize>");

                const msg = await message.channel.send(
`🎉 **GIVEAWAY STARTED**

Prize: **${prize}**
React with 🎉 to join!`
                );

                await msg.react("🎉");

                giveaways.set(msg.id, {
                    prize,
                    entries: new Set()
                });

                return;
            }

            if (args[0] === "reroll") {
                const msgId = args[1];
                const data = giveaways.get(msgId);

                if (!data) return message.reply("❌ Giveaway not found.");

                const users = [...data.entries];
                if (users.length === 0) return message.reply("❌ No entries.");

                const winner = users[Math.floor(Math.random() * users.length)];
                return message.channel.send(`🎉 New winner: <@${winner}>`);
            }
        }

    } catch (err) {
        console.log(err);
        message.reply("❌ Error occurred.");
    }
});

// ---------------- GIVEAWAY ENTRY TRACKING ----------------
client.on("messageReactionAdd", (reaction, user) => {
    if (user.bot) return;

    const data = giveaways.get(reaction.message.id);
    if (!data) return;

    if (reaction.emoji.name === "🎉") {
        data.entries.add(user.id);
    }
});

// ---------------- LOGIN ----------------
client.login(process.env.DISCORD_TOKEN);
