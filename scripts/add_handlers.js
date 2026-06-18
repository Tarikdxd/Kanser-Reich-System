// BOT HANDLER'LARINA KOMUT EKLEME SCRIPTSI
const fs = require('fs');

// Her bot handler'i icin eklenecek komut case bloklari
const HANDLERS = {
  'src/bots/webOsintBot.js': [
    `    // --- E-Posta Sorgulama ---
    case 'email-sorgula':
      ctx.waitUntil((async () => {
        try {
          const email = getOption('email');
          let result = \`**E-posta Sizinti Taramasi:** \\\`\${email}\\\`\\n\\n\`;
          if (env.HIBP_API_KEY) {
            try {
              const hibp = await (await fetch(\`https://haveibeenpwned.com/api/v3/breachedaccount/\${encodeURIComponent(email)}?truncateResponse=true\`, { headers: { 'hibp-api-key': env.HIBP_API_KEY, 'user-agent': 'DiscordBot' } })).json();
              if (Array.isArray(hibp) && hibp.length > 0) {
                result += \`**HIBP (\${hibp.length} sizinti):**\\n\${hibp.slice(0, 5).map(b => \`• \${b.Name}\`).join('\\n')}\\n\`;
              } else result += \`**HIBP:** Temiz\\n\`;
            } catch (e) { result += '_(HIBP sorgulanamadi)_\\n'; }
          } else {
            try {
              const ps = await (await fetch(\`https://psbdmp.cc/api/search/\${encodeURIComponent(email)}\`)).json();
              if (ps.count > 0) result += \`**psbdmp.cc:** \${ps.count} pastebin kaydi\\n\`;
            } catch (e) {}
          }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`E-posta sorgulama hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`,
    `    // --- Sifre Sorgulama ---
    case 'sifre-sorgula':
      try {
        const sifre = getOption('sifre');
        const hashBuf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(sifre));
        const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        const res = await fetch(\`https://api.pwnedpasswords.com/range/\${hashHex.substring(0, 5)}\`);
        if (res.ok) {
          const data = await res.text();
          const match = data.split('\\n').find(l => l.startsWith(hashHex.substring(5)));
          if (match) return sendResponse(\`**Sifre Sorgulama:** Bu sifre **\${parseInt(match.split(':')[1])} KEZ** sizintida goruldu! Hemen degistirin.\`);
          return sendResponse('Sifre bilinen sizinti veritabanlarinda bulunamadi.', true);
        }
        return sendResponse('Sifre sorgulama servisine erisilemedi.');
      } catch (e) { return sendResponse('Sifre sorgulama hatasi.'); }`,
    `    case 'breach-scanner':
      ctx.waitUntil((async () => {
        try {
          const domain = getOption('domain');
          let result = \`**Veri Sizintisi Taramasi:** \${domain}\\n\\n\`;
          try {
            const c = new AbortController(); setTimeout(() => c.abort(), 3000);
            const r = await fetch(\`https://\${domain}/.env\`, { method: 'HEAD', signal: c.signal });
            result += r.ok ? '⚠️ .env acik!\n' : '✅ .env guvenli\n';
          } catch (e) { result += '✅ .env kapali\n'; }
          result += \`\\nOneri: https://www.google.com/search?q=\${encodeURIComponent('site:pastebin.com ' + domain)}\`;
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`Breach tarama hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`,
    `    case 'pastebin-ara':
      ctx.waitUntil((async () => {
        try {
          const kelime = getOption('kelime');
          let result = \`**Pastebin/Gist Aramasi:** \\\`\${kelime}\\\`\\n\\n\`;
          try {
            const ps = await (await fetch(\`https://psbdmp.cc/api/search/\${encodeURIComponent(kelime)}\`)).json();
            if (ps.count > 0) result += \`psbdmp.cc: \${ps.count} sonuc\\n\${(ps.data || []).slice(0, 5).map(d => \`• https://pastebin.com/\${d.id}\`).join('\\n')}\`;
            else result += 'psbdmp.cc: Sonuc bulunamadi.\\n';
          } catch (e) { result += 'psbdmp.cc: Sorgulanamadi.\\n'; }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`Pastebin arama hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`,
    `    // --- WHOIS / DNS ---
    case 'whois-detay':
      ctx.waitUntil((async () => {
        try {
          const domain = getOption('domain');
          let result = \`**Detayli WHOIS:** \${domain}\\n\\n\`;
          const rdap = await (await fetch(\`https://rdap.org/domain/\${domain}\`)).json();
          const events = rdap.events || [];
          result += \`**Domain:** \${rdap.ldhName || domain}\\n\`;
          const created = events.find(e => e.eventAction === 'registration')?.eventDate;
          const expired = events.find(e => e.eventAction === 'expiration')?.eventDate;
          if (created) result += \`**Olusturulma:** \${created}\\n\`;
          if (expired) result += \`**Son Kullanim:** \${expired}\\n\`;
          for (const type of ['A', 'MX', 'NS', 'TXT']) {
            try {
              const dns = await (await fetch(\`https://cloudflare-dns.com/dns-query?name=\${domain}&type=\${type}\`, { headers: { 'accept': 'application/dns-json' } })).json();
              if (dns.Answer) result += \`\${type}: \${dns.Answer.slice(0, 2).map(a => a.data).join(', ')}\\n\`;
            } catch (e) {}
          }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`WHOIS hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`,
    `    case 'web-arsiv':
      ctx.waitUntil((async () => {
        try {
          const domain = getOption('domain');
          let result = \`**Web Arsiv (Wayback):** \${domain}\\n\\n\`;
          const wm = await (await fetch(\`https://web.archive.org/cdx/search/cdx?url=\${domain}&output=json&limit=10\`)).json();
          if (wm.length > 1) {
            result += \`**Toplam Kayit:** \${wm.length - 1}\\n\`;
            result += \`**Ilk:** https://web.archive.org/web/\${wm[1][1]}/\${domain}\\n\`;
            result += \`**Son:** https://web.archive.org/web/\${wm[wm.length - 1][1]}/\${domain}\\n\`;
          } else result += 'Wayback kaydi bulunamadi.\\n';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`Web arsiv hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`,
    `    case 'sertifika-transparan':
      ctx.waitUntil((async () => {
        try {
          const domain = getOption('domain');
          let result = \`**Sertifika Transparansi:** \${domain}\\n\\n\`;
          const crt = await (await fetch(\`https://crt.sh/?q=%25.\${domain}&output=json\`)).json();
          if (crt.length > 0) {
            const subs = [...new Set(crt.map(c => c.name_value))].filter(s => s.includes(domain));
            result += \`**Toplam Sertifika:** \${crt.length}\\n\`;
            result += \`**Alt Alan:** \${subs.length}\\n\`;
            result += \`**Ilk 10:**\\n\${subs.slice(0, 10).join('\\n')}\\n\`;
          } else result += 'Sertifika bulunamadi.\\n';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`Sertifika hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`,
    `    case 'asn-tarama':
      ctx.waitUntil((async () => {
        try {
          const asn = getOption('asn').toUpperCase().replace('AS', '');
          let result = \`**ASN Taramasi:** AS\${asn}\\n\\n\`;
          try {
            const ip = await (await fetch(\`http://ip-api.com/json/AS\${asn}?fields=as,isp,org,country,city\`)).json();
            if (ip.status === 'success') {
              result += \`**ISP:** \${ip.isp}\\n**Org:** \${ip.org}\\n**Lokasyon:** \${ip.city}, \${ip.country}\\n\`;
            }
          } catch (e) {}
          if (env.SHODAN_API_KEY) {
            try {
              const sd = await (await fetch(\`https://api.shodan.io/shodan/host/search?key=\${env.SHODAN_API_KEY}&query=asn:AS\${asn}&limit=5\`)).json();
              result += \`\\n**Shodan:** \${sd.total} acik cihaz\\n\`;
              if (sd.matches) sd.matches.slice(0, 3).forEach(m => result += \`• \${m.ip_str}:\${m.port}\\n\`);
            } catch (e) {}
          }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`ASN hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`,
    `    case 'cdn-gercek-ip':
      ctx.waitUntil((async () => {
        try {
          const domain = getOption('domain');
          let result = \`**Gercek IP Tespiti:** \${domain}\\n\\n\`;
          const subs = ['direct', 'origin', 'cdn', 'mail', 'ftp', 'ssh', 'vpn', 'webmail', 'ns1', 'ns2', 'pop', 'smtp', 'remote', 'admin', 'dev', 'api', 'test', 'www2', 'mx', 'backup'];
          const ips = new Set();
          await Promise.allSettled(subs.slice(0, 10).map(async sub => {
            try {
              const dns = await (await fetch(\`https://cloudflare-dns.com/dns-query?name=\${sub}.\${domain}&type=A\`, { headers: { 'accept': 'application/dns-json' } })).json();
              if (dns.Answer) dns.Answer.forEach(a => { if (a.data.match(/^\\\\d+/)) ips.add(a.data); });
            } catch (e) {}
          }));
          try {
            const ht = await (await fetch(\`https://api.hackertarget.com/hostsearch/?q=\${domain}\`)).text();
            if (!ht.includes('error')) ht.split('\\n').filter(l => l.trim()).forEach(l => { const p = l.split(','); if (p[1]?.match(/^\\\\d+/)) ips.add(p[1]); });
          } catch (e) {}
          if (ips.size > 0) result += \`**Aday IP'ler:**\\n\${[...ips].slice(0, 8).map((ip, i) => \`\${i + 1}. \\\`\${ip}\\\`\`).join('\\n')}\`;
          else result += 'Alternatif IP bulunamadi.\\n';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`CDN IP hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`
  ],
  'src/bots/mobilOsintBot.js': [
    `    case 'telefon-sorgula':
      ctx.waitUntil((async () => {
        try {
          const numara = getOption('telefon').replace(/[^0-9+]/g, '');
          let result = \`**Telefon Sorgulama:** \\\`\${numara}\\\`\\n\\n\`;
          if (env.NUMVERIFY_API_KEY) {
            try {
              const nv = await (await fetch(\`https://api.numverify.com/validate?number=\${encodeURIComponent(numara)}&api_key=\${env.NUMVERIFY_API_KEY}\`)).json();
              if (nv.valid) result += \`**Gecerli:** Evet\\n**Ulke:** \${nv.country_name || nv.country_code}\\n**Operator:** \${nv.carrier || 'Bilinmiyor'}\\n**Hat:** \${nv.line_type || 'Bilinmiyor'}\\n\`;
              else result += '**Gecerli:** Hayir\\n';
            } catch (e) { result += 'Numverify servisi sorgulanamadi.\\n'; }
          } else {
            if (numara.startsWith('+90') || numara.startsWith('90')) result += '**Ulke:** Turkiye\\n';
            else if (numara.startsWith('+1') || numara.startsWith('1')) result += '**Ulke:** ABD/Kanada\\n';
            else result += \`**Ulke:** Bilinmiyor (NUMVERIFY_API_KEY gerekli)\\n\`;
            result += \`**Hane:** \${numara.replace(/[^0-9]/g, '').length} rakam\\n\`;
          }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`Telefon sorgulama hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`
  ],
  'src/bots/sosyalMuhBot.js': [
    `    case 'oltala':
      try {
        const hedef = getOption('hedef');
        const maske = getOption('maske');
        const phishId = Math.random().toString(36).substring(2, 7);
        await env.KV.put(\`phish_\${phishId}\`, JSON.stringify({ hedef, creatorId: interaction.member.user.id }));
        const host = request.headers.get('host');
        return sendResponse(\`Oltalama Linki Hazir: \\\`https://\${host}/o/\${phishId}\\\`\\nGercek Hedef: \${hedef}\\nKurbanin Gormesi: \\\`\${maske}\\\`\`);
      } catch (err) { return sendResponse(\`Oltalama hata: \${err.message}\`); }`,
    `    case 'qr-phish':
      try {
        const hedef = getOption('hedef');
        const maske = getOption('maske');
        const phishId = Math.random().toString(36).substring(2, 7);
        await env.KV.put(\`phish_\${phishId}\`, JSON.stringify({ hedef, creatorId: interaction.member.user.id }));
        const host = request.headers.get('host');
        return sendResponse(\`**QR Phishing Linki:** \\\`https://\${host}/o/\${phishId}\\\`\\nQR: https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=\${encodeURIComponent('https://' + host + '/o/' + phishId)}\`);
      } catch (err) { return sendResponse(\`QR hata: \${err.message}\`); }`,
    `    case 'fake-login':
      try {
        const tur = getOption('tur');
        const pageId = Math.random().toString(36).substring(2, 8);
        const templates = { google: 'Google', instagram: 'Instagram', twitter: 'Twitter (X)', discord: 'Discord' };
        await env.KV.put(\`login_\${pageId}\`, JSON.stringify({ title: templates[tur] + ' Giris', creatorId: interaction.member.user.id, tur }), { expirationTtl: 86400 });
        const host = request.headers.get('host');
        return sendResponse(\`**Fake Login Sayfasi:** \${tur.toUpperCase()}\\nLink: https://\${host}/login/\${pageId}\\nKurban bilgileri DMden gelecek.\`);
      } catch (err) { return sendResponse(\`Fake login hatasi: \${err.message}\`); }`,
    `    case 'link-mask':
      try {
        const hedef = getOption('hedef');
        const maske = getOption('maske');
        const phishId = Math.random().toString(36).substring(2, 7);
        await env.KV.put(\`phish_\${phishId}\`, JSON.stringify({ hedef, creatorId: interaction.member.user.id }));
        const host = request.headers.get('host');
        const url = \`https://\${host}/o/\${phishId}\`;
        return sendResponse(\`**Maskelenmis Link:**\\nDogrudan: \\\`\${url}\\\`\\nMarkdown: \\\`[\${maske}](\${url})\\\`\\nHTML: \\\`<a href=\"\${url}\">\${maske}</a>\\`\`);
      } catch (err) { return sendResponse(\`Link mask hatasi: \${err.message}\`); }`
  ],
  'src/bots/derinWebBot.js': [
    `    case 'darkweb-arama':
      ctx.waitUntil((async () => {
        try {
          const kelime = getOption('kelime');
          const res = await fetch(\`https://ahmia.fi/search/json/?q=\${encodeURIComponent(kelime)}\`);
          if (!res.ok) throw new Error('Darkweb servisine erisilemedi.');
          const data = await res.json();
          const results = data.results || [];
          let result = \`**Darkweb Aramasi:** \${kelime}\\n\\n\`;
          if (results.length === 0) result += 'Bu kelime .onion sitelerinde bulunamadi.';
          else result += \`DIKKAT! \${results.length} kayit bulundu.\\n\${results.slice(0, 5).map(r => \`• \${r.title}: \${r.url}\`).join('\\n')}\`;
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`Darkweb hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`
  ],
  'src/bots/sosyalMedyaBot.js': [
    `    case 'telegram-sorgula':
      ctx.waitUntil((async () => {
        try {
          const k = getOption('kullanici');
          let result = \`**Telegram Profil:** @\${k}\\n\\n\`;
          const web = await fetch(\`https://t.me/\${k}\`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          const text = await web.text();
          if (text.includes('og:title')) {
            const t = text.match(/og:title" content="([^"]+)"/);
            const d = text.match(/og:description" content="([^"]+)"/);
            result += \`**Profil:** t.me/\${k}\\n\`;
            if (t) result += \`**Baslik:** \${t[1]}\\n\`;
            if (d) result += \`**Aciklama:** \${d[1].slice(0, 150)}\\n\`;
            result += '**Durum:** Mevcut\n';
          } else result += 'Bulunamadi veya gizli.\n';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`Telegram hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`,
    `    case 'insan-ara':
      ctx.waitUntil((async () => {
        try {
          const isim = getOption('isim');
          let result = \`**Kisi Arastirmasi:** \${isim}\\n\\n**Sosyal Medya:**\\n\`;
          const ad = isim.toLowerCase().replace(/\\\\s+/g, '.');
          const sites = [{ n: 'Instagram', u: \`https://www.instagram.com/\${ad}/\` }, { n: 'Twitter', u: \`https://twitter.com/\${ad}\` }, { n: 'GitHub', u: \`https://github.com/\${ad}\` }, { n: 'LinkedIn', u: \`https://www.linkedin.com/in/\${ad}\` }, { n: 'Facebook', u: \`https://www.facebook.com/\${ad}\` }];
          await Promise.allSettled(sites.map(async s => {
            try { const r = await fetch(s.u, { method: 'GET', redirect: 'manual' }); if (r.status === 200) result += \`• [\${s.n}](\${s.u})\\n\`; } catch (e) {}
          }));
          try {
            const gh = await (await fetch(\`https://api.github.com/search/users?q=\${encodeURIComponent(isim)}+in:name&per_page=3\`, { headers: env.GITHUB_TOKEN ? { Authorization: \`Bearer \${env.GITHUB_TOKEN}\` } : {} })).json();
            if (gh.total_count > 0) result += \`\\n**GitHub:**\\n\${gh.items.slice(0, 3).map(u => \`• \${u.login}: https://github.com/\${u.login}\`).join('\\n')}\`;
          } catch (e) {}
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`Kisi arama hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`,
    `    case 'dox-detay':
      ctx.waitUntil((async () => {
        try {
          const k = getOption('kullanici');
          let result = \`**Detayli DOX:** \${k}\\n\\n\`;
          try {
            const gh = await (await fetch(\`https://api.github.com/users/\${k}\`, { headers: env.GITHUB_TOKEN ? { Authorization: \`Bearer \${env.GITHUB_TOKEN}\` } : {} })).json();
            if (gh.login) result += \`**GitHub:** \${gh.name || 'Gizli'} | \${gh.location || 'Gizli'} | \${gh.email || 'Gizli'}\\n\`;
          } catch (e) {}
          if (env.HIBP_API_KEY) {
            try {
              const h = await (await fetch(\`https://haveibeenpwned.com/api/v3/breachedaccount/\${encodeURIComponent(k)}?truncateResponse=true\`, { headers: { 'hibp-api-key': env.HIBP_API_KEY } })).json();
              if (Array.isArray(h) && h.length > 0) result += \`**Sizinti:** \${h.length} adet\\n\${h.slice(0, 3).map(b => \`• \${b.Name}\`).join('\\n')}\\n\`;
            } catch (e) {}
          }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`DOX hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`
  ],
  'src/bots/guvenlikBot.js': [
    `    case 'cdn-coz':
      ctx.waitUntil((async () => {
        try {
          const domain = getOption('domain');
          let result = \`**CDN/WAF Atlatma:** \${domain}\\n\\n\`;
          const subs = ['direct', 'origin', 'cdn', 'www', 'mail', 'ftp', 'ssh', 'api', 'dev', 'admin'];
          await Promise.allSettled(subs.map(async sub => {
            try {
              const dns = await (await fetch(\`https://cloudflare-dns.com/dns-query?name=\${sub}.\${domain}&type=A\`, { headers: { 'accept': 'application/dns-json' } })).json();
              if (dns.Answer) result += \`• \${sub}.\${domain} -> \\\`\${dns.Answer[0].data}\\\`\\n\`;
            } catch (e) {}
          }));
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`CDN hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`,
    `    case 'port-hizli':
      ctx.waitUntil((async () => {
        try {
          const ip = getOption('ip');
          let result = \`**Hizli Port Taramasi:** \\\`\${ip}\\\`\\n\\n\`;
          const ports = [{ p: 21, n: 'FTP' }, { p: 22, n: 'SSH' }, { p: 23, n: 'Telnet' }, { p: 25, n: 'SMTP' }, { p: 53, n: 'DNS' }, { p: 80, n: 'HTTP' }, { p: 443, n: 'HTTPS' }, { p: 445, n: 'SMB' }, { p: 3306, n: 'MySQL' }, { p: 3389, n: 'RDP' }];
          const acik = [];
          await Promise.allSettled(ports.map(async p => {
            try {
              const scheme = [443, 8443].includes(p.p) ? 'https' : 'http';
              const c = new AbortController(); setTimeout(() => c.abort(), 2000);
              const r = await fetch(\`\${scheme}://\${ip}:\${p.p}\`, { method: 'HEAD', signal: c.signal });
              if (r) acik.push(\`\${p.p} (\${p.n})\`);
            } catch (e) {}
          }));
          if (acik.length > 0) result += \`**Acik Portlar:**\\n\${acik.join('\\n')}\`;
          else result += 'Ilk 10 portta acik port bulunamadi.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`Port tarama hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`,
    `    case 'tech-stack':
      ctx.waitUntil((async () => {
        try {
          const domain = getOption('domain');
          const url = domain.startsWith('http') ? domain : \`https://\${domain}\`;
          let result = \`**Teknoloji Analizi:** \${domain}\\n\\n\`;
          const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
          result += \`**Durum:** \${res.status}\\n\`;
          if (res.headers.get('server')) result += \`**Sunucu:** \${res.headers.get('server')}\\n\`;
          const html = await res.text().catch(() => '').then(t => t.slice(0, 30000));
          if (html.includes('wp-content') || html.includes('wp-json')) result += '**CMS:** WordPress\\n';
          if (html.includes('__NEXT_DATA__')) result += '**Framework:** Next.js\\n';
          if (html.includes('react-root') || html.includes('react.')) result += '**Framework:** React\\n';
          if (html.includes('vue-app')) result += '**Framework:** Vue.js\\n';
          if (html.includes('ng-version')) result += '**Framework:** Angular\\n';
          if (html.includes('laravel')) result += '**Framework:** Laravel\\n';
          if (html.includes('shopify')) result += '**E-ticaret:** Shopify\\n';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`Tech stack hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`,
    `    case 'ssl-coz':
      ctx.waitUntil((async () => {
        try {
          const domain = getOption('domain');
          let result = \`**SSL Sertifika:** \${domain}\\n\\n\`;
          const crt = await (await fetch(\`https://crt.sh/?q=\${domain}&output=json\`)).json();
          const certs = crt.filter(c => c.name_value === domain || c.name_value === \`*.\${domain}\`);
          if (certs.length > 0) {
            const c = certs[0];
            result += \`**Sertifika ID:** \${c.id}\\n\`;
            if (c.not_before && c.not_after) result += \`**Gecerlilik:** \${c.not_before} -> \${c.not_after}\\n\`;
          } else result += 'Sertifika bilgisi alinamadi.\\n';
          try {
            const ssl = await fetch(\`https://\${domain}\`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const tls = ssl.headers.get('cf-ssl-protocol') || 'Bilinmiyor';
            result += \`**TLS:** \${tls}\\n\`;
          } catch (e) { result += \`SSL baglantisi kurulamadi.\`; }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`SSL hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`,
    `    case 'wp-scan':
      ctx.waitUntil((async () => {
        try {
          const domain = getOption('domain');
          const base = domain.startsWith('http') ? domain : \`https://\${domain}\`;
          let result = \`**WP Taramasi:** \${domain}\\n\\n\`;
          const checks = ['wp-admin', 'wp-login.php', 'wp-content', 'wp-json', 'xmlrpc.php', 'readme.html'];
          await Promise.allSettled(checks.map(async c => {
            try { const r = await fetch(\`\${base}/\${c}\`, { redirect: 'manual' }); if (r.status < 400 || r.status === 403) result += \`[VAR] \${c}\\n\`; } catch (e) {}
          }));
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`WP tarama hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`,
    `    case 'header-guvenlik':
      ctx.waitUntil((async () => {
        try {
          const domain = getOption('domain');
          const url = domain.startsWith('http') ? domain : \`https://\${domain}\`;
          let result = \`**Guvenlik Basliklari:** \${domain}\\n\\n\`;
          const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
          const basliklar = [
            { n: 'Strict-Transport-Security', d: 'HSTS' },
            { n: 'Content-Security-Policy', d: 'CSP' },
            { n: 'X-Frame-Options', d: 'Clickjacking' },
            { n: 'X-Content-Type-Options', d: 'MIME Korumasi' },
            { n: 'Referrer-Policy', d: 'Referrer' },
            { n: 'X-XSS-Protection', d: 'XSS Filtre' }
          ];
          basliklar.forEach(b => result += res.headers.get(b.n) ? \`[VAR] \${b.d}\\n\` : \`[EKSIK] \${b.d}\\n\`);
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`Guvenlik hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`,
    `    case 'waf-test':
      ctx.waitUntil((async () => {
        try {
          const url = getOption('url');
          const target = url.startsWith('http') ? url : \`https://\${url}\`;
          const payloads = [{ n: 'SQLi', p: "' OR '1'='1" }, { n: 'XSS', p: '<script>alert(1)</script>' }, { n: 'Path Trav', p: '../../../etc/passwd' }, { n: 'Cmd Inj', p: '; cat /etc/passwd' }, { n: 'SSRF', p: 'http://169.254.169.254/' }];
          let result = \`**WAF Testi:** \${target}\\n\\n\`;
          let b = 0;
          for (const p of payloads) {
            try {
              const r = await fetch(\`\${target}\${target.includes('?') ? '&' : '?'}t=\${encodeURIComponent(p.p)}\`, { redirect: 'manual' });
              const bl = [403, 406, 429, 503].includes(r.status);
              if (bl) b++;
              result += \`\${bl ? '🚫' : '⚠️'} \${p.n}: \${r.status}\\n\`;
            } catch (e) { result += \`❌ \${p.n}: Hata\\n\`; }
          }
          result += \`\\nEngellenen: \${b}/\${payloads.length}\`;
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`WAF test hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`,
    `    case 'email-spoof':
      ctx.waitUntil((async () => {
        try {
          const domain = getOption('domain');
          let result = \`**E-posta Spoof:** \${domain}\\n\\n\`;
          try {
            const spf = await (await fetch(\`https://cloudflare-dns.com/dns-query?name=\${domain}&type=TXT\`, { headers: { 'accept': 'application/dns-json' } })).json();
            const spfRec = (spf.Answer || []).filter(a => a.data.includes('v=spf'));
            if (spfRec.length > 0) {
              result += \`**SPF:** Mevcut\`;
              if (spfRec[0].data.includes('~all')) result += ' (SoftFail - Spoof muhtemel)\\n';
              else if (spfRec[0].data.includes('-all')) result += ' (HardFail - Guclu)\\n';
              else result += ' ("all" mekanizmasi yok!)\\n';
            } else result += '**SPF:** YOK - Spoof yapilabilir!\\n';
          } catch (e) { result += '**SPF:** Sorgulanamadi\\n'; }
          try {
            const dmarc = await (await fetch(\`https://cloudflare-dns.com/dns-query?name=_dmarc.\${domain}&type=TXT\`, { headers: { 'accept': 'application/dns-json' } })).json();
            if (dmarc.Answer) {
              const d = dmarc.Answer[0].data;
              result += \`**DMARC:** \${d.includes('p=reject') ? 'Reject (Guclu)' : d.includes('p=quarantine') ? 'Quarantine (Orta)' : 'None (Zayif)'}\\n\`;
            } else result += '**DMARC:** YOK\\n';
          } catch (e) { result += '**DMARC:** Sorgulanamadi\\n'; }
          if (result.includes('YOK') || result.includes('SoftFail') || result.includes('None')) result += '\\n**Bu domain SPOOFLANABILIR!**';
          else result += '\\n**Spoof korumasi guclu.**';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`Email spoof hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`
  ],
  'src/bots/cografiBot.js': [
    `    case 'exif-derin':
      ctx.waitUntil((async () => {
        try {
          const attachmentId = getOption('fotograf');
          const att = interaction.data.resolved.attachments[attachmentId];
          if (!att || !att.url) throw new Error('Gorsel bulunamadi.');
          const img = await (await fetch(att.url)).arrayBuffer();
          const ai = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
            image: [...new Uint8Array(img)],
            prompt: 'Bu fotografi analiz et. 1) Cekildigi cihaz turu? 2) GPS/lokasyon ipucu var mi? 3) Ic/dis mekan? Emoji kullanma.',
            max_tokens: 300
          });
          let result = \`**Derin EXIF/Gorsel:**\\nDosya: \${att.filename}\\nBoyut: \${(att.size / 1024).toFixed(1)} KB\\n\`;
          result += \`\\n**AI Analizi:**\\n\${(ai.response || 'Analiz edilemedi.').slice(0, 1900)}\`;
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`EXIF hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`,
    `    case 'fotosint':
      ctx.waitUntil((async () => {
        try {
          const attachmentId = getOption('fotograf');
          const att = interaction.data.resolved.attachments[attachmentId];
          const imgUrl = att.url;
          let serpResult = '';
          if (env.SERPAPI_API_KEY) {
            try {
              const serp = await (await fetch(\`https://serpapi.com/search.json?engine=google_lens&url=\${encodeURIComponent(imgUrl)}&api_key=\${env.SERPAPI_API_KEY}\`)).json();
              if (serp.visual_matches) serpResult = \`Google Lens: \${serp.visual_matches.slice(0, 3).map(m => \`\${m.title}: \${m.link}\`).join('\\n')}\\n\\n\`;
            } catch (e) {}
          }
          const img = await (await fetch(imgUrl)).arrayBuffer();
          const ai = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
            image: [...new Uint8Array(img)],
            prompt: 'Bu kim/neresi? Tahmin et. Emoji kullanma.',
            max_tokens: 300
          });
          await updateInteraction(interaction.application_id, interaction.token, { content: \`\${serpResult}Yapay Zeka: \${ai.response || 'Tahmin yapilamadi.'}\` });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: \`Fotosint hatasi: \${err.message}\` }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });`
  ]
};

// Her bot handler'ina komutlari ekle
let totalCommands = 0;
for (const [file, caseBlocks] of Object.entries(HANDLERS)) {
  if (!fs.existsSync(file)) {
    console.log(`\nATA: ${file} bulunamadi!`);
    continue;
  }
  
  let content = fs.readFileSync(file, 'utf8');
  let added = 0;
  
  for (const caseBlock of caseBlocks) {
    // Extract command name from case block
    const cmdMatch = caseBlock.match(/case '([^']+)'/);
    const cmdName = cmdMatch ? cmdMatch[1] : 'unknown';
    
    // Check if already exists
    if (content.includes(`case '${cmdName}':`)) {
      console.log(`  ZATEN VAR (${file}): ${cmdName}`);
      continue;
    }
    
    // Insert before `default:`
    const defaultIdx = content.indexOf('default:');
    if (defaultIdx !== -1) {
      content = content.substring(0, defaultIdx) + '\n' + caseBlock + '\n\n    ' + content.substring(defaultIdx);
      console.log(`  EKLENDI (${file}): ${cmdName}`);
      added++;
    } else {
      console.log(`  HATA (${file}): default: bulunamadi`);
    }
  }
  
  fs.writeFileSync(file, content);
  console.log(`\n${file}: ${added}/${caseBlocks.length} komut eklendi\n`);
  totalCommands += added;
}

console.log(`\n=== ISLEM TAMAM === Toplam ${totalCommands} handler eklendi`);
