import { updateInteraction, sendResponse } from '../utils/helpers.js';

export async function handleDerinWebBot(interaction, request, env, ctx) {
  if (interaction.type === 1) {
    return new Response(JSON.stringify({ type: 1 }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (interaction.type === 2) {
    const { name, options } = interaction.data;
    const getOption = (optName) => options?.find(o => o.name === optName)?.value;

    switch (name) {
      case 'tor-sorgu':
      ctx.waitUntil((async () => {
        try {
          const onion = getOption('onion');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          let ahmiaMsg = '';
          try {
            const res = await fetch('https://ahmia.fi/onion/' + encodeURIComponent(onion.replace(/^https?:\/\//, '')), { signal: controller.signal });
            if (res.ok) ahmiaMsg = '\nBu .onion adresi Ahmia indeksinde kayitli.';
            else ahmiaMsg = '\nBu .onion adresi Ahmia indeksinde bulunamadi (veya erisilemiyor).';
          } catch { ahmiaMsg = '\nAhmia sorgulanamadi.'; }
          clearTimeout(timeoutId);
          const clean = onion.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
          const result = '**Tor .onion Sorgusu:** ' + clean + '\n\n' +
            'Bir .onion adresi Tor aginda barindirilan ve yalnizca Tor Browser ile erisilebilen bir alan adidir.\n' +
            'Bu bot dogrudan Tor agina baglanamaz. Asagidaki bilgiler acik kaynaklardan alinmistir:\n' +
            '- Adres: `' + clean + '`\n' +
            '- Uzunluk: ' + clean.length + ' karakter (onion v3: 56 karakter, onion v2: 16 karakter - kullanimdan kaldirildi)\n' +
            '- V3 onion adresleri 56 karakter + .onion uzantisindan olusur\n' +
            ahmiaMsg;
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Tor sorgu hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'tor-istatistik':
      ctx.waitUntil((async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const [detailsRes, bwRes] = await Promise.all([
            fetch('https://onionoo.torproject.org/details?limit=1&running=true', { signal: controller.signal }),
            fetch('https://onionoo.torproject.org/bandwidth?limit=1', { signal: controller.signal })
          ]);
          clearTimeout(timeoutId);
          if (!detailsRes.ok || !bwRes.ok) throw new Error('Tor Metrics servisine erisilemedi.');
          const details = await detailsRes.json();
          const bw = await bwRes.json();
          const totalRelays = (details.relays_truncated || 0) + (details.relays || []).length;
          const totalBridges = (details.bridges_truncated || 0) + (details.bridges || []).length;
          const bwTotal = (bw.relays || []).reduce((sum, r) => sum + (r.observed_bandwidth || 0), 0);
          const bwMb = Math.round(bwTotal / (1024 * 1024));
          const result = '**Tor Agi Istatistikleri**\n\n' +
            '\u2022 Aktif Relay Sayisi: ~' + totalRelays.toLocaleString('tr-TR') + '\n' +
            '\u2022 Bridge Sayisi: ~' + totalBridges.toLocaleString('tr-TR') + '\n' +
            '\u2022 Toplam Bant Genisligi: ~' + bwMb.toLocaleString('tr-TR') + ' MB/s\n' +
            '\u2022 Tarih: ' + new Date().toLocaleDateString('tr-TR') + '\n\n' +
            '_Veri kaynagi: Tor Metrics Onionoo API_';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Tor istatistik hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'i2p-tara':
      ctx.waitUntil((async () => {
        try {
          const hedef = getOption('hedef');
          const isB32 = /^[a-z2-7]{52}\.b32\.i2p$/i.test(hedef);
          const result = '**I2P Agi Taramasi:** ' + hedef + '\n\n' +
            'I2P (Invisible Internet Project), Tor\'a alternatif bir anonim agdir.\n' +
            '- Adres: `' + hedef + '`\n' +
            '- Gecerli b32 adres: ' + (isB32 ? 'Evet' : 'Hayir (I2P adresleri 52 karakter + .b32.i2p formatindadir)' ) + '\n' +
            '- I2P eepsitelerine yalnizca I2P yazilimi uzerinden erisilebilir\n' +
            '- Bu bot dogrudan I2P agina baglanamaz\n\n' +
            '_Not: I2P agi Tor\'dan farkli olarak eepSite (web), I2PSnark (torrent), ve I2P-Messenger (mesajlasma) gibi hizmetler sunar._';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'I2P tarama hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'breach-forum':
      ctx.waitUntil((async () => {
        try {
          const kelime = getOption('kelime');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const res = await fetch('https://2.intelx.io/phonebook/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ term: kelime, maxresults: 5, media: 0, target: 0, timeout: 5 }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          let result = '**Breach Forum / Sizinti Aramasi:** ' + kelime + '\n\n';
          if (res.ok) {
            const data = await res.json();
            const ids = data.id || [];
            if (ids.length === 0) result += 'Herhangi bir sizinti kaydi bulunamadi.';
            else {
              result += ids.length + ' adet sizinti kaydi bulundu (detayli inceleme icin IntelX web arayuzu kullanin):\n';
              ids.slice(0, 5).forEach((id, i) => {
                result += '\u2022 [' + (i + 1) + '] Kayit ID: `' + id + '`\n';
              });
            }
          } else {
            result += 'IntelX servisine erisilemedi. Onerme: Sizinti sorgulari icin https://intelx.io adresini kullanabilirsiniz.\n' +
              'Alternatif: https://haveibeenpwned.com veya https://psbdmp.cc';
          }
          result += '\n\n_Veri kaynagi: IntelX Phonebook_';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Breach forum hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'ransom-not':
      ctx.waitUntil((async () => {
        try {
          const hedef = getOption('hedef');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          let result = '**Ransomware Notu Aramasi:** ' + hedef + '\n\n';
          try {
            const res = await fetch('https://ransomware.live/api/recent/victims', { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
              const victims = await res.json();
              const lowerHedef = hedef.toLowerCase();
              const matches = (Array.isArray(victims) ? victims : []).filter(v =>
                (v.name || '').toLowerCase().includes(lowerHedef) ||
                (v.domain || '').toLowerCase().includes(lowerHedef) ||
                (v.industry || '').toLowerCase().includes(lowerHedef)
              );
              if (matches.length === 0) {
                result += 'Hedef ile eslesen fidye yazilimi kurbani bulunamadi.\n' +
                  '(Not: ransomware.live veritabani yalnizca yayinlanmis sizintilari icerir.)';
              } else {
                result += 'DIKKAT! ' + matches.length + ' adet eslesen kayit bulundu:\n';
                matches.slice(0, 5).forEach(v => {
                  result += '\u2022 **' + (v.name || 'Bilinmiyor') + '** - ' +
                    (v.domain || 'Domain yok') + ' [' + (v.post_date || v.discovered || 'Tarih yok') + ']\n';
                });
              }
            } else {
              result += 'ransomware.live servisine erisilemedi. Fidye yazilimi gruplari hakkinda bilgi icin:\n' +
                '- https://ransomware.live\n- https://ransomwatch.telemetry.ltd';
            }
          } catch {
            clearTimeout(timeoutId);
            result += 'ransomware.live servisine erisilemedi. Fidye yazilimi gruplari hakkinda bilgi icin:\n' +
              '- https://ransomware.live\n- https://ransomwatch.telemetry.ltd';
          }
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Ransomware hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'deep-web-scan':
      ctx.waitUntil((async () => {
        try {
          const kelime = getOption('kelime');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const res = await fetch('https://ahmia.fi/search/json/?q=' + encodeURIComponent(kelime), { signal: controller.signal });
          clearTimeout(timeoutId);
          let result = '**Derin Web Taramasi:** ' + kelime + '\n\n';
          if (res.ok) {
            const data = await res.json();
            const results = data.results || [];
            if (results.length > 0) {
              result += '**Ahmia (.onion) Sonuclari:** ' + results.length + ' kayit\n';
              results.slice(0, 5).forEach((r, i) => {
                result += '\u2022 ' + (r.title || 'Basliksiz') + ': ' + (r.url || '') + '\n';
              });
            } else {
              result += '**Ahmia (.onion):** Bu kelime .onion sitelerinde bulunamadi.\n';
            }
          } else {
            result += '**Ahmia (.onion):** Servise erisilemedi.\n';
          }
          result += '\n**Yuzey Web Kaynaklari:**\n' +
            '\u2022 Google: https://www.google.com/search?q=' + encodeURIComponent(kelime + ' deep web dark web') + '\n' +
            '\u2022 DuckDuckGo: https://lite.duckduckgo.com/lite?q=' + encodeURIComponent(kelime + ' darkweb') + '\n' +
            '\u2022 Ahmia (onion tarama): https://ahmia.fi/search/?q=' + encodeURIComponent(kelime) + '\n\n' +
            '_Uyari: Bu tarama yalnizca acik kaynak ve indekslenmis verileri icerir. Gercek derin web / dark web iceriklerine erisim icin ozel yazilimlar gerekir._';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Deep web tarama hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'darkweb-gelismis':
      ctx.waitUntil((async () => {
        try {
          const kelime = getOption('kelime');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          let result = '**Gelismis Dark Web Taramasi:** ' + kelime + '\n\n';
          let ahmiaCount = 0;
          let ahmiaResults = [];
          try {
            const res = await fetch('https://ahmia.fi/search/json/?q=' + encodeURIComponent(kelime), { signal: controller.signal });
            if (res.ok) {
              const data = await res.json();
              ahmiaResults = data.results || [];
              ahmiaCount = ahmiaResults.length;
            }
          } catch { /* ahmia hatasiz gec */ }
          result += '**1. Ahmia (.onion) Taramasi:**\n';
          if (ahmiaCount > 0) {
            result += ahmiaCount + ' adet .onion sitesi bulundu:\n';
            ahmiaResults.slice(0, 3).forEach(r => {
              result += '\u2022 **' + (r.title || 'Basliksiz') + '**\n  ' + (r.url || '') + '\n';
            });
            if (ahmiaCount > 3) result += '  +' + (ahmiaCount - 3) + ' daha...\n';
          } else {
            result += 'Bu kelime .onion sitelerinde bulunamadi.\n';
          }
          let intelxIds = [];
          try {
            const intelxRes = await fetch('https://2.intelx.io/phonebook/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ term: kelime, maxresults: 5, media: 0, target: 0, timeout: 5 }),
              signal: controller.signal
            });
            if (intelxRes.ok) {
              const intelxData = await intelxRes.json();
              intelxIds = intelxData.id || [];
            }
          } catch { /* intelx hatasiz gec */ }
          clearTimeout(timeoutId);
          result += '\n**2. IntelX Sizinti Veritabani:**\n';
          if (intelxIds.length > 0) {
            result += intelxIds.length + ' adet sizinti kaydi tespit edildi (detay: https://intelx.io).\n';
          } else {
            result += 'Sizinti veritabaninda kayit bulunamadi veya servis erisilemez.\n';
          }
          result += '\n**3. Analiz Ozeti:**\n' +
            '\u2022 .onion sonucu: ' + ahmiaCount + ' adet\n' +
            '\u2022 Sizinti kaydi: ' + intelxIds.length + ' adet\n' +
            '\u2022 Aranan: ' + kelime + '\n' +
            '\u2022 Zaman: ' + new Date().toLocaleString('tr-TR') + '\n\n' +
            '_Uyari: Bu tarama yalnizca kamuya acik veri kaynaklarini kullanir._';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Gelismis tarama hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'darkweb-arama':
      ctx.waitUntil((async () => {
        try {
          const kelime = getOption('kelime');
          const res = await fetch('https://ahmia.fi/search/json/?q=' + encodeURIComponent(kelime));
          if (!res.ok) throw new Error('Darkweb servisine erisilemedi.');
          const data = await res.json();
          const results = data.results || [];
          let result = '**Darkweb Aramasi:** ' + kelime + '\n\n';
          if (results.length === 0) result += 'Bu kelime .onion sitelerinde bulunamadi.';
          else result += 'DIKKAT! ' + results.length + ' kayit bulundu.\n' + results.slice(0, 5).map(r => '\u2022 ' + r.title + ': ' + r.url).join('\n');
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Darkweb hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    default:
        return sendResponse('Bilinmeyen komut. Bu bot henuz yapilandiriliyor.');
    }
  }

  return new Response('Bilinmeyen etkilesim', { status: 400 });
}
