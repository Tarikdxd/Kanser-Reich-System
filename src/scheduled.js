import { safeFetch } from './utils/helpers.js';
import { getConfig } from './utils/config.js';

export async function handleScheduled(event, env, ctx) {
  const enabled = await getConfig(env, 'CRON_ENABLED');
  if (enabled !== 'true') return;

  const startTime = Date.now();
  let logLines = [`[Kronik Tarama] ${new Date().toISOString()}`, ''];

  // Ornek: Domainleri kontrol et
  try {
    if (env.DB) {
      const tasks = await env.DB.prepare('SELECT target, type FROM cron_tasks').all();
      for (const task of tasks.results || []) {
        if (task.type === 'domain') {
          try {
            const res = await safeFetch(`https://${task.target}`, { method: 'HEAD' }, 10000);
            logLines.push(`✓ ${task.target} -> HTTP ${res.status}`);
          } catch (e) {
            logLines.push(`✗ ${task.target} -> Erisilemez (${e.message.slice(0, 50)})`);
          }
        }
      }
    }
  } catch (e) {
    logLines.push(`Tarama hatasi: ${e.message}`);
  }

  logLines.push('', `Süre: ${Date.now() - startTime}ms`);

  // Log kanalina gonder
  try {
    const channelId = await getConfig(env, 'LOG_CHANNEL_ID');
    if (channelId) {
      const token = env.DISCORD_TOKEN;
      if (token) {
        await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
          method: 'POST',
          headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: logLines.join('\n').slice(0, 1900) })
        });
      }
    }
  } catch (e) {
    console.error('Cron log failed:', e.message);
  }
}
