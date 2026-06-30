export async function initDB(env) {
  if (!env.DB) return;
  try {
    await env.DB.exec(`CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    await env.DB.exec(`CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, username TEXT NOT NULL DEFAULT '',
      command TEXT NOT NULL, options TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'success',
      duration_ms INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    await env.DB.exec(`CREATE TABLE IF NOT EXISTS cron_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, target TEXT NOT NULL, type TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    await env.DB.exec(`CREATE TABLE IF NOT EXISTS sent_emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT, recipient TEXT NOT NULL, subject TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'sent', created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
  } catch (e) {
    console.error('DB init failed:', e.message);
  }
}

export async function query(env, sql, ...params) {
  if (!env.DB) return null;
  try {
    const stmt = env.DB.prepare(sql);
    if (params.length > 0) stmt.bind(...params);
    return await stmt.all();
  } catch (e) {
    console.error('DB query failed:', e.message);
    return null;
  }
}

export async function execute(env, sql, ...params) {
  if (!env.DB) return null;
  try {
    const stmt = env.DB.prepare(sql);
    if (params.length > 0) stmt.bind(...params);
    return await stmt.run();
  } catch (e) {
    console.error('DB execute failed:', e.message);
    return null;
  }
}

export async function get(env, sql, ...params) {
  if (!env.DB) return null;
  try {
    const stmt = env.DB.prepare(sql);
    if (params.length > 0) stmt.bind(...params);
    return await stmt.first();
  } catch (e) {
    console.error('DB get failed:', e.message);
    return null;
  }
}
