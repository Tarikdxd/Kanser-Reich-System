export const CONFIG = {
  ALLOWED_ROLE_ID: "1515512301807992882",
  MENTION_ROLE_ID: "1515541382905987152",
  NEWS_CHANNEL_ID: "1515541797512675478",
  REACTIONS: [
    "sa:1515918590073634969",
    "as:1515918588719136798",
    "white:1515918587288748052",
    "hear:1515918585443123354",
    "dil:1515918583845224538"
  ]
};

export const delay = ms => new Promise(res => setTimeout(res, ms));

export function clearTurkishChars(str) {
  if (!str) return '';
  const mapping = {
    'İ': 'I', 'ı': 'i', 'Ş': 'S', 'ş': 's', 'Ğ': 'G', 'ğ': 'g',
    'Ç': 'C', 'ç': 'c', 'Ö': 'O', 'ö': 'o', 'Ü': 'U', 'ü': 'u'
  };
  return str.replace(/[İıŞşĞğÇçÖöÜü]/g, match => mapping[match]);
}

export function hexToBuf(hex) {
  if (!hex) return new Uint8Array();
  const numBytes = hex.length / 2;
  const buf = new Uint8Array(numBytes);
  for (let i = 0; i < numBytes; i++) {
    buf[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return buf;
}

// --- SAGLAM FETCH YARDIMCISI ---
export async function safeFetch(url, opts = {}, timeoutMs = 8000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ac.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') throw new Error('Istek zamani asimi (' + timeoutMs / 1000 + 's)');
    throw e;
  }
}

export async function safeJSON(response, fallback = null) {
  try {
    return await response.json();
  } catch (e) {
    return fallback;
  }
}

export function truncate(text, limit = 1950) {
  if (!text) return '';
  if (text.length <= limit) return text;
  return text.slice(0, limit) + '\n\n[Veriler kirpildi]';
}

// --- INPUT DOGRULAMA ---
export function validateTCKN(tckn) {
  if (!tckn || !/^\d{11}$/.test(tckn)) return false;
  const digits = tckn.split('').map(Number);
  if (digits[0] === 0) return false;
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const check10 = (oddSum * 7 - evenSum) % 10;
  if (check10 !== digits[9]) return false;
  const check11 = (digits.slice(0, 10).reduce((a, b) => a + b, 0)) % 10;
  if (check11 !== digits[10]) return false;
  return true;
}

export function validateGSM(gsm) {
  return gsm && /^5\d{9}$/.test(gsm);
}

export function validateNumeric(str) {
  return str && /^\d+$/.test(str);
}

export function validateEmail(email) {
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateURL(str) {
  if (!str) return false;
  try {
    const u = new URL(str.startsWith('http') ? str : 'https://' + str);
    return u.hostname.includes('.');
  } catch {
    return false;
  }
}

// --- DISCORD YARDIMCILARI ---
export async function updateInteraction(appId, token, payload, isFormData = false) {
  try {
    const options = { method: 'PATCH', body: payload };
    if (!isFormData) {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(payload);
    }
    await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, options);
  } catch (e) {
    console.error('updateInteraction failed:', e.message);
  }
}

export function sendResponse(content, ephemeral = false) {
  const safeContent = truncate(content, 1900);
  const payload = { type: 4, data: { content: safeContent } };
  if (ephemeral) payload.data.flags = 64;
  return new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } });
}

export async function sendDM(userId, content, botToken, asFile = false, filename = 'sonuc.txt') {
  if (!userId || !botToken) return false;
  try {
    const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: { 'Authorization': `Bot ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_id: userId })
    });
    if (!dmRes.ok) return false;
    const dmChannel = await dmRes.json();

    if (asFile) {
      const formData = new FormData();
      formData.append('payload_json', JSON.stringify({ content: 'Sorgu sonucu asagidaki dosyada:' }));
      const safeFilename = (filename || 'sonuc.txt').replace(/[^a-zA-Z0-9._-]/g, '_');
      formData.append('files[0]', new Blob([content], { type: 'text/plain; charset=utf-8' }), safeFilename);
      await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bot ${botToken}` },
        body: formData
      });
    } else {
      const safeContent = truncate(content, 1900);
      await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: safeContent })
      });
    }
    return true;
  } catch (e) {
    console.error('sendDM failed:', e.message);
    return false;
  }
}

export function getUserId(interaction) {
  return interaction?.member?.user?.id || interaction?.user?.id || null;
}

export function getAttachmentUrl(interaction, optName) {
  const id = interaction?.data?.options?.find(o => o.name === optName)?.value;
  if (!id) return null;
  return interaction?.data?.resolved?.attachments?.[id]?.url || null;
}

export async function verifyDiscordSignature(request, publicKey) {
  const signature = request.headers.get('X-Signature-Ed25519');
  const timestamp = request.headers.get('X-Signature-Timestamp');
  if (!signature || !timestamp || !publicKey) return false;

  try {
    const body = await request.clone().text();
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', hexToBuf(publicKey), { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify('Ed25519', key, hexToBuf(signature), enc.encode(timestamp + body));
  } catch {
    return false;
  }
}

// --- KATEGORI SONUC YARDIMCISI ---
export function formatResult(title, fields) {
  let text = `**${title}**\n`;
  for (const [label, value] of Object.entries(fields)) {
    text += `**${label}:** ${value || '-'}\n`;
  }
  return text;
}
