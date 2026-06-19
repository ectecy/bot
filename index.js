const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    EmbedBuilder
} = require("discord.js");
const fs = require("fs");

const PREFIX = ",";

/* =========================================================
   📦 DATABASE
========================================================= */

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

/* =========================================================
   🤖 CLIENT
========================================================= */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ]
});

/* =========================================================
   📊 LEVEL SYSTEM
========================================================= */

function getLevel(xp) {
    return Math.floor(Math.sqrt(xp / 100));
}

function addXP(userId) {
    const gain = Math.floor(Math.random() * 11) + 5;

    if (!db.xp[userId]) db.xp[userId] = 0;

    db.xp[userId] += gain;

    saveDB();
}

/* =========================================================
   🟢 READY
========================================================= */

client.once("ready", () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

/* =========================================================
   💬 MESSAGE HANDLER
========================================================= */

client.on("messageCreate", async (message) => {

    if (!message.guild || message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = (args.shift() || "").toLowerCase();

    const member = message.mentions.members.first();
    const user = message.mentions.users.first();

    try {

        /* =================================================
           XP GAIN
        ================================================= */

        addXP(message.author.id);

        /* =================================================
           COMMAND LIST
        ================================================= */

        if (cmd === "commands") {

            const embed = new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle("📜 Command Center")
                .setDescription("Available commands")
                .addFields(
                    {
                        name: "💰 Economy",
                        value:
                        "` ,balance `\n` ,work `",
                        inline: true
                    },
                    {
                        name: "⚠️ Moderation",
                        value:
                        "` ,warn `\n` ,kick `\n` ,ban `\n` ,unban `",
                        inline: true
                    },
                    {
                        name: "🔒 Channel",
                        value:
                        "` ,lock `\n` ,unlock `",
                        inline: true
                    },
                    {
                        name: "🎭 Roles",
                        value:
                        "` ,r create `\n` ,r add `\n` ,r remove `\n` ,r delete `",
                        inline: true
                    },
                    {
                        name: "📊 Leveling",
                        value:
                        "` ,rank `\n` ,g.m `",
                        inline: true
                    },
                    {
                        name: "💖 Fun",
                        value:
                        "` ,hug `\n` ,kiss `\n` ,slap `\n` ,shoot `",
                        inline: true
                    }
                )
                .setThumbnail(client.user.displayAvatarURL())
                .setTimestamp();

            return message.channel.send({
                embeds: [embed]
            });
        }

        /* =================================================
           RANK
        ================================================= */

        if (cmd === "rank") {

            const xp = db.xp[message.author.id] || 0;
            const level = getLevel(xp);

            const embed = new EmbedBuilder()
                .setColor("#00BFFF")
                .setTitle("📊 Rank Information")
                .setThumbnail(message.author.displayAvatarURL())
                .addFields(
                    {
                        name: "⭐ Level",
                        value: `${level}`,
                        inline: true
                    },
                    {
                        name: "✨ XP",
                        value: `${xp}`,
                        inline: true
                    }
                )
                .setFooter({
                    text: message.author.tag
                });

            return message.reply({
                embeds: [embed]
            });
        }

        /* =================================================
           LEVEL LEADERBOARD
        ================================================= */

        if (cmd === "g.m") {

            const sorted = Object.entries(db.xp)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            if (!sorted.length)
                return message.reply("❌ No XP data.");

            let board = "";

            sorted.forEach(([id, xp], index) => {

                board +=
                    `**${index + 1}.** <@${id}> • Level ${getLevel(xp)} • ${xp} XP\n`;

            });

            const embed = new EmbedBuilder()
                .setColor("Gold")
                .setTitle("🏆 Level Leaderboard")
                .setDescription(board)
                .setTimestamp();

            return message.channel.send({
                embeds: [embed]
            });
        }

        /* =================================================
           BALANCE
        ================================================= */

        if (cmd === "balance") {

            const balance = db.economy[message.author.id] || 0;

            const embed = new EmbedBuilder()
                .setColor("Gold")
                .setTitle("💰 Wallet")
                .setDescription(
                    `You currently have **$${balance}**`
                );

            return message.reply({
                embeds: [embed]
            });
        }

        /* =================================================
           WORK
        ================================================= */

        if (cmd === "work") {

            const amount =
                Math.floor(Math.random() * 200) + 50;

            db.economy[message.author.id] =
                (db.economy[message.author.id] || 0)
                + amount;

            saveDB();

            const embed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("💼 Work Complete")
                .setDescription(
                    `You earned **$${amount}**`
                )
                .setTimestamp();

            return message.reply({
                embeds: [embed]
            });
        }  /* =================================================
           WARN SYSTEM
        ================================================= */

       /* =================================================
   WARN SYSTEM
================================================= */

if (cmd === "warn") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
        return message.reply("❌ No permission.");

    if (!member)
        return message.reply("❌ Mention someone.");

    const reason = args.join(" ") || "No reason";

    db.warns[member.id] = (db.warns[member.id] || 0) + 1;
    saveDB();

    const count = db.warns[member.id];

    const warnEmbed = new EmbedBuilder()
        .setColor("Orange")
        .setTitle("⚠️ User Warned")
        .addFields(
            { name: "User", value: `${member.user.tag}`, inline: true },
            { name: "Warnings", value: `${count}/4`, inline: true },
            { name: "Reason", value: reason }
        )
        .setTimestamp();

    await message.channel.send({ embeds: [warnEmbed] });

    if (count >= 4) {
        const target = await message.guild.members.fetch(member.id).catch(() => null);

        if (target && target.bannable) {
            await target.ban({ reason: "4 warns reached" });

            db.warns[member.id] = 0;
            saveDB();
        }
    }
}
        /* =================================================
           KICK
        ================================================= */

        if (cmd === "kick") {

            if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
                return message.reply("❌ No permission.");

            if (!member)
                return message.reply("❌ Mention a user.");

            const target = await message.guild.members.fetch(member.id).catch(() => null);

            if (!target)
                return message.reply("❌ User not found.");

            if (!target.kickable)
                return message.reply("❌ Cannot kick this user.");

            await target.kick();

            const embed = new EmbedBuilder()
                .setColor("Orange")
                .setTitle("👢 Member Kicked")
                .setDescription(`${target.user.tag} was kicked from the server.`)
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }

        /* =================================================
           BAN
        ================================================= */

        if (cmd === "ban") {

            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
                return message.reply("❌ No permission.");

            if (!member)
                return message.reply("❌ Mention a user.");

            const target = await message.guild.members.fetch(member.id).catch(() => null);

            if (!target)
                return message.reply("❌ User not found.");

            if (!target.bannable)
                return message.reply("❌ Cannot ban this user.");

            await target.ban();

            const embed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("🔨 Member Banned")
                .setDescription(`${target.user.tag} has been banned.`)
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }

        /* =================================================
           UNBAN
        ================================================= */

        if (cmd === "unban") {

            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
                return message.reply("❌ No permission.");

            const userId = args[0];

            if (!userId)
                return message.reply("Usage: ,unban <userID>");

            await message.guild.members.unban(userId);

            const embed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("✅ User Unbanned")
                .setDescription(`User ID: ${userId} has been unbanned.`)
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }
/* ================= LOCK CHANNEL ================= */

if (cmd === "lock") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
        return message.reply("❌ No permission.");

    await message.channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        { SendMessages: false }
    );

    const embed = new EmbedBuilder()
        .setColor("DarkRed")
        .setTitle("🔒 Channel Locked")
        .setDescription(`${message.channel} is now locked.`);

    return message.channel.send({ embeds: [embed] });
}

/* ================= UNLOCK CHANNEL ================= */

if (cmd === "unlock") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
        return message.reply("❌ No permission.");

    await message.channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        { SendMessages: true }
    );

    const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("🔓 Channel Unlocked")
        .setDescription(`${message.channel} is now unlocked.`);

    return message.channel.send({ embeds: [embed] });
}
         /* =================================================
           🎭 ROLE SYSTEM
        ================================================= */

        if (cmd === "r") {

            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
                return message.reply("❌ No permission.");

            const sub = args[0];

            /* ================= CREATE ROLE ================= */

            if (sub === "create") {

                const name = args.slice(1).join(" ");

                if (!name)
                    return message.reply("❌ Provide a role name.");

                const role = await message.guild.roles.create({ name });

                const embed = new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("🎭 Role Created")
                    .setDescription(`Created role **${role.name}**`);

                return message.channel.send({ embeds: [embed] });
            }

            /* ================= ADD ROLE ================= */

            if (sub === "add") {

                if (!member)
                    return message.reply("❌ Mention a user.");

                const roleName = args.slice(2).join(" ");
                const role = message.guild.roles.cache.find(r => r.name === roleName);

                if (!role)
                    return message.reply("❌ Role not found.");

                await member.roles.add(role);

                const embed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("➕ Role Added")
                    .setDescription(`Added **${role.name}** to ${member.user.tag}`);

                return message.channel.send({ embeds: [embed] });
            }

            /* ================= REMOVE ROLE ================= */

            if (sub === "remove") {

                if (!member)
                    return message.reply("❌ Mention a user.");

                const roleName = args.slice(2).join(" ");
                const role = message.guild.roles.cache.find(r => r.name === roleName);

                if (!role)
                    return message.reply("❌ Role not found.");

                await member.roles.remove(role);

                const embed = new EmbedBuilder()
                    .setColor("Orange")
                    .setTitle("➖ Role Removed")
                    .setDescription(`Removed **${role.name}** from ${member.user.tag}`);

                return message.channel.send({ embeds: [embed] });
            }

            /* ================= DELETE ROLE ================= */

            if (sub === "delete") {

                const roleName = args.slice(1).join(" ");
                const role = message.guild.roles.cache.find(r => r.name === roleName);

                if (!role)
                    return message.reply("❌ Role not found.");

                await role.delete();

                const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("🗑️ Role Deleted")
                    .setDescription(`Deleted role **${role.name}**`);

                return message.channel.send({ embeds: [embed] });
            }
        }

       /* =================================================
   💖 FUN COMMANDS (WITH GIFS)
================================================= */

if (cmd === "hug") {

    const gif = "https://media.tenor.com/4S2Yf5y0p1AAAAAC/hug-anime.gif";

    const embed = new EmbedBuilder()
        .setColor("Pink")
        .setDescription(`🤗 ${message.author} hugs ${user || "someone"}`)
        .setImage(gif);

    return message.channel.send({ embeds: [embed] });
}

if (cmd === "kiss") {

    const gif = "https://media.tenor.com/3JZ6k2oQxqAAAAAC/anime-kiss.gif";

    const embed = new EmbedBuilder()
        .setColor("Pink")
        .setDescription(`💋 ${message.author} kisses ${user || "someone"}`)
        .setImage(gif);

    return message.channel.send({ embeds: [embed] });
}

if (cmd === "slap") {

    const gif = "https://media.tenor.com/1Qw8k9gH8oAAAAAC/slap-anime.gif";

    const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription(`👋 ${message.author} slaps ${user || "someone"}`)
        .setImage(gif);

    return message.channel.send({ embeds: [embed] });
}

if (cmd === "shoot") {

    const gif = "https://media.tenor.com/8hYg2vX9z1AAAAAC/anime-gun.gif";

    const embed = new EmbedBuilder()
        .setColor("DarkRed")
        .setDescription(`🔫 ${message.author} shoots ${user || "someone"} 💥`)
        .setImage(gif);

    return message.channel.send({ embeds: [embed] });
}

/* =========================================================
   🔐 LOGIN
========================================================= */

    } catch (err) {
        console.log(err);
    }
});

client.login(process.env.DISCORD_TOKEN);
