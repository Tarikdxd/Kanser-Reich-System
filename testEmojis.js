const config = require('./config.json');

async function testReactions() {
  const msgRes = await fetch(`https://discord.com/api/v10/channels/${config.testChannelId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bot ${config.discordToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: "Emoji Test Mesaji..." })
  });

  if (!msgRes.ok) {
    console.log("Mesaj atilamadi:", await msgRes.text());
    return;
  }
  const msgData = await msgRes.json();
  const messageId = msgData.id;
  console.log(`Test mesaji atildi: ${messageId}`);

  for (const emoji of config.testReactions) {
    const ep = emoji.startsWith("custom:") ? `customEmoji:${emoji.split(":")[1]}` : emoji;
    const reactRes = await fetch(`https://discord.com/api/v10/channels/${config.testChannelId}/messages/${messageId}/reactions/${encodeURIComponent(ep)}/@me`, {
      method: 'PUT',
      headers: { 'Authorization': `Bot ${config.discordToken}` }
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
