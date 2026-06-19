const {
    Client,
    GatewayIntentBits,
    PermissionsBitField
} = require("discord.js");

const PREFIX = ",";

// ---------------- SAFE STORAGE ----------------
const economy = new Map();
const warns = new Map();
const giveaways = new Map();

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

// ---------------- SAFE HELPERS ----------------
function safeUser(msg) {
    return msg.mentions.users.first() || null;
}

function safeMember(msg) {
    return msg.mentions.members.first() || null;
}

// ---------------- MESSAGE ----------------
client.on("messageCreate", async (message) => {
    try {
        if (message.author.bot || !message.guild) return;
        if (!message.content.startsWith(PREFIX)) return;

        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const cmd = (args.shift() || "").toLowerCase();

        const user = safeUser(message);
        const member = safeMember(message);

        // ---------------- COMMANDS ----------------
        if (cmd === "commands") {
            return message.channel.send(
`📜 **Commands**

💰 Economy:
,balance
,work

🛡 Moderation:
,warn
,kick
,ban

🎉 Giveaway:
,g create
,g reroll

💖 Fun:
,hug
,kiss
,slap
,shoot`
            );
        }

        // ---------------- ECONOMY (SAFE) ----------------
        if (cmd === "balance") {
            return message.reply(`💰 $${economy.get(message.author.id) || 0}`);
        }

        if (cmd === "work") {
            const amt = Math.floor(Math.random() * 200) + 50;
            economy.set(message.author.id, (economy.get(message.author.id) || 0) + amt);
            return message.reply(`💼 +$${amt}`);
        }

        // ---------------- FUN (SAFE) ----------------
        if (cmd === "hug") return message.channel.send(`🤗 ${message.author} hugs ${user || "someone"}`);
        if (cmd === "kiss") return message.channel.send(`💋 ${message.author} kisses ${user || "someone"}`);
        if (cmd === "slap") return message.channel.send(`👋 ${message.author} slaps ${user || "someone"}`);
        if (cmd === "shoot") return message.channel.send(`🔫 ${message.author} shoots ${user || "someone"} 💥`);

        // ---------------- WARN SYSTEM (SAFE) ----------------
        if (cmd === "warn") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                return message.reply("❌ No permission.");
            }

            if (!member) return message.reply("❌ Mention someone.");

            const reason = args.slice(1).join(" ") || "No reason";

            const data = warns.get(member.id) || 0;
            const newCount = data + 1;

            warns.set(member.id, newCount);

            message.channel.send(`⚠️ Warned ${member.user.tag} (${newCount}/4)`);

            if (newCount >= 4) {
                if (member.bannable) {
                    await member.ban({ reason: "4 warns" }).catch(() => {});
                    warns.set(member.id, 0);
                    message.channel.send(`🔨 Auto-banned ${member.user.tag}`);
                }
            }
        }

        // ---------------- MODERATION (SAFE) ----------------
        if (cmd === "kick") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                return message.reply("❌ No permission.");
            }
            if (!member) return message.reply("❌ Mention someone.");
            if (!member.kickable) return message.reply("❌ Can't kick.");

            await member.kick().catch(() => {});
            return message.channel.send(`👢 Kicked ${member.user.tag}`);
        }

        if (cmd === "ban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return message.reply("❌ No permission.");
            }
            if (!member) return message.reply("❌ Mention someone.");
            if (!member.bannable) return message.reply("❌ Can't ban.");

            await member.ban().catch(() => {});
            return message.channel.send(`🔨 Banned ${member.user.tag}`);
        }

        // ---------------- GIVEAWAY (SAFE VERSION) ----------------
        if (cmd === "g") {

            if (args[0] === "create") {
                const prize = await ask(message, "🎁 Prize?");
                if (!prize) return message.reply("❌ Cancelled.");

                const duration = await ask(message, "⏱ Duration (1m / 10m / 1h)?");
                if (!duration) return message.reply("❌ Cancelled.");

                const ms = parseDuration(duration);
                if (!ms) return message.reply("❌ Invalid duration.");

                const msg = await message.channel.send(
`🎉 **GIVEAWAY**

🎁 Prize: ${prize}
⏱ Ends soon

React 🎉 to join!`
                );

                await msg.react("🎉").catch(() => {});

                giveaways.set(msg.id, {
                    entries: new Set()
                });

                setTimeout(() => endGiveaway(msg.id, message.channel), ms);

                return;
            }

            if (args[0] === "reroll") {
                const id = args[1];
                const g = giveaways.get(id);

                if (!g || !g.entries.size) {
                    return message.reply("❌ No giveaway or no entries.");
                }

                const users = [...g.entries];
                const winner = users[Math.floor(Math.random() * users.length)];

                return message.channel.send(`🎉 New winner: <@${winner}>`);
            }
        }

    } catch (err) {
        console.log("Command error:", err);
    }
});

// ---------------- REACTIONS (SAFE) ----------------
client.on("messageReactionAdd", async (reaction, user) => {
    try {
        if (user.bot) return;

        if (reaction.partial) await reaction.fetch().catch(() => {});

        const g = giveaways.get(reaction.message.id);
        if (!g) return;

        if (reaction.emoji.name === "🎉") {
            g.entries.add(user.id);
        }

    } catch (err) {
        console.log("Reaction error:", err);
    }
});

// ---------------- HELPERS ----------------
function parseDuration(str) {
    if (!str) return null;

    const match = str.match(/(\d+)(s|m|h)/);
    if (!match) return null;

    const n = parseInt(match[1]);
    const t = match[2];

    if (t === "s") return n * 1000;
    if (t === "m") return n * 60000;
    if (t === "h") return n * 3600000;

    return null;
}

async function ask(message, question) {
    try {
        await message.channel.send(question);

        const collected = await message.channel.awaitMessages({
            filter: m => m.author.id === message.author.id,
            max: 1,
            time: 30000
        });

        if (!collected.size) return null;

        return collected.first().content;

    } catch {
        return null;
    }
}

async function endGiveaway(id, channel) {
    const g = giveaways.get(id);
    if (!g) return;

    const users = [...g.entries];

    if (!users.length) {
        return channel.send("❌ No entries.");
    }

    const winner = users[Math.floor(Math.random() * users.length)];

    channel.send(`🎉 Winner: <@${winner}>`);
    giveaways.delete(id);
}

// ---------------- LOGIN ----------------
client.login(process.env.DISCORD_TOKEN);
