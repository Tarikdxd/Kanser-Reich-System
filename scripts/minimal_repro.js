import { delay } from '../utils/helpers.js';

export async function handleTest(interaction, request, env, ctx, url) {
  if (interaction.type === 1) return new Response(JSON.stringify({ type: 1 }), { headers: { 'Content-Type': 'application/json' } });

  if (interaction.type === 2) {
    const { name, options } = interaction.data;
    const getOption = (optName) => options?.find(o => o.name === optName)?.value;

    switch (name) {
      case 'test':
        ctx.waitUntil((async () => {
          try {
            const result = getOption('input');
            await updateInteraction(interaction.application_id, interaction.token, { content: result });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Hata: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      default:
        return null;
    }
  }
}
