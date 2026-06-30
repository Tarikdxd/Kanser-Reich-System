const DEFAULTS = {
  ALLOWED_ROLE_ID: '1515512301807992882',
  KANSER_SORGU_ROLE_ID: '1520534751646191747',
  MENTION_ROLE_ID: '1515541382905987152',
  NEWS_CHANNEL_ID: '1515541797512675478',
  LOG_CHANNEL_ID: '1520713624300290068',
  LOG_ENABLED: 'true',
  CRON_ENABLED: 'false'
};

const CACHE = {};

export async function getConfig(env, key) {
  if (CACHE[key]) return CACHE[key];
  try {
    const val = await env.KV.get(`config_${key}`);
    if (val !== null) {
      CACHE[key] = val;
      return val;
    }
  } catch (e) {}
  return DEFAULTS[key] || null;
}

export async function setConfig(env, key, value) {
  try {
    await env.KV.put(`config_${key}`, String(value));
    CACHE[key] = String(value);
    return true;
  } catch (e) {
    console.error('setConfig failed:', e.message);
    return false;
  }
}

export async function getAllConfig(env) {
  const result = {};
  for (const key of Object.keys(DEFAULTS)) {
    result[key] = await getConfig(env, key);
  }
  if (env.DB) {
    try {
      const rows = await env.DB.prepare('SELECT key, value FROM config').all();
      for (const row of rows.results || []) {
        result[row.key] = row.value;
      }
    } catch (e) {}
  }
  return result;
}

export function getDefault(key) {
  return DEFAULTS[key] || null;
}

export function clearCache() {
  Object.keys(CACHE).forEach(k => delete CACHE[k]);
}
