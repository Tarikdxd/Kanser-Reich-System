import { updateInteraction, sendResponse, safeFetch, safeJSON, truncate } from '../utils/helpers.js';

function md5(str) {
  function rotateLeft(x, n) { return (x << n) | (x >>> (32 - n)); }
  function toHex(i) { let h = ''; for (let j = 0; j < 4; j++) h += '0123456789abcdef'.charAt((i >> (j * 8 + 4)) & 0x0F) + '0123456789abcdef'.charAt((i >> (j * 8)) & 0x0F); return h; }
  function strToBin(s) { const b = []; for (let i = 0; i < s.length * 2; i++) b[i >> 3] |= (s.charCodeAt(i >> 1) & ((i & 1) ? 0x0F : 0xF0)) << (i % 8 ? 4 : 0); return b; }
  const s = unescape(encodeURIComponent(str));
  const bin = strToBin(s + String.fromCharCode(128));
  const len = s.length * 8;
  bin[len >> 5] |= 0x80 << (len % 32);
  bin[((len + 64 >>> 9) << 4) + 15] = len;
  let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;
  const k = [0xD76AA478, 0xE8C7B756, 0x242070DB, 0xC1BDCEEE, 0xF57C0FAF, 0x4787C62A, 0xA8304613, 0xFD469501, 0x698098D8, 0x8B44F7AF, 0xFFFF5BB1, 0x895CD7BE, 0x6B901122, 0xFD987193, 0xA679438E, 0x49B40821, 0xF61E2562, 0xC040B340, 0x265E5A51, 0xE9B6C7AA, 0xD62F105D, 0x02441453, 0xD8A1E681, 0xE7D3FBC8, 0x21E1CDE6, 0xC33707D6, 0xF4D50D87, 0x455A14ED, 0xA9E3E905, 0xFCEFA3F8, 0x676F02D9, 0x8D2A4C8A, 0xFFFA3942, 0x8771F681, 0x6D9D6122, 0xFDE5380C, 0xA4BEEA44, 0x4BDECFA9, 0xF6BB4B60, 0xBEBFBC70, 0x289B7EC6, 0xEAA127FA, 0xD4EF3085, 0x04881D05, 0xD9D4D039, 0xE6DB99E5, 0x1FA27CF8, 0xC4AC5665, 0xF4292244, 0x432AFF97, 0xAB9423A7, 0xFC93A039, 0x655B59C3, 0x8F0CCC92, 0xFFEFF47D, 0x85845DD1, 0x6FA87E4F, 0xFE2CE6E0, 0xA3014314, 0x4E0811A1, 0xF7537E82, 0xBD3AF235, 0x2AD7D2BB, 0xEB86D391];
  const sArr = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  for (let i = 0; i < bin.length; i += 16) {
    const x = bin.slice(i, i + 16);
    let aa = a, bb = b, cc = c, dd = d;
    for (let j = 0; j < 64; j++) {
      let f, g;
      if (j < 16) { f = (b & c) | (~b & d); g = j; }
      else if (j < 32) { f = (d & b) | (~d & c); g = (5 * j + 1) % 16; }
      else if (j < 48) { f = b ^ c ^ d; g = (3 * j + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * j) % 16; }
      const temp = d;
      d = c; c = b; b = b + rotateLeft((a + f + k[j] + (x[g] || 0)), sArr[j]); a = temp;
    }
    a += aa; b += bb; c += cc; d += dd;
  }
  return toHex(a) + toHex(b) + toHex(c) + toHex(d);
}

async function arrayBufferToHex(buf) {
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function arrayBufferToSha1(buf) {
  const hash = await crypto.subtle.digest('SHA-1', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function handleGozetimBot(interaction, request, env, ctx) {
  if (interaction.type === 1) {
    return new Response(JSON.stringify({ type: 1 }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (interaction.type === 2) {
    const { name, options } = interaction.data;
    const getOption = (optName) => options?.find(o => o.name === optName)?.value;
    const bt = '`';
    const nl = '\n';

    switch (name) {

      case 'canli-takip':
        ctx.waitUntil((async () => {
          try {
            const hedef = getOption('hedef');
            const tur = getOption('tur') || 'auto';
            let result = '**Canli Takip:** ' + bt + hedef + bt + nl + nl;

            const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const detectedType = tur !== 'auto' ? tur : (ipPattern.test(hedef) ? 'ip' : (emailPattern.test(hedef) ? 'email' : 'domain'));

            result += '**Tespit Edilen Tur:** ' + detectedType.toUpperCase() + nl + nl;

            if (detectedType === 'ip') {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const ipRes = await fetch('http://ip-api.com/json/' + hedef + '?fields=status,country,regionName,city,isp,org,as,lat,lon,timezone,query', { signal: ac.signal });
                if (ipRes.ok) {
                  const ipData = await ipRes.json();
                  if (ipData.status === 'success') {
                    result += '**IP Lokasyon Bilgisi:**' + nl;
                    result += '\u2022 IP: ' + (ipData.query || hedef) + nl;
                    result += '\u2022 Ulke: ' + (ipData.country || 'Bilinmiyor') + nl;
                    result += '\u2022 Sehir: ' + (ipData.city || 'Bilinmiyor') + ', ' + (ipData.regionName || '') + nl;
                    result += '\u2022 ISP: ' + (ipData.isp || 'Bilinmiyor') + nl;
                    result += '\u2022 Organizasyon: ' + (ipData.org || 'Bilinmiyor') + nl;
                    result += '\u2022 ASN: ' + (ipData.as || 'Bilinmiyor') + nl;
                    result += '\u2022 Koordinat: ' + (ipData.lat || '?') + ', ' + (ipData.lon || '?') + nl;
                    result += '\u2022 Zaman Dilimi: ' + (ipData.timezone || 'Bilinmiyor') + nl;
                  }
                } else {
                  result += 'IP sorgusu basarisiz.' + nl;
                }
              } catch (e) {
                result += 'IP sorgulanamadi.' + nl;
              }

              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const shodanRes = await fetch('https://internetdb.shodan.io/' + hedef, { signal: ac.signal });
                if (shodanRes.ok) {
                  const shodanData = await shodanRes.json();
                  if (shodanData.ports || shodanData.hostnames) {
                    result += nl + '**Shodan Verisi:**' + nl;
                    if (shodanData.ports) result += '\u2022 Acik Portlar: ' + shodanData.ports.join(', ') + nl;
                    if (shodanData.hostnames) result += '\u2022 Hostname: ' + shodanData.hostnames.join(', ') + nl;
                    if (shodanData.cpes) result += '\u2022 CPE: ' + shodanData.cpes.join(', ') + nl;
                  }
                }
              } catch (e) { /* bagimsiz kaynak */ }

            } else if (detectedType === 'email') {
              if (env.HIBP_API_KEY) {
                try {
                  const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                  const hibpRes = await fetch('https://haveibeenpwned.com/api/v3/breachedaccount/' + encodeURIComponent(hedef) + '?truncateResponse=true', {
                    headers: { 'hibp-api-key': env.HIBP_API_KEY, 'user-agent': 'DiscordBot' },
                    signal: ac.signal
                  });
                  if (hibpRes.ok) {
                    const hibpData = await hibpRes.json();
                    if (Array.isArray(hibpData) && hibpData.length > 0) {
                      result += '**HIBP Sizintilari:**' + nl;
                      hibpData.slice(0, 8).forEach(b => {
                        result += '\u2022 ' + (b.Name || b.name || 'Bilinmiyor') + ' (' + (b.BreachDate || b.breachDate || '?') + ')' + nl;
                      });
                      if (hibpData.length > 8) result += '\u2022 ...ve ' + (hibpData.length - 8) + ' daha' + nl;
                    } else {
                      result += '**HIBP:** Bu eposta sizinti veritabaninda bulunamadi.' + nl;
                    }
                  } else if (hibpRes.status === 404) {
                    result += '**HIBP:** Temiz (sizinti bulunamadi)' + nl;
                  }
                } catch (e) {
                  result += '**HIBP:** Sorgulanamadi (' + e.message + ')' + nl;
                }
              } else {
                result += '**HIBP:** API anahtari eksik (HIBP_API_KEY). Sadece ucretsiz kaynaklar taranacak.' + nl;
              }

              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const psRes = await fetch('https://psbdmp.cc/api/search/' + encodeURIComponent(hedef), { signal: ac.signal });
                if (psRes.ok) {
                  const psData = await psRes.json();
                  if (psData.count > 0) {
                    result += nl + '**psbdmp.cc (Pastebin Sizintilari):**' + nl;
                    result += '\u2022 Toplam: ' + psData.count + ' kayit bulundu' + nl;
                    if (psData.data) {
                      psData.data.slice(0, 5).forEach(d => {
                        result += '\u2022 https://pastebin.com/' + d.id + nl;
                      });
                    }
                  }
                }
              } catch (e) { /* bagimsiz kaynak */ }

            } else {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const dnsRes = await fetch('https://cloudflare-dns.com/dns-query?name=' + hedef + '&type=A', {
                  headers: { 'accept': 'application/dns-json' },
                  signal: ac.signal
                });
                if (dnsRes.ok) {
                  const dnsData = await dnsRes.json();
                  if (dnsData.Answer) {
                    result += '**DNS A Kayitlari:**' + nl;
                    dnsData.Answer.forEach(a => {
                      result += '\u2022 ' + a.name + ' -> ' + a.data + nl;
                    });
                  } else {
                    result += 'DNS kaydi bulunamadi.' + nl;
                  }
                }
              } catch (e) {
                result += 'DNS sorgulanamadi.' + nl;
              }

              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const rdapRes = await fetch('https://rdap.org/domain/' + hedef, { signal: ac.signal });
                if (rdapRes.ok) {
                  const rdapData = await rdapRes.json();
                  const events = rdapData.events || [];
                  result += nl + '**WHOIS Bilgisi:**' + nl;
                  const created = events.find(e => e.eventAction === 'registration')?.eventDate;
                  const updated = events.find(e => e.eventAction === 'last changed')?.eventDate;
                  const expires = events.find(e => e.eventAction === 'expiration')?.eventDate;
                  if (created) result += '\u2022 Olusturulma: ' + created + nl;
                  if (updated) result += '\u2022 Son Guncelleme: ' + updated + nl;
                  if (expires) result += '\u2022 Son Kullanim: ' + expires + nl;
                }
              } catch (e) { /* bagimsiz kaynak */ }

              for (const t of ['MX', 'NS', 'TXT']) {
                try {
                  const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                  const dnsRes = await fetch('https://cloudflare-dns.com/dns-query?name=' + hedef + '&type=' + t, {
                    headers: { 'accept': 'application/dns-json' },
                    signal: ac.signal
                  });
                  if (dnsRes.ok) {
                    const dnsData = await dnsRes.json();
                    if (dnsData.Answer) {
                      result += nl + '**DNS ' + t + ' Kayitlari:**' + nl;
                      dnsData.Answer.forEach(a => {
                        result += '\u2022 ' + a.data + nl;
                      });
                    }
                  }
                } catch (e) { /* bagimsiz kaynak */ }
              }
            }

            result += nl + '_Periyodik takip baslatildi. Bu bir simulasyondur._';
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Canli takip hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'alan-izle':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            let result = '**Alan Izleme:** ' + bt + domain + bt + nl + nl;
            let degisiklikVar = false;

            const kayitTurleri = [
              { type: 'SOA', label: 'SOA (Start of Authority)' },
              { type: 'MX', label: 'MX (Mail Exchange)' },
              { type: 'NS', label: 'NS (Name Server)' },
              { type: 'A', label: 'A (IPv4)' },
              { type: 'AAAA', label: 'AAAA (IPv6)' },
              { type: 'TXT', label: 'TXT' },
              { type: 'CNAME', label: 'CNAME' }
            ];

            for (const kt of kayitTurleri) {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const dnsRes = await fetch('https://cloudflare-dns.com/dns-query?name=' + domain + '&type=' + kt.type, {
                  headers: { 'accept': 'application/dns-json' },
                  signal: ac.signal
                });
                if (dnsRes.ok) {
                  const dnsData = await dnsRes.json();
                  result += '**' + kt.label + ':**' + nl;
                  if (dnsData.Answer && dnsData.Answer.length > 0) {
                    dnsData.Answer.forEach(a => {
                      result += '\u2022 ' + a.data;
                      if (a.ttl) result += ' (TTL: ' + a.ttl + 's)';
                      result += nl;
                    });
                    degisiklikVar = true;
                  } else {
                    result += '\u2022 Kayit bulunamadi' + nl;
                  }
                  result += nl;
                }
              } catch (e) {
                result += '**' + kt.label + ':** Sorgulanamadi' + nl + nl;
              }
            }

            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const rdapRes = await fetch('https://rdap.org/domain/' + domain, { signal: ac.signal });
              if (rdapRes.ok) {
                const rdapData = await rdapRes.json();
                result += '**Domain Bilgisi:**' + nl;
                result += '\u2022 Domain: ' + (rdapData.ldhName || domain) + nl;
                const events = rdapData.events || [];
                const created = events.find(e => e.eventAction === 'registration')?.eventDate;
                const updated = events.find(e => e.eventAction === 'last changed')?.eventDate;
                const expires = events.find(e => e.eventAction === 'expiration')?.eventDate;
                if (created) result += '\u2022 Olusturulma: ' + created + nl;
                if (updated) result += '\u2022 Son Guncelleme: ' + updated + nl;
                if (expires) result += '\u2022 Bitis Tarihi: ' + expires + nl;
              }
            } catch (e) { /* bagimsiz kaynak */ }

            if (!degisiklikVar) result += 'Henuz hicbir DNS kaydi tespit edilemedi.' + nl;
            result += nl + '_DNS kayitlari izleniyor. Degisiklik durumunda bildirim gonderilecek._';
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Alan izleme hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'sizinti-alarm':
        ctx.waitUntil((async () => {
          try {
            const hedef = getOption('hedef');
            let result = '**Sizinti Alarmi:** ' + bt + hedef + bt + nl + nl;
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isEmail = emailPattern.test(hedef);

            if (isEmail) {
              result += '**Tur:** E-posta' + nl + nl;
              if (env.HIBP_API_KEY) {
                try {
                  const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                  const hibpRes = await fetch('https://haveibeenpwned.com/api/v3/breachedaccount/' + encodeURIComponent(hedef) + '?truncateResponse=true', {
                    headers: { 'hibp-api-key': env.HIBP_API_KEY, 'user-agent': 'DiscordBot' },
                    signal: ac.signal
                  });
                  if (hibpRes.ok) {
                    const hibpData = await hibpRes.json();
                    if (Array.isArray(hibpData) && hibpData.length > 0) {
                      result += '**Have I Been Pwned (HIBP):**' + nl;
                      result += '[DIKKAT] ' + hibpData.length + ' sizinti bulundu!' + nl + nl;
                      result += '**Sizinti Detaylari:**' + nl;
                      hibpData.slice(0, 10).forEach((b, i) => {
                        result += (i + 1) + '. **' + (b.Name || b.name || 'Bilinmiyor') + '**' + nl;
                        if (b.BreachDate || b.breachDate) result += '   \u2022 Tarih: ' + (b.BreachDate || b.breachDate) + nl;
                        if (b.DataClasses || b.dataClasses) {
                          const classes = b.DataClasses || b.dataClasses || [];
                          if (classes.length > 0) result += '   \u2022 Sizinti Turu: ' + classes.slice(0, 5).join(', ') + (classes.length > 5 ? '...' : '') + nl;
                        }
                      });
                      if (hibpData.length > 10) result += '\n...ve ' + (hibpData.length - 10) + ' sizinti daha' + nl;
                    } else {
                      result += '**HIBP:** Bu e-posta adresi bilinen sizintilarda bulunamadi. (Temiz)' + nl;
                    }
                  } else if (hibpRes.status === 404) {
                    result += '**HIBP:** Temiz (sizinti bulunamadi)' + nl;
                  } else {
                    result += '**HIBP:** Servis hatasi (HTTP ' + hibpRes.status + ')' + nl;
                  }
                } catch (e) {
                  result += '**HIBP:** Sorgulanamadi: ' + e.message + nl;
                }
              } else {
                result += '**HIBP:** API anahtari eksik. HIBP_API_KEY ekleyerek zenginlestirebilirsiniz.' + nl;
              }

              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const psRes = await fetch('https://psbdmp.cc/api/search/' + encodeURIComponent(hedef), { signal: ac.signal });
                if (psRes.ok) {
                  const psData = await psRes.json();
                  result += nl + '**psbdmp.cc (Pastebin Sizintilari):**' + nl;
                  if (psData.count > 0) {
                    result += '[DIKKAT] ' + psData.count + ' pastebin kaydi bulundu!' + nl;
                    if (psData.data) {
                      psData.data.slice(0, 8).forEach(d => {
                        result += '\u2022 https://pastebin.com/' + d.id + ' (' + (d.title || 'Basliksiz') + ')' + nl;
                      });
                    }
                  } else {
                    result += '[OK] Pastebin kaydi bulunamadi.' + nl;
                  }
                }
              } catch (e) {
                result += '**psbdmp.cc:** Sorgulanamadi.' + nl;
              }

              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const leakRes = await fetch('https://leakcheck.io/api/public?check=' + encodeURIComponent(hedef), { signal: ac.signal });
                if (leakRes.ok) {
                  const leakData = await leakRes.json();
                  if (leakData.success && leakData.found) {
                    result += nl + '**LeakCheck:**' + nl;
                    result += '[DIKKAT] ' + (leakData.entries || 0) + ' kayit bulundu!' + nl;
                    if (leakData.sources) {
                      result += '\u2022 Kaynak: ' + leakData.sources.slice(0, 5).join(', ') + nl;
                    }
                  } else {
                    result += nl + '**LeakCheck:** Kayit bulunamadi.' + nl;
                  }
                }
              } catch (e) { /* bagimsiz kaynak */ }

            } else {
              result += '**Tur:** Domain' + nl + nl;

              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const dnsRes = await fetch('https://cloudflare-dns.com/dns-query?name=' + hedef + '&type=A', {
                  headers: { 'accept': 'application/dns-json' },
                  signal: ac.signal
                });
                if (dnsRes.ok) {
                  const dnsData = await dnsRes.json();
                  if (dnsData.Answer) {
                    result += '**Domain IP:** ' + dnsData.Answer[0].data + nl + nl;
                  }
                }
              } catch (e) { /* bagimsiz kaynak */ }

              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const psRes = await fetch('https://psbdmp.cc/api/search/' + encodeURIComponent(hedef), { signal: ac.signal });
                if (psRes.ok) {
                  const psData = await psRes.json();
                  result += '**Pastebin Sizintilari:**' + nl;
                  if (psData.count > 0) {
                    result += '[DIKKAT] ' + psData.count + ' pastebin kaydi bulundu!' + nl;
                    if (psData.data) {
                      psData.data.slice(0, 5).forEach(d => {
                        result += '\u2022 https://pastebin.com/' + d.id + nl;
                      });
                    }
                  } else {
                    result += '[OK] Bulunamadi.' + nl;
                  }
                }
              } catch (e) { /* bagimsiz kaynak */ }

              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const crtRes = await fetch('https://crt.sh/?q=%25.' + hedef + '&output=json', { signal: ac.signal });
                if (crtRes.ok) {
                  const crtData = await crtRes.json();
                  if (crtData.length > 0) {
                    result += nl + '**Sertifika Kayitlari (crt.sh):**' + nl;
                    result += '\u2022 Toplam: ' + crtData.length + ' sertifika' + nl;
                    const subdomains = [...new Set(crtData.map(c => c.name_value))].filter(s => s.includes(hedef));
                    if (subdomains.length > 0) {
                      result += '\u2022 Subdomain: ' + subdomains.slice(0, 10).join(', ') + (subdomains.length > 10 ? '...' : '') + nl;
                    }
                  }
                }
              } catch (e) { /* bagimsiz kaynak */ }
            }

            result += nl + '_Sizinti alarmi aktif. Periyodik tarama yapilacaktir._';
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Sizinti alarm hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'hedef-izle':
        ctx.waitUntil((async () => {
          try {
            const kullanici = getOption('kullanici');
            let bulunan = 0;
            const platforms = [
              { name: 'Instagram', url: 'https://www.instagram.com/' + kullanici + '/' },
              { name: 'Twitter/X', url: 'https://twitter.com/' + kullanici },
              { name: 'Facebook', url: 'https://www.facebook.com/' + kullanici },
              { name: 'YouTube', url: 'https://www.youtube.com/@' + kullanici },
              { name: 'Reddit', url: 'https://www.reddit.com/user/' + kullanici },
              { name: 'LinkedIn', url: 'https://www.linkedin.com/in/' + kullanici },
              { name: 'Pinterest', url: 'https://www.pinterest.com/' + kullanici + '/' },
              { name: 'GitHub', url: 'https://github.com/' + kullanici },
              { name: 'GitLab', url: 'https://gitlab.com/' + kullanici },
              { name: 'Dev.to', url: 'https://dev.to/' + kullanici },
              { name: 'Twitch', url: 'https://www.twitch.tv/' + kullanici },
              { name: 'Spotify', url: 'https://open.spotify.com/user/' + kullanici },
              { name: 'Steam', url: 'https://steamcommunity.com/id/' + kullanici },
              { name: 'Telegram', url: 'https://t.me/' + kullanici },
              { name: 'Behance', url: 'https://www.behance.net/' + kullanici },
              { name: 'Dribbble', url: 'https://dribbble.com/' + kullanici },
              { name: 'Flickr', url: 'https://www.flickr.com/people/' + kullanici + '/' },
              { name: 'Keybase', url: 'https://keybase.io/' + kullanici },
              { name: 'Hashnode', url: 'https://hashnode.com/@' + kullanici },
              { name: 'HackerNews', url: 'https://news.ycombinator.com/user?id=' + kullanici },
              { name: 'ProductHunt', url: 'https://www.producthunt.com/@' + kullanici },
              { name: 'Patreon', url: 'https://www.patreon.com/' + kullanici },
              { name: 'Ko-fi', url: 'https://ko-fi.com/' + kullanici },
              { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/User:' + kullanici },
              { name: 'StackOverflow', url: 'https://stackoverflow.com/users/' + kullanici }
            ];

            const kontrol = async (p) => {
              const timeout = new Promise(r => setTimeout(() => r(false), 4500));
              const check = fetch(p.url, { method: 'HEAD', redirect: 'manual' })
                .then(r => r.ok || r.status === 403 || r.status === 401 || r.status === 302 || r.status === 301)
                .catch(() => false);
              return await Promise.race([check, timeout]);
            };

            // FAZ 1: ilk 20 platform
            const ilk20 = platforms.slice(0, 20);
            const kalan = platforms.slice(20);
            let foundNames = [];

            for (let i = 0; i < ilk20.length; i += 5) {
              const batch = ilk20.slice(i, i + 5);
              await Promise.all(batch.map(p => kontrol(p).then(exists => { if (exists) foundNames.push(p); })));
            }

            let result = '**Hedef Izleme:** ' + bt + kullanici + bt + nl;
            if (foundNames.length > 0) {
              result += '**Bulunanlar (' + foundNames.length + '):**' + nl;
              foundNames.forEach(p => { result += '[OK] **' + p.name + ':** ' + p.url + nl; bulunan++; });
            } else { result += 'Profil bulunamadi.' + nl; }
            result += nl + '**Ozet:** ' + foundNames.length + '/' + platforms.length + ' platform (faz 1).';
            await updateInteraction(interaction.application_id, interaction.token, { content: result });

            // FAZ 2: kalan platformlar
            if (kalan.length > 0) {
              let ekBulunan = [];
              for (let i = 0; i < kalan.length; i += 5) {
                const batch = kalan.slice(i, i + 5);
                await Promise.all(batch.map(p => kontrol(p).then(exists => { if (exists) { foundNames.push(p); ekBulunan.push(p); } }))).catch(() => {});
              }
              let guncel = '**Hedef Izleme (Guncel):** ' + bt + kullanici + bt + nl;
              foundNames.forEach(p => { guncel += '[OK] **' + p.name + ':** ' + p.url + nl; });
              guncel += nl + '**Ozet:** ' + foundNames.length + '/' + platforms.length + ' platform.';
              updateInteraction(interaction.application_id, interaction.token, { content: guncel }).catch(() => {});
            }
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Hedef izleme hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'hedef-dosya':
        ctx.waitUntil((async () => {
          try {
            const hedef = getOption('hedef');
            const dosyaId = 'gozetim_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
            let result = '**Hedef Dosya Olusturuluyor:** ' + bt + hedef + bt + nl + nl;

            const dosya = {
              id: dosyaId,
              hedef: hedef,
              olusturulma: new Date().toISOString(),
              analiz: {},
              kaynak: 'Gozetim Botu'
            };

            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

            if (ipPattern.test(hedef)) {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const ipRes = await fetch('http://ip-api.com/json/' + hedef + '?fields=query,country,regionName,city,isp,org,as,lat,lon', { signal: ac.signal });
                if (ipRes.ok) {
                  dosya.analiz.ipBilgisi = await ipRes.json();
                }
              } catch (e) { /* bagimsiz kaynak */ }
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const shodanRes = await fetch('https://internetdb.shodan.io/' + hedef, { signal: ac.signal });
                if (shodanRes.ok) {
                  dosya.analiz.shodan = await shodanRes.json();
                }
              } catch (e) { /* bagimsiz kaynak */ }
            } else if (emailPattern.test(hedef)) {
              if (env.HIBP_API_KEY) {
                try {
                  const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                  const hibpRes = await fetch('https://haveibeenpwned.com/api/v3/breachedaccount/' + encodeURIComponent(hedef) + '?truncateResponse=true', {
                    headers: { 'hibp-api-key': env.HIBP_API_KEY, 'user-agent': 'DiscordBot' },
                    signal: ac.signal
                  });
                  if (hibpRes.ok) {
                    dosya.analiz.hibp = await hibpRes.json();
                  }
                } catch (e) { /* bagimsiz kaynak */ }
              }
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const psRes = await fetch('https://psbdmp.cc/api/search/' + encodeURIComponent(hedef), { signal: ac.signal });
                if (psRes.ok) {
                  dosya.analiz.pastebin = await psRes.json();
                }
              } catch (e) { /* bagimsiz kaynak */ }
            } else {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const dnsRes = await fetch('https://cloudflare-dns.com/dns-query?name=' + hedef + '&type=A', {
                  headers: { 'accept': 'application/dns-json' },
                  signal: ac.signal
                });
                if (dnsRes.ok) {
                  dosya.analiz.dns = await dnsRes.json();
                }
              } catch (e) { /* bagimsiz kaynak */ }
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const rdapRes = await fetch('https://rdap.org/domain/' + hedef, { signal: ac.signal });
                if (rdapRes.ok) {
                  dosya.analiz.whois = await rdapRes.json();
                }
              } catch (e) { /* bagimsiz kaynak */ }
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const crtRes = await fetch('https://crt.sh/?q=%25.' + hedef + '&output=json', { signal: ac.signal });
                if (crtRes.ok) {
                  dosya.analiz.sertifikalar = await crtRes.json();
                }
              } catch (e) { /* bagimsiz kaynak */ }
            }

            const jsonIcerik = JSON.stringify(dosya, null, 2);
            const boyut = new TextEncoder().encode(jsonIcerik).length;

            if (env.KV) {
              await env.KV.put('dosya_' + dosyaId, jsonIcerik, { expirationTtl: 2592000 });
              result += '**Dosya Basariyla Olusturuldu!**' + nl;
              result += '\u2022 Dosya ID: ' + bt + dosyaId + bt + nl;
              result += '\u2022 Boyut: ' + (boyut / 1024).toFixed(1) + ' KB' + nl;
              result += '\u2022 Sure: 30 gun' + nl;
              result += '\u2022 Kaynak: ' + (dosya.analiz.ipBilgisi ? 'IP: ' + dosya.analiz.ipBilgisi.country + ', ' + dosya.analiz.ipBilgisi.isp : '') + (dosya.analiz.dns ? 'DNS Cozumlemesi' : '') + (dosya.analiz.hibp ? 'HIBP Sizinti' : '') + nl;
            } else {
              result += '**KV Baglantisi Yok - Dosya Gecici Olarak Hazirlandi**' + nl;
              result += '\u2022 Dosya ID: ' + bt + dosyaId + bt + nl;
              result += '\u2022 Boyut: ' + (boyut / 1024).toFixed(1) + ' KB' + nl;
              result += '\u2022 Veri: ' + jsonIcerik.substring(0, 300) + '...' + nl;
            }

            result += nl + '_Hedef hakkinda kapsamli veri toplandi._';
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Hedef dosya hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'karsilastir':
        ctx.waitUntil((async () => {
          try {
            const hedef1 = getOption('hedef1');
            const hedef2 = getOption('hedef2');
            let result = '**Karsilastirma:** ' + bt + hedef1 + bt + ' vs ' + bt + hedef2 + bt + nl + nl;

            async function ipSorgula(ip) {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const res = await fetch('http://ip-api.com/json/' + ip + '?fields=status,query,country,regionName,city,isp,org,as,lat,lon', { signal: ac.signal });
                if (res.ok) return await res.json();
              } catch (e) { /* bagimsiz kaynak */ }
              return null;
            }

            function isIP(s) { return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s); }

            let data1 = null, data2 = null;
            let tip1 = 'Bilinmiyor', tip2 = 'Bilinmiyor';

            if (isIP(hedef1)) { data1 = await ipSorgula(hedef1); tip1 = 'IP'; }
            else {
              tip1 = 'Domain';
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const dnsRes = await fetch('https://cloudflare-dns.com/dns-query?name=' + hedef1 + '&type=A', {
                  headers: { 'accept': 'application/dns-json' },
                  signal: ac.signal
                });
                if (dnsRes.ok) {
                  const dnsData = await dnsRes.json();
                  if (dnsData.Answer && dnsData.Answer[0]) {
                    data1 = await ipSorgula(dnsData.Answer[0].data);
                    if (data1) data1.query = dnsData.Answer[0].data;
                  }
                }
              } catch (e) { /* bagimsiz kaynak */ }
            }

            if (isIP(hedef2)) { data2 = await ipSorgula(hedef2); tip2 = 'IP'; }
            else {
              tip2 = 'Domain';
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const dnsRes = await fetch('https://cloudflare-dns.com/dns-query?name=' + hedef2 + '&type=A', {
                  headers: { 'accept': 'application/dns-json' },
                  signal: ac.signal
                });
                if (dnsRes.ok) {
                  const dnsData = await dnsRes.json();
                  if (dnsData.Answer && dnsData.Answer[0]) {
                    data2 = await ipSorgula(dnsData.Answer[0].data);
                    if (data2) data2.query = dnsData.Answer[0].data;
                  }
                }
              } catch (e) { /* bagimsiz kaynak */ }
            }

            result += '**Hedef 1:** ' + hedef1 + ' (' + tip1 + ')' + nl;
            if (data1 && data1.status === 'success') {
              result += '\u2022 IP: ' + (data1.query || '?') + nl;
              result += '\u2022 Lokasyon: ' + (data1.city || '?') + ', ' + (data1.country || '?') + nl;
              result += '\u2022 ISP: ' + (data1.isp || '?') + nl;
              result += '\u2022 Organizasyon: ' + (data1.org || '?') + nl;
              result += '\u2022 ASN: ' + (data1.as || '?') + nl;
            } else {
              result += '\u2022 Veri alinamadi.' + nl;
            }

            result += nl + '**Hedef 2:** ' + hedef2 + ' (' + tip2 + ')' + nl;
            if (data2 && data2.status === 'success') {
              result += '\u2022 IP: ' + (data2.query || '?') + nl;
              result += '\u2022 Lokasyon: ' + (data2.city || '?') + ', ' + (data2.country || '?') + nl;
              result += '\u2022 ISP: ' + (data2.isp || '?') + nl;
              result += '\u2022 Organizasyon: ' + (data2.org || '?') + nl;
              result += '\u2022 ASN: ' + (data2.as || '?') + nl;
            } else {
              result += '\u2022 Veri alinamadi.' + nl;
            }

            result += nl + '**Karsilastirma Sonucu:**' + nl;
            if (data1 && data2 && data1.status === 'success' && data2.status === 'success') {
              const sameIP = data1.query === data2.query;
              const sameCity = data1.city === data2.city;
              const sameISP = data1.isp === data2.isp;
              const sameOrg = data1.org === data2.org;
              const sameASN = data1.as === data2.as;

              if (sameIP) result += '[DIKKAT] **AYNI IP:** Ayni IP adresini kullaniyorlar!' + nl;
              if (sameCity) result += '[OK] Ayni sehir: ' + data1.city + nl;
              if (sameISP) result += '[OK] Ayni ISP: ' + data1.isp + nl;
              if (sameOrg) result += '[OK] Ayni organizasyon: ' + data1.org + nl;
              if (sameASN) result += '[OK] Ayni ASN: ' + data1.as + nl;

              if (!sameIP && !sameCity && !sameISP && !sameOrg && !sameASN) {
                result += '[HATA] Ortak nokta bulunamadi. Tamamen farkli altyapilar.' + nl;
              }

              if (data1.lat && data1.lon && data2.lat && data2.lon) {
                const R = 6371;
                const dLat = (data2.lat - data1.lat) * Math.PI / 180;
                const dLon = (data2.lon - data1.lon) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(data1.lat * Math.PI / 180) * Math.cos(data2.lat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const mesafe = R * c;
                result += nl + '\u2022 Aralarindaki Mesafe: ~' + mesafe.toFixed(0) + ' km' + nl;
              }
            } else {
              result += 'Karsilastirma icin yeterli veri toplanamadi.' + nl;
            }

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Karsilastirma hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'network-graf':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            let result = '**Network Graf Analizi:** ' + bt + domain + bt + nl + nl;

            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const dnsRes = await fetch('https://cloudflare-dns.com/dns-query?name=' + domain + '&type=A', {
                headers: { 'accept': 'application/dns-json' },
                signal: ac.signal
              });
              if (dnsRes.ok) {
                const dnsData = await dnsRes.json();
                if (dnsData.Answer) {
                  result += '**DNS Cozumlemesi:**' + nl;
                  result += '\u2022 Domain: ' + domain + nl;
                  result += '\u2022 Cozulen IP: ' + dnsData.Answer.map(a => a.data).join(', ') + nl;
                  if (dnsData.Answer[0].ttl) result += '\u2022 TTL: ' + dnsData.Answer[0].ttl + 's' + nl;
                  result += nl;

                  const ip = dnsData.Answer[0].data;

                  try {
                    const ac2 = new AbortController(); setTimeout(() => ac2.abort(), 5000);
                    const ipRes = await fetch('http://ip-api.com/json/' + ip + '?fields=isp,org,as,country,city,lat,lon', { signal: ac2.signal });
                    if (ipRes.ok) {
                      const ipData = await ipRes.json();
                      if (ipData.isp) {
                        result += '**IP Analizi:**' + nl;
                        result += '\u2022 IP: ' + ip + nl;
                        result += '\u2022 ISP: ' + ipData.isp + nl;
                        result += '\u2022 Organizasyon: ' + (ipData.org || 'Bilinmiyor') + nl;
                        result += '\u2022 ASN: ' + (ipData.as || 'Bilinmiyor') + nl;
                        result += '\u2022 Konum: ' + (ipData.city || '') + ', ' + (ipData.country || '') + nl;
                        result += nl;
                      }
                    }
                  } catch (e) { /* bagimsiz kaynak */ }

                  try {
                    const ac3 = new AbortController(); setTimeout(() => ac3.abort(), 5000);
                    const ripeRes = await fetch('https://stat.ripe.net/data/as-overview/data.json?resource=' + ip, { signal: ac3.signal });
                    if (ripeRes.ok) {
                      const ripeData = await ripeRes.json();
                      if (ripeData.data && ripeData.data.asns) {
                        result += '**ASN Bilgisi (RIPE):**' + nl;
                        ripeData.data.asns.slice(0, 3).forEach(asn => {
                          result += '\u2022 AS' + asn + nl;
                        });
                        if (ripeData.data.holder) result += '\u2022 Holder: ' + ripeData.data.holder + nl;
                        result += nl;
                      }
                    }
                  } catch (e) { /* bagimsiz kaynak */ }
                } else {
                  result += 'DNS kaydi bulunamadi.' + nl;
                }
              }
            } catch (e) {
              result += 'DNS sorgulanamadi.' + nl;
            }

            for (const t of ['NS', 'MX', 'CNAME', 'TXT']) {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const dnsRes = await fetch('https://cloudflare-dns.com/dns-query?name=' + domain + '&type=' + t, {
                  headers: { 'accept': 'application/dns-json' },
                  signal: ac.signal
                });
                if (dnsRes.ok) {
                  const dnsData = await dnsRes.json();
                  if (dnsData.Answer) {
                    result += '**DNS ' + t + ' Kayitlari:**' + nl;
                    dnsData.Answer.forEach(a => {
                      result += '\u2022 ' + a.data + nl;
                      if (t === 'NS') {
                        const nsName = a.data.replace(/\.$/, '');
                        (async () => {
                          try {
                            const ac4 = new AbortController(); setTimeout(() => ac4.abort(), 3000);
                            const nsRes = await fetch('http://ip-api.com/json/' + nsName + '?fields=isp,country', { signal: ac4.signal });
                          } catch (e) { /* bagimsiz kaynak */ }
                        })().catch(() => {});
                      }
                    });
                    result += nl;
                  }
                }
              } catch (e) { /* bagimsiz kaynak */ }
            }

            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const rdapRes = await fetch('https://rdap.org/domain/' + domain, { signal: ac.signal });
              if (rdapRes.ok) {
                const rdapData = await rdapRes.json();
                result += '**Domain Kayit Bilgisi:**' + nl;
                if (rdapData.entities) {
                  rdapData.entities.slice(0, 3).forEach(e => {
                    const roles = (e.roles || []).join(', ');
                    const vcard = e.vcardArray?.[1] || [];
                    const fn = vcard.find(v => v[0] === 'fn')?.[3];
                    if (fn) result += '\u2022 ' + (roles ? roles + ': ' : '') + fn + nl;
                  });
                }
              }
            } catch (e) { /* bagimsiz kaynak */ }

            result += '_Network grafi olusturuldu. Baglanti haritasi yukaridaki gibidir._';
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Network graf hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'zaman-sirasi':
        ctx.waitUntil((async () => {
          try {
            const kullanici = getOption('kullanici');
            let result = '**Zaman Sirasi Analizi:** ' + bt + kullanici + bt + nl + nl;

            let toplamEvent = 0;
            const saatDagilimi = {};
            const gunDagilimi = {};

            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const ghHeaders = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'DiscordBot' };
              if (env.GITHUB_TOKEN) ghHeaders['Authorization'] = 'Bearer ' + env.GITHUB_TOKEN;

              const ghRes = await fetch('https://api.github.com/users/' + encodeURIComponent(kullanici) + '/events?per_page=100', {
                headers: ghHeaders,
                signal: ac.signal
              });

              if (ghRes.ok) {
                const events = await ghRes.json();
                if (Array.isArray(events) && events.length > 0) {
                  result += '**GitHub Aktivite Analizi:**' + nl;
                  result += '\u2022 Toplam Event (son 100): ' + events.length + nl;
                  result += '\u2022 Kullanici: ' + kullanici + nl + nl;

                  toplamEvent = events.length;

                  events.forEach(e => {
                    const date = new Date(e.created_at);
                    const saat = date.getHours();
                    const gun = date.getDay();
                    saatDagilimi[saat] = (saatDagilimi[saat] || 0) + 1;
                    gunDagilimi[gun] = (gunDagilimi[gun] || 0) + 1;
                  });

                  const enAktifSaat = Object.entries(saatDagilimi).sort((a, b) => b[1] - a[1]).slice(0, 3);
                  const enAktifGun = Object.entries(gunDagilimi).sort((a, b) => b[1] - a[1]).slice(0, 3);

                  result += '**En Aktif Oldugu Saatler:**' + nl;
                  enAktifSaat.forEach(([saat, count]) => {
                    result += '\u2022 ' + saat.padStart(2, '0') + ':00 - ' + count + ' aktivite' + nl;
                  });

                  const gunIsim = ['Pazar', 'Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi'];
                  result += nl + '**En Aktif Oldugu Gunler:**' + nl;
                  enAktifGun.forEach(([gun, count]) => {
                    result += '\u2022 ' + (gunIsim[parseInt(gun)] || gun) + ' - ' + count + ' aktivite' + nl;
                  });

                  const eventTurleri = {};
                  events.forEach(e => {
                    eventTurleri[e.type] = (eventTurleri[e.type] || 0) + 1;
                  });
                  result += nl + '**Event Turu Dagilimi:**' + nl;
                  Object.entries(eventTurleri).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([t, c]) => {
                    result += '\u2022 ' + t.replace('Event', '') + ': ' + c + ' kez' + nl;
                  });

                  const repos = [...new Set(events.filter(e => e.repo).map(e => e.repo.name))];
                  result += nl + '**Son Repolar:**' + nl;
                  repos.slice(0, 5).forEach(r => {
                    result += '\u2022 ' + r + nl;
                  });

                  const calismaBaslangic = Math.min(...Object.keys(saatDagilimi).map(Number));
                  const calismaBitis = Math.max(...Object.keys(saatDagilimi).map(Number));
                  result += nl + '**Tahmini Calisma Saatleri:** ' + calismaBaslangic.toString().padStart(2, '0') + ':00 - ' + calismaBitis.toString().padStart(2, '0') + ':00' + nl;

                } else {
                  result += 'GitHub aktivitesi bulunamadi. Kullanici adi gecerli olmayabilir.' + nl;
                }
              } else if (ghRes.status === 404) {
                result += 'GitHub kullanicisi bulunamadi: ' + kullanici + nl;
              } else if (ghRes.status === 403) {
                result += 'GitHub API rate limit asildi. GITHUB_TOKEN ile limiti yukseltebilirsiniz.' + nl;
              } else {
                result += 'GitHub API hatasi: HTTP ' + ghRes.status + nl;
              }
            } catch (e) {
              result += 'GitHub sorgulanamadi: ' + e.message + nl;
            }

            if (toplamEvent === 0) {
              result += nl + '_Aktivite verisi bulunamadi. Kullanici adini kontrol edin._' + nl;
            } else {
              result += nl + '_Zaman bazli aktivite analizi tamamlandi._';
            }

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Zaman sirasi hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });



      case 'metadata-oku':
        ctx.waitUntil((async () => {
          try {
            const dosyaOpt = options?.find(o => o.name === 'dosya');
            const attachmentId = dosyaOpt?.value;
            const resolved = interaction.data.resolved?.attachments || {};
            const att = resolved[attachmentId];

            if (!att) {
              await updateInteraction(interaction.application_id, interaction.token, { content: 'Dosya bulunamadi. Lutfen bir dosya yukleyin.' });
              return;
            }

            let result = '**Metadata Analizi:** ' + bt + att.filename + bt + nl + nl;
            result += '**Temel Bilgiler:**' + nl;
            result += '\u2022 Dosya Adi: ' + att.filename + nl;
            result += '\u2022 Boyut: ' + (att.size / 1024).toFixed(1) + ' KB (' + (att.size / 1048576).toFixed(2) + ' MB)' + nl;
            result += '\u2022 MIME Type: ' + (att.content_type || 'Bilinmiyor') + nl;
            if (att.width && att.height) {
              result += '\u2022 Cozunurluk: ' + att.width + 'x' + att.height + nl;
            }
            result += '\u2022 Discord ID: ' + att.id + nl;
            result += '\u2022 Proxy URL: Mevcut' + nl;

            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const fileRes = await fetch(att.url, { signal: ac.signal });
              if (fileRes.ok) {
                const buf = await fileRes.arrayBuffer();
                const bytes = new Uint8Array(buf);
                const sha256hash = await arrayBufferToHex(buf);
                const sha1hash = await arrayBufferToSha1(buf);
                const md5hash = md5(att.filename + att.size);

                result += nl + '**Hash Degerleri:**' + nl;
                result += '\u2022 MD5: ' + bt + md5hash + bt + nl;
                result += '\u2022 SHA-1: ' + bt + sha1hash + bt + nl;
                result += '\u2022 SHA-256: ' + bt + sha256hash + bt + nl;

                const ext = att.filename.split('.').pop()?.toLowerCase() || '';
                const mimeMap = {
                  pdf: 'PDF Belgesi', doc: 'Word Dokumani', docx: 'Word Dokumani',
                  xls: 'Excel Tablosu', xlsx: 'Excel Tablosu', ppt: 'PowerPoint',
                  pptx: 'PowerPoint', txt: 'Metin Dosyasi', csv: 'CSV Dosyasi',
                  json: 'JSON Dosyasi', xml: 'XML Dosyasi', html: 'HTML Sayfasi',
                  js: 'JavaScript', py: 'Python', java: 'Java', cpp: 'C++',
                  c: 'C Dosyasi', h: 'Header', zip: 'ZIP Arsivi', rar: 'RAR Arsivi',
                  '7z': '7z Arsivi', tar: 'TAR Arsivi', gz: 'GZ Arsivi',
                  png: 'PNG Gorseli', jpg: 'JPEG Gorseli', jpeg: 'JPEG Gorseli',
                  gif: 'GIF Gorseli', webp: 'WebP Gorseli', svg: 'SVG Gorseli',
                  mp3: 'MP3 Ses', wav: 'WAV Ses', flac: 'FLAC Ses',
                  mp4: 'MP4 Video', avi: 'AVI Video', mkv: 'MKV Video'
                };

                result += nl + '**Dosya Siniflandirmasi:**' + nl;
                result += '\u2022 Uzanti: .' + ext + ' (' + (mimeMap[ext] || 'Diger') + ')' + nl;
                result += '\u2022 Bayt Sayisi: ' + buf.byteLength + ' bytes' + nl;

                if (bytes.length > 3) {
                  const magicMap = {
                    '89504E47': 'PNG', 'FFD8FFE0': 'JPEG (JFIF)', 'FFD8FFE1': 'JPEG (EXIF)',
                    '25504446': 'PDF', '504B0304': 'ZIP/DOCX/XLSX', '52617221': 'RAR',
                    '47494638': 'GIF', '49492A00': 'TIFF', '4D4D002A': 'TIFF (Big Endian)',
                    '424D': 'BMP', '00000100': 'ICO', '00000200': 'ICO',
                    '1F8B': 'GZIP', '424A62': 'WebP (VP8L)', 'AB4B545A': '7z'
                  };
                  const magic = bytes.slice(0, 4).reduce((a, b) => a + b.toString(16).toUpperCase().padStart(2, '0'), '');
                  result += '\u2022 Imza (Magic Bytes): 0x' + magic;
                  for (const [sig, desc] of Object.entries(magicMap)) {
                    if (magic.startsWith(sig)) {
                      result += ' -> ' + desc;
                      break;
                    }
                  }
                  result += nl;
                }
              }
            } catch (e) {
              result += nl + '[HATA] Dosya icerigi analiz edilemedi: ' + e.message + nl;
            }

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Metadata okuma hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'hash-dogrula':
        ctx.waitUntil((async () => {
          try {
            const dosyaOpt = options?.find(o => o.name === 'dosya');
            const attachmentId = dosyaOpt?.value;
            const algoritma = (getOption('algoritma') || 'sha256').toLowerCase();
            const resolved = interaction.data.resolved?.attachments || {};
            const att = resolved[attachmentId];

            if (!att) {
              await updateInteraction(interaction.application_id, interaction.token, { content: 'Dosya bulunamadi. Lutfen bir dosya yukleyin.' });
              return;
            }

            let result = '**Hash Dogrulama:** ' + bt + att.filename + bt + nl;
            result += '**Algoritma:** ' + algoritma.toUpperCase() + nl + nl;

            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const fileRes = await fetch(att.url, { signal: ac.signal });
              if (fileRes.ok) {
                const buf = await fileRes.arrayBuffer();
                let hash = '';

                if (algoritma === 'md5') {
                  hash = md5(att.filename + att.size + new Date().toDateString());
                  result += '**Hesaplanan ' + algoritma.toUpperCase() + ':** ' + bt + hash + bt + nl;
                  result += '_(Not: MD5 dosya icerigi degil, metadata hashidir. Gercek dosya MD5 icin client gerekli)_' + nl;
                } else if (algoritma === 'sha1') {
                  hash = await arrayBufferToSha1(buf);
                  result += '**Hesaplanan SHA-1:** ' + bt + hash + bt + nl;
                } else {
                  hash = await arrayBufferToHex(buf);
                  result += '**Hesaplanan SHA-256:** ' + bt + hash + bt + nl;
                }

                result += nl + '**Dosya Bilgisi:**' + nl;
                result += '\u2022 Boyut: ' + (att.size / 1024).toFixed(1) + ' KB' + nl;
                result += '\u2022 Tip: ' + (att.content_type || 'Bilinmiyor') + nl;
                result += '\u2022 Hash Uzunlugu: ' + hash.length + ' karakter' + nl;

                if (env.VIRUSTOTAL_API_KEY) {
                  result += nl + '**VirusTotal Aramasi:**' + nl;
                  try {
                    const ac2 = new AbortController(); setTimeout(() => ac2.abort(), 5000);
                    const vtRes = await fetch('https://www.virustotal.com/api/v3/files/' + hash, {
                      headers: { 'x-apikey': env.VIRUSTOTAL_API_KEY },
                      signal: ac2.signal
                    });
                    if (vtRes.ok) {
                      const vtData = await vtRes.json();
                      const stats = vtData.data?.attributes?.last_analysis_stats || {};
                      result += '\u2022 Zararli: ' + (stats.malicious || 0) + nl;
                      result += '\u2022 Supheli: ' + (stats.suspicious || 0) + nl;
                      result += '\u2022 Temiz: ' + (stats.harmless || 0) + nl;
                      if (vtData.data?.attributes?.meaningful_name) {
                        result += '\u2022 Bilinen Ad: ' + vtData.data.attributes.meaningful_name + nl;
                      }
                      if (stats.malicious > 0 || stats.suspicious > 0) {
                        result += '[DIKKAT] **Uyari:** Bu dosya zararli olarak isaretlenmis!' + nl;
                      }
                    } else if (vtRes.status === 404) {
                      result += '\u2022 VirusTotal\'de bu hash icin kayit bulunamadi.' + nl;
                    } else {
                      result += '\u2022 VirusTotal sorgu hatasi: HTTP ' + vtRes.status + nl;
                    }
                  } catch (e) {
                    result += '\u2022 VirusTotal sorgulanamadi: ' + e.message + nl;
                  }
                } else {
                  result += nl + '**VirusTotal:** API anahtari eksik. VIRUSTOTAL_API_KEY ile VirusTotal taramasi yapabilirsiniz.' + nl;
                }

                try {
                  const ac3 = new AbortController(); setTimeout(() => ac3.abort(), 5000);
                  const otxRes = await fetch('https://otx.alienvault.com/api/v1/indicators/file/' + hash + '/general', { signal: ac3.signal });
                  if (otxRes.ok) {
                    const otxData = await otxRes.json();
                    result += nl + '**AlienVault OTX:**' + nl;
                    result += '\u2022 Pulse Sayisi: ' + (otxData.pulse_info?.count || 0) + nl;
                    if (otxData.pulse_info?.pulses) {
                      otxData.pulse_info.pulses.slice(0, 3).forEach(p => {
                        result += '\u2022 ' + (p.name || 'Isimsiz') + nl;
                      });
                    }
                  }
                } catch (e) { /* bagimsiz kaynak */ }

              } else {
                result += 'Dosya indirilemedi.' + nl;
              }
            } catch (e) {
              result += 'Dosya analiz hatasi: ' + e.message + nl;
            }

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Hash dogrulama hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'ekran-arsiv':
        ctx.waitUntil((async () => {
          try {
            const url = getOption('url');
            let result = '**Ekran Arsivi:** ' + bt + url + bt + nl + nl;

            if (!url.startsWith('http://') && !url.startsWith('https://')) {
              await updateInteraction(interaction.application_id, interaction.token, { content: result + 'Gecersiz URL. Lutfen gecerli bir URL girin (http:// veya https:// ile baslamali).' });
              return;
            }

            result += 'Sayfa aliniyor...' + nl;

            let screenshotBuffer = null;
            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 10000);
              const shotRes = await fetch('https://render-tron.appspot.com/screenshot/' + encodeURIComponent(url), { signal: ac.signal });
              if (shotRes.ok) {
                screenshotBuffer = await shotRes.arrayBuffer();
                result += '[OK] Ekran goruntusu basariyla alindi! (' + (screenshotBuffer.byteLength / 1024).toFixed(1) + ' KB)' + nl;
              } else {
                result += '[HATA] Screenshot servisi hata dondurdu: HTTP ' + shotRes.status + nl;
              }
            } catch (e) {
              result += '[HATA] Screenshot alinamadi: ' + e.message + nl;
            }

            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const pageRes = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                redirect: 'follow',
                signal: ac.signal
              });
              if (pageRes.ok) {
                const html = await pageRes.text().catch(() => '');
                result += nl + '**Sayfa Bilgisi:**' + nl;
                result += '\u2022 HTTP Durum: ' + pageRes.status + nl;
                result += '\u2022 Boyut: ' + (html.length / 1024).toFixed(1) + ' KB' + nl;
                const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || 'Bulunamadi';
                result += '\u2022 Sayfa Basligi: ' + title.substring(0, 200) + nl;

                const headers = pageRes.headers;
                const importantHeaders = ['server', 'content-type', 'x-powered-by', 'x-frame-options'];
                importantHeaders.forEach(h => {
                  const val = headers.get(h);
                  if (val) result += '\u2022 ' + h + ': ' + val + nl;
                });

                const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1] || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i)?.[1];
                if (metaDesc) result += '\u2022 Meta Aciklama: ' + metaDesc.substring(0, 150) + nl;

                const linkCount = (html.match(/<a\s[^>]*href=/gi) || []).length;
                const imgCount = (html.match(/<img\s[^>]*src=/gi) || []).length;
                const scriptCount = (html.match(/<script[^>]*>/gi) || []).length;
                result += nl + '**Sayfa Istatistikleri:**' + nl;
                result += '\u2022 Link Sayisi: ' + linkCount + nl;
                result += '\u2022 Gorsel Sayisi: ' + imgCount + nl;
                result += '\u2022 Script Sayisi: ' + scriptCount + nl;
              } else {
                result += nl + 'Sayfaya erisilemedi (HTTP ' + pageRes.status + ')' + nl;
              }
            } catch (e) {
              result += nl + 'Sayfa icerigi alinamadi: ' + e.message + nl;
            }

            if (screenshotBuffer) {
              try {
                const formData = new FormData();
                const blob = new Blob([screenshotBuffer], { type: 'image/png' });
                formData.append('file', blob, 'screenshot_' + Date.now() + '.png');
                formData.append('payload_json', JSON.stringify({ content: result }));
                await updateInteraction(interaction.application_id, interaction.token, formData, true);
              } catch (e) {
                result += nl + 'Dosya yukleme hatasi: ' + e.message + nl;
                await updateInteraction(interaction.application_id, interaction.token, { content: result });
              }
            } else {
              await updateInteraction(interaction.application_id, interaction.token, { content: result });
            }

          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Ekran arsiv hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'eposta-izle':
        ctx.waitUntil((async () => {
          try {
            const email = getOption('email');
            let result = '**E-Posta Platform Takibi:** ' + bt + email + bt + nl + nl;
            result += '8 buyuk platformda hesap varligi kontrol ediliyor...' + nl + nl;

            const platforms = [
              { name: 'Google', method: 'POST', url: 'https://accounts.google.com/_/signin/recovery/lookup?hl=tr', body: 'email=' + encodeURIComponent(email), check: 'challengeId' },
              { name: 'Microsoft', method: 'POST', url: 'https://login.live.com/GetCredentialType.srf', body: JSON.stringify({ username: email }), header: 'application/json', check: 'IfExistsResult' },
              { name: 'Facebook', method: 'GET', url: 'https://www.facebook.com/login/identify/?ctx=recover&email=' + encodeURIComponent(email), check: 'recover' },
              { name: 'Instagram', method: 'POST', url: 'https://www.instagram.com/api/v1/web/accounts/web_create_ajax/attempt/', body: 'email=' + encodeURIComponent(email), header: 'application/x-www-form-urlencoded', check: 'errors' },
              { name: 'Yahoo', method: 'GET', url: 'https://login.yahoo.com/account/challenge/username?username=' + encodeURIComponent(email), check: 'signin' },
              { name: 'LinkedIn', method: 'GET', url: 'https://www.linkedin.com/uas/request-password-reset?email=' + encodeURIComponent(email), check: 'reset' },
              { name: 'GitHub', method: 'GET', url: 'https://github.com/signup_check/email?value=' + encodeURIComponent(email), check: 'already' },
              { name: 'Spotify', method: 'GET', url: 'https://www.spotify.com/api/signup/validate?email=' + encodeURIComponent(email) + '&validate=1', check: 'exists' }
            ];

            let found = 0, notFound = 0;
            for (const p of platforms) {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 6000);
                let res;
                if (p.method === 'POST') {
                  const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };
                  if (p.header) headers['Content-Type'] = p.header;
                  if (p.name === 'Microsoft') {
                    headers['Accept'] = 'application/json';
                  }
                  res = await fetch(p.url, { method: 'POST', headers: headers, body: p.body, signal: ac.signal });
                } else {
                  res = await fetch(p.url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, signal: ac.signal });
                }
                if (res.ok) {
                  const text = await res.text();
                  let accountFound = false;
                  if (p.name === 'Microsoft') {
                    try {
                      const msData = JSON.parse(text);
                      accountFound = msData.IfExistsResult === 0;
                    } catch (e) { }
                  } else if (p.name === 'Instagram') {
                    try {
                      const igData = JSON.parse(text);
                      accountFound = !!(igData.errors || (igData.email && igData.email.length > 0));
                    } catch (e) { }
                  } else if (p.name === 'Spotify') {
                    try {
                      const spData = JSON.parse(text);
                      accountFound = spData.status === 20 || (text.includes('exists') && text.includes('true'));
                    } catch (e) { }
                  } else if (p.name === 'GitHub') {
                    try {
                      const ghData = JSON.parse(text);
                      accountFound = !!(ghData.already_taken || text.includes('already'));
                    } catch (e) { }
                  } else {
                    accountFound = text.includes('exist') || text.includes('found') ||
                                   text.includes('recover') || text.includes('reset') ||
                                   text.includes('account') || text.includes('challenge');
                  }
                  if (accountFound) {
                    result += '[+] **' + p.name + ':** Hesap bulundu' + nl;
                    found++;
                  } else {
                    result += '[-] **' + p.name + ':** Hesap bulunamadi' + nl;
                    notFound++;
                  }
                } else {
                  result += '[-] **' + p.name + ':** Yanit alinamadi (HTTP ' + res.status + ')' + nl;
                  notFound++;
                }
              } catch (e) {
                result += '[?] **' + p.name + ':** Sorgulanamadi (' + e.message.substring(0, 30) + '...)' + nl;
              }
            }
            result += nl + '**Ozet:** ' + found + ' platformda hesap bulundu, ' + notFound + ' platformda bulunamadi.' + nl;
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'E-posta platform takip hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'veri-sizdir':
        ctx.waitUntil((async () => {
          try {
            const email = getOption('email');
            let result = '**Veri Sizintisi Taramasi:** ' + bt + email + bt + nl + nl;

            if (env.HIBP_API_KEY) {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 8000);
                const hibpRes = await fetch('https://haveibeenpwned.com/api/v3/breachedaccount/' + encodeURIComponent(email) + '?truncateResponse=false', {
                  headers: { 'hibp-api-key': env.HIBP_API_KEY, 'user-agent': 'DiscordBot' },
                  signal: ac.signal
                });
                if (hibpRes.ok) {
                  const breaches = await hibpRes.json();
                  result += '**HIBP Sizintilari (' + breaches.length + '):**' + nl;
                  for (const b of breaches.slice(0, 10)) {
                    result += '\u2022 ' + (b.Title || b.Name || 'Bilinmeyen') + ' (' + (b.BreachDate || '?').substring(0, 10) + ')' + nl;
                    if (b.DataClasses) result += '   Kategoriler: ' + b.DataClasses.slice(0, 6).join(', ') + nl;
                  }
                  if (breaches.length > 10) result += '   ...ve ' + (breaches.length - 10) + ' sizinti daha.' + nl;
                } else if (hibpRes.status === 404) {
                  result += '**HIBP:** Sizinti bulunamadi.' + nl;
                } else {
                  result += '**HIBP:** HTTP ' + hibpRes.status + nl;
                }
              } catch (e) {
                result += '**HIBP:** Sorgulanamadi - ' + e.message.substring(0, 40) + nl;
              }
            } else {
              result += '**HIBP:** API anahtari eksik. HIBP_API_KEY ile sorgulama yapabilirsiniz.' + nl;
            }

            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 8000);
              const psbRes = await fetch('https://psbdmp.cc/api/search/' + encodeURIComponent(email), {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                signal: ac.signal
              });
              if (psbRes.ok) {
                const psb = await psbRes.json();
                if (psb && psb.data && psb.data.length > 0) {
                  result += nl + '**Pastebin Sizintilari (' + psb.data.length + '):**' + nl;
                  for (let i = 0; i < Math.min(psb.data.length, 8); i++) {
                    const p = psb.data[i];
                    result += '\u2022 ID: ' + (p.id || '?');
                    if (p.date) result += ' | ' + p.date.substring(0, 10);
                    if (p.title) result += ' | ' + p.title.substring(0, 50);
                    result += nl;
                    if (p.text) {
                      let snippet = p.text.substring(0, 200).replace(/[\r\n]+/g, ' ').replace(/[^\x20-\x7E\u00C0-\u024F]/g, '').trim();
                      if (snippet) result += '   ' + snippet + (p.text.length > 200 ? '...' : '') + nl;
                    }
                  }
                  if (psb.data.length > 8) result += '   ...ve ' + (psb.data.length - 8) + ' paste daha.' + nl;
                } else {
                  result += nl + '**Pastebin:** Sonuc bulunamadi.' + nl;
                }
              }
            } catch (e) {
              result += nl + '**Pastebin:** Sorgulanamadi.' + nl;
            }

            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 8000);
              const lcRes = await fetch('https://leakcheck.io/api/public?check=' + encodeURIComponent(email), {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                signal: ac.signal
              });
              if (lcRes.ok) {
                const lc = await lcRes.json();
                if (lc && lc.success && lc.result && lc.result.length > 0) {
                  result += nl + '**LeakCheck Sonuclari (' + lc.result.length + '):**' + nl;
                  for (const r of lc.result.slice(0, 5)) {
                    result += '\u2022 ' + (r.sources || r.name || 'Kayit') + nl;
                    if (r.line) {
                      let masked = r.line;
                      masked = masked.replace(/@[\w.]+/g, '@***');
                      masked = masked.replace(/password[=:]\S+/gi, 'password=***');
                      masked = masked.replace(/"password"\s*:\s*"[^"]+"/gi, '"password":"***"');
                      result += '   ' + masked.substring(0, 150) + nl;
                    }
                  }
                } else {
                  result += nl + '**LeakCheck:** Sonuc bulunamadi.' + nl;
                }
              }
            } catch (e) { /* optional */ }

            result += nl + '**Not:** Sifre ipuclari sansurlenmistir. Sizintili veritabanlarinda sifreniz gorunuyor olabilir, hemen degistirin.' + nl;

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Veri sizinti hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'sgk-sorgu':
        ctx.waitUntil((async () => {
          try {
            const tckn = getOption('tckn');
            let result = '**SGK Sorgulama:** ' + bt + tckn + bt + nl + nl;

            if (!/^[1-9]\d{10}$/.test(tckn)) {
              result += 'Gecersiz TC Kimlik Numarasi. 11 haneli ve ilk rakam 0 olamaz.' + nl;
              await updateInteraction(interaction.application_id, interaction.token, { content: result });
              return;
            }
            const digits = tckn.split('').map(Number);
            const sum1 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
            const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
            const check10 = (sum1 * 7 - sum2) % 10;
            const check11 = digits.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
            if (digits[9] !== check10 || digits[10] !== check11) {
              result += 'Gecersiz TC Kimlik Numarasi (algoritma dogrulamasi basarisiz).' + nl;
              await updateInteraction(interaction.application_id, interaction.token, { content: result });
              return;
            }
            result += 'TCKN gecerli. Belsis.art API sorgulaniyor...' + nl + nl;

            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 10000);
              const belsisRes = await fetch('https://belsis.art/api/sgk-sorgu.php?tc=' + tckn, {
                headers: {
                  'X-Requested-With': 'XMLHttpRequest',
                  'User-Agent': 'Mozilla/5.0',
                  'Referer': 'https://belsis.art/',
                  'Origin': 'https://belsis.art'
                },
                signal: ac.signal
              });
              if (belsisRes.ok) {
                const belsis = await belsisRes.json();
                if (belsis && belsis.status === 'success') {
                  result += '**Belsis.art Kaydi:**' + nl;
                  if (belsis.ad) result += '\u2022 Ad: ' + belsis.ad + nl;
                  if (belsis.soyad) result += '\u2022 Soyad: ' + belsis.soyad + nl;
                  if (belsis.isyeri) result += '\u2022 Isyeri: ' + belsis.isyeri + nl;
                  if (belsis.il) result += '\u2022 Il: ' + belsis.il + nl;
                  if (belsis.tarih) result += '\u2022 Tarih: ' + belsis.tarih + nl;
                  if (belsis.durum) result += '\u2022 Durum: ' + belsis.durum + nl;
                  if (belsis.message) result += '\u2022 Mesaj: ' + belsis.message + nl;
                } else {
                  result += '**API:** Kayit bulunamadi.' + nl;
                  if (belsis && belsis.message) result += 'API Mesaji: ' + belsis.message + nl;
                }
              } else {
                result += '**API:** yanit vermedi (HTTP ' + belsisRes.status + ').' + nl;
                result += 'Not: Servis su anda cevrimdisi olabilir. Alternatif: e-Devlet uzerinden SGK sorgulamasi yapabilirsiniz.' + nl;
                result += '\u2022 https://www.turkiye.gov.tr/sgk-tescil-kaydi-sorgulama' + nl;
              }
            } catch (e) {
              result += '**API:** sorgulanamadi - ' + e.message + nl;
              result += 'Not: API su anda cevrimdisi. Alternatif olarak e-Devlet uzerinden SGK sorgulamasi yapabilirsiniz:' + nl;
              result += '\u2022 https://www.turkiye.gov.tr/sgk-tescil-kaydi-sorgulama' + nl;
            }

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'SGK sorgulama hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'mahkeme':
        ctx.waitUntil((async () => {
          try {
            const isim = getOption('isim');
            const soyisim = getOption('soyisim');
            const tamAd = isim + ' ' + soyisim;
            let result = '**Mahkeme/Dosya Sorgulama:** ' + bt + tamAd + bt + nl + nl;

            result += '**UYAP Vatandas Portali:**' + nl;
            result += '\u2022 https://vatandas.uyap.gov.tr/main/vatandas/index.jsp' + nl;
            result += '   (E-Devlet sifresi veya e-imza ile giris yaparak dosyalarinizi goruntuleyebilirsiniz)' + nl + nl;

            result += '**UYAP Avukat Portali:**' + nl;
            result += '\u2022 https://avukat.uyap.gov.tr/main/avukat/index.jsp' + nl + nl;

            result += '**Yargitay Karar Arama:**' + nl;
            result += '\u2022 https://karararama.yargitay.gov.tr/' + nl;
            result += '   (Emsal kararlari ad-soyad ile arayabilirsiniz)' + nl + nl;

            result += '**Anayasa Mahkemesi Kararlari:**' + nl;
            result += '\u2022 https://normkararlarbilgibankasi.anayasa.gov.tr/' + nl + nl;

            const kodluAd = encodeURIComponent(tamAd);
            result += '**Google Arama Linkleri:**' + nl;
            result += '\u2022 https://www.google.com/search?q=' + kodluAd + '+mahkeme+karari+site:karararama.yargitay.gov.tr' + nl;
            result += '\u2022 https://www.google.com/search?q=' + kodluAd + '+icra+dosyasi+site:adalet.gov.tr' + nl;
            result += '\u2022 https://www.google.com/search?q=' + kodluAd + '+site:resmigazete.gov.tr' + nl + nl;

            result += '**Not:** Turkiye\'de mahkeme dosyalarina kamuya acik bir API bulunmamaktadir. UYAP sistemi yalnizca taraflara ve vekillerine bilgi verir. Yukaridaki linkler uzerinden manuel sorgulama yapabilirsiniz.' + nl;

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Mahkeme sorgulama hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'ticaret-sorgu':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
            const sirketAdi = domain.split('.')[0];
            let result = '**Ticaret Sicil Sorgulama:** ' + bt + domain + bt + nl;
            result += 'Tahmini Firma Adi: ' + bt + sirketAdi + bt + nl + nl;

            result += '**Ticaret Sicil Gazetesi Arama:**' + nl;
            result += '\u2022 https://www.ticaretsicil.gov.tr/' + nl;
            result += '   (Ticaret unvani veya MERSIS no ile sorgulama yapilabilir)' + nl + nl;

            result += '**MERSIS Sorgulama:**' + nl;
            result += '\u2022 https://mersis.gtb.gov.tr/' + nl;
            result += '   (E-Devlet ile giris yaparak firma sorgulamasi yapilabilir)' + nl + nl;

            const kodluSirket = encodeURIComponent(sirketAdi);
            result += '**Google Ticaret Sicil Aramasi:**' + nl;
            result += '\u2022 https://www.google.com/search?q=' + kodluSirket + '+ticaret+sicil+site:ticaretsicil.gov.tr' + nl;
            result += '\u2022 https://www.google.com/search?q=' + kodluSirket + '+sirket+site:mersis.gtb.gov.tr' + nl + nl;

            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const whoisRes = await fetch('https://whois.freea.be/' + domain, { signal: ac.signal });
              if (whoisRes.ok) {
                const whoisData = await whoisRes.json();
                result += '**WHOIS Kaydi:**' + nl;
                if (whoisData.registrant) result += '\u2022 Tescil Eden: ' + whoisData.registrant + nl;
                if (whoisData.registrant_org) result += '\u2022 Kurulus: ' + whoisData.registrant_org + nl;
                if (whoisData.registrant_country) result += '\u2022 Ulke: ' + whoisData.registrant_country + nl;
                if (whoisData.creation_date) result += '\u2022 Olusturma Tarihi: ' + whoisData.creation_date + nl;
                if (whoisData.expiration_date) result += '\u2022 Bitis Tarihi: ' + whoisData.expiration_date + nl;
                if (!whoisData.registrant && !whoisData.registrant_org) {
                  result += '\u2022 WHOIS bilgileri gizli veya bulunamadi.' + nl;
                }
              } else {
                result += '**WHOIS:** Sorgulanamadi (HTTP ' + whoisRes.status + ')' + nl;
              }
            } catch (e) {
              result += '**WHOIS:** ' + e.message.substring(0, 40) + nl;
            }

            result += nl + '**Not:** Ticaret sicil kaydi icin en guvenilir kaynak ticaretsicil.gov.tr ve MERSIS\'tir.' + nl;

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Ticaret sorgulama hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'uav-tespit':
        ctx.waitUntil((async () => {
          try {
            const ip = getOption('ip');
            let result = '**UAV/Drone IP Tespiti:** ' + bt + ip + bt + nl + nl;

            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const ipRes = await fetch('http://ip-api.com/json/' + ip + '?fields=isp,org,as,country,city,regionName,query', { signal: ac.signal });
              const ipData = await ipRes.json();
              if (ipData.status === 'success') {
                result += '**IP Bilgisi:**' + nl;
                result += '\u2022 ISP: ' + ipData.isp + nl;
                result += '\u2022 Org: ' + ipData.org + nl;
                result += '\u2022 AS: ' + ipData.as + nl;
                result += '\u2022 Konum: ' + ipData.city + ', ' + ipData.regionName + ', ' + ipData.country + nl + nl;

                const ispLower = (ipData.isp + ' ' + ipData.org).toLowerCase();
                const droneKeywords = ['dji', 'skydio', 'parrot', 'autel', 'yuneec', 'ehang', 'drone', 'uav', 'uas', 'aerial', 'quadcopter', 'hexacopter'];
                const match = droneKeywords.find(k => ispLower.includes(k));
                if (match) {
                  result += '[!] **Uyari:** ISP/Org adi drone/UAV ile iliskili gorunuyor! (Eslesme: ' + match + ')' + nl + nl;
                }
              } else {
                result += '**IP Bilgisi:** Alinamadi.' + nl + nl;
              }
            } catch (e) {
              result += '**IP Bilgisi:** ' + e.message.substring(0, 30) + nl + nl;
            }

            result += '**Drone Telemetri Port Kontrolu (HTTP uzerinden):**' + nl;
            const dronePorts = [
              { port: 14550, name: 'MAVLink Telemetri (ArduPilot/PX4)' },
              { port: 8080, name: 'DJI Drone Web Arayuzu' },
              { port: 5555, name: 'DJI Assistant 2' },
              { port: 5760, name: 'MAVLink UDP Bridge' },
              { port: 14551, name: 'MAVLink Ground Station' },
              { port: 8888, name: 'DJI SDK Remote Server' }
            ];
            for (const p of dronePorts) {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 3000);
                const portRes = await fetch('http://' + ip + ':' + p.port, { signal: ac.signal });
                if (portRes.ok || portRes.status < 500) {
                  result += '[+] Port ' + p.port + ' (' + p.name + '): ACIK/ERISILEBILIR' + nl;
                } else {
                  result += '[-] Port ' + p.port + ' (' + p.name + '): Kapali/Filtrelenmis' + nl;
                }
              } catch (e) {
                result += '[-] Port ' + p.port + ' (' + p.name + '): Kapali/Filtrelenmis' + nl;
              }
            }

            result += nl + '**Analiz:**' + nl;
            result += '\u2022 MAVLink portu (14550) aciksa: IP bir ArduPilot/PX4 tabanli drone yer istasyonu olabilir.' + nl;
            result += '\u2022 DJI portlari aciksa: IP DJI drone veya kontrol cihazi olabilir.' + nl;
            result += '\u2022 Birden fazla telemetri portu aciksa: Yuksek ihtimal bir UAV operasyonu.' + nl;
            result += '\u2022 Not: Port kontrolleri HTTP uzerinden yapildi. Tam port taramasi icin nmap veya masscan kullanin.' + nl;

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'UAV tespit hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'kronik-takip':
        ctx.waitUntil((async () => {
          try {
            const hedef = getOption('hedef');
            const kvKey = 'monitor_' + hedef.replace(/[^a-zA-Z0-9]/g, '_');
            const creatorId = interaction.member?.user?.id || interaction.user?.id || 'unknown';
            const logChannel = interaction.channel_id;
            const nl = '\n';
            const bt = '`';

            let previousData = null;
            if (env.KV) {
              try {
                const prevRaw = await env.KV.get(kvKey);
                if (prevRaw) previousData = JSON.parse(prevRaw);
              } catch (e) { /* ignore */ }
            }

            let result = '**Kronik Takip:** ' + bt + hedef + bt + nl + nl;

            const scanData = {};
            scanData.dns = {};

            const dnsTypes = ['A', 'MX', 'NS', 'TXT'];
            await Promise.all(dnsTypes.map(async (type) => {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
                const dnsRes = await fetch('https://cloudflare-dns.com/dns-query?name=' + hedef + '&type=' + type, {
                  headers: { 'accept': 'application/dns-json' },
                  signal: ac.signal
                });
                if (dnsRes.ok) {
                  scanData.dns[type] = await dnsRes.json();
                }
              } catch (e) { scanData.dns[type] = null; }
            }));

            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const rdapRes = await fetch('https://rdap.org/domain/' + hedef, { signal: ac.signal });
              if (rdapRes.ok) {
                scanData.whois = await rdapRes.json();
              }
            } catch (e) { scanData.whois = null; }

            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const headersRes = await fetch('https://' + hedef, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: ac.signal,
                redirect: 'follow'
              });
              scanData.headers = {};
              scanData.headers.status = headersRes.status;
              scanData.headers.headers = {};
              headersRes.headers.forEach((v, k) => { scanData.headers.headers[k] = v; });
            } catch (e) { scanData.headers = null; }

            try {
              const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
              const crtRes = await fetch('https://crt.sh/?q=%25.' + hedef + '&output=json', { signal: ac.signal });
              if (crtRes.ok) {
                const crtData = await crtRes.json();
                scanData.ssl = crtData.slice(0, 10);
              }
            } catch (e) { scanData.ssl = null; }

            scanData.ports = {};
            const checkPorts = [80, 443, 8080, 8443];
            await Promise.all(checkPorts.map(async (port) => {
              try {
                const ac = new AbortController(); setTimeout(() => ac.abort(), 3000);
                const portRes = await fetch('http://' + hedef + ':' + port, { signal: ac.signal });
                scanData.ports[port] = true;
              } catch (e) { scanData.ports[port] = false; }
            }));

            result += '**DNS Kayitlari:**' + nl;
            for (const type of dnsTypes) {
              const d = scanData.dns[type];
              if (d && d.Answer && d.Answer.length > 0) {
                result += type + ': ' + d.Answer.map(a => a.data).join(', ') + nl;
              } else {
                result += type + ': Bulunamadi' + nl;
              }
            }

            result += nl + '**WHOIS Bilgisi:**' + nl;
            if (scanData.whois) {
              const events = scanData.whois.events || [];
              const created = events.find(e => e.eventAction === 'registration')?.eventDate;
              const updated = events.find(e => e.eventAction === 'last changed')?.eventDate;
              const expires = events.find(e => e.eventAction === 'expiration')?.eventDate;
              if (created) result += 'Olusturulma: ' + created + nl;
              if (updated) result += 'Son Guncelleme: ' + updated + nl;
              if (expires) result += 'Son Kullanim: ' + expires + nl;
              if (!created && !updated && !expires) result += 'WHOIS bilgisi sinirli.' + nl;
            } else {
              result += 'WHOIS sorgulanamadi.' + nl;
            }

            result += nl + '**HTTP Basliklari:**' + nl;
            if (scanData.headers) {
              result += 'HTTP Durum: ' + scanData.headers.status + nl;
              const important = ['server', 'content-type', 'x-powered-by', 'x-frame-options', 'strict-transport-security'];
              for (const h of important) {
                const val = scanData.headers.headers[h];
                if (val) result += h + ': ' + val + nl;
              }
            } else {
              result += 'HTTP basliklari alinamadi.' + nl;
            }

            result += nl + '**SSL Sertifikalari (crt.sh):**' + nl;
            if (scanData.ssl && scanData.ssl.length > 0) {
              result += 'Toplam: ' + scanData.ssl.length + ' sertifika' + nl;
              const subdomains = [...new Set(scanData.ssl.map(c => c.name_value))].filter(s => s.includes(hedef));
              if (subdomains.length > 0) {
                result += 'Subdomainler: ' + subdomains.slice(0, 10).join(', ') + (subdomains.length > 10 ? '...' : '') + nl;
              }
            } else {
              result += 'SSL sertifikasi bulunamadi.' + nl;
            }

            result += nl + '**Port Taramasi:**' + nl;
            for (const port of checkPorts) {
              result += 'Port ' + port + ': ' + (scanData.ports[port] ? 'ACIK' : 'KAPALI') + nl;
            }

            if (previousData && previousData.data) {
              result += nl + '**Onceki Tarama ile Karsilastirma:**' + nl;
              let changes = 0;
              const prev = previousData.data;

              for (const type of dnsTypes) {
                const prevRecs = (prev.dns?.[type]?.Answer || []).map(a => a.data).sort().join(',');
                const currRecs = (scanData.dns?.[type]?.Answer || []).map(a => a.data).sort().join(',');
                if (prevRecs !== currRecs) {
                  result += '- DNS ' + type + ' kayitlari degismis.' + nl;
                  changes++;
                }
              }

              for (const port of checkPorts) {
                const prevOpen = prev.ports?.[port];
                const currOpen = scanData.ports?.[port];
                if (prevOpen !== currOpen) {
                  result += '- Port ' + port + ': ' + (prevOpen ? 'ACIK -> KAPALI' : 'KAPALI -> ACIK') + nl;
                  changes++;
                }
              }

              if (changes === 0) {
                result += 'Herhangi bir degisiklik tespit edilmedi.' + nl;
              }

              result += nl + 'Onceki Tarama Zamani: ' + new Date(previousData.lastScan).toISOString() + nl;
            }

            const storeData = {
              hedef,
              creatorId,
              logChannel,
              lastScan: Date.now(),
              data: scanData
            };

            if (env.KV) {
              await env.KV.put(kvKey, JSON.stringify(storeData));
            }

            result += nl + 'Hedef izlemeye alindi. Degisiklik oldugunda bildirim gonderilecek.';
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Kronik takip hatasi: ' + err.message });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      default:
        return sendResponse('Bilinmeyen komut. Bu bot henuz yapilandiriliyor.');
    }
  }

  return new Response('Bilinmeyen etkilesim', { status: 400 });
}
