import { delay, clearTurkishChars, hexToBuf, updateInteraction, sendResponse } from '../utils/helpers.js';
import { handleNewCommand } from './newCommands.js';

export async function handleKanserBot(interaction, request, env, ctx, url) {
  if (interaction.type === 1) return new Response(JSON.stringify({ type: 1 }), { headers: { 'Content-Type': 'application/json' } });

  if (interaction.type === 2) {
    const { name, options } = interaction.data;
    const getOption = (optName) => options?.find(o => o.name === optName)?.value;

    const userPermissions = BigInt(interaction.member?.permissions || "0");
    const ADMINISTRATOR_FLAG = BigInt(8);
    if ((userPermissions & ADMINISTRATOR_FLAG) !== ADMINISTRATOR_FLAG) {
      return sendResponse("Hata: Bu komutu kullanmak icin sunucuda Yonetici yetkisine sahip olmaniz gerekmektedir.", true);
    }

    // Yeni komutlari kontrol et
    const newCmdResult = await handleNewCommand(name, getOption, interaction, request, env, ctx, url);
    if (newCmdResult) return newCmdResult;

    switch (name) {
      case 'dev-tara':
        ctx.waitUntil((async () => {
          try {
            const username = getOption('kullanici');
            const url = `https://api.github.com/users/${username}/repos?per_page=20&sort=updated`;
            let reposRes = await fetch(url, { headers: { 'User-Agent': 'DiscordBot' } });
            if (reposRes.status === 403 && env.GITHUB_TOKEN) {
              reposRes = await fetch(url, { headers: { 'User-Agent': 'DiscordBot', 'Authorization': `token ${env.GITHUB_TOKEN}` } });
            }
            if (!reposRes.ok) throw new Error("GitHub kullanicisi bulunamadi veya limite takildi.");
            const repos = await reposRes.json();

            if (!repos.length) {
              return await updateInteraction(interaction.application_id, interaction.token, { content: `Kullanicinin public reposu bulunamadi.` });
            }

            const secretPatterns = ['.env', 'config.json', 'credentials', 'id_rsa', 'secret'];
            let findings = [];

            for (const repo of repos.slice(0, 5)) {
              try {
                const treeUrl = `https://api.github.com/repos/${username}/${repo.name}/git/trees/${repo.default_branch}?recursive=1`;
                let treeRes = await fetch(treeUrl, { headers: { 'User-Agent': 'DiscordBot' } });
                if (treeRes.status === 403 && env.GITHUB_TOKEN) {
                  treeRes = await fetch(treeUrl, { headers: { 'User-Agent': 'DiscordBot', 'Authorization': `token ${env.GITHUB_TOKEN}` } });
                }
                if (treeRes.ok) {
                  const treeData = await treeRes.json();
                  if (treeData.tree) {
                    const suspicious = treeData.tree.filter(item => secretPatterns.some(p => item.path.includes(p)));
                    if (suspicious.length > 0) {
                      suspicious.forEach(s => findings.push(`Repo: ${repo.name} | Dosya: ${s.path}`));
                    }
                  }
                }
              } catch (e) { }
            }

            let resultText = `GitHub Taramasi: ${username} (Son 5 repo derin analizi)\n\n`;
            if (findings.length > 0) {
              resultText += `DIKKAT! POTANSIYEL SIZINTILAR:\n${findings.join('\n')}`;
            } else {
              resultText += `Public repolarda acik bir .env veya credential dosyasina rastlanmadi.`;
            }

            await updateInteraction(interaction.application_id, interaction.token, { content: resultText });
          } catch (err) {
            await updateInteraction(interaction.application_id, interaction.token, { content: `Tarama hatasi: ${err.message}` });
          }
        })());
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

      
    default:
      return null;
  }
}