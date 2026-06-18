// Add handlers to bot files - v2
// Uses simple strings, no template literals
const fs = require('fs');

// All handler code as simple string arrays
const handlers = {};

// webOsintBot
handlers['src/bots/webOsintBot.js'] = [
  "      // --- E-Posta -----\n    case 'email-sorgula':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const email = getOption('email');\n" +
  "          let result = '**E-posta Sizinti Taramasi:** `' + email + '`\\n\\n';\n" +
  "          if (env.HIBP_API_KEY) {\n" +
  "            try {\n" +
  "              const hibp = await (await fetch('https://haveibeenpwned.com/api/v3/breachedaccount/' + encodeURIComponent(email) + '?truncateResponse=true', { headers: { 'hibp-api-key': env.HIBP_API_KEY, 'user-agent': 'DiscordBot' } })).json();\n" +
  "              if (Array.isArray(hibp) && hibp.length > 0) result += '**HIBP (' + hibp.length + ' sizinti):**\\n' + hibp.slice(0, 5).map(b => '\\u2022 ' + b.Name).join('\\n') + '\\n';\n" +
  "              else result += '**HIBP:** Temiz\\n';\n" +
  "            } catch (e) { result += '(HIBP sorgulanamadi)\\n'; }\n" +
  "          } else {\n" +
  "            try { const ps = await (await fetch('https://psbdmp.cc/api/search/' + encodeURIComponent(email))).json(); if (ps.count > 0) result += '**psbdmp.cc:** ' + ps.count + ' pastebin kaydi\\n'; } catch (e) {}\n" +
  "          }\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'E-posta sorgulama hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });",

  "      // --- Sifre Sorgulama -----\n    case 'sifre-sorgula':\n" +
  "      try {\n" +
  "        const sifre = getOption('sifre');\n" +
  "        const hashBuf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(sifre));\n" +
  "        const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();\n" +
  "        const res = await fetch('https://api.pwnedpasswords.com/range/' + hashHex.substring(0, 5));\n" +
  "        if (res.ok) {\n" +
  "          const data = await res.text();\n" +
  "          const match = data.split('\\n').find(l => l.startsWith(hashHex.substring(5)));\n" +
  "          if (match) return sendResponse('**Sifre Sorgulama:** Bu sifre **' + parseInt(match.split(':')[1]) + ' KEZ** sizintida goruldu! Hemen degistirin.');\n" +
  "          return sendResponse('Sifre bilinen sizinti veritabanlarinda bulunamadi.', true);\n" +
  "        }\n" +
  "        return sendResponse('Sifre sorgulama servisine erisilemedi.');\n" +
  "      } catch (e) { return sendResponse('Sifre sorgulama hatasi.'); }",

  "      case 'breach-scanner':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const domain = getOption('domain');\n" +
  "          let result = '**Veri Sizintisi Taramasi:** ' + domain + '\\n\\n';\n" +
  "          try { const c = new AbortController(); setTimeout(() => c.abort(), 3000); const r = await fetch('https://' + domain + '/.env', { method: 'HEAD', signal: c.signal }); result += r.ok ? '\\u26a0\\ufe0f .env acik!\\n' : '\\u2705 .env guvenli\\n'; } catch (e) { result += '\\u2705 .env kapali\\n'; }\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Breach tarama hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });",

  "      case 'pastebin-ara':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const kelime = getOption('kelime');\n" +
  "          let result = '**Pastebin/Gist Aramasi:** `' + kelime + '`\\n\\n';\n" +
  "          try { const ps = await (await fetch('https://psbdmp.cc/api/search/' + encodeURIComponent(kelime))).json(); if (ps.count > 0) result += 'psbdmp.cc: ' + ps.count + ' sonuc\\n' + (ps.data || []).slice(0, 5).map(d => '\\u2022 https://pastebin.com/' + d.id).join('\\n'); else result += 'psbdmp.cc: Sonuc bulunamadi.\\n'; } catch (e) { result += 'psbdmp.cc: Sorgulanamadi.\\n'; }\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Pastebin arama hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });",

  "      // --- WHOIS / DNS\n    case 'whois-detay':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const domain = getOption('domain');\n" +
  "          let result = '**Detayli WHOIS:** ' + domain + '\\n\\n';\n" +
  "          try {\n" +
  "            const rdap = await (await fetch('https://rdap.org/domain/' + domain)).json();\n" +
  "            const events = rdap.events || [];\n" +
  "            const created = events.find(e => e.eventAction === 'registration')?.eventDate;\n" +
  "            result += '**Domain:** ' + (rdap.ldhName || domain) + '\\n';\n" +
  "            if (created) result += '**Olusturulma:** ' + created + '\\n';\n" +
  "          } catch (e) {}\n" +
  "          for (const type of ['A', 'MX', 'NS', 'TXT']) {\n" +
  "            try {\n" +
  "              const dns = await (await fetch('https://cloudflare-dns.com/dns-query?name=' + domain + '&type=' + type, { headers: { 'accept': 'application/dns-json' } })).json();\n" +
  "              if (dns.Answer) result += type + ': ' + dns.Answer.slice(0, 2).map(a => a.data).join(', ') + '\\n';\n" +
  "            } catch (e) {}\n" +
  "          }\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'WHOIS hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });",

  "      case 'web-arsiv':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const domain = getOption('domain');\n" +
  "          let result = '**Web Arsiv (Wayback):** ' + domain + '\\n\\n';\n" +
  "          try {\n" +
  "            const wm = await (await fetch('https://web.archive.org/cdx/search/cdx?url=' + domain + '&output=json&limit=10')).json();\n" +
  "            if (wm.length > 1) {\n" +
  "              result += '**Toplam Kayit:** ' + (wm.length - 1) + '\\n';\n" +
  "              result += '**Ilk:** https://web.archive.org/web/' + wm[1][1] + '/' + domain + '\\n';\n" +
  "              result += '**Son:** https://web.archive.org/web/' + wm[wm.length - 1][1] + '/' + domain + '\\n';\n" +
  "            } else result += 'Wayback kaydi bulunamadi.\\n';\n" +
  "          } catch (e) { result += 'Wayback sorgulanamadi.\\n'; }\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Web arsiv hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });",

  "      case 'sertifika-transparan':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const domain = getOption('domain');\n" +
  "          let result = '**Sertifika Transparansi:** ' + domain + '\\n\\n';\n" +
  "          try {\n" +
  "            const crt = await (await fetch('https://crt.sh/?q=%25.' + domain + '&output=json')).json();\n" +
  "            if (crt.length > 0) {\n" +
  "              const subs = [...new Set(crt.map(c => c.name_value))].filter(s => s.includes(domain));\n" +
  "              result += '**Toplam Sertifika:** ' + crt.length + '\\n';\n" +
  "              result += '**Alt Alan:** ' + subs.length + '\\n';\n" +
  "              result += subs.slice(0, 10).join('\\n') + '\\n';\n" +
  "            } else result += 'Sertifika bulunamadi.\\n';\n" +
  "          } catch (e) { result += 'crt.sh sorgulanamadi.\\n'; }\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Sertifika hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });",

  "      case 'asn-tarama':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const asn = getOption('asn').toUpperCase().replace('AS', '');\n" +
  "          let result = '**ASN Taramasi:** AS' + asn + '\\n\\n';\n" +
  "          try {\n" +
  "            const ip = await (await fetch('http://ip-api.com/json/AS' + asn + '?fields=isp,org,country,city')).json();\n" +
  "            if (ip.status === 'success') result += '**ISP:** ' + ip.isp + '\\n**Org:** ' + ip.org + '\\n**Lokasyon:** ' + ip.city + ', ' + ip.country + '\\n';\n" +
  "          } catch (e) {}\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'ASN hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });",

  "      case 'cdn-gercek-ip':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const domain = getOption('domain');\n" +
  "          let result = '**Gercek IP Tespiti:** ' + domain + '\\n\\n';\n" +
  "          const subs = ['direct', 'origin', 'cdn', 'www', 'mail', 'ftp', 'ssh', 'api', 'dev', 'admin', 'ns1', 'ns2', 'pop', 'smtp', 'remote', 'mx', 'backup', 'test', 'www2', 'vpn'];\n" +
  "          const ips = new Set();\n" +
  "          await Promise.allSettled(subs.slice(0, 10).map(async sub => {\n" +
  "            try {\n" +
  "              const dns = await (await fetch('https://cloudflare-dns.com/dns-query?name=' + sub + '.' + domain + '&type=A', { headers: { 'accept': 'application/dns-json' } })).json();\n" +
  "              if (dns.Answer) dns.Answer.forEach(a => { if (a.data.match(/^\\d+/)) ips.add(a.data); });\n" +
  "            } catch (e) {}\n" +
  "          }));\n" +
  "          try {\n" +
  "            const ht = await (await fetch('https://api.hackertarget.com/hostsearch/?q=' + domain)).text();\n" +
  "            if (!ht.includes('error')) ht.split('\\n').filter(l => l.trim()).forEach(l => { const p = l.split(','); if (p[1]?.match(/^\\d+/)) ips.add(p[1]); });\n" +
  "          } catch (e) {}\n" +
  "          if (ips.size > 0) result += '**Aday IP\\'ler:**\\n' + [...ips].slice(0, 8).map((ip, i) => (i + 1) + '. `' + ip + '`').join('\\n');\n" +
  "          else result += 'Alternatif IP bulunamadi.\\n';\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'CDN IP hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });"
];

// mobilOsint
handlers['src/bots/mobilOsintBot.js'] = [
  "      case 'telefon-sorgula':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const numara = getOption('telefon').replace(/[^0-9+]/g, '');\n" +
  "          let result = '**Telefon Sorgulama:** `' + numara + '`\\n\\n';\n" +
  "          if (env.NUMVERIFY_API_KEY) {\n" +
  "            try {\n" +
  "              const nv = await (await fetch('https://api.numverify.com/validate?number=' + encodeURIComponent(numara) + '&api_key=' + env.NUMVERIFY_API_KEY)).json();\n" +
  "              if (nv.valid) result += '**Gecerli:** Evet\\n**Ulke:** ' + (nv.country_name || nv.country_code) + '\\n**Operator:** ' + (nv.carrier || 'Bilinmiyor') + '\\n';\n" +
  "              else result += '**Gecerli:** Hayir\\n';\n" +
  "            } catch (e) { result += 'Numverify sorgulanamadi.\\n'; }\n" +
  "          } else {\n" +
  "            if (numara.startsWith('+90')) result += '**Ulke:** Turkiye\\n';\n" +
  "            else result += '**Ulke:** Bilinmiyor\\n';\n" +
  "          }\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Telefon sorgulama hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });"
];

// sosyalMuh
handlers['src/bots/sosyalMuhBot.js'] = [
  "      case 'oltala':\n" +
  "      try {\n" +
  "        const hedef = getOption('hedef');\n" +
  "        const maske = getOption('maske');\n" +
  "        const phishId = Math.random().toString(36).substring(2, 7);\n" +
  "        await env.KV.put('phish_' + phishId, JSON.stringify({ hedef: hedef, creatorId: interaction.member.user.id }));\n" +
  "        const host = request.headers.get('host');\n" +
  "        return sendResponse('**Oltalama Linki Hazir:**\\nLink: https://' + host + '/o/' + phishId + '\\nGercek Hedef: ' + hedef + '\\nKurbanin Gormesi: ' + maske);\n" +
  "      } catch (err) { return sendResponse('Oltalama hata: ' + err.message); }",

  "      case 'qr-phish':\n" +
  "      try {\n" +
  "        const hedef = getOption('hedef');\n" +
  "        const phishId = Math.random().toString(36).substring(2, 7);\n" +
  "        await env.KV.put('phish_' + phishId, JSON.stringify({ hedef: hedef, creatorId: interaction.member.user.id }));\n" +
  "        const host = request.headers.get('host');\n" +
  "        const url = 'https://' + host + '/o/' + phishId;\n" +
  "        const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(url);\n" +
  "        return sendResponse('**QR Phishing:**\\nLink: ' + url + '\\nQR Kod: ' + qrUrl);\n" +
  "      } catch (err) { return sendResponse('QR hata: ' + err.message); }",

  "      case 'fake-login':\n" +
  "      try {\n" +
  "        const tur = getOption('tur');\n" +
  "        const pageId = Math.random().toString(36).substring(2, 8);\n" +
  "        const templates = { google: 'Google Giris', instagram: 'Instagram Giris', twitter: 'X Giris', discord: 'Discord Giris' };\n" +
  "        await env.KV.put('login_' + pageId, JSON.stringify({ title: templates[tur] || 'Giris', creatorId: interaction.member.user.id, tur: tur }), { expirationTtl: 86400 });\n" +
  "        const host = request.headers.get('host');\n" +
  "        return sendResponse('**Fake Login Sayfasi:** ' + tur.toUpperCase() + '\\nLink: https://' + host + '/login/' + pageId);\n" +
  "      } catch (err) { return sendResponse('Fake login hatasi: ' + err.message); }",

  "      case 'link-mask':\n" +
  "      try {\n" +
  "        const hedef = getOption('hedef');\n" +
  "        const maske = getOption('maske');\n" +
  "        const phishId = Math.random().toString(36).substring(2, 7);\n" +
  "        await env.KV.put('phish_' + phishId, JSON.stringify({ hedef: hedef, creatorId: interaction.member.user.id }));\n" +
  "        const host = request.headers.get('host');\n" +
  "        const url = 'https://' + host + '/o/' + phishId;\n" +
  "        return sendResponse('**Maskelenmis Link:**\\nMarkdown: [' + maske + '](' + url + ')\\nHTML: <a href=\"' + url + '\">' + maske + '</a>');\n" +
  "      } catch (err) { return sendResponse('Link mask hatasi: ' + err.message); }"
];

// derinWeb
handlers['src/bots/derinWebBot.js'] = [
  "      case 'darkweb-arama':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const kelime = getOption('kelime');\n" +
  "          const res = await fetch('https://ahmia.fi/search/json/?q=' + encodeURIComponent(kelime));\n" +
  "          if (!res.ok) throw new Error('Darkweb servisine erisilemedi.');\n" +
  "          const data = await res.json();\n" +
  "          const results = data.results || [];\n" +
  "          let result = '**Darkweb Aramasi:** ' + kelime + '\\n\\n';\n" +
  "          if (results.length === 0) result += 'Bu kelime .onion sitelerinde bulunamadi.';\n" +
  "          else result += 'DIKKAT! ' + results.length + ' kayit bulundu.\\n' + results.slice(0, 5).map(r => '\\u2022 ' + r.title + ': ' + r.url).join('\\n');\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Darkweb hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });"
];

// sosyalMedya
handlers['src/bots/sosyalMedyaBot.js'] = [
  "      // --- Telegram\n    case 'telegram-sorgula':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const k = getOption('kullanici');\n" +
  "          let result = '**Telegram Profil:** @' + k + '\\n\\n';\n" +
  "          const web = await fetch('https://t.me/' + k, { headers: { 'User-Agent': 'Mozilla/5.0' } });\n" +
  "          const text = await web.text();\n" +
  "          if (text.includes('og:title')) { result += '**Profil:** t.me/' + k + '\\n**Durum:** Mevcut\\n'; }\n" +
  "          else result += 'Bulunamadi veya gizli.\\n';\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Telegram hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });",

  "      case 'insan-ara':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const isim = getOption('isim');\n" +
  "          let result = '**Kisi Arastirmasi:** ' + isim + '\\n\\n';\n" +
  "          const ad = isim.toLowerCase().replace(/\\s+/g, '.');\n" +
  "          const sites = [{ n: 'Instagram', u: 'https://www.instagram.com/' + ad + '/' }, { n: 'Twitter', u: 'https://twitter.com/' + ad }, { n: 'GitHub', u: 'https://github.com/' + ad }, { n: 'LinkedIn', u: 'https://www.linkedin.com/in/' + ad }];\n" +
  "          await Promise.allSettled(sites.map(async s => { try { const r = await fetch(s.u, { redirect: 'manual' }); if (r.status === 200) result += '\\u2022 [' + s.n + '](' + s.u + ')\\n'; } catch (e) {} }));\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Kisi arama hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });",

  "      case 'dox-detay':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const k = getOption('kullanici');\n" +
  "          let result = '**Detayli DOX:** ' + k + '\\n\\n';\n" +
  "          try {\n" +
  "            const gh = await (await fetch('https://api.github.com/users/' + k, { headers: env.GITHUB_TOKEN ? { Authorization: 'Bearer ' + env.GITHUB_TOKEN } : {} })).json();\n" +
  "            if (gh.login) result += '**GitHub:** ' + (gh.name || 'Gizli') + ' | ' + (gh.location || 'Gizli') + '\\n';\n" +
  "          } catch (e) {}\n" +
  "          if (env.HIBP_API_KEY) {\n" +
  "            try {\n" +
  "              const h = await (await fetch('https://haveibeenpwned.com/api/v3/breachedaccount/' + encodeURIComponent(k) + '?truncateResponse=true', { headers: { 'hibp-api-key': env.HIBP_API_KEY } })).json();\n" +
  "              if (Array.isArray(h) && h.length > 0) result += '**Sizinti:** ' + h.length + ' adet\\n' + h.slice(0, 3).map(b => '\\u2022 ' + b.Name).join('\\n') + '\\n';\n" +
  "            } catch (e) {}\n" +
  "          }\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'DOX hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });"
];

// guvenlik
handlers['src/bots/guvenlikBot.js'] = [
  "      case 'cdn-coz':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const domain = getOption('domain');\n" +
  "          let result = '**CDN/WAF Atlatma:** ' + domain + '\\n\\n';\n" +
  "          const subs = ['direct', 'origin', 'cdn', 'www', 'mail', 'ftp', 'ssh', 'api', 'dev', 'admin'];\n" +
  "          await Promise.allSettled(subs.map(async sub => {\n" +
  "            try {\n" +
  "              const dns = await (await fetch('https://cloudflare-dns.com/dns-query?name=' + sub + '.' + domain + '&type=A', { headers: { 'accept': 'application/dns-json' } })).json();\n" +
  "              if (dns.Answer) result += '\\u2022 ' + sub + '.' + domain + ' -> `' + dns.Answer[0].data + '`\\n';\n" +
  "            } catch (e) {}\n" +
  "          }));\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'CDN hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });",

  "      case 'port-hizli':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const ip = getOption('ip');\n" +
  "          let result = '**Hizli Port Taramasi:** `' + ip + '`\\n\\n';\n" +
  "          const ports = [{ p: 21, n: 'FTP' }, { p: 22, n: 'SSH' }, { p: 23, n: 'Telnet' }, { p: 25, n: 'SMTP' }, { p: 53, n: 'DNS' }, { p: 80, n: 'HTTP' }, { p: 443, n: 'HTTPS' }, { p: 445, n: 'SMB' }, { p: 3306, n: 'MySQL' }, { p: 3389, n: 'RDP' }];\n" +
  "          const acik = [];\n" +
  "          await Promise.allSettled(ports.map(async p => {\n" +
  "            try {\n" +
  "              const scheme = [443].includes(p.p) ? 'https' : 'http';\n" +
  "              const c = new AbortController(); setTimeout(() => c.abort(), 2000);\n" +
  "              const r = await fetch(scheme + '://' + ip + ':' + p.p, { method: 'HEAD', signal: c.signal });\n" +
  "              if (r) acik.push(p.p + ' (' + p.n + ')');\n" +
  "            } catch (e) {}\n" +
  "          }));\n" +
  "          if (acik.length > 0) result += '**Acik Portlar:**\\n' + acik.join('\\n');\n" +
  "          else result += 'Ilk 10 portta acik port bulunamadi.';\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Port tarama hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });",

  "      case 'tech-stack':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const domain = getOption('domain');\n" +
  "          const url = domain.startsWith('http') ? domain : 'https://' + domain;\n" +
  "          let result = '**Teknoloji Analizi:** ' + domain + '\\n\\n';\n" +
  "          const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });\n" +
  "          result += '**Durum:** ' + res.status + '\\n';\n" +
  "          if (res.headers.get('server')) result += '**Sunucu:** ' + res.headers.get('server') + '\\n';\n" +
  "          const html = await res.text().catch(() => '');\n" +
  "          if (html.includes('wp-content')) result += '**CMS:** WordPress\\n';\n" +
  "          if (html.includes('__NEXT_DATA__')) result += '**Framework:** Next.js\\n';\n" +
  "          if (html.includes('shopify')) result += '**E-ticaret:** Shopify\\n';\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Tech stack hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });",

  "      case 'ssl-coz':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const domain = getOption('domain');\n" +
  "          let result = '**SSL Sertifika:** ' + domain + '\\n\\n';\n" +
  "          try {\n" +
  "            const crt = await (await fetch('https://crt.sh/?q=' + domain + '&output=json')).json();\n" +
  "            const certs = crt.filter(c => c.name_value === domain || c.name_value === '*.' + domain);\n" +
  "            if (certs.length > 0) result += '**Sertifika ID:** ' + certs[0].id + '\\n';\n" +
  "          } catch (e) { result += 'crt.sh sorgulanamadi.\\n'; }\n" +
  "          try {\n" +
  "            const ssl = await fetch('https://' + domain, { headers: { 'User-Agent': 'Mozilla/5.0' } });\n" +
  "            result += '**HTTP:** ' + ssl.status + '\\n';\n" +
  "          } catch (e) { result += 'SSL baglantisi kurulamadi.\\n'; }\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'SSL hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });",

  "      case 'wp-scan':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const domain = getOption('domain');\n" +
  "          const base = domain.startsWith('http') ? domain : 'https://' + domain;\n" +
  "          let result = '**WP Taramasi:** ' + domain + '\\n\\n';\n" +
  "          const checks = ['wp-admin', 'wp-login.php', 'wp-content', 'wp-json', 'xmlrpc.php'];\n" +
  "          await Promise.allSettled(checks.map(async c => {\n" +
  "            try { const r = await fetch(base + '/' + c, { redirect: 'manual' }); if (r.status < 400 || r.status === 403) result += '[VAR] ' + c + '\\n'; } catch (e) {}\n" +
  "          }));\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'WP tarama hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });",

  "      case 'header-guvenlik':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const domain = getOption('domain');\n" +
  "          const url = domain.startsWith('http') ? domain : 'https://' + domain;\n" +
  "          let result = '**Guvenlik Basliklari:** ' + domain + '\\n\\n';\n" +
  "          const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });\n" +
  "          const basliklar = ['Strict-Transport-Security', 'Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy'];\n" +
  "          basliklar.forEach(b => result += res.headers.get(b) ? '[VAR] ' + b + '\\n' : '[EKSIK] ' + b + '\\n');\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Guvenlik hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });",

  "      case 'waf-test':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const url = getOption('url');\n" +
  "          const target = url.startsWith('http') ? url : 'https://' + url;\n" +
  "          const payloads = [{ n: 'SQLi', p: \"' OR '1'='1\" }, { n: 'XSS', p: '<script>alert(1)</script>' }, { n: 'Path Trav', p: '../../../etc/passwd' }, { n: 'SSRF', p: 'http://169.254.169.254/' }];\n" +
  "          let result = '**WAF Testi:** ' + target + '\\n\\n';\n" +
  "          let b = 0;\n" +
  "          for (const p of payloads) {\n" +
  "            try {\n" +
  "              const sep = target.includes('?') ? '&' : '?';\n" +
  "              const r = await fetch(target + sep + 't=' + encodeURIComponent(p.p), { redirect: 'manual' });\n" +
  "              const bl = [403, 406, 429, 503].includes(r.status); if (bl) b++;\n" +
  "              result += (bl ? '[BLOCKED] ' : '[PASSED] ') + p.n + ': ' + r.status + '\\n';\n" +
  "            } catch (e) { result += '[ERROR] ' + p.n + '\\n'; }\n" +
  "          }\n" +
  "          result += '\\nEngellenen: ' + b + '/' + payloads.length;\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'WAF test hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });",

  "      case 'email-spoof':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const domain = getOption('domain');\n" +
  "          let result = '**E-posta Spoof:** ' + domain + '\\n\\n';\n" +
  "          try {\n" +
  "            const spf = await (await fetch('https://cloudflare-dns.com/dns-query?name=' + domain + '&type=TXT', { headers: { 'accept': 'application/dns-json' } })).json();\n" +
  "            const spfRec = (spf.Answer || []).filter(a => a.data.includes('v=spf'));\n" +
  "            if (spfRec.length > 0) result += '**SPF:** Mevcut' + (spfRec[0].data.includes('~all') ? ' (SoftFail)\\n' : spfRec[0].data.includes('-all') ? ' (HardFail)\\n' : '\\n');\n" +
  "            else result += '**SPF:** YOK! Spoof yapilabilir!\\n';\n" +
  "          } catch (e) { result += '**SPF:** Sorgulanamadi\\n'; }\n" +
  "          try {\n" +
  "            const dmarc = await (await fetch('https://cloudflare-dns.com/dns-query?name=_dmarc.' + domain + '&type=TXT', { headers: { 'accept': 'application/dns-json' } })).json();\n" +
  "            if (dmarc.Answer) result += '**DMARC:** ' + (dmarc.Answer[0].data.includes('p=reject') ? 'Reject (Guclu)' : dmarc.Answer[0].data.includes('p=quarantine') ? 'Quarantine (Orta)' : 'None (Zayif)') + '\\n';\n" +
  "            else result += '**DMARC:** YOK\\n';\n" +
  "          } catch (e) { result += '**DMARC:** Sorgulanamadi\\n'; }\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Email spoof hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });"
];

// cografi
handlers['src/bots/cografiBot.js'] = [
  "      case 'exif-derin':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const attachmentId = getOption('fotograf');\n" +
  "          const att = interaction.data.resolved.attachments[attachmentId];\n" +
  "          if (!att || !att.url) throw new Error('Gorsel bulunamadi.');\n" +
  "          const img = await (await fetch(att.url)).arrayBuffer();\n" +
  "          const ai = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', { image: [...new Uint8Array(img)], prompt: 'Bu fotografi analiz et. Cihaz turu? Lokasyon ipucu? Ic/dis mekan? Emoji kullanma.', max_tokens: 300 });\n" +
  "          let result = '**Derin EXIF:**\\nDosya: ' + att.filename + '\\nBoyut: ' + (att.size / 1024).toFixed(1) + ' KB\\n\\n' + (ai.response || 'Analiz edilemedi.').slice(0, 1900);\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: result });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'EXIF hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });",

  "      case 'fotosint':\n" +
  "      ctx.waitUntil((async () => {\n" +
  "        try {\n" +
  "          const attachmentId = getOption('fotograf');\n" +
  "          const att = interaction.data.resolved.attachments[attachmentId];\n" +
  "          const imgUrl = att.url;\n" +
  "          let serpResult = '';\n" +
  "          if (env.SERPAPI_API_KEY) {\n" +
  "            try { const serp = await (await fetch('https://serpapi.com/search.json?engine=google_lens&url=' + encodeURIComponent(imgUrl) + '&api_key=' + env.SERPAPI_API_KEY)).json(); if (serp.visual_matches) serpResult = 'Google Lens buluntulari var.\\n'; } catch (e) {}\n" +
  "          }\n" +
  "          const img = await (await fetch(imgUrl)).arrayBuffer();\n" +
  "          const ai = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', { image: [...new Uint8Array(img)], prompt: 'Bu fotograftaki kisi veya yer kim/neresi? Tahmin et. Emoji kullanma.', max_tokens: 300 });\n" +
  "          await updateInteraction(interaction.application_id, interaction.token, { content: serpResult + 'Yapay Zeka: ' + (ai.response || 'Tahmin yapilamadi.') });\n" +
  "        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Fotosint hatasi: ' + err.message }); }\n" +
  "      })());\n" +
  "      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });"
];

// Apply handlers
let total = 0;
for (const [file, cases] of Object.entries(handlers)) {
  if (!fs.existsSync(file)) { console.log('SKIP: ' + file); continue; }
  let content = fs.readFileSync(file, 'utf8');
  let added = 0;
  for (const caseBlock of cases) {
    const cmdMatch = caseBlock.match(/case '([^']+)'/);
    const cmdName = cmdMatch ? cmdMatch[1] : 'unknown';
    if (content.includes("case '" + cmdName + "':")) { console.log('  EXISTS: ' + cmdName); continue; }
    const defaultIdx = content.indexOf('default:');
    if (defaultIdx !== -1) {
      content = content.substring(0, defaultIdx) + '\n' + caseBlock + '\n\n    ' + content.substring(defaultIdx);
      console.log('  ADDED (' + file.split('/').pop() + '): ' + cmdName);
      added++;
    } else { console.log('  ERROR: default not found in ' + file); }
  }
  fs.writeFileSync(file, content);
  console.log(file.split('/').pop() + ': ' + added + '/' + cases.length + ' commands added');
  total += added;
}
console.log('\nTotal: ' + total + ' handlers added');
