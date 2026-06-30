const token = process.env.DISCORD_TOKEN;
const guildId = "1442997310735913053"; // Sunucu ID'si

async function listEmojis() {
  const url = `https://discord.com/api/v10/guilds/${guildId}/emojis`;
  const res = await fetch(url, { headers: { 'Authorization': `Bot ${token}` } });
  
  if (!res.ok) {
    console.log("Sunucu emojileri alinamadi:", await res.text());
    return;
  }
  
  const emojis = await res.json();
  console.log("Sunucudaki ozel emojiler:");
  emojis.forEach(e => {
    console.log(`- Isim: ${e.name}, ID: ${e.id}, Format: ${e.name}:${e.id}`);
  });
}

listEmojis();
