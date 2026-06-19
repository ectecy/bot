const { Events } = require('discord.js');
const prefix = ',r'; // Set your primary prefix

client.on(Events.MessageCreate, async (message) => {
    // Ignore bots and messages that don't start with the prefix
    if (message.author.bot || !message.content.startsWith(prefix)) return;

    // Split the message into arguments and isolate the command
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Check if the command matches "create"
    if (command === 'create') {
        try {
            // Place your creation logic here
            await message.reply('You have successfully triggered the `,r create` command!');
        } catch (error) {
            console.error(error);
        }
    }
});