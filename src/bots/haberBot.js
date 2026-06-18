import puppeteer from '@cloudflare/puppeteer';
import { CONFIG, delay, clearTurkishChars, updateInteraction, sendResponse } from '../utils/helpers.js';

export async function handleHaberBot(interaction, request, env, ctx) {
  if (interaction.type === 1) return new Response(JSON.stringify({ type: 1 }), { headers: { 'Content-Type': 'application/json' } });

  if (interaction.type === 2 && interaction.data.name === 'haber') {
    const getOption = (optName) => interaction.data.options?.find(o => o.name === optName)?.value;
    
    ctx.waitUntil((async () => {
      try {
        const icerik = clearTurkishChars(getOption('icerik'));
        if (icerik.length > 120) return await updateInteraction(interaction.application_id, interaction.token, { content: "Manset maksimum 120 karakter olabilir." });

        const userRoles = interaction.member?.roles || [];
        if (!userRoles.includes(CONFIG.ALLOWED_ROLE_ID)) {
          return await updateInteraction(interaction.application_id, interaction.token, { content: "Bu komut icin magazin rolune sahip olmalisin." });
        }

        const bgBase64 = await env.KV.get('news_bg_base64');
        if (!bgBase64) throw new Error("Arka plan resmi KV'de bulunamadi.");

        const htmlTemplate = `
          <!DOCTYPE html><html><head><style>
            @import url('https://fonts.googleapis.com/css2?family=Nosifer&display=swap');
            body { margin:0; padding:0; width:700px; height:900px; background-image:url(data:image/png;base64,${bgBase64}); background-size:cover; font-family:'Nosifer',sans-serif; color:white; position:relative; }
            .manset { position:absolute; top:480px; left:50%; transform:translateX(-50%); font-size:18px; text-align:center; width:58%; color:#ff2a6d; line-height:1.5; text-shadow:0px 4px 8px #000, 0px 2px 3px #000; word-wrap:break-word; }
          </style></head><body><div class="manset">${icerik}</div></body></html>
        `;

        const browser = await puppeteer.launch(env.MY_BROWSER);
        const page = await browser.newPage();
        await page.setViewport({ width: 700, height: 900 });
        await page.setContent(htmlTemplate);
        await page.evaluate(async () => await document.fonts.ready);
        const screenshotBuffer = await page.screenshot({ type: 'png' });
        await browser.close();

        const formData = new FormData();
        formData.append('files[0]', new Blob([screenshotBuffer], { type: 'image/png' }), 'manset.png');
        formData.append('payload_json', JSON.stringify({ content: `<@&${CONFIG.MENTION_ROLE_ID}>` }));

        const msgRes = await fetch(`https://discord.com/api/v10/channels/${CONFIG.NEWS_CHANNEL_ID}/messages`, {
          method: 'POST',
          headers: { 'Authorization': `Bot ${env.HABER_DISCORD_TOKEN}` },
          body: formData
        });
        
        if (!msgRes.ok) throw new Error("Mesaj atilamadi.");
        const msgData = await msgRes.json();

        await fetch(`https://discord.com/api/v10/channels/${CONFIG.NEWS_CHANNEL_ID}/messages/${msgData.id}/threads`, {
          method: 'POST',
          headers: { 'Authorization': `Bot ${env.HABER_DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: `Yorumlar • ${icerik.slice(0, 30)}`, auto_archive_duration: 1440 })
        });

        for (const emoji of CONFIG.REACTIONS) {
          const ep = emoji.startsWith("custom:") ? `customEmoji:${emoji.split(":")[1]}` : emoji;
          await fetch(`https://discord.com/api/v10/channels/${CONFIG.NEWS_CHANNEL_ID}/messages/${msgData.id}/reactions/${encodeURIComponent(ep)}/@me`, {
            method: 'PUT', headers: { 'Authorization': `Bot ${env.HABER_DISCORD_TOKEN}` }
          });
          await delay(1500);
        }

        await updateInteraction(interaction.application_id, interaction.token, { content: `Haber basariyla <#${CONFIG.NEWS_CHANNEL_ID}> kanalinda yayinlandi!` });
      } catch (err) {
        await updateInteraction(interaction.application_id, interaction.token, { content: `Hata: ${err.message}` });
      }
    })());
    return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response('Bilinmeyen haber etkilesimi', { status: 400 });
}