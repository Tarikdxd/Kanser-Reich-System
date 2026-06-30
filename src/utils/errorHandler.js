import { updateInteraction } from './helpers.js';
import { logAudit } from './audit.js';

export async function handleError(interaction, error, command, env) {
  const message = error?.message || 'Bilinmeyen hata';
  console.error(`[${command}] ${message}`);
  await logAudit(interaction, command, 'error_' + message.slice(0, 50), 0, env);
  try {
    await updateInteraction(interaction.application_id, interaction.token, {
      content: `Hata: ${message.slice(0, 300)}`
    });
  } catch (e) {
    console.error('handleError updateInteraction failed:', e.message);
  }
}

export function wrapCommand(fn, commandName) {
  return async function(...args) {
    const interaction = args[2] || args[0];
    const env = args[4] || args[3];
    const start = Date.now();
    try {
      const result = await fn(...args);
      const duration = Date.now() - start;
      await logAudit(interaction, commandName, 'success', duration, env);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      await logAudit(interaction, commandName, 'error', duration, env);
      await handleError(interaction, error, commandName, env);
      return null;
    }
  };
}
