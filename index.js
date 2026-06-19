const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const PREFIX = ",";

// ---------------- DATABASE ----------------
let db = {
    economy: {},
    warns: {},
    giveaways: {},
    xp: {}
};

if (fs.existsSync("./data.json")) {
    try {
        db = JSON.parse(fs.readFileSync("./data.json", "utf8"));
    } catch {
        console.log("DB load error");
    }
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

// ---------------- LEVEL ----------------
function getLevel(xp) {
    return Math.floor(Math.sqrt(xp / 100));
}

function addXP(id) {
    db.xp[id] = (db.xp[id] || 0) + Math.floor(Math.random() * 11) + 5;
    saveDB();
}

// ---------------- EMBED HELPER ----------------
function baseEmbed(title, desc = "") {
    return new EmbedBuilder()
        .setColor("#2b2d31")
        .setTitle(title)
        .setDescription(desc)
        .setFooter({ text: "Bot System" });
}

// ---------------- READY ----------------
client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// ---------------- MAIN ----------------
client.on("messageCreate", async (message) => {
    try {
        if (!message.guild || message.author.bot) return;
        if (!message.content.startsWith(PREFIX)) return;

        const args = message.content.slice(PREFIX).trim().split(/ +/);
        const cmd = (args.shift() || "").toLowerCase();

        const user = message.mentions.users.first();
        const member = message.mentions.members.first();

        addXP(message.author.id);

        // ---------------- COMMANDS MENU ----------------
        if (cmd === "commands") {
            return message.channel.send({
                embeds: [
                    baseEmbed("📜 Command Menu",
`
💰 Economy
• ,balance
• ,work

📊 Leveling
• ,rank
• ,g.m

⚠️ Moderation
• ,warn
• ,kick
• ,ban
• ,unban

🎉 Giveaway
• ,g create
• ,g reroll

💖 Fun
• ,hug
• ,kiss
• ,slap
• ,shoot
`)
                ]
            });
        }

        // ---------------- RANK ----------------
        if (cmd === "rank") {
            const xp = db.xp[message.author.id] || 0;

            return message.channel.send({
                embeds: [
                    baseEmbed("📊 Your Rank",
                        `Level: **${getLevel(xp)}**\nXP: **${xp}**`
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
                    baseEmbed("🏆 Leaderboard",
                        sorted.map((u, i) =>
                            `**${i + 1}.** <@${u[0]}> — Level **${getLevel(u[1])}** (${u[1]} XP)`
                        ).join("\n")
                    )
                ]
            });
        }

        // ---------------- ECONOMY ----------------
        if (cmd === "balance") {
            return message.reply({
                embeds: [
                    baseEmbed("💰 Balance",
                        `$${db.economy[message.author.id] || 0}`
                    )
                ]
            });
        }

        if (cmd === "work") {
            const amount = Math.floor(Math.random() * 200) + 50;
            db.economy[message.author.id] = (db.economy[message.author.id] || 0) + amount;
            saveDB();

            return message.reply({
                embeds: [
                    baseEmbed("💼 Work Complete", `Earned **$${amount}**`)
                ]
            });
        }

        // ---------------- WARN ----------------
        if (cmd === "warn") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
                return message.reply("❌ No permission.");

            if (!member) return message.reply("❌ Mention someone.");

            const reason = args.join(" ") || "No reason";

            db.warns[member.id] = (db.warns[member.id] || 0) + 1;
            saveDB();

            const count = db.warns[member.id];

            await message.channel.send({
                embeds: [
                    baseEmbed("⚠️ Warning Issued",
                        `${member.user.tag}\nWarnings: **${count}/4**\nReason: ${reason}`
                    )
                ]
            });

            if (count >= 4 && member.bannable) {
                await member.ban({ reason: "4 warns" }).catch(() => {});
                db.warns[member.id] = 0;
                saveDB();

                message.channel.send({
                    embeds: [
                        baseEmbed("🔨 Auto Ban", `${member.user.tag} was banned`)
                    ]
                });
            }
        }

        // ---------------- KICK ----------------
        if (cmd === "kick") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
                return;

            if (!member) return;

            await member.kick();

            return message.channel.send({
                embeds: [
                    baseEmbed("👢 Kicked", member.user.tag)
                ]
            });
        }

        // ---------------- BAN ----------------
        if (cmd === "ban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
                return;

            if (!member) return;

            await member.ban();

            return message.channel.send({
                embeds: [
                    baseEmbed("🔨 Banned", member.user.tag)
                ]
            });
        }

        // ---------------- UNBAN ----------------
        if (cmd === "unban") {
            const id = args[0];
            if (!id) return;

            await message.guild.members.unban(id).catch(() => {});

            return message.channel.send({
                embeds: [
                    baseEmbed("✅ Unbanned", `<@${id}>`)
                ]
            });
        }

        // ---------------- FUN ----------------
        if (cmd === "hug")
            return message.channel.send({ embeds: [baseEmbed("🤗 Hug", `${message.author} hugs ${user || "someone"}`)] });

        if (cmd === "kiss")
            return message.channel.send({ embeds: [baseEmbed("💋 Kiss", `${message.author} kisses ${user || "someone"}`)] });

        if (cmd === "slap")
            return message.channel.send({ embeds: [baseEmbed("👋 Slap", `${message.author} slaps ${user || "someone"}`)] });

        if (cmd === "shoot")
            return message.channel.send({ embeds: [baseEmbed("🔫 Shoot", `${message.author} shoots ${user || "someone"} 💥`)] });

    } catch (err) {
        console.log(err);
    }
});

// ---------------- LOGIN ----------------
client.login(process.env.DISCORD_TOKEN);
