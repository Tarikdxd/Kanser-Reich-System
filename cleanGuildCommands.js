const config = require('./config.json');

async function clearGuildCommands() {
  for (const guildId of config.guildIds) {
    const url = `https://discord.com/api/v10/applications/${config.applicationId}/guilds/${guildId}/commands`;

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bot ${config.discordToken}`
        },
        body: JSON.stringify([])
      });

      if (response.ok) {
        console.log(`Sunucu (${guildId}) yerel komutlari temizlendi.`);
      }
    } catch (err) {
      console.error(err);
    }
  }
}

clearGuildCommands();
