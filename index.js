const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    ChannelType
} = require("discord.js");

const fs = require("fs");

const PREFIX = ",";

// ---------------- DATABASE ----------------
let db = {
    economy: {},
    warns: {},
    xp: {},
    giveaways: {}
};

if (fs.existsSync("./data.json")) {
    db = JSON.parse(fs.readFileSync("./data.json", "utf8"));
}

function saveDB() {
    fs.writeFileSync("./data.json", JSON.stringify(db, null, 2));
}

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

// ---------------- GIVEAWAYS ----------------
function pickWinner(list) {
    return list[Math.floor(Math.random() * list.length)];
}

// ---------------- READY ----------------
client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// ---------------- MESSAGE ----------------
client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = (args.shift() || "").toLowerCase();

    const member = message.mentions.members.first();

    try {

        // ---------------- COMMANDS ----------------
        if (cmd === "commands") {
            return message.channel.send(
`📜 Commands:
,r create <name>
,r add @user <role>
,r remove @user <role>

🎉 Giveaway:
g.create <prize>
g.reroll <messageID>

🛡 Moderation:
,kick @user
,ban @user`
            );
        }

        // ---------------- ROLE SYSTEM FIXED ----------------
        if (cmd === "r") {

            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                return message.reply("❌ Missing Manage Roles permission.");
            }

            const sub = args[0];

            // CREATE ROLE
            if (sub === "create") {
                const name = args.slice(1).join(" ");
                if (!name) return message.reply("Usage: ,r create <name>");

                const role = await message.guild.roles.create({ name });
                return message.channel.send(`🎭 Created role **${role.name}**`);
            }

            // ADD ROLE
            if (sub === "add") {
                const target = message.mentions.members.first();
                const roleName = args.slice(2).join(" ");

                const role = message.guild.roles.cache.find(r => r.name === roleName);

                if (!target || !role) {
                    return message.reply("Usage: ,r add @user RoleName");
                }

                await target.roles.add(role);
                return message.channel.send(`➕ Added **${role.name}** to ${target.user.tag}`);
            }

            // REMOVE ROLE
            if (sub === "remove") {
                const target = message.mentions.members.first();
                const roleName = args.slice(2).join(" ");

                const role = message.guild.roles.cache.find(r => r.name === roleName);

                if (!target || !role) {
                    return message.reply("Usage: ,r remove @user RoleName");
                }

                await target.roles.remove(role);
                return message.channel.send(`➖ Removed **${role.name}** from ${target.user.tag}`);
            }
        }

        // ---------------- MODERATION FIXED ----------------
        if (cmd === "kick") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                return message.reply("❌ No permission.");
            }

            if (!member) return message.reply("Mention a user.");

            await member.kick().catch(() => {});
            return message.channel.send(`👢 Kicked ${member.user.tag}`);
        }

        if (cmd === "ban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return message.reply("❌ No permission.");
            }

            if (!member) return message.reply("Mention a user.");

            await member.ban().catch(() => {});
            return message.channel.send(`🔨 Banned ${member.user.tag}`);
        }

        // ---------------- GIVEAWAY CREATE FIXED ----------------
        if (cmd === "g.create") {

            const prize = args.join(" ");
            if (!prize) return message.reply("Usage: g.create <prize>");

            const msg = await message.channel.send(
`🎉 GIVEAWAY

🏆 Prize: **${prize}**
React with 🎉 to enter!`
            );

            await msg.react("🎉");

            db.giveaways[msg.id] = {
                prize,
                entries: []
            };

            saveDB();

            return;
        }

        // ---------------- GIVEAWAY REROLL FIXED ----------------
        if (cmd === "g.reroll") {

            const id = args[0];
            const g = db.giveaways[id];

            if (!g || !g.entries.length) {
                return message.reply("❌ No giveaway or no entries.");
            }

            const winner = pickWinner(g.entries);

            return message.channel.send(`🎉 New Winner: <@${winner}>`);
        }

    } catch (err) {
        console.log(err);
        message.reply("❌ Error occurred.");
    }
});

// ---------------- GIVEAWAY ENTRY TRACKING ----------------
client.on("messageReactionAdd", (reaction, user) => {
    if (user.bot) return;

    const g = db.giveaways[reaction.message.id];
    if (!g) return;

    if (reaction.emoji.name === "🎉") {
        if (!g.entries.includes(user.id)) {
            g.entries.push(user.id);
            saveDB();
        }
    }
});

// ---------------- LOGIN ----------------
client.login(process.env.DISCORD_TOKEN);
