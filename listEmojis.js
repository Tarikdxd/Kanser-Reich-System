const config = require('./config.json');

async function listEmojis() {
  const url = `https://discord.com/api/v10/guilds/${config.testGuildId}/emojis`;
  const res = await fetch(url, { headers: { 'Authorization': `Bot ${config.discordToken}` } });

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
