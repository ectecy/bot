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

    const target = message.mentions.members.first();
    if (!target)
        return message.reply("❌ Mention someone like: ,hug @user");

    const gifs = [
        "https://media.tenor.com/4Y9x9qX1g2AAAAAC/anime-hug.gif",
        "https://media.tenor.com/8Hc1v3Y5yJgAAAAC/hug-anime.gif",
        "https://media.tenor.com/1l3xQwZy2m8AAAAC/cute-hug.gif"
    ];

    const gif = gifs[Math.floor(Math.random() * gifs.length)];

    return message.channel.send({
        embeds: [
            new EmbedBuilder()
                .setColor("Pink")
                .setDescription(`🤗 ${message.author} hugs ${target.user}`)
                .setImage(gif)
        ]
    });
}
        
if (cmd === "kiss") {

    const target = message.mentions.members.first();
    if (!target)
        return message.reply("❌ Mention someone like: ,kiss @user");

    const gifs = [
        "https://media.tenor.com/3Yt5xkK8hQAAAAAC/anime-kiss.gif",
        "https://media.tenor.com/9Ab2cX1pLmAAAAAC/kiss-anime.gif",
        "https://media.tenor.com/2kQx8hZy0rAAAAAC/cute-kiss.gif"
    ];

    const gif = gifs[Math.floor(Math.random() * gifs.length)];

    return message.channel.send({
        embeds: [
            new EmbedBuilder()
                .setColor("Pink")
                .setDescription(`💋 ${message.author} kisses ${target.user}`)
                .setImage(gif)
        ]
    });
}
        
if (cmd === "slap") {

    if (!member) {
        return message.reply("❌ Mention someone to slap.");
    }

    const gifs = [
        "https://images-ext-1.discordapp.net/external/eo41PefE1eBGfQy2pCJ6NnwDDL7lXvhTVzpGk13KmhE/https/images-ext-1.discordapp.net/external/OLmWWwnlAKonK3vrZKAd505N3RpjncLVABAoz_rBBhE/https/nekos.best/api/v2/slap/facb4ca9-b269-4b88-b72d-f99416546bfb.gif",
        "https://images-ext-1.discordapp.net/external/xx6AUAlu3HcLJZd-97rMzc4a3zvisNNRXbWsuaWIgv8/https/images-ext-1.discordapp.net/external/hAwJolPkYUKvbR1a-O2CCHGLb_GGDC8PtrnsNRev3lI/https/nekos.best/api/v2/slap/6fdd5bd2-19d1-4c6e-9f61-d6209f1625ba.gif",
        "https://images-ext-1.discordapp.net/external/RpcknjgUWPVLSljAeCscJyqER8IgTi8-TosDVzxW5E4/https/nekos.best/api/v2/slap/0365dc87-17d5-4a4b-b04a-e1fb2c052e55.gif",
        "https://images-ext-1.discordapp.net/external/j_FkU5x1BV7bXhmfBm4Znolav2l7mAP_UPd7e1G7JHw/https/nekos.best/api/v2/slap/86fb2280-f18d-4a01-9d7b-662209c82684.gif"
    ];

    const gif = gifs[Math.floor(Math.random() * gifs.length)];

    const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription(`👋 ${message.author} slaps ${member.user}`)
        .setImage(gif);

    return message.channel.send({ embeds: [embed] });
}

        
if (cmd === "shoot") {

    if (!member) {
        return message.reply("❌ Mention someone to shoot.");
    }

    const gifs = [
        "https://images-ext-1.discordapp.net/external/ObjpTlGgXfr13OwQKRJWumsxuLR5cS4WzBvR7_5wNc4/https/nekos.best/api/v2/shoot/55157a2c-28c1-4ffd-a0b6-7be8eb652b30.gif",
        "https://images-ext-1.discordapp.net/external/72l3p5dF24Di2ktiCzZuf4bSUZjreuE9f2YphPxZnyo/https/nekos.best/api/v2/shoot/453ab869-f191-4555-a0ea-7a1c70013751.gif",
        "https://images-ext-1.discordapp.net/external/seLQ81XQmitmApBjKpHgc4C6YZzmcxgD-FvDvsGe9Bw/https/nekos.best/api/v2/shoot/77daac09-d578-459d-939e-eb7f4465a16e.gif",
        "https://images-ext-1.discordapp.net/external/jLtAR2DSMbE3RoSC_nxSci9mZqU4XIQX_zClaapxXLU/https/nekos.best/api/v2/shoot/83ed8fd5-8ad7-4375-af87-d67a63aeaaed.gif"
    ];

    const gif = gifs[Math.floor(Math.random() * gifs.length)];

    const embed = new EmbedBuilder()
        .setColor("DarkRed")
        .setDescription(`🔫 ${message.author} shoots ${member.user} 💥`)
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
