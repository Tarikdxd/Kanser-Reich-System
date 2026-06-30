import { getConfig } from './config.js';

export async function logAudit(interaction, command, status, durationMs, env) {
  try {
    const userId = interaction?.member?.user?.id || interaction?.user?.id || 'bilinmiyor';
    const username = interaction?.member?.user?.username || interaction?.user?.username || '';
    const options = JSON.stringify(interaction?.data?.options || []);

    if (env.DB) {
      await env.DB.prepare(
        'INSERT INTO audit_logs (user_id, username, command, options, status, duration_ms) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(userId, username, command, options, status, durationMs).run();
    }
  } catch (e) {
    console.error('logAudit failed:', e.message);
  }
}

export async function sendToLogChannel(content, env) {
  try {
    const channelId = await getConfig(env, 'LOG_CHANNEL_ID');
    if (!channelId) return;
    const token = env.DISCORD_TOKEN;
    if (!token) return;
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: truncateMsg(content, 1900) })
    });
  } catch (e) {
    console.error('sendToLogChannel failed:', e.message);
  }
}

function truncateMsg(text, limit) {
  if (!text) return '';
  if (text.length <= limit) return text;
  return text.slice(0, limit) + '\n\n[Kirpildi]';
}
