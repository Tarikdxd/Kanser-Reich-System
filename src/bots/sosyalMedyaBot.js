import { updateInteraction, sendResponse } from '../utils/helpers.js';

export async function handleSosyalMedyaBot(interaction, request, env, ctx) {
  if (interaction.type === 1) {
    return new Response(JSON.stringify({ type: 1 }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (interaction.type === 2) {
    const { name, options } = interaction.data;
    const getOption = (optName) => options?.find(o => o.name === optName)?.value;

    switch (name) {
      case 'telegram-sorgula':
        ctx.waitUntil((async () => {
          try {
            const k = getOption('kullanici');
            let result = '**Telegram Profil:** @' + k + '\n\n';
            const web = await fetch('https://t.me/' + k, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const text = await web.text();
            if (text.includes('og:title')) { result += '**Profil:** t.me/' + k + '\n**Durum:** Mevcut\n'; }
            else result += 'Bulunamadi veya gizli.\n';
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Telegram hatasi: ' + err.message }); }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });



      case 'dox-detay':
        ctx.waitUntil((async () => {
          try {
            const k = getOption('kullanici');
            let result = '**Detayli DOX:** ' + k + '\n\n';
            try {
              const gh = await (await fetch('https://api.github.com/users/' + k, { headers: env.GITHUB_TOKEN ? { Authorization: 'Bearer ' + env.GITHUB_TOKEN } : {} })).json();
              if (gh.login) result += '**GitHub:** ' + (gh.name || 'Gizli') + ' | ' + (gh.location || 'Gizli') + '\n';
            } catch (e) {}
            if (env.HIBP_API_KEY) {
              try {
                const h = await (await fetch('https://haveibeenpwned.com/api/v3/breachedaccount/' + encodeURIComponent(k) + '?truncateResponse=true', { headers: { 'hibp-api-key': env.HIBP_API_KEY } })).json();
                if (Array.isArray(h) && h.length > 0) result += '**HIBP Sizinti:** ' + h.length + ' adet\n' + h.slice(0, 3).map(b => '\u2022 ' + b.Name).join('\n') + '\n';
              } catch (e) {}
            }
            try {
              const ps = await (await fetch('https://psbdmp.cc/api/search/' + encodeURIComponent(k))).json();
              if (ps.count > 0) result += '**psbdmp.cc:** ' + ps.count + ' pastebin kaydi\n';
            } catch (e) {}
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'DOX hatasi: ' + err.message }); }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });





      case 'reddit-profil':
        ctx.waitUntil((async () => {
          try {
            const k = getOption('kullanici');
            let result = '**Reddit Profil:** u/' + k + '\n\n';
            try {
              const c = new AbortController(); setTimeout(() => c.abort(), 5000);
              const r = await fetch('https://www.reddit.com/user/' + k + '/about.json', { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: c.signal });
              const d = await r.json();
              if (d.data) {
                const u = d.data;
                result += '**Kullanici Adi:** ' + u.name + '\n';
                result += '**Isim:** ' + (u.subreddit?.title || u.name) + '\n';
                result += '**Post Karma:** ' + (u.total_karma ?? u.link_karma ?? 'Bilinmiyor') + '\n';
                result += '**Yorum Karma:** ' + (u.comment_karma ?? 'Bilinmiyor') + '\n';
                result += '**Hesap Tarihi:** <t:' + Math.floor(u.created_utc) + ':R>\n';
                result += '**Reddit Gold:** ' + (u.is_gold ? 'Evet' : 'Hayir') + '\n';
              } else { result += 'Kullanici bulunamadi.\n'; }
            } catch (e) { result += 'Reddit API\'ye ulasilamadi veya kullanici bulunamadi.\n'; }
            try {
              const c2 = new AbortController(); setTimeout(() => c2.abort(), 5000);
              const r2 = await fetch('https://www.reddit.com/user/' + k + '/comments.json?limit=5', { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: c2.signal });
              const d2 = await r2.json();
              if (d2.data?.children?.length > 0) {
                result += '\n**Son Yorumlar:**\n';
                d2.data.children.slice(0, 3).forEach(c => {
                  result += '\u2022 ' + (c.data.body?.substring(0, 80) || 'Bos') + '\n';
                });
              }
            } catch (e) {}
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Reddit hatasi: ' + err.message }); }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'telegram-kanal':
        ctx.waitUntil((async () => {
          try {
            const kanal = getOption('kanal');
            let result = '**Telegram Kanal:** @' + kanal + '\n\n';
            try {
              const c = new AbortController(); setTimeout(() => c.abort(), 5000);
              const r = await fetch('https://t.me/' + kanal, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: c.signal });
              const text = await r.text();
              if (text.includes('og:title') || text.includes('tgme_channel_info')) {
                result += '**Kanal Mevcut:** Evet\n';
                if (text.includes('tgme_channel_info_counters')) {
                  const uyeMatch = text.match(/([0-9.,]+)\s*(member|uye|Uye)/i);
                  if (uyeMatch) result += '**Uye Sayisi:** ' + uyeMatch[1] + '\n';
                }
                result += '**Link:** https://t.me/' + kanal + '\n';
              } else { result += 'Kanal bulunamadi veya gizli.\n'; }
            } catch (e) { result += 'Telegram sayfasina erisilemedi.\n'; }
            result += '\n**Tahmini Bilgiler:**\n';
            result += 'Kanal Turu: Publik\n';
            result += 'Aktiflik: Bilinmiyor (manuel inceleme gerekli)\n';
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Telegram kanal hatasi: ' + err.message }); }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'steam-istihbarat':
        ctx.waitUntil((async () => {
          try {
            const steamid = getOption('steamid');
            let result = '**Steam Istihbarat:** ' + steamid + '\n\n';
            if (env.STEAM_API_KEY) {
              try {
                const c = new AbortController(); setTimeout(() => c.abort(), 5000);
                const r = await fetch('http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=' + env.STEAM_API_KEY + '&vanityurl=' + steamid, { signal: c.signal });
                const d = await r.json();
                let sid = d.response?.steamid;
                if (!sid && /^[0-9]{17}$/.test(steamid)) sid = steamid;
                if (sid) {
                  result += '**Steam ID:** ' + sid + '\n';
                  const c2 = new AbortController(); setTimeout(() => c2.abort(), 5000);
                  const r2 = await fetch('http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=' + env.STEAM_API_KEY + '&steamids=' + sid, { signal: c2.signal });
                  const d2 = await r2.json();
                  const p = d2.response?.players?.[0];
                  if (p) {
                    result += '**Isim:** ' + (p.personaname || 'Bilinmiyor') + '\n';
                    result += '**Seviye:** Steam Cloud\n';
                    result += '**Profil:** ' + (p.profileurl || '') + '\n';
                    result += '**Hesap Olusturma:** ' + (p.timecreated ? '<t:' + p.timecreated + ':R>' : 'Bilinmiyor') + '\n';
                    result += '**Toplam Oyun:** Steam API oyun listesi icin ek sorgu gerekli\n';
                  }
                } else { result += 'Steam kullanicisi bulunamadi.\n'; }
              } catch (e) { result += 'Steam API hatasi: ' + e.message + '\n'; }
            } else {
              result += 'Steam API anahtari tanimlanmamis.\n';
              result += '**Profil:** https://steamcommunity.com/id/' + steamid + '/\n';
              result += 'Dummy: Steam API key olmadan detayli bilgi alinamaz.\n';
            }
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Steam hatasi: ' + err.message }); }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'sarki-profil':
        ctx.waitUntil((async () => {
          try {
            const k = getOption('kullanici');
            let result = '**Muzik Profili:** ' + k + '\n\n';
            if (env.LASTFM_API_KEY) {
              try {
                const c = new AbortController(); setTimeout(() => c.abort(), 5000);
                const r = await fetch('http://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=' + encodeURIComponent(k) + '&api_key=' + env.LASTFM_API_KEY + '&format=json', { signal: c.signal });
                const d = await r.json();
                if (d.user) {
                  result += '**Platform:** Last.fm\n';
                  result += '**Kullanici:** ' + d.user.name + '\n';
                  result += '**Ulke:** ' + (d.user.country || 'Bilinmiyor') + '\n';
                  result += '**Kayit:** ' + (d.user.registered?.unixtime ? '<t:' + d.user.registered.unixtime + ':R>' : 'Bilinmiyor') + '\n';
                  result += '**Toplam Parca:** ' + (d.user.playcount || '0') + '\n';
                  const c2 = new AbortController(); setTimeout(() => c2.abort(), 5000);
                  const r2 = await fetch('http://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=' + encodeURIComponent(k) + '&api_key=' + env.LASTFM_API_KEY + '&format=json&limit=5', { signal: c2.signal });
                  const d2 = await r2.json();
                  if (d2.topartists?.artist?.length > 0) {
                    result += '\n**En Cok Dinlenen 5 Sanatci:** \n';
                    d2.topartists.artist.slice(0, 5).forEach((a, i) => {
                      result += (i + 1) + '. ' + a.name + ' (' + a.playcount + ')\n';
                    });
                  }
                } else { result += 'Kullanici Last.fm\'de bulunamadi.\n'; }
              } catch (e) { result += 'Last.fm API hatasi: ' + e.message + '\n'; }
            } else {
              result += 'Last.fm API anahtari tanimlanmamis. Dummy veri gosteriliyor:\n\n';
              result += '**Platform:** Spotify/Last.fm\n';
              result += '**Kullanici:** ' + k + '\n';
              result += '**En Cok Dinlenen:**\n';
              result += '1. Artist A (1,234 dinlenme)\n';
              result += '2. Artist B (987 dinlenme)\n';
              result += '3. Artist C (654 dinlenme)\n';
              result += '4. Artist D (321 dinlenme)\n';
              result += '5. Artist E (210 dinlenme)\n';
            }
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Muzik profili hatasi: ' + err.message }); }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'sosyal-derin':
        ctx.waitUntil((async () => {
          try {
            const k = getOption('kullanici');
            let result = '**Derin Sosyal Medya Taramasi:** @' + k + '\n\n**Taranan Platformlar:**\n\n';
            const platforms = [
              { n: 'Instagram', u: 'https://www.instagram.com/' + k + '/' },
              { n: 'Twitter', u: 'https://twitter.com/' + k },
              { n: 'GitHub', u: 'https://github.com/' + k },
              { n: 'Reddit', u: 'https://www.reddit.com/user/' + k },
              { n: 'TikTok', u: 'https://www.tiktok.com/@' + k },
              { n: 'Telegram', u: 'https://t.me/' + k },
              { n: 'YouTube', u: 'https://www.youtube.com/@' + k },
              { n: 'Pinterest', u: 'https://www.pinterest.com/' + k + '/' },
              { n: 'Twitch', u: 'https://www.twitch.tv/' + k },
              { n: 'Steam', u: 'https://steamcommunity.com/id/' + k + '/' }
            ];
            const kontrol = async (p) => {
              const timeout = new Promise(r => setTimeout(() => r(false), 4500));
              const check = fetch(p.u, { redirect: 'manual' }).then(r => r.status === 200 || r.status === 301 || r.status === 302).catch(() => false);
              return await Promise.race([check, timeout]);
            };
            let bulunan = 0;
            for (let i = 0; i < platforms.length; i += 5) {
              const batch = platforms.slice(i, i + 5);
              await Promise.all(batch.map(p => kontrol(p).then(exists => { if (exists) { result += '[OK] [' + p.n + '](' + p.u + ')\n'; bulunan++; } })));
            }
            if (bulunan === 0) result += 'Hicbir platformda profil bulunamadi.\n';
            result += '\n**Ozet:** ' + bulunan + '/' + platforms.length + ' platformda profil bulundu.\n';
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Derin tarama hatasi: ' + err.message }); }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'telegram-grup':
        ctx.waitUntil((async () => {
          try {
            const grup = getOption('grup');
            let result = '**Telegram Grup Bilgisi:** ' + grup + '\n\n';
            try {
              const c = new AbortController(); setTimeout(() => c.abort(), 5000);
              const url = grup.startsWith('https://t.me/') || grup.startsWith('t.me/') ? grup.replace(/^t\.me\//, 'https://t.me/').replace(/^https?:\/\//, 'https://') : 'https://t.me/' + grup;
              const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: c.signal });
              const text = await r.text();
              if (text.includes('tgme_channel_info') || text.includes('tgme_page')) {
                result += 'Grup/kanal sayfasi mevcut.\n';
                const titleMatch = text.match(/<meta property="og:title"[^>]*content="([^"]+)"/);
                if (titleMatch) result += '**Baslik:** ' + titleMatch[1] + '\n';
                const descMatch = text.match(/<meta property="og:description"[^>]*content="([^"]+)"/);
                if (descMatch) result += '**Aciklama:** ' + descMatch[1].substring(0, 100) + '\n';
              } else { result += 'Grup bulunamadi veya gizli.\n'; }
            } catch (e) { result += 'Grup sayfasina erisilemedi.\n'; }
            result += '\n**Not:** Telegram grup uye listesi ve detayli analiz icin Telegram API veya manuel dogrulama gereklidir.\n';
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Telegram grup hatasi: ' + err.message }); }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });



      default:
        return sendResponse('Bilinmeyen komut. Bu bot henuz yapilandiriliyor.');
    }
  }

  return new Response('Bilinmeyen etkilesim', { status: 400 });
}
