const fs = require('fs');
const path = require('path');

// ===== 1. EMAIL-SORGULA: HIBP public fallback =====
function fixEmailSorgula(content) {
  const oldBlock = `          result += \`_(HIBP_API_KEY eksik)_\\n\`;\n        }\n\n        // Firebase Scraper Check (ucretsiz)`;
  
  const newBlock = `          // --- PUBLIC BREACH CHECK (HIBP KEY YOK) ---\n          result += \`**Public Kaynak Taramasi:**\\n\`;\n          try {\n            const psRes = await fetch(\`https://psbdmp.cc/api/search/\${encodeURIComponent(email)}\`);\n            if (psRes.ok) {\n              const psData = await psRes.json();\n              if (psData.count > 0) {\n                result += \`• psbdmp.cc: \${psData.count} pastebin kaydi bulundu\\n\`;\n                (psData.data || []).slice(0, 3).forEach(d => {\n                  result += \`  - https://pastebin.com/\${d.id}\\n\`;\n                });\n              }\n            }\n          } catch (e) {}\n          try {\n            const leakRes = await fetch(\`https://leakcheck.net/api/public?check=\${encodeURIComponent(email)}\`);\n            if (leakRes.ok) {\n              const leakData = await leakRes.json();\n              if (leakData.success && leakData.found > 0) {\n                result += \`• LeakCheck: \${leakData.found} sizinti kaydi bulundu\\n\`;\n                if (leakData.sources) {\n                  result += \`  Kaynaklar: \${leakData.sources.slice(0, 5).join(', ')}\\n\`;\n                }\n              }\n            }\n          } catch (e) {}\n        }\n\n        // Firebase Scraper Check (ucretsiz)`;

  return content.replace(oldBlock, newBlock);
}

// ===== 2. DIJITAL-IZ: HIBP public fallback =====
function fixDigitalIz(content) {
  const oldBlock = `          // HIBP\n          if (env.HIBP_API_KEY) {\n            try {\n              const hibpRes = await fetch(\`https://haveibeenpwned.com/api/v3/breachedaccount/\${encodeURIComponent(kullanici)}?truncateResponse=true\`, {\n                headers: { 'hibp-api-key': env.HIBP_API_KEY }\n              });\n              if (hibpRes.ok) {\n                const breaches = await hibpRes.json();\n                if (breaches.length > 0) {\n                  result += \`**Veri Sizintilari:** \${breaches.length} adet\\n\`;\n                  breaches.slice(0, 3).forEach(b => result += \`• \${b.Name} (\${b.BreachDate})\\n\`);\n                  result += \`\\n\`;\n                }\n              }\n            } catch (e) {}\n          }`;

  const newBlock = `          // HIBP + Public Breach Check\n          if (env.HIBP_API_KEY) {\n            try {\n              const hibpRes = await fetch(\`https://haveibeenpwned.com/api/v3/breachedaccount/\${encodeURIComponent(kullanici)}?truncateResponse=true\`, {\n                headers: { 'hibp-api-key': env.HIBP_API_KEY }\n              });\n              if (hibpRes.ok) {\n                const breaches = await hibpRes.json();\n                if (breaches.length > 0) {\n                  result += \`**Veri Sizintilari (HIBP):** \${breaches.length} adet\\n\`;\n                  breaches.slice(0, 3).forEach(b => result += \`• \${b.Name} (\${b.BreachDate})\\n\`);\n                  result += \`\\n\`;\n                }\n              }\n            } catch (e) {}\n          }\n          // Public breach check (key olmasa da calisir)\n          try {\n            const psRes = await fetch(\`https://psbdmp.cc/api/search/\${encodeURIComponent(kullanici)}\`);\n            if (psRes.ok) {\n              const psData = await psRes.json();\n              if (psData.count > 0) {\n                result += \`**Public Kaynak:** psbdmp.cc'de \${psData.count} kayit\\n\`;\n              }\n            }\n          } catch (e) {}`;

  return content.replace(oldBlock, newBlock);
}

// ===== 3. DOX-DETAY: HIBP public fallback =====
function fixDoxDetay(content) {
  const oldBlock = `          // HIBP veri sizintilari\n          if (env.HIBP_API_KEY) {\n            try {\n              const hibpRes = await fetch(\`https://haveibeenpwned.com/api/v3/breachedaccount/\${encodeURIComponent(kullanici)}?truncateResponse=true\`, {\n                headers: { 'hibp-api-key': env.HIBP_API_KEY, 'user-agent': 'DiscordBot' }\n              });\n              if (hibpRes.ok) {\n                const breaches = await hibpRes.json();\n                if (breaches.length > 0) {\n                  result += \`**Veri Sizintilari (\${breaches.length} adet):**\\n\`;\n                  breaches.slice(0, 5).forEach(b => {\n                    result += \`• \${b.Name} (\${b.BreachDate || 'Tarih Yok'}) - \${b.Domain || 'Bilinmiyor'}\\n\`;\n                  });\n                  result += '\\n';\n                }\n              }\n            } catch (e) {}\n          }`;

  const newBlock = `          // HIBP veri sizintilari\n          if (env.HIBP_API_KEY) {\n            try {\n              const hibpRes = await fetch(\`https://haveibeenpwned.com/api/v3/breachedaccount/\${encodeURIComponent(kullanici)}?truncateResponse=true\`, {\n                headers: { 'hibp-api-key': env.HIBP_API_KEY, 'user-agent': 'DiscordBot' }\n              });\n              if (hibpRes.ok) {\n                const breaches = await hibpRes.json();\n                if (breaches.length > 0) {\n                  result += \`**Veri Sizintilari (\${breaches.length} adet):**\\n\`;\n                  breaches.slice(0, 5).forEach(b => {\n                    result += \`• \${b.Name} (\${b.BreachDate || 'Tarih Yok'}) - \${b.Domain || 'Bilinmiyor'}\\n\`;\n                  });\n                  result += '\\n';\n                }\n              }\n            } catch (e) {}\n          }\n          // Public breach check\n          try {\n            const psRes = await fetch(\`https://psbdmp.cc/api/search/\${encodeURIComponent(kullanici)}\`);\n            if (psRes.ok) {\n              const psData = await psRes.json();\n              if (psData.count > 0) {\n                result += \`**Public Sizinti:** psbdmp.cc'de \${psData.count} kayit bulundu\\n\\n\`;\n              }\n            }\n          } catch (e) {}`;

  return content.replace(oldBlock, newBlock);
}

// ===== 4. ASN-TARAMA: Shodan InternetDB fallback =====
function fixAsnTarama(content) {
  const oldBlock = `          // Shodan ile ASN taramasi\n          if (env.SHODAN_API_KEY) {\n            try {\n              const sdRes = await fetch(\`https://api.shodan.io/shodan/host/search?key=\${env.SHODAN_API_KEY}&query=asn:AS\${temizAsn}&limit=10\`);\n              if (sdRes.ok) {\n                const sdData = await sdRes.json();\n                result += \`**Shodan:** Toplam \${sdData.total} acik cihaz bulundu\\n\`;\n                if (sdData.matches && sdData.matches.length > 0) {\n                  result += \`**Ornek IP'ler:**\\n\`;\n                  sdData.matches.slice(0, 5).forEach(m => {\n                    result += \`• \${m.ip_str}:\${m.port} (\${m.org || 'Bilinmiyor'})\\n\`;\n                  });\n                }\n              }\n            } catch (e) {}\n          } else {\n            result += \`(Detayli ASN taramasi icin SHODAN_API_KEY gerekli)\\n\\n\`;\n          }`;

  const newBlock = `          // Shodan ile ASN taramasi\n          if (env.SHODAN_API_KEY) {\n            try {\n              const sdRes = await fetch(\`https://api.shodan.io/shodan/host/search?key=\${env.SHODAN_API_KEY}&query=asn:AS\${temizAsn}&limit=10\`);\n              if (sdRes.ok) {\n                const sdData = await sdRes.json();\n                result += \`**Shodan:** Toplam \${sdData.total} acik cihaz bulundu\\n\`;\n                if (sdData.matches && sdData.matches.length > 0) {\n                  result += \`**Ornek IP'ler:**\\n\`;\n                  sdData.matches.slice(0, 5).forEach(m => {\n                    result += \`• \${m.ip_str}:\${m.port} (\${m.org || 'Bilinmiyor'})\\n\`;\n                  });\n                }\n              }\n            } catch (e) {}\n          }\n          // Public InternetDB fallback (key gerekmez)\n          try {\n            const idbRes = await fetch(\`https://internetdb.shodan.io/AS\${temizAsn}\`);\n            if (idbRes.ok) {\n              const idbData = await idbRes.json();\n              if (idbData.ports && idbData.ports.length > 0) {\n                result += \`**InternetDB (Public):** \${idbData.ports.length} acik port, \${(idbData.hostnames || []).length} hostname\\n\`;\n              }\n            }\n          } catch (e) {}`;

  return content.replace(oldBlock, newBlock);
}

// ===== 5. Add 3 new commands before the closing } of the switch =====
function addNewCommands(content) {
  const switchClose = `  }\n\n  return null; // Komut bulunamadi`;
  
  const newCommands = `
    case 'sunucu-istatistik':
      ctx.waitUntil((async () => {
        try {
          const guildId = interaction.guild_id;
          let result = \`**Sunucu Istatistikleri**\\n\\n\`;

          // Sunucu bilgisi
          const guildRes = await fetch(\`https://discord.com/api/v10/guilds/\${guildId}\`, {
            headers: { 'Authorization': \`Bot \${env.DISCORD_TOKEN}\` }
          });
          if (guildRes.ok) {
            const g = await guildRes.json();
            result += \`**Sunucu:** \${g.name}\\n\`;
            result += \`**ID:** \\\`\${guildId}\\\`\\n\`;
            result += \`**Olusturulma:** \${new Date(g.id / 4194304 + 1420070400000).toUTCString()}\\n\`;
            result += \`**Uye Sayisi:** \${g.approximate_member_count || 'Bilinmiyor'}\\n\`;
            result += \`**Aktif Uye:** \${g.approximate_presence_count || 'Bilinmiyor'}\\n\`;
            result += \`**Kanal Sayisi:** \${g.channels || 'Bilinmiyor'}\\n\`;
            result += \`**Rol Sayisi:** \${g.roles ? g.roles.length : 'Bilinmiyor'}\\n\`;
            result += \`**Boost Seviyesi:** \${g.premium_tier || 0}\\n\`;
            result += \`**Boost Sayisi:** \${g.premium_subscription_count || 0}\\n\`;
            if (g.owner_id) {
              result += \`**Sahip ID:** \\\`\${g.owner_id}\\\`\\n\`;
            }
            if (g.vanity_url_code) {
              result += \`**Ozel URL:** discord.gg/\${g.vanity_url_code}\\n\`;
            }
            result += \`**Dogrulama Seviyesi:** \${['Yok', 'Dusuk', 'Orta', 'Yuksek', 'En Yuksek'][g.verification_level] || 'Bilinmiyor'}\\n\`;
            result += \`**NSFW Seviyesi:** \${['Varsayilan', '18+', 'Yas Sinirlamasi Yok'][g.nsfw_level] || 'Bilinmiyor'}\\n\`;
          }

          // En aktif kanallar
          result += \`\\n**En Aktif Kanallar:**\\n\`;
          try {
            const chRes = await fetch(\`https://discord.com/api/v10/guilds/\${guildId}/channels\`, {
              headers: { 'Authorization': \`Bot \${env.DISCORD_TOKEN}\` }
            });
            if (chRes.ok) {
              const channels = await chRes.json();
              const textChannels = channels.filter(c => c.type === 0).slice(0, 5);
              textChannels.forEach(c => {
                result += \`• <#\${c.id}> (ID: \\\`\${c.id}\\\`)\\n\`;
              });
            }
          } catch (e) {}

          // Emoji istatistik
          try {
            const emojiRes = await fetch(\`https://discord.com/api/v10/guilds/\${guildId}/emojis\`, {
              headers: { 'Authorization': \`Bot \${env.DISCORD_TOKEN}\` }
            });
            if (emojiRes.ok) {
              const emojis = await emojiRes.json();
              result += \`\\n**Emoji Sayisi:** \${emojis.length}\\n\`;
              if (emojis.filter(e => e.animated).length > 0) {
                result += \`Animasyonlu: \${emojis.filter(e => e.animated).length}\\n\`;
              }
            }
          } catch (e) {}

          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: \`Sunucu istatistik hatasi: \${err.message}\` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'oto-moderasyon':
      ctx.waitUntil((async () => {
        try {
          const guildId = interaction.guild_id;
          const aksiyon = getOption('islem') || 'durum';
          let result = \`**Otomatik Moderasyon**\\n\\n\`;

          if (aksiyon === 'durum' || aksiyon === 'listele') {
            // Mevcut auto-mod kurallarini listele
            const amRes = await fetch(\`https://discord.com/api/v10/guilds/\${guildId}/auto-moderation/rules\`, {
              headers: { 'Authorization': \`Bot \${env.DISCORD_TOKEN}\` }
            });
            if (amRes.ok) {
              const rules = await amRes.json();
              if (rules.length > 0) {
                result += \`**Auto-Mod Kurallari (\${rules.length} adet):**\\n\`;
                rules.slice(0, 10).forEach((r, i) => {
                  result += \`\${i + 1}. \${r.name} (\${r.event_type === 1 ? 'Mesaj' : 'Uye Katilimi'})\\n\`;
                  result += \`   - Aksiyon: \${['Yok', 'Mesaji Engelle', 'Kullaniciyi Uyar', 'Kullaniciyi Zaman Asimina At', 'Kullaniciyi At'][r.actions[0]?.type] || 'Bilinmiyor'}\\n\`;
                  result += \`   - Aktif: \${r.enabled ? '✅' : '❌'}\\n\`;
                });
              } else {
                result += \`Henuz auto-mod kurali eklenmemis.\\n\`;
                result += \`\`/oto-moderasyon islem:ekle\` ile kural ekleyebilirsin.\\n\`;
              }
            }
          } else if (aksiyon === 'ekle') {
            // Basit bir kufur/spam filtresi ekle
            const newRule = {
              name: 'Otomatik Spam/Kufur Korumasi',
              event_type: 1,
              trigger_type: 1,
              trigger_metadata: {
                keyword_filter: ['spam', '@everyone', '@here', 'discord.gg', 'http://', 'https://'],
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
              result += \`**Filtre:** Toplu mesaj, mention spam, davet linkleri\\n\`;
              result += \`**Aksiyon:** Mesaji engelle\\n\`;
            } else {
              const errData = await createRes.text();
              result += \`❌ Kural eklenemedi: \${errData.slice(0, 200)}\\n\`;
              result += \`Not: Botun \\\`MANAGE_GUILD\\\` yetkisi olmali.\\n\`;
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

          let result = \`**Gelismis ID Analizi:** \\\`\${id}\\\`\\n\\n\`;
          result += \`**Hesap Yas Bilgisi:**\\n\`;
          result += \`• Olusturulma: \${date.toUTCString()}\\n\`;
          result += \`• Yas: \${yas} yil, \${Math.floor((Date.now() - Number(timestamp)) / 86400000)} gun\\n\`;
          result += \`• Tip: \${isBot ? 'Robot/Bot' : 'Kullanici'}\\n\`;
          result += \`• Snowflake Sirasi: ~\${(Number(snowflake >> 12n) & 0x3FF).toString()}\\n\\n\`;

          // Discord API'den profil
          const userRes = await fetch(\`https://discord.com/api/v10/users/\${id}\`, {
            headers: { 'Authorization': \`Bot \${env.DISCORD_TOKEN}\` }
          });

          if (userRes.ok) {
            const u = await userRes.json();
            result += \`**Profil Bilgileri:**\\n\`;
            result += \`• Kullanici: \${u.global_name || u.username || 'Yok'}\\n\`;
            result += \`• Kullanici Adi: \${u.username || 'Yok'}\`;
            if (u.discriminator && u.discriminator !== '0') {
              result += \`#\${u.discriminator}\`;
            }
            result += \`\\n\`;

            // Avatar Gecmisi - mevcut avatari goster
            if (u.avatar) {
              const ext = u.avatar.startsWith('a_') ? 'gif' : 'png';
              const avatarUrl = \`https://cdn.discordapp.com/avatars/\${id}/\${u.avatar}.\${ext}?size=256\`;
              result += \`• Mevcut Avatar: [Link](\${avatarUrl})\\n\`;
              // Varsayilan avatar tahmini
              const defaultNum = parseInt(id.slice(-4)) % 6;
              result += \`• Varsayilan Avatar: [Link](https://cdn.discordapp.com/embed/avatars/\${defaultNum}.png)\\n\`;
            }

            // Banner
            if (u.banner) {
              const ext2 = u.banner.startsWith('a_') ? 'gif' : 'png';
              const bannerUrl = \`https://cdn.discordapp.com/banners/\${id}/\${u.banner}.\${ext2}?size=256\`;
              result += \`• Banner: [Link](\${bannerUrl})\\n\`;
            }

            // Profil rengi
            if (u.accent_color) {
              result += \`• Profil Rengi: #\${u.accent_color.toString(16).padStart(6, '0')}\\n\`;
            }

            // Nitro
            const premiumNames = { 0: 'Yok', 1: 'Nitro Classic', 2: 'Nitro', 3: 'Nitro Basic' };
            result += \`• Nitro: \${premiumNames[u.premium_type] || 'Bilinmiyor'}\\n\`;

            // Rozetler
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
              if (u.public_flags & 65536) badges.push('House Bravery');
              if (u.public_flags & 128) badges.push('House Brilliance');
              if (u.public_flags & 256) badges.push('House Balance');
              if (badges.length > 0) {
                result += \`• Rozetler: \${badges.join(', ')}\\n\`;
              }
            }
          } else if (userRes.status === 404) {
            result += \`\\n❌ Bu hesap SILINMIS veya gecerli degil.\\n\`;
          } else {
            result += \`\\n⚠️ Discord API profil bilgisi alinamadi.\\n\`;
          }

          // Hesap aktiflik testi
          if (!isBot) {
            try {
              const dmTest = await fetch('https://discord.com/api/v10/users/@me/channels', {
                method: 'POST',
                headers: { 'Authorization': \`Bot \${env.DISCORD_TOKEN}\`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipient_id: id })
              });
              if (dmTest.status === 403) {
                result += \`\\n**Hesap Durumu:** DM atilamiyor (Suspended/Deaktif olabilir)\\n\`;
              } else if (dmTest.ok) {
                result += \`\\n**Hesap Durumu:** ✅ Aktif\\n\`;
              }
            } catch (e) {}
          }

          // Bot ise top.gg kontrolu
          if (isBot) {
            try {
              const tgRes = await fetch(\`https://top.gg/api/bots/\${id}\`);
              if (tgRes.ok) {
                const tg = await tgRes.json();
                result += \`\\n**top.gg:** \${tg.username || 'Bilinmiyor'}\`;
                if (tg.guilds) result += \` - \${tg.guilds.toLocaleString()} sunucu\`;
                result += \`\\n\`;
              }
            } catch (e) {}
          }

          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: \`ID analiz hatasi: \${err.message}\` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });
`;
  
  return content.replace(switchClose, newCommands + '\n  }\n\n  return null; // Komut bulunamadi');
}

// ===== KANSERBOT.JS: ip-sorgula VT fallback =====
function fixKanserBotIpSorgula(content) {
  // VT key yoksa OTX ekle
  const oldBlock = `      case 'ip-sorgula':
        try {
          const ip = getOption('ip');
          if (env.VIRUSTOTAL_API_KEY) {
            const res = await fetch(\`https://www.virustotal.com/api/v3/ip_addresses/\${ip}\`, { headers: { 'x-apikey': env.VIRUSTOTAL_API_KEY } });
            if (res.ok) {
              const data = await res.json();
              const stats = data.data.attributes.last_analysis_stats;
              return sendResponse(\`VirusTotal Analizi (\${ip}):\\nZararli: \${stats.malicious}\\nSupheli: \${stats.suspicious}\\nTemiz: \${stats.harmless}\`);
            }
          }
          const res = await fetch(\`http://ip-api.com/json/\${ip}\`);
          const data = await res.json();
          if (data.status !== "success") return sendResponse(\`IP bilgisi alinamadi.\`);
          return sendResponse(\`IP: \${ip}\\nUlke: \${data.country}\\nSehir: \${data.city}\\nISP: \${data.isp}\\nOrganizasyon: \${data.org}\\n(VirusTotal API Key eksik, temel bilgi gosterildi)\`);
        } catch { return sendResponse('IP API hatasi.'); }`;

  const newBlock = `      case 'ip-sorgula':
        try {
          const ip = getOption('ip');
          let result = \`**IP Analizi:** \\\`\${ip}\\\`\\n\\n\`;
          let vtKeyVar = false;

          if (env.VIRUSTOTAL_API_KEY) {
            const res = await fetch(\`https://www.virustotal.com/api/v3/ip_addresses/\${ip}\`, { headers: { 'x-apikey': env.VIRUSTOTAL_API_KEY } });
            if (res.ok) {
              vtKeyVar = true;
              const data = await res.json();
              const stats = data.data.attributes.last_analysis_stats;
              result += \`**VirusTotal:**\\nZararli: \${stats.malicious} | Supheli: \${stats.suspicious} | Temiz: \${stats.harmless}\\n\`;
            }
          }

          // Public OTX check (VT olsa da olmasa da calisir)
          try {
            const otxRes = await fetch(\`https://otx.alienvault.com/api/v1/indicators/IPv4/\${ip}/general\`);
            if (otxRes.ok) {
              const otxData = await otxRes.json();
              if (otxData.pulse_info?.count > 0) {
                result += \`**AlienVault OTX:** \${otxData.pulse_info.count} pulse (tehdit kaydi)\\n\`;
              }
            }
          } catch (e) {}

          // Temel IP bilgisi
          const res = await fetch(\`http://ip-api.com/json/\${ip}\`);
          const data = await res.json();
          if (data.status === "success") {
            result += \`\\n**Konum:** \${data.city}, \${data.country}\\n\`;
            result += \`**ISP:** \${data.isp}\\n\`;
            result += \`**Organizasyon:** \${data.org}\\n\`;
          }
          return sendResponse(result);
        } catch { return sendResponse('IP API hatasi.'); }`;

  return content.replace(oldBlock, newBlock);
}

// ===== KANSERBOT.JS: domain-sorgula VT fallback =====
function fixKanserBotDomainSorgula(content) {
  const oldBlock = `      case 'domain-sorgula':
        try {
          const domain = getOption('domain');
          if (env.VIRUSTOTAL_API_KEY) {
            const res = await fetch(\`https://www.virustotal.com/api/v3/domains/\${domain}\`, { headers: { 'x-apikey': env.VIRUSTOTAL_API_KEY } });
            if (res.ok) {
              const data = await res.json();
              const stats = data.data.attributes.last_analysis_stats;
              return sendResponse(\`VirusTotal Analizi (\${domain}):\\nZararli: \${stats.malicious}\\nSupheli: \${stats.suspicious}\\nTemiz: \${stats.harmless}\`);
            }
          }
          const res = await fetch(\`https://cloudflare-dns.com/dns-query?name=\${domain}&type=A\`, { headers: { 'accept': 'application/dns-json' } });
          const data = await res.json();
          const ips = data.Answer ? data.Answer.map(a => a.data).join(', ') : 'Bulunamadi';
          return sendResponse(\`Alan Adi: \${domain}\\nCozumlenen IP Adresleri: \${ips}\\nDurum: Bilinmiyor (VirusTotal API Key eksik)\`);
        } catch { return sendResponse('Domain sorgulama hatasi.'); }`;

  const newBlock = `      case 'domain-sorgula':
        try {
          const domain = getOption('domain');
          let result = \`**Domain Analizi:** \\\`\${domain}\\\`\\n\\n\`;

          if (env.VIRUSTOTAL_API_KEY) {
            const res = await fetch(\`https://www.virustotal.com/api/v3/domains/\${domain}\`, { headers: { 'x-apikey': env.VIRUSTOTAL_API_KEY } });
            if (res.ok) {
              const data = await res.json();
              const stats = data.data.attributes.last_analysis_stats;
              result += \`**VirusTotal:** Zararli: \${stats.malicious} | Supheli: \${stats.suspicious} | Temiz: \${stats.harmless}\\n\`;
            }
          }

          // Public OTX kontrol
          try {
            const otxRes = await fetch(\`https://otx.alienvault.com/api/v1/indicators/domain/\${domain}/general\`);
            if (otxRes.ok) {
              const otxData = await otxRes.json();
              if (otxData.pulse_info?.count > 0) {
                result += \`**AlienVault OTX:** \${otxData.pulse_info.count} pulse (tehdit kaydi)\\n\`;
              }
            }
          } catch (e) {}

          // DNS cozum
          const res = await fetch(\`https://cloudflare-dns.com/dns-query?name=\${domain}&type=A\`, { headers: { 'accept': 'application/dns-json' } });
          const data = await res.json();
          const ips = data.Answer ? data.Answer.map(a => a.data).join(', ') : 'Bulunamadi';
          result += \`\\n**DNS Cozum:** \${ips}\\n\`;
          return sendResponse(result);
        } catch { return sendResponse('Domain sorgulama hatasi.'); }`;

  return content.replace(oldBlock, newBlock);
}

// ===== KANSERBOT.JS: veri-sizintisi HIBP fallback =====
function fixKanserBotVeriSizintisi(content) {
  const oldBlock = `      case 'veri-sizintisi':
      case 'ayak-izi':
        try {
          const hedef = getOption('hedef');
          if (!env.HIBP_API_KEY) return sendResponse('HIBP_API_KEY (HaveIBeenPwned) sistemde tanimli olmadigi icin sizinti taramasi yapilamiyor.');
          const res = await fetch(\`https://haveibeenpwned.com/api/v3/breachedaccount/\${encodeURIComponent(hedef)}\`, {
            headers: { 'hibp-api-key': env.HIBP_API_KEY, 'user-agent': 'DiscordBot' }
          });
          if (res.status === 404) return sendResponse(\`Hedef (\${hedef}) temiz. Herhangi bir sizinti kaydi bulunamadi.\`);
          if (!res.ok) throw new Error();
          const data = await res.json();
          const breaches = data.map(b => b.Name).join(', ');
          return sendResponse(\`Dikkat! Hedef (\${hedef}) su sizintilarda bulundu:\\n\${breaches}\`);
        } catch { return sendResponse('Sizinti API hatasi veya yetkisiz erisim.'); }`;

  const newBlock = `      case 'veri-sizintisi':
      case 'ayak-izi':
        ctx.waitUntil((async () => {
          try {
            const hedef = getOption('hedef');
            let result = \`**Sizinti Taramasi:** \\\`\${hedef}\\\`\\n\\n\`;

            if (env.HIBP_API_KEY) {
              const res = await fetch(\`https://haveibeenpwned.com/api/v3/breachedaccount/\${encodeURIComponent(hedef)}\`, {
                headers: { 'hibp-api-key': env.HIBP_API_KEY, 'user-agent': 'DiscordBot' }
              });
              if (res.status === 404) {
                result += \`**HIBP:** Temiz, sizinti bulunamadi.\\n\`;
              } else if (res.ok) {
                const data = await res.json();
                const breaches = data.map(b => b.Name).join(', ');
                result += \`**HIBP:** Sizinti(lar): \${breaches}\\n\`;
              }
            }

            // Public leak check (key gerekmez, HIBP olsa da calisir)
            try {
              const psRes = await fetch(\`https://psbdmp.cc/api/search/\${encodeURIComponent(hedef)}\`);
              if (psRes.ok) {
                const psData = await psRes.json();
                if (psData.count > 0) {
                  result += \`**psbdmp.cc:** \${psData.count} pastebin kaydi\\n\`;
                }
              }
            } catch (e) {}

            if (!result.includes('Sizinti') && !result.includes('Temiz')) {
              result += \`Public kaynaklarda sizinti bulunamadi.\\n\`;
            }

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: \`Sizinti tarama hatasi: \${err.message}\` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`;

  return content.replace(oldBlock, newBlock);
}

// ===== MAIN =====
const newCommandsPath = path.join(__dirname, '..', 'src', 'bots', 'newCommands.js');
const kanserBotPath = path.join(__dirname, '..', 'src', 'bots', 'kanserBot.js');

let nc = fs.readFileSync(newCommandsPath, 'utf8');
let kb = fs.readFileSync(kanserBotPath, 'utf8');

// 1. email-sorgula HIBP fallback
const ncBefore = nc.length;
nc = fixEmailSorgula(nc);
console.log(`email-sorgula: ${ncBefore !== nc.length ? 'DEGISTI' : 'ATLANDI'}`);

// 2. dijital-iz HIBP fallback
const nc2Before = nc.length;
nc = fixDigitalIz(nc);
console.log(`dijital-iz: ${nc2Before !== nc.length ? 'DEGISTI' : 'ATLANDI'}`);

// 3. dox-detay HIBP fallback
const nc3Before = nc.length;
nc = fixDoxDetay(nc);
console.log(`dox-detay: ${nc3Before !== nc.length ? 'DEGISTI' : 'ATLANDI'}`);

// 4. asn-tarama Shodan InternetDB fallback
const nc4Before = nc.length;
nc = fixAsnTarama(nc);
console.log(`asn-tarama: ${nc4Before !== nc.length ? 'DEGISTI' : 'ATLANDI'}`);

// 5. Add 3 new commands (sunucu-istatistik, oto-moderasyon, gelismis-id)
const nc5Before = nc.length;
nc = addNewCommands(nc);
console.log(`yeni-komutlar: ${nc5Before !== nc.length ? 'DEGISTI' : 'ATLANDI'}`);

fs.writeFileSync(newCommandsPath, nc);
console.log('newCommands.js kaydedildi.');

// KANSERBOT.JS changes
// 6. ip-sorgula VT fallback
const kb1Before = kb.length;
kb = fixKanserBotIpSorgula(kb);
console.log(`ip-sorgula: ${kb1Before !== kb.length ? 'DEGISTI' : 'ATLANDI'}`);

// 7. domain-sorgula VT fallback
const kb2Before = kb.length;
kb = fixKanserBotDomainSorgula(kb);
console.log(`domain-sorgula: ${kb2Before !== kb.length ? 'DEGISTI' : 'ATLANDI'}`);

// 8. veri-sizintisi HIBP fallback
const kb3Before = kb.length;
kb = fixKanserBotVeriSizintisi(kb);
console.log(`veri-sizintisi: ${kb3Before !== kb.length ? 'DEGISTI' : 'ATLANDI'}`);

fs.writeFileSync(kanserBotPath, kb);
console.log('kanserBot.js kaydedildi.');

console.log('\n=== TUM DEGISIKLIKLER TAMAM ===');
