import { updateInteraction, sendResponse, safeFetch, safeJSON, truncate, validateURL, validateNumeric } from '../utils/helpers.js';

export async function handleWebOsintBot(interaction, request, env, ctx) {
  if (interaction.type === 1) {
    return new Response(JSON.stringify({ type: 1 }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (interaction.type === 2) {
    const { name, options } = interaction.data;
    const getOption = (optName) => options?.find(o => o.name === optName)?.value;

    const bt = '`';
    const nl = '\n';

    switch (name) {
      case 'ip-gecmis':
        ctx.waitUntil((async () => {
          try {
            const ip = getOption('ip');
            let result = '**IP WHOIS Gecmisi:** ' + bt + ip + bt + nl + nl;

            const ac1 = new AbortController(); setTimeout(() => ac1.abort(), 5000);
            const rdapRes = await fetch('https://rdap.db.ripe.net/ip/' + ip, { signal: ac1.signal });
            if (rdapRes.ok) {
              const rdapData = await rdapRes.json();
              const events = rdapData.events || [];
              const entities = rdapData.entities || [];

              result += '**RIPE RDAP Kaydi:**\n';
              const created = events.find(e => e.eventAction === 'registration')?.eventDate;
              const updated = events.find(e => e.eventAction === 'last changed')?.eventDate;
              if (created) result += '\u2022 Ilk Kayit: ' + created + '\n';
              if (updated) result += '\u2022 Son Guncelleme: ' + updated + '\n';

              entities.forEach(entity => {
                const roles = (entity.roles || []).join(', ');
                const vcard = entity.vcardArray?.[1] || [];
                const fn = vcard.find(v => v[0] === 'fn')?.[3];
                const email = vcard.find(v => v[0] === 'email')?.[3];
                if (fn) result += '\u2022 ' + roles + ': ' + fn + '\n';
                if (email) result += '\u2022 E-posta: ' + email + '\n';
              });
            } else {
              result += 'RDAP kaydi bulunamadi.\n';
            }

            try {
              const ac2 = new AbortController(); setTimeout(() => ac2.abort(), 5000);
              const ipRes = await fetch('http://ip-api.com/json/' + ip + '?fields=status,country,regionName,city,isp,org,as', { signal: ac2.signal });
              const ipData = await ipRes.json();
              if (ipData.status === 'success') {
                result += '\n**Konum:** ' + (ipData.city || '') + ', ' + (ipData.regionName || '') + ', ' + (ipData.country || '') + '\n';
                result += '**ISP:** ' + (ipData.isp || '') + '\n';
                result += '**ORG:** ' + (ipData.org || '') + '\n';
                result += '**ASN:** ' + (ipData.as || '') + '\n';
              }
            } catch (e) { /* bagimsiz kaynak */ }

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'IP gecmis hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'bgp-tara':
        ctx.waitUntil((async () => {
          try {
            const hedef = getOption('hedef');
            const temizAsn = hedef.toUpperCase().replace('AS', '');
            let result = '**BGP Route Analizi:** ' + hedef + '\n\n';

            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const ripeRes = await fetch('https://stat.ripe.net/data/as-overview/data.json?resource=AS' + temizAsn, { signal: ac.signal });
              if (ripeRes.ok) {
                const ripeData = await ripeRes.json();
                if (ripeData.data) {
                  result += '**ASN Bilgisi:**\n';
                  if (ripeData.data.holder) result += '\u2022 Holder: ' + ripeData.data.holder + '\n';
                  if (ripeData.data.asn_country) result += '\u2022 Ulke: ' + ripeData.data.asn_country + '\n';
                  if (ripeData.data.registered) result += '\u2022 Kayit: ' + ripeData.data.registered + '\n';
                  if (ripeData.data.length) result += '\u2022 IP Blok Sayisi: ' + ripeData.data.length + '\n';
                }
              }
            } catch (e) { /* bagimsiz kaynak */ }

            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const peerRes = await fetch('https://stat.ripe.net/data/asn-neighbours/data.json?resource=AS' + temizAsn, { signal: ac.signal });
              if (peerRes.ok) {
                const peerData = await peerRes.json();
                if (peerData.data && peerData.data.neighbours) {
                  const peers = peerData.data.neighbours.slice(0, 10);
                  if (peers.length > 0) {
                    result += '\n**BGP Peerlari (Ilk 10):**\n';
                    peers.forEach(p => {
                      result += '\u2022 AS' + p.asn + ' (' + (p.power === 'Peer' ? 'Peer' : 'Upstream') + ')\n';
                    });
                  }
                }
              }
            } catch (e) { /* bagimsiz kaynak */ }

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'BGP tarama hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'traceroute-sim':
        ctx.waitUntil((async () => {
          try {
            const hedef = getOption('hedef');
            const maxHops = Math.min(Math.max(getOption('atlamasayisi') || 15, 5), 30);
            let result = '**Traceroute Simulasyonu:** ' + hedef + '\n\n';

            let hedefIP = hedef;
            if (!hedef.match(/^\d+\.\d+\.\d+\.\d+$/)) {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const dnsRes = await fetch('https://cloudflare-dns.com/dns-query?name=' + hedef + '&type=A', {
                headers: { 'accept': 'application/dns-json' },
                signal: ac.signal
              });
              if (dnsRes.ok) {
                const dnsData = await dnsRes.json();
                if (dnsData.Answer && dnsData.Answer[0]) {
                  hedefIP = dnsData.Answer[0].data;
                }
              }
            }
            result += '**Hedef IP:** ' + hedefIP + '\n\n';

            result += '**Atlama Noktalari:**\n';
            for (let hop = 1; hop <= Math.min(maxHops, 20); hop++) {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const hopRes = await fetch('https://cloudflare-dns.com/dns-query?name=' + hedef + '&type=A', {
                  headers: { 'accept': 'application/dns-json' },
                  signal: ac.signal
                });
                if (hopRes.ok) {
                  const hopData = await hopRes.json();
                  if (hopData.Answer && hopData.Answer[0]) {
                    const ip = hopData.Answer[0].data;
                    try {
                      const ac2 = new AbortController(); setTimeout(() => ac2.abort(), 5000);
                      const locRes = await fetch('http://ip-api.com/json/' + ip + '?fields=isp,org,country,city', { signal: ac2.signal });
                      if (locRes.ok) {
                        const locData = await locRes.json();
                        if (locData.isp) {
                          result += hop + '. ' + ip + ' (' + (locData.isp || '') + ' - ' + (locData.city || '') + ' ' + (locData.country || '') + ')\n';
                        }
                      }
                    } catch (e) {
                      result += hop + '. ' + ip + '\n';
                    }
                    if (ip === hedefIP) {
                      result += '\n**Hedefe ulasildi!** Toplam ' + hop + ' atlama.\n';
                      break;
                    }
                  }
                }
              } catch (e) {
                result += hop + '. * * * (Zamanasimi)\n';
              }
            }

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Traceroute hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'cdn-harita':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            let result = '**CDN Haritasi:** ' + domain + '\n\n';

            const cdns = [
              { name: 'Cloudflare', test: (h, b) => h.get('cf-ray') || b.includes('cloudflare') },
              { name: 'Akamai', test: (h, b) => h.get('x-akamai-') || b.includes('akamai') },
              { name: 'Fastly', test: (h, b) => h.get('x-fastly') || (h.get('x-served-by') || '').includes('fastly') },
              { name: 'CloudFront', test: (h, b) => h.get('x-amz-cf-id') || h.get('x-amz-cf-pop') },
              { name: 'Incapsula', test: (h, b) => h.get('x-iinfo') },
              { name: 'StackPath', test: (h, b) => h.get('x-mslug') },
              { name: 'Sucuri', test: (h, b) => h.get('x-sucuri-id') },
              { name: 'KeyCDN', test: (h, b) => h.get('x-keycdn') },
              { name: 'Azure', test: (h, b) => h.get('x-azure-ref') },
              { name: 'Google Cloud CDN', test: (h, b) => h.get('x-cloud-trace-context') }
            ];

            let detectedCDN = false;
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const res = await fetch('https://' + domain, {
                method: 'GET',
                headers: { 'User-Agent': 'Mozilla/5.0' },
                redirect: 'manual',
                signal: ac.signal
              });
              const headers = res.headers;
              const body = await res.text().catch(() => '').then(t => t.toLowerCase());

              result += '**Tespit Edilen CDNler:**\n';
              cdns.forEach(cdn => {
                if (cdn.test(headers, body)) {
                  result += '[OK] ' + cdn.name + '\n';
                  detectedCDN = true;
                }
              });

              const server = headers.get('server');
              if (server) result += '\n**Sunucu:** ' + server + '\n';
              const via = headers.get('via');
              if (via) result += '**Via:** ' + via + '\n';
              const cacheControl = headers.get('x-cache');
              if (cacheControl) result += '**Cache:** ' + cacheControl + '\n';
            } catch (e) {
              result += 'Baglanti kurulamadi.\n';
            }

            if (!detectedCDN) {
              result += '\u2022 Bilinen bir CDN tespit edilemedi (dogrudan origin olabilir)\n';
            }

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'CDN harita hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'websiteleri-ortak':
        ctx.waitUntil((async () => {
          try {
            const domainler = getOption('domainler').split(',').map(d => d.trim()).filter(d => d);
            let result = '**Ortak Baglanti Analizi:** ' + domainler.join(', ') + '\n\n';
            const domainData = [];
            for (const domain of domainler) {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const dnsRes = await fetch('https://cloudflare-dns.com/dns-query?name=' + domain + '&type=A', { headers: { 'accept': 'application/dns-json' }, signal: ac.signal });
                if (dnsRes.ok) {
                  const dnsData = await dnsRes.json();
                  if (dnsData.Answer && dnsData.Answer[0]) {
                    const ip = dnsData.Answer[0].data;
                    try {
                      const ac2 = new AbortController(); setTimeout(() => ac2.abort(), 5000);
                      const ipRes = await fetch('http://ip-api.com/json/' + ip + '?fields=isp,org,as', { signal: ac2.signal });
                      if (ipRes.ok) {
                        const ipData = await ipRes.json();
                        domainData.push({ domain, ip, isp: ipData.isp || 'Bilinmiyor', org: ipData.org || 'Bilinmiyor', asn: ipData.as || 'Bilinmiyor' });
                      }
                    } catch (e) {
                      domainData.push({ domain, ip, isp: 'Sorgulanamadi', org: 'Sorgulanamadi', asn: 'Bilinmiyor' });
                    }
                  }
                }
              } catch (e) { /* bagimsiz kaynak */ }
            }
            domainData.forEach(d => {
              result += '**' + d.domain + '**\n';
              result += '\u2022 IP: ' + d.ip + '\n';
              result += '\u2022 ISP: ' + d.isp + '\n';
              result += '\u2022 Org: ' + d.org + '\n';
              result += '\u2022 ASN: ' + d.asn + '\n\n';
            });
            if (domainData.length > 1) {
              const ortakASN = domainData.map(d => d.asn).filter((v, i, a) => a.indexOf(v) !== i);
              const ortakISP = domainData.map(d => d.isp).filter((v, i, a) => a.indexOf(v) !== i);
              result += '**Ortak Noktalar:**\n';
              if (ortakASN.length > 0) result += '\u2022 Ortak ASN: ' + [...new Set(ortakASN)].join(', ') + '\n';
              if (ortakISP.length > 0) result += '\u2022 Ortak ISP: ' + [...new Set(ortakISP)].join(', ') + '\n';
              const ips = domainData.map(d => d.ip);
              if (new Set(ips).size < ips.length) result += '\u2022 Ayni IP uzerinde barinma tespit edildi!\n';
              if (ortakASN.length === 0 && ortakISP.length === 0) result += '\u2022 Ortak baglanti tespit edilemedi.\n';
            }
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Ortak baglanti hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'subdomain-takeover':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            let result = '**Subdomain Takeover Taramasi:** ' + domain + '\n\n';
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const crtRes = await fetch('https://crt.sh/?q=%25.' + domain + '&output=json', { signal: ac.signal });
              if (crtRes.ok) {
                const crtData = await crtRes.json();
                const subs = [...new Set(crtData.map(c => c.name_value))].filter(s => s.includes(domain) && !s.startsWith('*.'));
                result += '**Toplam Subdomain:** ' + subs.length + '\n\n';
                let takeoverCount = 0;
                for (const sub of subs.slice(0, 15)) {
                  try {
                    const ac2 = new AbortController(); setTimeout(() => ac2.abort(), 5000);
                    const subRes = await fetch('https://' + sub, { method: 'GET', signal: ac2.signal, redirect: 'manual' }).catch(() => null);
                    if (subRes) {
                      const body = await subRes.text().catch(() => '').then(t => t.toLowerCase());
                      if (subRes.status === 404 || subRes.status === 400 || body.includes('no such bucket') || body.includes('not found') || body.includes('there is nothing here') || body.includes('domain not found') || body.includes('nxdomain')) {
                        result += '[DIKKAT] ' + sub + ' -> Takeover POTANSIYELI (HTTP ' + subRes.status + ')\n';
                        takeoverCount++;
                      }
                    }
                  } catch (e) { /* bagimsiz kaynak */ }
                }
                if (takeoverCount === 0) result += 'Takeover zafiyeti bulunamadi.\n';
                else result += '\n**Toplam Potansiyel:** ' + takeoverCount + '\n';
              } else {
                result += 'crt.sh sorgulanamadi.\n';
              }
            } catch (e) {
              result += 'crt.sh sorgu hatasi.\n';
            }
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Subdomain takeover hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'firebase-ara':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            let result = '**Firebase Acik Veritabani Kontrolu:** ' + domain + '\n\n';
            const firebaseUrls = [
              'https://' + domain + '.firebaseio.com/.json',
              'https://' + domain + '-default-rtdb.firebaseio.com/.json',
              'https://' + domain + '-prod.firebaseio.com/.json',
              'https://' + domain + '-dev.firebaseio.com/.json'
            ];
            for (const url of firebaseUrls) {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const fbRes = await fetch(url, { signal: ac.signal });
                if (fbRes.ok) {
                  const data = await fbRes.json().catch(() => null);
                  if (data !== null) {
                    result += '[DIKKAT] **ACIK FIREBASE:** ' + url + '\n';
                    const jsonStr = JSON.stringify(data).substring(0, 500);
                    result += '**Icerik (ilk 500 karakter):**\n' + jsonStr + '\n\n';
                  }
                } else if (fbRes.status === 401 || fbRes.status === 403) {
                  result += '[OK] ' + url + ' -> Guvenli (yetkilendirme gerekiyor)\n';
                } else {
                  result += '[HATA] ' + url + ' -> Bulunamadi/Kapali\n';
                }
              } catch (e) {
                result += '[HATA] ' + url + ' -> Hata\n';
              }
            }
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Firebase kontrol hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'http-gecmis':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            let result = '**HTTP Gecmisi (Wayback):** ' + domain + '\n\n';
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const wmRes = await fetch('https://web.archive.org/cdx/search/cdx?url=' + domain + '&output=json&limit=5&fl=timestamp,statuscode,original,mimetype', { signal: ac.signal });
              if (wmRes.ok) {
                const wmData = await wmRes.json();
                if (wmData.length > 1) {
                  for (let i = wmData.length - 1; i >= 1; i--) {
                    const snap = wmData[i];
                    result += '**Snapshot ' + (wmData.length - i) + ':**\n';
                    result += '\u2022 Tarih: ' + snap[0].substring(0, 4) + '-' + snap[0].substring(4, 6) + '-' + snap[0].substring(6, 8) + ' ' + snap[0].substring(8, 10) + ':' + snap[0].substring(10, 12) + '\n';
                    result += '\u2022 Durum: HTTP ' + snap[1] + '\n';
                    result += '\u2022 URL: ' + snap[2] + '\n';
                    result += '\u2022 Tip: ' + snap[3] + '\n';
                    result += '\u2022 Link: https://web.archive.org/web/' + snap[0] + '/' + domain + '\n\n';
                  }
                } else {
                  result += 'Wayback kaydi bulunamadi.\n';
                }
              } else {
                result += 'Wayback API sorgulanamadi.\n';
              }
            } catch (e) {
              result += 'Wayback API hatasi.\n';
            }
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'HTTP gecmis hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'url-tara':
        ctx.waitUntil((async () => {
          try {
            const url = getOption('url');
            let result = '**URL Itibar Analizi:** ' + url + '\n\n';
            if (env.VIRUSTOTAL_API_KEY) {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const vtRes = await fetch('https://www.virustotal.com/api/v3/urls', {
                  method: 'POST',
                  headers: { 'x-apikey': env.VIRUSTOTAL_API_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: 'url=' + encodeURIComponent(url),
                  signal: ac.signal
                });
                if (vtRes.ok) {
                  const vtData = await vtRes.json();
                  const analysisId = vtData.data?.id;
                  if (analysisId) {
                    const ac2 = new AbortController(); setTimeout(() => ac2.abort(), 5000);
                    const vtAnaRes = await fetch('https://www.virustotal.com/api/v3/analyses/' + analysisId, { headers: { 'x-apikey': env.VIRUSTOTAL_API_KEY }, signal: ac2.signal });
                    if (vtAnaRes.ok) {
                      const vtAna = await vtAnaRes.json();
                      const stats = vtAna.data?.attributes?.stats || {};
                      result += '**VirusTotal Analizi:**\n';
                      result += '\u2022 Zararli: ' + (stats.malicious || 0) + '\n';
                      result += '\u2022 Supheli: ' + (stats.suspicious || 0) + '\n';
                      result += '\u2022 Temiz: ' + (stats.harmless || 0) + '\n\n';
                    }
                  }
                }
              } catch (e) {
                result += 'VirusTotal sorgulanamadi.\n';
              }
            }
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const otxRes = await fetch('https://otx.alienvault.com/api/v1/indicators/url/' + encodeURIComponent(url) + '/general', { signal: ac.signal });
              if (otxRes.ok) {
                const otxData = await otxRes.json();
                result += '**AlienVault OTX:**\n';
                result += '\u2022 Pulse Sayisi: ' + (otxData.pulse_info?.count || 0) + '\n';
                if (otxData.pulse_info?.pulses) {
                  otxData.pulse_info.pulses.slice(0, 3).forEach(p => {
                    result += '\u2022 ' + (p.name || 'Isimsiz') + ' (' + (p.adversary || 'Bilinmiyor') + ')\n';
                  });
                }
                result += '\n';
              } else {
                result += 'OTX: Sonuc bulunamadi.\n\n';
              }
            } catch (e) {
              result += 'OTX sorgulanamadi.\n\n';
            }
            if (!env.VIRUSTOTAL_API_KEY) {
              result += '_VirusTotal analizi icin VIRUSTOTAL_API_KEY gereklidir. Su an sadece OTX kullanildi._\n';
            }
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'URL tarama hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'censys-sorgu':
        ctx.waitUntil((async () => {
          try {
            const hedef = getOption('hedef');
            let result = '**Censys Alternatif Sorgu:** ' + hedef + '\n\n';
            const isIP = hedef.match(/^\d+\.\d+\.\d+\.\d+$/);
            if (isIP) {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const shodanRes = await fetch('https://internetdb.shodan.io/' + hedef, { signal: ac.signal });
                if (shodanRes.ok) {
                  const shodanData = await shodanRes.json();
                  result += '**Shodan InternetDB:**\n';
                  if (shodanData.ports) result += '\u2022 Acik Portlar: ' + shodanData.ports.join(', ') + '\n';
                  if (shodanData.hostnames) result += '\u2022 Hostname: ' + shodanData.hostnames.join(', ') + '\n';
                  if (shodanData.cpes) result += '\u2022 CPE: ' + shodanData.cpes.join(', ') + '\n';
                  if (shodanData.tags) result += '\u2022 Etiketler: ' + shodanData.tags.join(', ') + '\n';
                  if (!shodanData.ports && !shodanData.hostnames) result += 'Bu IP icin veri bulunamadi.\n';
                  result += '\n';
                }
              } catch (e) {
                result += 'Shodan sorgulanamadi.\n\n';
              }
            }
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const crtRes = await fetch('https://crt.sh/?q=' + (isIP ? hedef : '%25.' + hedef) + '&output=json', { signal: ac.signal });
              if (crtRes.ok) {
                const crtData = await crtRes.json();
                if (crtData.length > 0) {
                  result += '**Sertifika Kayitlari (crt.sh):**\n';
                  result += '\u2022 Toplam Sertifika: ' + crtData.length + '\n';
                  const issuer = crtData[0]?.issuer_name || 'Bilinmiyor';
                  result += '\u2022 Son Sertifika: ' + (crtData[0]?.name_value || '') + '\n';
                  result += '\u2022 Issuer: ' + issuer + '\n';
                  result += '\u2022 Gecerlilik: ' + (crtData[0]?.not_before || '') + ' - ' + (crtData[0]?.not_after || '') + '\n';
                } else {
                  result += 'Sertifika kaydi bulunamadi.\n';
                }
              }
            } catch (e) {
              result += 'Sertifika sorgulanamadi.\n';
            }
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Censys sorgu hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 's3-tara':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            let result = '**S3 Bucket Taramasi:** ' + domain + '\n\n';
            const baseName = domain.replace(/\.[^.]+$/g, '').replace(/\./g, '-');
            const keywords = ['', 'dev', 'prod', 'test', 'staging', 'backup', 'logs', 'data', 'assets', 'static', 'public', 'media', 'files', 'images', 'uploads', 'config', 'cdn', 'app', 'web', 'bucket'];
            let acikSayisi = 0;
            for (const kw of keywords) {
              const bucketName = kw ? baseName + '-' + kw : baseName;
              for (const domain_suffix of ['s3.amazonaws.com', 's3-us-east-1.amazonaws.com', 's3.eu-west-1.amazonaws.com']) {
                try {
                  const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                  const s3Res = await fetch('https://' + bucketName + '.' + domain_suffix, { method: 'GET', signal: ac.signal });
                  if (s3Res.ok) {
                    const body = await s3Res.text().catch(() => '').then(t => t.toLowerCase());
                    if (body.includes('listbucketresult') || body.includes('contents') || body.includes('<key>')) {
                      result += '[DIKKAT] **ACIK S3 Bucket:** ' + bucketName + '.' + domain_suffix + ' (Listelenebilir!)\n';
                      acikSayisi++;
                    } else if (!body.includes('accessdenied') && !body.includes('allaccessdisabled')) {
                      result += '[OK] ' + bucketName + '.' + domain_suffix + ' -> Erisilebilir (ancak listelenemiyor)\n';
                      acikSayisi++;
                    }
                  } else if (s3Res.status === 403) {
                    result += '[HATA] ' + bucketName + '.' + domain_suffix + ' -> Erisim Engelli (403)\n';
                  }
                } catch (e) { /* bagimsiz kaynak */ }
              }
            }
            if (acikSayisi === 0) result += 'Acik S3 bucket bulunamadi.\n';
            result += '\n**Ozet:** ' + acikSayisi + ' potansiyel acik bucket\n';
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'S3 tarama hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'github-dork':
        ctx.waitUntil((async () => {
          try {
            const kelime = getOption('kelime');
            let result = '**GitHub Dork Taramasi:** ' + kelime + '\n\n';
            const headers = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'DiscordBot' };
            if (env.GITHUB_TOKEN) headers['Authorization'] = 'Bearer ' + env.GITHUB_TOKEN;
            const queries = [
              kelime + ' api_key',
              kelime + ' password',
              kelime + ' secret',
              kelime + ' token',
              kelime + ' .env',
              kelime + ' aws_key',
              kelime + ' slack_token',
              kelime + ' db_password',
              '"' + kelime + '"',
            ];
            for (const q of queries.slice(0, 5)) {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const ghRes = await fetch('https://api.github.com/search/code?q=' + encodeURIComponent(q) + '&per_page=3', { headers, signal: ac.signal });
                if (ghRes.ok) {
                  const ghData = await ghRes.json();
                  if (ghData.total_count > 0) {
                    result += '**Arama: ' + q + '** (' + ghData.total_count + ' sonuc)\n';
                    (ghData.items || []).slice(0, 2).forEach(item => {
                      result += '\u2022 [' + (item.repository?.full_name || 'Bilinmiyor') + '] ' + (item.html_url || '') + '\n';
                      result += '  Dosya: ' + (item.name || '') + ' - ' + (item.path || '') + '\n';
                    });
                    result += '\n';
                  }
                }
              } catch (e) { /* bagimsiz kaynak */ }
            }
            if (result === '**GitHub Dork Taramasi:** ' + kelime + '\n\n') {
              result += 'Sonuc bulunamadi. API rate limit asilmis olabilir.\n';
              if (!env.GITHUB_TOKEN) result += 'IP bazli rate limit (60/saat) asildi. GITHUB_TOKEN ekleyerek limiti 5000/saat yukseltebilirsiniz.\n';
            }
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'GitHub dork hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'cryptoscan':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            let result = '**SSL/TLS Kripto Taramasi:** ' + domain + '\n\n';
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const sslyzeRes = await fetch('https://api.ssllabs.com/api/v3/analyze?host=' + domain + '&maxAge=24', { signal: ac.signal });
              if (sslyzeRes.ok) {
                const sslyzeData = await sslyzeRes.json();
                if (sslyzeData.status === 'READY' || sslyzeData.status === 'ERROR') {
                  if (sslyzeData.endpoints) {
                    const ep = sslyzeData.endpoints[0] || {};
                    result += '**Sunucu:** ' + (ep.ipAddress || '') + ':' + (ep.port || 443) + '\n';
                    result += '**SSL Notu:** ' + (ep.grade || 'F') + (ep.gradeTrustIgnored ? ' (trust ignored)' : '') + '\n';
                    if (ep.details) {
                      const det = ep.details;
                      if (det.protocols) {
                        result += '\n**Protokoller:**\n';
                        det.protocols.forEach(p => {
                          result += '\u2022 ' + p.name + ' ' + p.version + ': ' + (p.status === 'INsecure' ? '[HATA]' : '[OK]') + '\n';
                        });
                      }
                      if (det.suites) {
                        result += '\n**Sifreleme Suite\'leri (Gecerli):**\n';
                        (det.suites.list || []).filter(s => s.suite).slice(0, 5).forEach(s => {
                          result += '\u2022 ' + s.suite.name + ' (' + s.suite.cipherStrength + ' bit)\n';
                        });
                      }
                      if (det.vulnBeast) result += '\n[DIKKAT] BEAST: ' + (det.vulnBeast === 'INSECURE' ? 'Zafiyetli' : 'Guvenli') + '\n';
                      if (det.heartbleed) result += '[DIKKAT] Heartbleed: ' + (det.heartbleed === 'INSECURE' ? 'Zafiyetli' : 'Guvenli') + '\n';
                      if (det.poodle) result += '[DIKKAT] POODLE: ' + (det.poodle === 'INSECURE' ? 'Zafiyetli' : 'Guvenli') + '\n';
                      if (det.heartbeat) result += '[DIKKAT] Heartbleed (detay): ' + (det.heartbeat === 'INSECURE' ? 'Zafiyetli' : 'Guvenli') + '\n';
                    }
                  }
                  if (sslyzeData.status === 'ERROR') result += '\nSSL Labs henuz analiz ediyor. Bir sure sonra tekrar deneyin.\n';
                } else {
                  result += 'SSL Labs analizi devam ediyor (status: ' + sslyzeData.status + ').\n';
                }
              } else {
                result += 'SSL Labs API sorgulanamadi.\n';
              }
            } catch (e) {
              result += 'SSL Labs hatasi.\n';
            }
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Kripto tarama hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'dork-avla':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            let result = '**Google Dork Avcisi:** ' + domain + '\n\n';
            const dorks = [
              { name: 'SQL Acigi', dork: 'site:' + domain + ' ext:sql | ext:db | ext:mdb' },
              { name: 'Env Dosyasi', dork: 'site:' + domain + ' intitle:index.of .env' },
              { name: 'Config Dosyasi', dork: 'site:' + domain + ' ext:conf | ext:cfg | ext:ini' },
              { name: 'Admin Paneli', dork: 'site:' + domain + ' inurl:admin | inurl:login | inurl:panel' },
              { name: 'Yedek Dosyasi', dork: 'site:' + domain + ' ext:bak | ext:old | ext:backup | ext:swp' },
              { name: 'Log Dosyasi', dork: 'site:' + domain + ' ext:log | intitle:index.of logs' },
              { name: 'Veritabani', dork: 'site:' + domain + ' ext:php intitle:phpinfo' },
              { name: 'API/Token', dork: 'site:' + domain + ' "api_key" | "secret" | "token"' },
              { name: 'Dizin Listeleme', dork: 'site:' + domain + ' intitle:index.of' },
              { name: 'Hassas Dosya', dork: 'site:' + domain + ' ext:pdf | ext:doc | ext:xls | ext:ppt intitle:confidential | intitle:gizli' },
              { name: 'GitHub Izgisi', dork: 'site:github.com ' + domain + ' "api_key" | "secret" | "password"' },
              { name: 'Pastebin Izgisi', dork: 'site:pastebin.com ' + domain + ' | ' + domain.replace(/^www\./, '') },
            ];
            for (const dork of dorks) {
              result += '**' + dork.name + ':**\n';
              result += '\u2022 [Google\'da Ara](https://www.google.com/search?q=' + encodeURIComponent(dork.dork) + ')\n';
              result += '  `' + dork.dork + '`\n\n';
            }
            result += '_Uyari: Bu dorklar sadece bilgi amaclidir. Izinsiz tarama yapmayiniz._\n';
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Dork avlama hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'waf-as':
        ctx.waitUntil((async () => {
          try {
            const url = getOption('url');
            let result = '**WAF Tespit Analizi:** ' + url + '\n\n';
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const res = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'manual', signal: ac.signal });
              const h = res.headers;
              const body = await res.text().catch(() => '').then(t => t.toLowerCase());
              result += '**HTTP Durum:** ' + res.status + ' ' + res.statusText + '\n\n';
              result += '**Tespit Edilen WAF/Proxy:**\n';
              let wafDetected = false;
              if (h.get('cf-ray')) { result += '[OK] **Cloudflare** (cf-ray: ' + h.get('cf-ray') + ')\n'; wafDetected = true; }
              if (h.get('x-sucuri-id')) { result += '[OK] **Sucuri WAF**\n'; wafDetected = true; }
              if (h.get('x-iinfo')) { result += '[OK] **Incapsula/Imperva**\n'; wafDetected = true; }
              if (h.get('x-akamai-') || h.get('x-akamai-transformed')) { result += '[OK] **Akamai**\n'; wafDetected = true; }
              if (h.get('server') && h.get('server').toLowerCase().includes('cloudflare')) { result += '[OK] **Cloudflare** (server header)\n'; wafDetected = true; }
              if (h.get('server') && h.get('server').toLowerCase().includes('akamai')) { result += '[OK] **Akamai** (server header)\n'; wafDetected = true; }
              if (h.get('x-powered-by') && h.get('x-powered-by').toLowerCase().includes('wtp')) { result += '[OK] **Wordfence WAF**\n'; wafDetected = true; }
              if (h.get('x-mod-security') || body.includes('mod_security') || body.includes('modsecurity')) { result += '[OK] **ModSecurity**\n'; wafDetected = true; }
              if (h.get('x-waf')) { result += '[OK] **WAF:** ' + h.get('x-waf') + '\n'; wafDetected = true; }
              if (h.get('x-protected-by')) { result += '[OK] **Protected By:** ' + h.get('x-protected-by') + '\n'; wafDetected = true; }
              if (h.get('x-cdn')) { result += '[OK] **CDN:** ' + h.get('x-cdn') + '\n'; wafDetected = true; }
              if (body.includes('cloudflare') && body.includes('attention required')) { result += '[OK] **Cloudflare Challenge (JS)**\n'; wafDetected = true; }
              if (body.includes('blocked by') && body.includes('sucuri')) { result += '[OK] **Sucuri Block**\n'; wafDetected = true; }
              if (body.includes('access denied') && body.includes('akamai')) { result += '[OK] **Akamai Block**\n'; wafDetected = true; }
              if (h.get('server') && h.get('server').toLowerCase().includes('aws')) { result += '[OK] **AWS**\n'; wafDetected = true; }
              if (!wafDetected) {
                result += '\u2022 Bilinen bir WAF tespit edilemedi.\n';
                result += '\u2022 Dogrudan origin sunucu olabilir veya ozel WAF cozumu kullaniyor.\n';
              }
              result += '\n**Yanit Headerlari:**\n';
              const importantHeaders = ['server', 'x-powered-by', 'x-frame-options', 'x-xss-protection', 'x-content-type-options', 'strict-transport-security', 'content-security-policy', 'set-cookie'];
              importantHeaders.forEach(headerName => {
                const val = h.get(headerName);
                if (val) result += '\u2022 ' + headerName + ': ' + val + '\n';
              });
            } catch (e) {
              result += 'Baglanti kurulamadi: ' + e.message + '\n';
            }
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'WAF tespit hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'email-sorgula':
        ctx.waitUntil((async () => {
          try {
            const email = getOption('email');
            let result = '**E-posta Sizinti Taramasi:** `' + email + '`\n\n';
            if (env.HIBP_API_KEY) {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const hibpRes = await fetch('https://haveibeenpwned.com/api/v3/breachedaccount/' + encodeURIComponent(email) + '?truncateResponse=true', { headers: { 'hibp-api-key': env.HIBP_API_KEY, 'user-agent': 'DiscordBot' }, signal: ac.signal });
                const hibp = await hibpRes.json();
                if (Array.isArray(hibp) && hibp.length > 0) result += '**HIBP (' + hibp.length + ' sizinti):**\n' + hibp.slice(0, 5).map(b => '\u2022 ' + b.Name).join('\n') + '\n';
                else result += '**HIBP:** Temiz\n';
              } catch (e) {
                result += '(HIBP sorgulanamadi)\n';
              }
            }
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const psRes = await fetch('https://psbdmp.cc/api/search/' + encodeURIComponent(email), { signal: ac.signal });
              const ps = await psRes.json();
              if (ps.count > 0) result += '**psbdmp.cc:** ' + ps.count + ' pastebin kaydi\n';
            } catch (e) { /* bagimsiz kaynak */ }
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'E-posta sorgulama hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'sifre-sorgula':
        ctx.waitUntil((async () => {
          try {
            const sifre = getOption('sifre');
            const hashBuf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(sifre));
            const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
            const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
            const res = await fetch('https://api.pwnedpasswords.com/range/' + hashHex.substring(0, 5), { signal: ac.signal });
            if (res.ok) {
              const data = await res.text();
              const match = data.split('\n').find(l => l.startsWith(hashHex.substring(5)));
              if (match) await updateInteraction(interaction.application_id, interaction.token, { content: '**Sifre Sorgulama:** Bu sifre **' + parseInt(match.split(':')[1]) + ' KEZ** sizintida goruldu! Hemen degistirin.' });
              else await updateInteraction(interaction.application_id, interaction.token, { content: 'Sifre bilinen sizinti veritabanlarinda bulunamadi.' });
            } else await updateInteraction(interaction.application_id, interaction.token, { content: 'Sifre sorgulama servisine erisilemedi.' });
          } catch (e) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Sifre sorgulama hatasi.' }); }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'pastebin-ara':
        ctx.waitUntil((async () => {
          try {
            const kelime = getOption('kelime');
            let result = '**Pastebin/Gist Aramasi:** `' + kelime + '`\n\n';
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const psRes = await fetch('https://psbdmp.cc/api/search/' + encodeURIComponent(kelime), { signal: ac.signal });
              const ps = await psRes.json();
              if (ps.count > 0) {
                result += 'psbdmp.cc: ' + ps.count + ' sonuc\n';
                result += (ps.data || []).slice(0, 5).map(d => '\u2022 https://pastebin.com/' + d.id).join('\n');
              } else {
                result += 'psbdmp.cc: Sonuc bulunamadi.\n';
              }
            } catch (e) {
              result += 'psbdmp.cc: Sorgulanamadi.\n';
            }
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Pastebin arama hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'whois-detay':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            let result = '**Detayli WHOIS:** ' + domain + '\n\n';
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const rdapRes = await fetch('https://rdap.org/domain/' + domain, { signal: ac.signal });
              const rdap = await rdapRes.json();
              const events = rdap.events || [];
              const created = events.find(e => e.eventAction === 'registration')?.eventDate;
              result += '**Domain:** ' + (rdap.ldhName || domain) + '\n';
              if (created) result += '**Olusturulma:** ' + created + '\n';
            } catch (e) { /* bagimsiz kaynak */ }
            for (const type of ['A', 'MX', 'NS', 'TXT']) {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const dnsRes = await fetch('https://cloudflare-dns.com/dns-query?name=' + domain + '&type=' + type, { headers: { 'accept': 'application/dns-json' }, signal: ac.signal });
                const dns = await dnsRes.json();
                if (dns.Answer) result += type + ': ' + dns.Answer.slice(0, 2).map(a => a.data).join(', ') + '\n';
              } catch (e) { /* bagimsiz kaynak */ }
            }
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'WHOIS hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'web-arsiv':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            let result = '**Web Arsiv (Wayback):** ' + domain + '\n\n';
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const wmRes = await fetch('https://web.archive.org/cdx/search/cdx?url=' + domain + '&output=json&limit=10', { signal: ac.signal });
              const wm = await wmRes.json();
              if (wm.length > 1) {
                result += '**Toplam Kayit:** ' + (wm.length - 1) + '\n';
                result += '**Ilk:** https://web.archive.org/web/' + wm[1][1] + '/' + domain + '\n';
                result += '**Son:** https://web.archive.org/web/' + wm[wm.length - 1][1] + '/' + domain + '\n';
              } else {
                result += 'Wayback kaydi bulunamadi.\n';
              }
            } catch (e) {
              result += 'Wayback sorgulanamadi.\n';
            }
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Web arsiv hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'sertifika-transparan':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            let result = '**Sertifika Transparansi:** ' + domain + '\n\n';
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const crtRes = await fetch('https://crt.sh/?q=%25.' + domain + '&output=json', { signal: ac.signal });
              const crt = await crtRes.json();
              if (crt.length > 0) {
                const subs = [...new Set(crt.map(c => c.name_value))].filter(s => s.includes(domain));
                result += '**Toplam Sertifika:** ' + crt.length + '\n';
                result += '**Alt Alan:** ' + subs.length + '\n';
                result += subs.slice(0, 10).join('\n') + '\n';
              } else {
                result += 'Sertifika bulunamadi.\n';
              }
            } catch (e) {
              result += 'crt.sh sorgulanamadi.\n';
            }
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Sertifika hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'asn-tarama':
        ctx.waitUntil((async () => {
          try {
            const asn = getOption('asn').toUpperCase().replace('AS', '');
            let result = '**ASN Taramasi:** AS' + asn + '\n\n';
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const ipRes = await fetch('http://ip-api.com/json/AS' + asn + '?fields=isp,org,country,city', { signal: ac.signal });
              const ip = await ipRes.json();
              if (ip.status === 'success') result += '**ISP:** ' + ip.isp + '\n**Org:** ' + ip.org + '\n**Lokasyon:** ' + ip.city + ', ' + ip.country + '\n';
            } catch (e) { /* bagimsiz kaynak */ }
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'ASN hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'cdn-gercek-ip':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            let result = '**Gercek IP Tespiti:** ' + domain + '\n\n';
            const subs = ['direct', 'origin', 'cdn', 'www', 'mail', 'ftp', 'ssh', 'api', 'dev', 'admin', 'ns1', 'ns2', 'pop', 'smtp', 'remote', 'mx', 'backup', 'test', 'www2', 'vpn'];
            const ips = new Set();
            for (const sub of subs.slice(0, 10)) {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const dnsRes = await fetch('https://cloudflare-dns.com/dns-query?name=' + sub + '.' + domain + '&type=A', { headers: { 'accept': 'application/dns-json' }, signal: ac.signal });
                const dns = await dnsRes.json();
                if (dns.Answer) result += '\u2022 ' + sub + '.' + domain + ' -> `' + dns.Answer[0].data + '`\n';
              } catch (e) { /* bagimsiz kaynak */ }
            }
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const htRes = await fetch('https://api.hackertarget.com/hostsearch/?q=' + domain, { signal: ac.signal });
              const ht = await htRes.text();
              if (!ht.includes('error')) ht.split('\n').filter(l => l.trim()).forEach(l => { const p = l.split(','); if (p[1]?.match(/^\d+/)) ips.add(p[1]); });
            } catch (e) { /* bagimsiz kaynak */ }
            if (ips.size > 0) result += '**Aday IP\'ler:**\n' + [...ips].slice(0, 8).map((ip, i) => (i + 1) + '. `' + ip + '`').join('\n');
            else result += 'Alternatif IP bulunamadi.\n';
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'CDN IP hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'dns-zone':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            let result = '**DNS Zone Transfer Denemesi:** ' + bt + domain + bt + '\n\n';

            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const nsRes = await fetch('https://cloudflare-dns.com/dns-query?name=' + domain + '&type=NS', {
                headers: { 'accept': 'application/dns-json' },
                signal: ac.signal
              });
              const nsData = await nsRes.json();
              if (nsData.Answer && nsData.Answer.length > 0) {
                result += '**NS Sunuculari:**\n';
                const nsServers = nsData.Answer.map(a => a.data.replace(/\.$/, ''));
                nsServers.forEach(ns => result += '\u2022 ' + ns + '\n');

                result += '\n**Zone Transfer (AXFR) Denemeleri:**\n';
                let zoneFound = false;
                for (const ns of nsServers) {
                  try {
                    const axfrAc = new AbortController(); setTimeout(() => axfrAc.abort(), 5000);
                    const axfrRes = await fetch('https://api.hackertarget.com/zonetransfer/?q=' + domain + '&nameserver=' + ns, {
                      signal: axfrAc.signal
                    });
                    if (axfrRes.ok) {
                      const axfrText = await axfrRes.text();
                      if (!axfrText.includes('error') && !axfrText.includes('No records')) {
                        result += '\n[+] **' + ns + ':** Zone Transfer YANIT VERDI!\n';
                        const records = axfrText.split('\n').filter(l => l.trim());
                        records.slice(0, 20).forEach(r => result += '   ' + r + '\n');
                        if (records.length > 20) result += '   ...ve ' + (records.length - 20) + ' kayit daha.\n';
                        zoneFound = true;
                      } else {
                        result += '[-] **' + ns + ':** Zone Transfer basarisiz (reddedildi).\n';
                      }
                    } else {
                      result += '[-] **' + ns + ':** Yanit alinamadi.\n';
                    }
                  } catch (e) {
                    result += '[-] **' + ns + ':** Sorgulanamadi.\n';
                  }
                }
                if (!zoneFound) {
                  result += '\nHicbir NS sunucusu zone transferine yanit vermedi. Guvenli yapilandirma.' + '\n';
                }
              } else {
                result += 'NS kaydi bulunamadi.' + '\n';
              }
            } catch (e) {
              result += 'NS sorgulamasi yapilamadi: ' + e.message.substring(0, 40) + '\n';
            }

            result += '\n**Not:** Zone transfer acigi (AXFR) modern DNS sunucularinda genellikle kapalidir. Acik olmasi ciddi guvenlik riskidir.' + '\n';

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'DNS zone hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'cdn-atlat':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            let result = '**CDN Atlatma / Origin IP Tespiti:** ' + bt + domain + bt + '\n\n';
            const candidates = new Set();

            result += '**1. crt.sh Sertifika Alt Alanlari:**\n';
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 8000);
              const crtRes = await fetch('https://crt.sh/?q=%25.' + domain + '&output=json', { signal: ac.signal });
              const crtData = await crtRes.json();
              if (crtData && crtData.length > 0) {
                const subdomains = [...new Set(crtData.map(c => c.name_value))].filter(s => s.includes(domain));
                result += 'Bulunan alt alan: ' + subdomains.length + '\n';
                const commonOrigin = ['direct', 'origin', 'direct-connect', 'cpanel', 'whm', 'server', 'srv', 'host', 'backend', 'ipv4', 'prod', 'be', 'web0'];
                for (const sub of subdomains.slice(0, 20)) {
                  for (const prefix of commonOrigin) {
                    if (sub.toLowerCase().startsWith(prefix + '.')) {
                      result += '[!] Potansiyel origin: ' + sub + '\n';
                      try {
                        const dnsAc = new AbortController(); setTimeout(() => dnsAc.abort(), 3000);
                        const dnsRes = await fetch('https://cloudflare-dns.com/dns-query?name=' + sub + '&type=A', {
                          headers: { 'accept': 'application/dns-json' }, signal: dnsAc.signal
                        });
                        const dnsData = await dnsRes.json();
                        if (dnsData.Answer) {
                          dnsData.Answer.forEach(a => {
                            candidates.add(a.data);
                            result += '   IP: ' + a.data + '\n';
                          });
                        }
                      } catch (e) { }
                    }
                  }
                }
              }
            } catch (e) {
              result += 'crt.sh sorgulanamadi.\n';
            }

            result += '\n**2. SecurityTrails Historical DNS (Manuel):**\n';
            result += '\u2022 https://securitytrails.com/domain/' + domain + '/history/a\n';

            result += '\n**3. DNSDB Scout (Manuel):**\n';
            result += '\u2022 https://dnstrails.com/#/domain/domain/' + domain + '\n';
            result += '\u2022 https://dnsdumpster.com/ (domain: ' + domain + ')\n';

            result += '\n**4. Censys Arama (Manuel):**\n';
            result += '\u2022 https://search.censys.io/search?resource=hosts&q=' + encodeURIComponent(domain) + '\n';
            result += '\u2022 https://search.censys.io/certificates?q=' + encodeURIComponent(domain) + '\n';

            result += '\n**5. Yaygin Subdomain IP Kontrolu:**\n';
            const subs = ['direct', 'origin', 'cdn', 'cp', 'cpanel', 'webmail', 'smtp', 'remote', 'vpn', 'dev'];
            const tried = new Set();
            for (const sub of subs) {
              try {
                const dnsAc = new AbortController(); setTimeout(() => dnsAc.abort(), 3000);
                const dnsRes = await fetch('https://cloudflare-dns.com/dns-query?name=' + sub + '.' + domain + '&type=A', {
                  headers: { 'accept': 'application/dns-json' }, signal: dnsAc.signal
                });
                const dnsData = await dnsRes.json();
                if (dnsData.Answer) {
                  dnsData.Answer.forEach(a => {
                    if (!tried.has(a.data)) {
                      tried.add(a.data);
                      candidates.add(a.data);
                      result += '\u2022 ' + sub + '.' + domain + ' -> ' + a.data + '\n';
                    }
                  });
                }
              } catch (e) { }
            }

            if (candidates.size > 0) {
              result += '\n**Aday Origin IP\'ler:**\n';
              [...candidates].slice(0, 8).forEach((ip, i) => {
                result += (i + 1) + '. `' + ip + '`\n';
              });
            } else {
              result += '\nOrigin IP tespit edilemedi. CDN basarili sekilde arka sunucuyu gizliyor.\n';
            }

            result += '\n**Not:** Tarama HTTP/DNS sorgulari ile yapilmistir. Censys/SecurityTrails linklerinden manuel kontrol etmeniz onerilir.\n';

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'CDN atlatma hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'smtp-banner':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            let result = '**SMTP Banner Bilgisi:** ' + bt + domain + bt + '\n\n';

            result += '**MX Kayitlari:**\n';
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const mxRes = await fetch('https://cloudflare-dns.com/dns-query?name=' + domain + '&type=MX', {
                headers: { 'accept': 'application/dns-json' }, signal: ac.signal
              });
              const mxData = await mxRes.json();
              if (mxData.Answer && mxData.Answer.length > 0) {
                const sorted = mxData.Answer.sort((a, b) => a.data.split(' ')[0] - b.data.split(' ')[0]);
                sorted.forEach(mx => {
                  const parts = mx.data.split(' ');
                  const priority = parts[0];
                  const host = parts[1].replace(/\.$/, '');
                  result += '\u2022 Priority ' + priority + ': ' + host + '\n';
                });

                const mxHosts = sorted.map(mx => mx.data.split(' ')[1].replace(/\.$/, ''));
                result += '\n**SMTP Banner Kontrol Komutlari:**\n';
                mxHosts.slice(0, 3).forEach(host => {
                  result += '\u2022 `telnet ' + host + ' 25`\n';
                  result += '\u2022 `nc -v ' + host + ' 25`\n';
                  result += '\u2022 `openssl s_client -starttls smtp -connect ' + host + ':587`\n';
                });
                result += '\n';

                try {
                  const htAc = new AbortController(); setTimeout(() => htAc.abort(), 5000);
                  const htRes = await fetch('https://api.hackertarget.com/nmap/?q=' + mxHosts[0], { signal: htAc.signal });
                  if (htRes.ok) {
                    const htText = await htRes.text();
                    if (!htText.includes('error') && htText.trim()) {
                      const smtpLines = htText.split('\n').filter(l => l.includes('25/tcp') || l.includes('587/tcp') || l.includes('465/tcp') || l.includes('smtp'));
                      if (smtpLines.length > 0) {
                        result += '**Hackertarget Nmap (SMTP portlari):**\n';
                        smtpLines.slice(0, 5).forEach(l => result += l.trim() + '\n');
                        result += '\n';
                      }
                    }
                  }
                } catch (e) { /* bagimsiz kaynak */ }
              } else {
                result += 'MX kaydi bulunamadi.\n\n';
              }
            } catch (e) {
              result += 'MX sorgulamasi yapilamadi.\n\n';
            }

            result += '**Not:** Cloudflare Workers TCP soket baglantisi desteklemedigi icin dogrudan SMTP banner alinamaz. Yukaridaki telnet/nc komutlarini kendi sunucunuzda calistirarak banner bilgisi alabilirsiniz.\n';
            result += 'Banner analizi: SMTP sunucu surumu, yamasi, ESMTP komut destegi, ve guvenlik aciklari hakkinda bilgi verir.\n';

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'SMTP banner hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'soa-kaz':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            let result = '**SOA Kaydi Analizi:** ' + bt + domain + bt + '\n\n';

            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const soaRes = await fetch('https://cloudflare-dns.com/dns-query?name=' + domain + '&type=SOA', {
                headers: { 'accept': 'application/dns-json' }, signal: ac.signal
              });
              const soaData = await soaRes.json();
              if (soaData.Answer && soaData.Answer.length > 0) {
                const soaRecord = soaData.Answer[0].data;
                const parts = soaRecord.split(' ');
                const mname = parts[0].replace(/\.$/, '');
                const rname = parts[1].replace(/\.$/, '');
                const serial = parts[2];
                const refresh = parseInt(parts[3]);
                const retry = parseInt(parts[4]);
                const expire = parseInt(parts[5]);
                const minimum = parseInt(parts[6]);

                result += '**Primary NS (MNAME):** ' + mname + '\n';
                result += '**Admin Email (RNAME):** ' + rname.replace(/\./, '@').replace(/\.$/, '') + '\n\n';

                result += '**Serial Number:** ' + serial + '\n';
                const serialMatch = serial.match(/^(\d{4})(\d{2})(\d{2})(\d{2})$/);
                if (serialMatch) {
                  result += '\u2022 Format: YYYYMMDDNN\n';
                  result += '\u2022 Tarih: ' + serialMatch[1] + '-' + serialMatch[2] + '-' + serialMatch[3] + '\n';
                  result += '\u2022 Revizyon: ' + serialMatch[4] + ' (gun icindeki degisiklik sayisi)\n';
                  result += '\u2022 Yorum: Bu format zone dosyasinin son degistirilme tarihini gosterir. Yaygin ve onerilen formattir.\n';
                } else if (/^\d{10}$/.test(serial)) {
                  result += '\u2022 Format: 10 haneli (olasilikla UNIX timestamp)\n';
                  const ts = parseInt(serial);
                  if (ts > 1000000000 && ts < 2000000000) {
                    result += '\u2022 Tahmini Tarih: ' + new Date(ts * 1000).toISOString().substring(0, 10) + ' (UNIX timestamp format)\n';
                  }
                } else {
                  result += '\u2022 Format: Standart olmayan seri numarasi\n';
                }

                result += '\n**Zamanlama Degerleri:**\n';
                result += '\u2022 Refresh: ' + refresh + ' sn (' + (refresh / 60).toFixed(0) + ' dk)\n';
                result += '   (Secondary NS\'in primary\'i sorgulama sikligi)\n';
                result += '\u2022 Retry: ' + retry + ' sn (' + (retry / 60).toFixed(0) + ' dk)\n';
                result += '   (Refresh basarisiz olursa tekrar deneme araligi)\n';
                result += '\u2022 Expire: ' + expire + ' sn (' + (expire / 3600).toFixed(1) + ' saat)\n';
                result += '   (Primary\'e ulasilamazsa zone\'un gecerlilik suresi)\n';
                result += '\u2022 Minimum TTL: ' + minimum + ' sn (' + (minimum / 60).toFixed(0) + ' dk)\n';
                result += '   (Negatif cache suresi / varsayilan TTL)\n';

              } else {
                result += 'SOA kaydi bulunamadi.\n';
              }
            } catch (e) {
              result += 'SOA sorgulamasi yapilamadi: ' + e.message.substring(0, 40) + '\n';
            }

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'SOA kazimasi hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'etag-parmak':
        ctx.waitUntil((async () => {
          try {
            const url = getOption('url');
            let result = '**ETag Parmak Izi Analizi:** ' + bt + url + bt + '\n\n';

            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 8000);
              const res = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                signal: ac.signal
              });
              const etag = res.headers.get('etag') || res.headers.get('ETag') || res.headers.get('Etag');
              result += '**HTTP Durum:** ' + res.status + '\n';
              result += '**Server:** ' + (res.headers.get('server') || 'Bulunamadi') + '\n';
              result += '**X-Powered-By:** ' + (res.headers.get('x-powered-by') || 'Bulunamadi') + '\n';

              if (etag) {
                result += '\n**ETag Degeri:** ' + etag + '\n\n';
                const cleanEtag = etag.replace(/^["']|["']$/g, '');

                result += '**Format Analizi:**\n';

                if (/^[0-9a-f]{32,}$/i.test(cleanEtag)) {
                  result += '\u2022 Hash-tabanli ETag (32+ hex karakter)\n';
                  if (cleanEtag.length === 32) {
                    result += '   -> Buyuk ihtimal MD5 hash (Apache 2.2+ varsayilan: inode-boyut-timestamp MD5)\n';
                    result += '   -> Tahmini Sunucu: Apache HTTP Server\n';
                  } else if (cleanEtag.length === 40) {
                    result += '   -> SHA-1 hash (Nginx varsayilan)\n';
                    result += '   -> Tahmini Sunucu: Nginx\n';
                  } else if (cleanEtag.length === 64) {
                    result += '   -> SHA-256 hash\n';
                    result += '   -> Tahmini Sunucu: Modern Nginx veya IIS 10+\n';
                  }
                } else if (/^[a-f0-9]+-[a-f0-9]+-[a-f0-9]+$/i.test(cleanEtag)) {
                  result += '\u2022 inode-size-timestamp format (Apache klasik)\n';
                  result += '   -> Tahmini Sunucu: Apache HTTP Server (eski surum)\n';
                  const parts = cleanEtag.split('-');
                  result += '   -> Inode: 0x' + parts[0] + '\n';
                  result += '   -> Dosya boyutu: 0x' + parts[1] + '\n';
                  result += '   -> Timestamp: 0x' + parts[2] + '\n';
                } else if (/^[0-9a-f]{8,}$/i.test(cleanEtag)) {
                  result += '\u2022 Tekil hex hash (8+ karakter)\n';
                  result += '   -> Tahmini Sunucu: IIS 7+ veya hafif HTTP sunucusu\n';
                } else if (/^[0-9]+$/.test(cleanEtag)) {
                  result += '\u2022 Numerik ETag (olasilikla dosya boyutu veya tarih)\n';
                  result += '   -> Tahmini Sunucu: Lighttpd, Caddy, veya ozel sunucu\n';
                } else if (etag.includes('"') || etag.includes("'")) {
                  result += '\u2022 Zayif ETag (Weak ETag - W/ ile baslar)\n';
                  result += '   -> Tahmini Sunucu: Nginx (weak etag destegi)\n';
                  result += '   -> Not: Zayif ETaglar byte-level degisimi garanti etmez.\n';
                } else {
                  result += '\u2022 Standart olmayan ETag format\n';
                }

                const serverHeader = (res.headers.get('server') || '').toLowerCase();
                if (serverHeader.includes('apache')) {
                  result += '\n**Dogrudan Sunucu Tespiti:** Apache (' + res.headers.get('server') + ')\n';
                } else if (serverHeader.includes('nginx')) {
                  result += '\n**Dogrudan Sunucu Tespiti:** Nginx (' + res.headers.get('server') + ')\n';
                } else if (serverHeader.includes('iis') || serverHeader.includes('microsoft')) {
                  result += '\n**Dogrudan Sunucu Tespiti:** IIS/Microsoft (' + res.headers.get('server') + ')\n';
                } else if (serverHeader.includes('cloudflare')) {
                  result += '\n**Dogrudan Sunucu Tespiti:** Cloudflare on yuzde. Arka sunucu ETag\'den tahmin edilmeye calisildi.\n';
                }
              } else {
                result += '\n**ETag:** Bulunamadi. Bu sunucu ETag header\'i gondermiyor.\n';
                result += 'ETag olmamasi genellikle dinamik icerik (PHP, Node.js, Python) veya CDN arkasindaki yapilandirmalarda gorulur.\n';
              }

            } catch (e) {
              result += 'URL sorgulanamadi: ' + e.message.substring(0, 50) + '\n';
            }

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'ETag parmakizi hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'vpn-tespit':
        ctx.waitUntil((async () => {
          try {
            const ip = getOption('ip');
            let result = `**VPN/Proxy Tespit Analizi:** \`${ip}\`${nl}${nl}`;

            result += `**1. ip-api.com Proxy Kontrolu:**${nl}`;
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const ipRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,org,as,proxy,hosting,mobile,query`, { signal: ac.signal });
              const ipData = await ipRes.json();
              if (ipData.status === 'success') {
                result += `  ISP: ${ipData.isp || 'Bilinmiyor'}${nl}`;
                result += `  Org: ${ipData.org || 'Bilinmiyor'}${nl}`;
                result += `  ASN: ${ipData.as || 'Bilinmiyor'}${nl}`;
                result += `  Proxy/VPN: ${ipData.proxy ? '[EVET - VPN/Proxy tespit edildi!]' : 'Hayir'}${nl}`;
                result += `  Hosting/DC: ${ipData.hosting ? '[EVET - Veri merkezi!]' : 'Hayir'}${nl}`;
                result += `  Mobil: ${ipData.mobile ? 'Evet (GSM hatti)' : 'Hayir'}${nl}`;
                result += `  Konum: ${ipData.city || '?'}, ${ipData.country || '?'}${nl}${nl}`;
              }
            } catch (e) { result += `  Sorgulanamadi${nl}${nl}`; }

            result += `**2. Shodan InternetDB:**${nl}`;
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const shRes = await fetch(`https://internetdb.shodan.io/${ip}`, { signal: ac.signal });
              if (shRes.ok) {
                const shData = await shRes.json();
                if (shData.ports) result += `  Acik Portlar: ${shData.ports.join(', ')}${nl}`;
                if (shData.tags) {
                  const tags = shData.tags.filter(t => ['vpn','proxy','tor','compromised','honeypot'].some(k => t.includes(k)));
                  if (tags.length > 0) result += `  [UYARI] Supheli etiketler: ${tags.join(', ')}${nl}`;
                }
                if (shData.vulns) result += `  Zafiyetler: ${shData.vulns.slice(0, 3).join(', ')}${nl}`;
                result += nl;
              }
            } catch (e) { /* alt */ }

            result += `**3. ipqualityscore.com:**${nl}`;
            if (env.IPQUALITY_API_KEY) {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const iqRes = await fetch(`https://ipqualityscore.com/api/json/ip/${env.IPQUALITY_API_KEY}/${ip}`, { signal: ac.signal });
                if (iqRes.ok) {
                  const iq = await iqRes.json();
                  result += `  Fraud Score: ${iq.fraud_score || 0}/100${nl}`;
                  if (iq.vpn) result += `  [UYARI] VPN: ${iq.vpn === true ? 'Evet' : 'Hayir'}${nl}`;
                  if (iq.proxy) result += `  [UYARI] Proxy: ${iq.proxy === true ? 'Evet' : 'Hayir'}${nl}`;
                  if (iq.tor) result += `  [UYARI] TOR: ${iq.tor === true ? 'Evet' : 'Hayir'}${nl}`;
                  if (iq.active_vpn) result += `  Aktif VPN: ${iq.active_vpn === true ? 'Evet' : 'Hayir'}${nl}`;
                  if (iq.active_tor) result += `  Aktif TOR: ${iq.active_tor === true ? 'Evet' : 'Hayir'}${nl}`;
                  if (iq.recent_abuse) result += `  Son Suistimal: ${iq.recent_abuse === true ? 'Evet' : 'Hayir'}${nl}`;
                  if (iq.bot_status) result += `  Bot: ${iq.bot_status === true ? 'Evet' : 'Hayir'}${nl}`;
                  if (iq.ASN) result += `  ASN: ${iq.ASN}${nl}`;
                  if (iq.ISP) result += `  ISP: ${iq.ISP}${nl}`;
                  if (iq.host) result += `  Hostname: ${iq.host}${nl}`;
                }
              } catch (e) { /* alt */ }
            } else {
              result += `  IPQUALITY_API_KEY yok. Ucretsiz kaynaklar kullaniliyor.${nl}`;
              result += `  Alternatif: https://www.ipqualityscore.com/free-ip-lookup-proxy-vpn-test/lookup/${ip}${nl}`;
            }

            result += `${nl}**4. VPN/Proxy Atlatma Ipuclari:**${nl}`;
            result += `  - WebRTC leak test: /webrtc-sizdir (Cookies bot)${nl}`;
            result += `  - DNS leak: gercek ISP DNS'i VPN disina sizabilir${nl}`;
            result += `  - IPv6 leak: cogu VPN IPv6'yi yonlendirmez${nl}`;
            result += `  - TCP timestamp: ayni OS farkli IP'lerde ayni timestamp araligi${nl}`;

            await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `VPN tespit hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'ip-derin':
        ctx.waitUntil((async () => {
          try {
            const ip = getOption('ip');
            let result = `**Derin IP Arastirmasi:** \`${ip}\`${nl}${nl}`;

            result += `**1. Temel Bilgiler:**${nl}`;
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const r = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,org,as,proxy,hosting,mobile,lat,lon,timezone,query,reverse`, { signal: ac.signal });
              const d = await r.json();
              if (d.status === 'success') {
                result += `  IP: ${d.query}${nl}`;
                result += `  Lokasyon: ${d.city || '?'}, ${d.regionName || '?'}, ${d.country || '?'}${nl}`;
                result += `  ISP: ${d.isp || '?'}${nl}`;
                result += `  Organizasyon: ${d.org || '?'}${nl}`;
                result += `  ASN: ${d.as || '?'}${nl}`;
                result += `  Timezone: ${d.timezone || '?'}${nl}`;
                result += `  Koordinat: ${d.lat || '?'}, ${d.lon || '?'}${nl}`;
                result += `  Reverse DNS: ${d.reverse || 'Yok'}${nl}`;
                result += `  Hosting/DC: ${d.hosting ? '[EVET] Sunucu/VPS/Cloud' : 'Hayir'}${nl}`;
                result += `  Proxy/VPN: ${d.proxy ? '[EVET]' : 'Hayir'}${nl}${nl}`;
              }
            } catch (e) { result += `  Sorgulanamadi${nl}${nl}`; }

            result += `**2. AbuseIPDB Skor:**${nl}`;
            if (env.ABUSEIPDB_API_KEY) {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const aRes = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90&verbose=true`, { headers: { 'Key': env.ABUSEIPDB_API_KEY, 'Accept': 'application/json' }, signal: ac.signal });
                if (aRes.ok) {
                  const a = await aRes.json();
                  const d = a.data;
                  result += `  Guven Skoru: ${d.abuseConfidenceScore || 0}% (ne kadar yuksek o kadar kotu)${nl}`;
                  result += `  Rapor Sayisi: ${d.totalReports || 0}${nl}`;
                  if (d.domain) result += `  Domain: ${d.domain}${nl}`;
                  if (d.usageType) result += `  Kullanim: ${d.usageType}${nl}`;
                  if (d.isp) result += `  ISP: ${d.isp}${nl}`;
                  if (d.countryCode) result += `  Ulke: ${d.countryCode}${nl}`;
                  result += nl;
                }
              } catch (e) { result += `  API yok/erisilemedi${nl}${nl}`; }
            } else {
              result += `  ABUSEIPDB_API_KEY eksik.${nl}${nl}`;
            }

            result += `**3. VirusTotal IP Raporu:**${nl}`;
            if (env.VIRUSTOTAL_API_KEY) {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const vtRes = await fetch(`https://www.virustotal.com/api/v3/ip_addresses/${ip}`, { headers: { 'x-apikey': env.VIRUSTOTAL_API_KEY }, signal: ac.signal });
                if (vtRes.ok) {
                  const vt = await vtRes.json();
                  const attr = vt.data?.attributes || {};
                  const stats = attr.last_analysis_stats || {};
                  result += `  Zararli: ${stats.malicious || 0}, Supheli: ${stats.suspicious || 0}, Temiz: ${stats.harmless || 0}${nl}`;
                  if (attr.as_owner) result += `  ASN Sahibi: ${attr.as_owner}${nl}`;
                  if (attr.network) result += `  Ag: ${attr.network}${nl}`;
                  if (attr.reputation !== undefined) result += `  Reputasyon: ${attr.reputation}${nl}`;
                  if (attr.last_https_certificate?.subject?.CN) result += `  DNS: ${attr.last_https_certificate.subject.CN}${nl}`;
                  result += nl;
                }
              } catch (e) { /* alt */ }
            } else {
              result += `  VIRUSTOTAL_API_KEY eksik.${nl}${nl}`;
            }

            result += `**4. Gercek IP Bulma Teknikleri:**${nl}`;
            result += `  - WebRTC leak: tarayicidan gercek IP sizabilir (/webrtc-sizdir)${nl}`;
            result += `  - DNS leak test: https://dnsleaktest.com${nl}`;
            result += `  - Email header kontrolu: gonderilen email header'larinda gercek IP${nl}`;
            result += `  - P2P tracker: torrent tracker baglantilari gercek IP'yi gosterir${nl}`;
            result += `  - Flash/Java applet: eski pluginler VPN'i atlayabilir${nl}`;
            result += `  - Timezone mismatch: IP lokasyonu ile tarayici timezone farkliysa VPN gostergesi${nl}`;
            result += `  - Language mismatch: IP ulke ile Accept-Language farkliysa VPN${nl}`;

            await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `IP derin analiz hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      default:
        return sendResponse('Bilinmeyen komut. Bu bot henuz yapilandiriliyor.');
    }
  }

  return new Response('Bilinmeyen etkilesim', { status: 400 });
}
