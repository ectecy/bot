const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    EmbedBuilder
} = require("discord.js");

const fs = require("fs");

const PREFIX = ",";

// ---------------- DATABASE ----------------
let db = {
    economy: {},
    warns: {},
    xp: {}
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
        GatewayIntentBits.GuildMembers
    ]
});

// ---------------- CONFIG ----------------
const COLORS = {
    main: 0x5865F2,
    success: 0x57F287,
    danger: 0xED4245,
    warn: 0xFEE75C,
    info: 0x2F3136
};

// ---------------- XP SYSTEM ----------------
function getLevel(xp) {
    return Math.floor(Math.sqrt(xp / 100));
}

function addXP(userId) {
    const gain = Math.floor(Math.random() * 11) + 5;
    db.xp[userId] = (db.xp[userId] || 0) + gain;
}

// ---------------- READY ----------------
client.once("ready", () => {
    console.log(`[READY] Logged in as ${client.user.tag}`);
});

// ---------------- MESSAGE HANDLER ----------------
client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = (args.shift() || "").toLowerCase();

    const member = message.mentions.members.first();
    const user = message.mentions.users.first();

    addXP(message.author.id);
    saveDB();

    try {

        // ---------------- HELP ----------------
        if (cmd === "commands") {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.main)
                        .setTitle("📘 Command Reference")
                        .setDescription("Prefix: `,`")
                        .addFields(
                            {
                                name: "💖 Fun",
                                value: "`hug`, `kiss`, `slap`, `shoot`"
                            },
                            {
                                name: "💰 Economy",
                                value: "`balance`, `work`"
                            },
                            {
                                name: "📊 Leveling",
                                value: "`rank`, `g.m`"
                            },
                            {
                                name: "🛡 Moderation",
                                value: "`warn`, `kick`, `ban`, `unban`"
                            },
                            {
                                name: "🎭 Roles",
                                value: "`r create`, `r add`, `r remove`"
                            }
                        )
                        .setFooter({ text: "Professional Bot System" })
                ]
            });
        }

        // ---------------- RANK ----------------
        if (cmd === "rank") {
            const xp = db.xp[message.author.id] || 0;
            const level = getLevel(xp);

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.main)
                        .setTitle("📊 User Profile")
                        .addFields(
                            { name: "Level", value: `${level}`, inline: true },
                            { name: "XP", value: `${xp}`, inline: true }
                        )
                ]
            });
        }

        // ---------------- LEADERBOARD ----------------
        if (cmd === "g.m") {
            const sorted = Object.entries(db.xp)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xF1C40F)
                        .setTitle("🏆 Global Leaderboard")
                        .setDescription(
                            sorted.length
                                ? sorted.map((u, i) =>
                                    `**${i + 1}.** <@${u[0]}> — Level ${getLevel(u[1])} (${u[1]} XP)`
                                  ).join("\n")
                                : "No data available."
                        )
                ]
            });
        }

        // ---------------- ECONOMY ----------------
        if (cmd === "balance") {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.success)
                        .setTitle("💰 Wallet")
                        .setDescription(`Balance: **$${db.economy[message.author.id] || 0}**`)
                ]
            });
        }

        if (cmd === "work") {
            const amount = Math.floor(Math.random() * 200) + 50;

            db.economy[message.author.id] =
                (db.economy[message.author.id] || 0) + amount;

            saveDB();

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.success)
                        .setDescription(`💼 Earned **$${amount}**`)
                ]
            });
        }

        // ---------------- WARN SYSTEM ----------------
        if (cmd === "warn") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                return message.reply("❌ Missing permissions.");
            }

            if (!member) return message.reply("❌ Mention a user.");

            db.warns[member.id] = (db.warns[member.id] || 0) + 1;
            saveDB();

            const count = db.warns[member.id];

            message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.warn)
                        .setTitle("⚠️ User Warned")
                        .setDescription(`${member.user.tag} has been warned`)
                        .addFields(
                            { name: "Total Warnings", value: `${count}/4` }
                        )
                ]
            });

            if (count >= 4 && member.bannable) {
                await member.ban({ reason: "4 warnings reached" });
                db.warns[member.id] = 0;
                saveDB();
            }
        }

        // ---------------- MODERATION ----------------
        if (cmd === "kick") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return;
            if (!member) return;

            await member.kick();

            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.danger)
                        .setDescription(`👢 Kicked **${member.user.tag}**`)
                ]
            });
        }

        if (cmd === "ban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
            if (!member) return;

            await member.ban();

            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.danger)
                        .setDescription(`🔨 Banned **${member.user.tag}**`)
                ]
            });
        }

        if (cmd === "unban") {
            const id = args[0];
            if (!id) return message.reply("Usage: ,unban <userID>");

            try {
                await message.guild.members.unban(id);

                return message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.success)
                            .setDescription(`✅ Unbanned <@${id}>`)
                    ]
                });
            } catch {
                return message.reply("❌ Failed to unban.");
            }
        }

        // ---------------- FUN ----------------
        if (cmd === "hug") return message.channel.send(`🤗 ${message.author} hugs ${user || "someone"}`);
        if (cmd === "kiss") return message.channel.send(`💋 ${message.author} kisses ${user || "someone"}`);
        if (cmd === "slap") return message.channel.send(`👋 ${message.author} slaps ${user || "someone"}`);
        if (cmd === "shoot") return message.channel.send(`🔫 ${message.author} shoots ${user || "someone"} 💥`);

        // ---------------- ROLE SYSTEM ----------------
        if (cmd === "r") {

            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                return message.reply("❌ Missing permissions.");
            }

            if (args[0] === "create") {
                const name = args.slice(1).join(" ");
                const role = await message.guild.roles.create({ name });

                return message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.success)
                            .setDescription(`🎭 Created role **${role.name}**`)
                    ]
                });
            }

            if (args[0] === "add") {
                const roleName = args.slice(2).join(" ");
                const role = message.guild.roles.cache.find(r => r.name === roleName);

                if (!member || !role) return message.reply("Invalid usage.");

                await member.roles.add(role);
                return message.channel.send(`➕ Role assigned`);
            }

            if (args[0] === "remove") {
                const roleName = args.slice(2).join(" ");
                const role = message.guild.roles.cache.find(r => r.name === roleName);

                if (!member || !role) return message.reply("Invalid usage.");

                await member.roles.remove(role);
                return message.channel.send(`➖ Role removed`);
            }
        }

    } catch (err) {
        console.log("[ERROR]", err);
    }
});

// ---------------- LOGIN ----------------
client.login(process.env.DISCORD_TOKEN);
