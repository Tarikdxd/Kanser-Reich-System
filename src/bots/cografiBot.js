import { updateInteraction, sendResponse, getAttachmentUrl, delay } from '../utils/helpers.js';

export async function handleCografiBot(interaction, request, env, ctx) {
  if (interaction.type === 1) {
    return new Response(JSON.stringify({ type: 1 }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (interaction.type === 2) {
    const { name, options } = interaction.data;
    const getOption = (optName) => options?.find(o => o.name === optName)?.value;

    switch (name) {
      // --- Cografi OSINT komutlari buraya eklenecek ---

      
      case 'exif-derin':
      ctx.waitUntil((async () => {
        try {
          const attachmentId = getOption('fotograf');
          const att = interaction.data.resolved.attachments[attachmentId];
          if (!att || !att.url) throw new Error('Gorsel bulunamadi.');
          const img = await (await fetch(att.url)).arrayBuffer();
          const ai = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', { image: [...new Uint8Array(img)], prompt: 'Bu fotografi analiz et. Cihaz turu? Lokasyon ipucu? Ic/dis mekan? Emoji kullanma.', max_tokens: 300 });
          let result = '**Derin EXIF:**\nDosya: ' + att.filename + '\nBoyut: ' + (att.size / 1024).toFixed(1) + ' KB\n\n' + (ai.response || 'Analiz edilemedi.').slice(0, 1900);
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'EXIF hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    
      case 'fotosint':
      ctx.waitUntil((async () => {
        try {
          const attachmentId = getOption('fotograf');
          const att = interaction.data.resolved.attachments[attachmentId];
          const imgUrl = att.url;
          let serpResult = '';
          if (env.SERPAPI_API_KEY) {
            try { const serp = await (await fetch('https://serpapi.com/search.json?engine=google_lens&url=' + encodeURIComponent(imgUrl) + '&api_key=' + env.SERPAPI_API_KEY)).json(); if (serp.visual_matches) serpResult = 'Google Lens buluntulari var.\n'; } catch (e) {}
          }
          const img = await (await fetch(imgUrl)).arrayBuffer();
          const ai = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', { image: [...new Uint8Array(img)], prompt: 'Bu fotograftaki kisi veya yer kim/neresi? Tahmin et. Emoji kullanma.', max_tokens: 300 });
          await updateInteraction(interaction.application_id, interaction.token, { content: serpResult + 'Yapay Zeka: ' + (ai.response || 'Tahmin yapilamadi.') });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Fotosint hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });


      case 'yer-bul':
      ctx.waitUntil((async () => {
        try {
          const attachmentId = getOption('fotograf');
          const att = interaction.data.resolved.attachments[attachmentId];
          if (!att || !att.url) throw new Error('Gorsel bulunamadi.');
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const img = await (await fetch(att.url, { signal: controller.signal })).arrayBuffer();
          clearTimeout(timeout);
          const ai = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', { image: [...new Uint8Array(img)], prompt: 'Bu fotograftaki yer neresi? Sehir, ulke, mekan ismi, iklim, mimari tarz gibi ipuclari ver. Emoji kullanma.', max_tokens: 300 });
          const result = '**Yer Tespiti:**\n' + (ai.response || 'Tespit edilemedi.').slice(0, 1900);
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Yer bulma hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'yuz-tanima':
      ctx.waitUntil((async () => {
        try {
          const attachmentId = getOption('fotograf');
          const att = interaction.data.resolved.attachments[attachmentId];
          if (!att || !att.url) throw new Error('Gorsel bulunamadi.');
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const img = await (await fetch(att.url, { signal: controller.signal })).arrayBuffer();
          clearTimeout(timeout);
          const ai = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', { image: [...new Uint8Array(img)], prompt: 'Bu fotograftaki kisi/kisiler hakkinda tahmin yap. Cinsiyet, yas araligi, ten rengi, sac rengi, varsa unlu benzerligi. Emoji kullanma.', max_tokens: 300 });
          const result = '**Yuz Tanima:**\n' + (ai.response || 'Yuz tespit edilemedi.').slice(0, 1900);
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Yuz tanima hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'logo-tara':
      ctx.waitUntil((async () => {
        try {
          const attachmentId = getOption('fotograf');
          const att = interaction.data.resolved.attachments[attachmentId];
          if (!att || !att.url) throw new Error('Gorsel bulunamadi.');
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const img = await (await fetch(att.url, { signal: controller.signal })).arrayBuffer();
          clearTimeout(timeout);
          const ai = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', { image: [...new Uint8Array(img)], prompt: 'Bu fotograftaki logoyu tespit et. Hangi marka, sirket veya kurulusa ait? Sektorunu de belirt. Emoji kullanma.', max_tokens: 300 });
          const result = '**Logo Tarama:**\n' + (ai.response || 'Logo tespit edilemedi.').slice(0, 1900);
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Logo tarama hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'harita-karsilastir':
      ctx.waitUntil((async () => {
        try {
          const coord1 = getOption('koordinat1');
          const coord2 = getOption('koordinat2');
          if (!coord1 || !coord2) throw new Error('Iki koordinat da gerekli.');
          const [lat1, lon1] = coord1.split(',').map(Number);
          const [lat2, lon2] = coord2.split(',').map(Number);
          if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) throw new Error('Gecersiz koordinat formati. Orn: 41.0082,28.9784');
          const R = 6371;
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
          const mesafeKm = (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
          const mapsLink1 = `https://www.google.com/maps?q=${lat1},${lon1}`;
          const mapsLink2 = `https://www.google.com/maps?q=${lat2},${lon2}`;
          let result = `**Harita Karsilastirma:**\nNokta 1: \`${lat1},${lon1}\`\nNokta 2: \`${lat2},${lon2}\`\nMesafe: \`${mesafeKm} km\`\n[Harita 1](${mapsLink1}) | [Harita 2](${mapsLink2})`;
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Karsilastirma hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'koordinat-coz':
      ctx.waitUntil((async () => {
        try {
          const coord = getOption('koordinat');
          if (!coord) throw new Error('Koordinat gerekli.');
          const [lat, lon] = coord.split(',').map(Number);
          if (isNaN(lat) || isNaN(lon)) throw new Error('Gecersiz koordinat formati. Orn: 41.0082,28.9784');
          const mapsLink = `https://www.google.com/maps?q=${lat},${lon}`;
          let adres = 'Adres bilgisi alinamadi.';
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const geo = await (await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`, { signal: controller.signal, headers: { 'User-Agent': 'DiscordBot/1.0' } })).json();
            clearTimeout(timeout);
            if (geo.display_name) adres = geo.display_name;
          } catch (e) { adres = 'Reverse geocoding API hatasi.'; }
          const result = `**Koordinat Cozumu:**\`${lat}, ${lon}\`\n\n**Adres:** ${adres}\n[Google Maps](${mapsLink})`;
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Koordinat cozme hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'maps-tara':
      ctx.waitUntil((async () => {
        try {
          const sorgu = getOption('sorgu');
          if (!sorgu) throw new Error('Arama sorgusu gerekli.');
          let sonuc = '';
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const geo = await (await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(sorgu)}&format=json&limit=5&addressdetails=1`, { signal: controller.signal, headers: { 'User-Agent': 'DiscordBot/1.0' } })).json();
            clearTimeout(timeout);
            if (geo.length > 0) {
              sonuc = geo.slice(0, 3).map((r, i) => `${i + 1}. ${r.display_name}\n   [Harita](https://www.google.com/maps?q=${r.lat},${r.lon})`).join('\n');
            } else {
              sonuc = 'Sonuc bulunamadi.';
            }
          } catch (e) { sonuc = 'Arama API hatasi.'; }
          const result = `**Maps Tarama:** "${sorgu}"\n\n${sonuc}`;
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Maps tarama hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'drone-haritasi':
      ctx.waitUntil((async () => {
        try {
          const coord = getOption('koordinat');
          if (!coord) throw new Error('Koordinat gerekli.');
          const [lat, lon] = coord.split(',').map(Number);
          if (isNaN(lat) || isNaN(lon)) throw new Error('Gecersiz koordinat formati. Orn: 41.0082,28.9784');
          const mapsLink = `https://www.google.com/maps?q=${lat},${lon}`;
          const uyduLink = `https://www.google.com/maps?q=${lat},${lon}&z=15&t=k`;
          const droneLink = `https://www.google.com/maps?q=${lat},${lon}&z=18&t=k`;
          let bolgeBilgi = 'Bolge bilgisi alinamadi.';
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const geo = await (await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`, { signal: controller.signal, headers: { 'User-Agent': 'DiscordBot/1.0' } })).json();
            clearTimeout(timeout);
            if (geo.address) {
              const a = geo.address;
              bolgeBilgi = `Ulke: ${a.country || '?'}\nSehir: ${a.city || a.town || a.village || a.county || '?'}\nBolge: ${a.state || '?'}\nPosta Kodu: ${a.postcode || '?'}`;
            }
          } catch (e) { bolgeBilgi = 'Bolge bilgisi alinamadi.'; }
          const result = `**Drone Haritasi:**\`${lat}, ${lon}\`\n\n**Bolge Bilgisi:**\n${bolgeBilgi}\n\n[Standart](${mapsLink}) | [Uydu](${uyduLink}) | [Drone](${droneLink})`;
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Drone haritasi hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'wifi-harita':
      ctx.waitUntil((async () => {
        try {
          const koordinat = getOption('koordinat');
          if (!koordinat) throw new Error('Koordinat gerekli.');
          const [lat, lon] = koordinat.split(',').map(Number);
          if (isNaN(lat) || isNaN(lon)) throw new Error('Gecersiz koordinat formati. Orn: 41.0082,28.9784');
          let result = '**WiFi Haritasi:** `' + lat + ', ' + lon + '`\n\n';
          result += '**Wigle.net:**\n';
          result += 'https://wigle.net/map?lat=' + lat + '&lon=' + lon + '&zoom=15\n\n';
          result += '**Wigle API (direkt sorgu):**\n';
          result += 'https://api.wigle.net/api/v2/network/search?latrange1=' + (lat - 0.005) + '&latrange2=' + (lat + 0.005) + '&longrange1=' + (lon - 0.005) + '&longrange2=' + (lon + 0.005) + '\n\n';
          result += '**OpenWiFiMap:**\n';
          result += 'https://openwifimap.net/#lat=' + lat + '&lon=' + lon + '&zoom=15\n\n';
          result += '**BSSID/SSID Analizi:**\n';
          result += '- BSSID: Access Point MAC adresi - uretici bilgisi (OUI)\n';
          result += '- SSID: Ag ismi - lokasyon, isletme, kisi bilgisi verebilir\n';
          result += '- Sinyal Gucu (RSSI): Mesafe ve engel bilgisi\n';
          result += '- Guvenlik: WPA2/WPA3/WEP -> ag guvenligi hakkinda bilgi\n';
          result += '- Kanal: 2.4GHz vs 5GHz -> router tipi ve yasi\n';
          result += '- Ilk Gorulme/Son Gorulme: Agin ne zamandir aktif oldugu\n\n';
          result += '> Wigle.net kullanici tarafindan toplanan WiFi verilerini haritalar.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'WiFi harita hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'kule-ucgenle':
      ctx.waitUntil((async () => {
        try {
          const cellid = getOption('cellid');
          const lac = getOption('lac');
          const mcc = getOption('mcc');
          const mnc = getOption('mnc');
          if (!cellid || !lac || !mcc || !mnc) throw new Error('cellid, lac, mcc, mnc parametreleri gerekli.');
          let result = '**GSM Kule Ucgenlemesi**\n\n';
          result += 'Cell ID: ' + cellid + '\n';
          result += 'LAC: ' + lac + '\n';
          result += 'MCC: ' + mcc + ' (Mobil Ulke Kodu)\n';
          result += 'MNC: ' + mnc + ' (Mobil Ag Kodu)\n\n';
          result += '**OpenCellID API:**\n';
          result += 'https://opencellid.org/cell/get?key=API_KEY&mcc=' + mcc + '&mnc=' + mnc + '&lac=' + lac + '&cellid=' + cellid + '\n\n';
          result += '**UnwiredLabs API:**\n';
          result += 'https://unwiredlabs.com/v2/process.php -> POST {"token":"API_KEY","mcc":' + mcc + ',"mnc":' + mnc + ',"cells":[{"lac":' + lac + ',"cid":' + cellid + '}],"address":1}\n\n';
          result += '**Mozilla Location Service (MLS):**\n';
          result += 'https://location.services.mozilla.com/v1/geolocate?key=API_KEY\n\n';
          result += '**Manuel Sorgu Linkleri:**\n';
          result += '- OpenCellID: https://opencellid.org/#map\n';
          result += '- CellMapper: https://www.cellmapper.net/\n';
          result += '- Anten Haritasi: https://www.antennasearch.com/\n\n';
          result += '**Teknik Aciklama:**\n';
          result += '- MCC (Mobile Country Code): Ulke kodu (TR=286)\n';
          result += '- MNC (Mobile Network Code): Operator kodu\n';
          result += '- LAC (Location Area Code): Bolge kodu (1-65535)\n';
          result += '- Cell ID: Baz istasyonu kimligi\n';
          result += '- Bu 4 deger birlikte baz istasyonunun fiziksel konumunu verir\n';
          result += '- Birden fazla kule ile ucgenleme yapilarak cihaz konumu ~50-500m hassasiyetle belirlenir';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Kule ucgenleme hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'uydu-canli':
      ctx.waitUntil((async () => {
        try {
          const koordinat = getOption('koordinat');
          if (!koordinat) throw new Error('Koordinat gerekli.');
          const [lat, lon] = koordinat.split(',').map(Number);
          if (isNaN(lat) || isNaN(lon)) throw new Error('Gecersiz koordinat formati. Orn: 41.0082,28.9784');
          let result = '**Canli Uydu Goruntusu:** `' + lat + ', ' + lon + '`\n\n';
          result += '**Sentinel Hub EO Browser:**\n';
          result += 'https://apps.sentinel-hub.com/eo-browser/?lat=' + lat + '&lng=' + lon + '&zoom=14\n\n';
          result += '**NASA Worldview:**\n';
          result += 'https://worldview.earthdata.nasa.gov/?l=Reference_Labels,Reference_Features(hidden),Coastlines&t=' + new Date().toISOString().split('T')[0] + '&v=' + lon + ',' + lat + ',' + (lon + 2) + ',' + (lat + 2) + '\n\n';
          result += '**Google Earth Engine:**\n';
          result += 'https://earthengine.google.com/timelapse/#v=' + lat + ',' + lon + ',10\n\n';
          result += '**Copernicus Browser:**\n';
          result += 'https://browser.dataspace.copernicus.eu/?lat=' + lat + '&lng=' + lon + '&zoom=14\n\n';
          result += '**Son Gecis Tahmini (uydu tahmin araclari):**\n';
          result += '- SatFlare: https://satflare.com/track.asp\n';
          result += '- N2YO: https://www.n2yo.com/\n';
          result += '- Heavens Above: https://www.heavens-above.com/\n';
          result += '- Find Satellites: https://www.findsatellites.com/\n\n';
          result += '**Sentinel-2 Gecis Sikligi:**\n';
          result += 'Her 5 gunde bir ayni bolgeyi goruntuler.\n';
          result += 'Son gecisler icin Copernicus Data Space API kullanilabilir:\n';
          result += 'https://catalogue.dataspace.copernicus.eu/resto/api/collections/Sentinel2/search.json?box=' + (lon - 0.1) + ',' + (lat - 0.1) + ',' + (lon + 0.1) + ',' + (lat + 0.1) + '&maxRecords=5\n\n';
          result += '**Landsat 8/9:** Her 16 gunde bir (8 gun offset ile).';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Uydu canli hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'termal-harita':
      ctx.waitUntil((async () => {
        try {
          const koordinat = getOption('koordinat');
          if (!koordinat) throw new Error('Koordinat gerekli.');
          const [lat, lon] = koordinat.split(',').map(Number);
          if (isNaN(lat) || isNaN(lon)) throw new Error('Gecersiz koordinat formati. Orn: 41.0082,28.9784');
          let result = '**Termal/Kizilotesi Harita:** `' + lat + ', ' + lon + '`\n\n';
          result += '**NASA FIRMS (Yangin Tespiti - MODIS/VIIRS):**\n';
          result += 'https://firms.modaps.eosdis.nasa.gov/map/#t:adv;d:' + new Date().toISOString().split('T')[0] + ';@' + lon + ',' + lat + ',10z\n\n';
          result += '**Landsat Termal Bant (Band 10/11 - TIRS):**\n';
          result += 'https://earthexplorer.usgs.gov/ -> Landsat 8-9 Collection 2 Level-2\n';
          result += 'Termal bantlar: Band 10 (10.6-11.19 um), Band 11 (11.5-12.51 um)\n';
          result += 'Yer yuzey sicakligi (LST): 100m cozunurluk\n\n';
          result += '**MODIS Land Surface Temperature (MOD11):**\n';
          result += 'https://modis.gsfc.nasa.gov/data/dataprod/mod11.php\n';
          result += 'Gunluk/8gunluk kompozit, 1km cozunurluk\n\n';
          result += '**ECOSTRESS (ISS):**\n';
          result += 'https://ecostress.jpl.nasa.gov/\n';
          result += '70m cozunurluk, gunun farkli saatlerinde\n\n';
          result += '**Termal Analiz Gozetim Amacli Kullanimi:**\n';
          result += '- Gece goruntu: Isi farki ile bina/arac/insan tespiti\n';
          result += '- Endustriyel aktivite: Fabrika isi emisyonu\n';
          result += '- Isi adasi: Kentsel bolgelerde sicaklik anomalisi\n';
          result += '- Yeralti yapilari: Isi sizintisi ile tespit\n';
          result += '- Askeri tesisler: Isi imzasi ile aktivite analizi\n\n';
          result += '> Landsat termal bantlari ile 100m cozunurlukte yuzey sicakligi olculebilir.';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Termal harita hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'sel-baskin':
      ctx.waitUntil((async () => {
        try {
          const koordinat = getOption('koordinat');
          if (!koordinat) throw new Error('Koordinat gerekli.');
          const [lat, lon] = koordinat.split(',').map(Number);
          if (isNaN(lat) || isNaN(lon)) throw new Error('Gecersiz koordinat formati. Orn: 41.0082,28.9784');
          let result = '**Sel/Baskin Risk Analizi:** `' + lat + ', ' + lon + '`\n\n';
          let elevation = 'Bilinmiyor';
          try {
            const c = new AbortController(); setTimeout(() => c.abort(), 5000);
            const geo = await (await fetch('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lon + '&format=json&addressdetails=1', { signal: c.signal, headers: { 'User-Agent': 'DiscordBot/1.0' } })).json();
            if (geo.address) {
              const a = geo.address;
              result += '**Konum:** ' + (a.road || '') + ' ' + (a.suburb || '') + ' ' + (a.city || a.town || a.village || '') + ', ' + (a.country || '') + '\n';
            }
          } catch (e) {}
          try {
            const c2 = new AbortController(); setTimeout(() => c2.abort(), 5000);
            const elv = await (await fetch('https://api.open-elevation.com/api/v1/lookup?locations=' + lat + ',' + lon, { signal: c2.signal })).json();
            if (elv.results && elv.results[0]) {
              elevation = elv.results[0].elevation.toFixed(1) + ' metre';
            }
          } catch (e) {}
          result += '**Yukseklik:** ' + elevation + '\n\n';
          result += '**Yakin Su Kaynaklari (Overpass API):**\n';
          result += 'https://overpass-api.de/api/interpreter?data=[out:json];(way["waterway"](around:5000,' + lat + ',' + lon + ');way["natural"="water"](around:5000,' + lat + ',' + lon + ');way["water"](around:5000,' + lat + ',' + lon + '););out;%3E;\n\n';
          result += '**Sel Riski Harita Linkleri:**\n';
          result += '- Global Flood Database: https://global-flood-database.cloudtostreet.ai/\n';
          result += '- JRC Floods Portal: https://emergency.copernicus.eu/mapping/list-of-components/EMSR\n';
          result += '- Copernicus EMS: https://emergency.copernicus.eu/\n';
          result += '- FEMA Flood Map (ABD): https://msc.fema.gov/portal/home\n';
          result += '- FloodMap Pro: https://www.floodmap.net/\n';
          result += '- OpenFloodRiskMap: https://www.openstreetmap.org/ -> katman: water\n\n';
          result += '**Risk Faktorleri:**\n';
          result += '- Yukseklik: ' + elevation + ' (Alcak bolgeler daha riskli)\n';
          result += '- Nehir/Dere yakinligi: Overpass API ile kontrol edin\n';
          result += '- Yagis verisi: https://openweathermap.org/weathermap\n';
          result += '- Toprak tipi: Kil/gecirimsiz zemin sel riskini artirir\n';
          result += '- Kentsel alan: Asfalt/beton su gecirmezligi artirir';
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Sel baskin hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'deepfake-kontrol':
      ctx.waitUntil((async () => {
        try {
          const imgUrl = getAttachmentUrl(interaction, 'fotograf');
          if (!imgUrl) throw new Error('Fotograf bulunamadi.');
          const img = await (await fetch(imgUrl)).arrayBuffer();
          const prompt = 'Bu fotograftaki yuzun deepfake veya AI uretimi olup olmadigini analiz et. Su kriterlere bak: goz bebekleri yuvarlak mi, isik yansimasi tutarli mi, sac telleri dogal mi, kulak hatlari simetrik mi, arka plan bulanikligi dogal mi, cene ve elmacik kemikleri orantili mi, disler dogal mi, goz kirpma izi var mi. 5 uzerinden deepfake olasilik puani ver.';
          let aiResult = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const ai = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', { image: [...new Uint8Array(img)], prompt: prompt, max_tokens: 500 });
              aiResult = ai.response;
              break;
            } catch (e) {
              if (String(e).includes('3043') || (e.message && e.message.includes('3043'))) {
                if (attempt < 2) await delay(3000);
              } else {
                throw e;
              }
            }
          }
          if (!aiResult) throw new Error('AI model 3 denemeye ragmen yanit vermedi (3043).');
          let result = '**Deepfake Kontrol:**\n' + aiResult.slice(0, 1900);
          await updateInteraction(interaction.application_id, interaction.token, { content: result });
        } catch (err) { await updateInteraction(interaction.application_id, interaction.token, { content: 'Deepfake kontrol hatasi: ' + err.message }); }
      })());
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    default:
        return sendResponse('Bilinmeyen komut. Bu bot henuz yapilandiriliyor.');
    }
  }

  return new Response('Bilinmeyen etkilesim', { status: 400 });
}
