const token = process.env.DISCORD_TOKEN;
const channelId = "1515541797512675478"; 

const REACTIONS = [
  "custom:1473975113639526430",
  "custom:1446310441721532516",
  "custom:1459463528531366039",
  "custom:1459462866771116125",
  "custom:1473975132123824266"
];

async function testReactions() {
  // 1. Kanala deneme mesaji atalim
  const msgRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: "Emoji Test Mesaji..." })
  });

  if (!msgRes.ok) {
    console.log("Mesaj atilamadi:", await msgRes.text());
    return;
  }
  const msgData = await msgRes.json();
  const messageId = msgData.id;
  console.log(`Test mesaji atildi: ${messageId}`);

  // 2. Emojileri tek tek ekleyelim ve hata ciktisini görelim
  for (const emoji of REACTIONS) {
    const ep = emoji.startsWith("custom:") ? `customEmoji:${emoji.split(":")[1]}` : emoji;
    const reactRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(ep)}/@me`, {
      method: 'PUT', 
      headers: { 'Authorization': `Bot ${token}` }
    });
    
    if (reactRes.ok) {
      console.log(`[BASARILI] ${emoji} eklendi.`);
    } else {
      console.log(`[HATA] ${emoji} eklenemedi! Kod: ${reactRes.status}, Yanit: ${await reactRes.text()}`);
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
}

testReactions();
