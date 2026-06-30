# Bot Stres Test — Kullanma Kilavuzu

## Guvenli Test Sirasi (Risk artarak gider)

```
ADIM 1: KV Okuma Testi     — en guvenli, sadece KV okur
  python stress-test.py --target https://discord-bot.kanserbusiness.workers.dev --test kv --count 50

ADIM 2: Invalid Payload     — error handling testi, zararsiz
  python stress-test.py --target https://discord-bot.kanserbusiness.workers.dev --test invalid

ADIM 3: Oversized Payload   — bellek limitini test eder
  python stress-test.py --target https://discord-bot.kanserbusiness.workers.dev --test oversized

ADIM 4: Concurrent Storm    — Worker'a ayni anda yuklenir
  python stress-test.py --target https://discord-bot.kanserbusiness.workers.dev --test storm --count 30

ADIM 5: Monitor Flood       — DM kutunu mesajla doldurur!!! DIKKAT!
  python stress-test.py --target https://discord-bot.kanserbusiness.workers.dev --test monitor --count 5

ADIM 6: PDF Flood           — log kanalini mesajla doldurur!!! DIKKAT!
  python stress-test.py --target https://discord-bot.kanserbusiness.workers.dev --test pdf --count 5
```

## Bot Duserse Ne Yapmalisin?

Workers botlari serverless oldugu icin genelde dusmez, AMA:

| Hata Kodu | Anlami | Cozum |
|-----------|--------|-------|
| 1102 | CPU limiti asildi (30s) | Komutlara sure limiti ekle |
| 1105 | Bellek limiti asildi (128MB) | Buyuk islemleri bol |
| 500 | Internal error | Kod hatasi, log'dan bul |
| 502 | Workers timeout | Cok fazla subrequest |
| 429 | Discord rate limit | Cooldown ekle |

## Cloudflare Dashboard'da Izle

1. workers.cloudflare.com'a git
2. discord-bot Worker'ini ac
3. Metrics -> CPU, Memory, Requests grafiklerini izle
4. Test sirasinda grafiklerin nasil yukseldigini gor

## Test Bittikten Sonra

```bash
# Log kanalinda biriken mesajlari temizle
# Bot'ta /komut-temizle gibi bir komut yoksa manuel sil

# Eger bot surekli 500 donuyorsa:
npx wrangler tail  # canli loglari izle
```

## Cozum: Nasil Saglamlastirilir

```js
// helpers.js'ye ekle:
export async function checkCooldown(env, userId, cmdName, seconds = 3) {
  const key = `cd_${userId}_${cmdName}`;
  const last = await env.KV?.get(key);
  const now = Date.now();
  if (last && now - parseInt(last) < seconds * 1000) {
    return Math.ceil((seconds * 1000 - (now - parseInt(last))) / 1000);
  }
  await env.KV?.put(key, now.toString(), { expirationTtl: seconds + 5 });
  return 0;
}
```

Her komut handler'inda:

```js
const cd = await checkCooldown(env, getUserId(interaction), name, 3);
if (cd > 0) return sendResponse(`Bekleyin: ${cd}saniye`, true);
```
