const token = process.env.DISCORD_TOKEN;
const applicationId = "1045787629028909106";

const guildIds = [
  "750127541116993536", 
  "1442997310735913053" 
];

async function clearGuildCommands() {
  for (const guildId of guildIds) {
    const url = `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`;
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bot ${token}`
        },
        body: JSON.stringify([]) // Bos array gondererek sunucuya ozel komutlari siliyoruz
      });
      
      if (response.ok) {
        console.log(`Sunucu (${guildId}) yerel komutlari temizlendi. Artik sadece Global komut gorunecek.`);
      }
    } catch (err) {
      console.error(err);
    }
  }
}

clearGuildCommands();
