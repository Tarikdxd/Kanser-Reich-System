"""
Rate Limit Test Araci (Egitim)
===============================
Amac: Bot'un rate limit ve cooldown sistemini test etmek.
      Kendi botunuzda kullanin, baskasi uzerinde DEGIL.

Senaryo:
  1. Bot'a hizli sekilde komut gonder
  2. Bot'un tepkisini olc (429? yok sayiyor mu?)
  3. Cooldown varsa dogru calisiyor mu kontrol et

Calistirma:
  python 02-rate-limit-test.py --webhook https://discord.com/api/webhooks/.../...
  python 02-rate-limit-test.py --guild-id 123456 --channel-id 789012 (mesaj olarak)

NOT: Bu script Workers bot'larina dogrudan komut GONDEREMEZ
     (Discord Interaction API gerektirir). Bunun yerine
     webhook uzerinden test eder veya rate limit mantigini
     simule eder.
"""

import time, json, requests, sys, argparse

def simulate_request(limit_per_second=5):
    """
    Cooldown sistemi olan bir bot'ta hizli istekleri simule eder.
    `limit_per_second`: Saniyede kac istege izin verildigi
    """
    results = []
    last_time = {}
    
    print(f"[TEST] Cooldown simulesyonu (limit: {limit_per_second}/sn)")
    print("-" * 50)
    
    for i in range(20):
        user_id = f"user_{i % 3}"  # 3 kullanici taklit et
        cmd = f"komut_{i % 4}"
        now = time.time()
        
        key = f"{user_id}:{cmd}"
        last = last_time.get(key, 0)
        
        if now - last < 1.0 / limit_per_second:
            result = "BLOKE (cooldown)"
        else:
            result = "IZIN VERILDI"
            last_time[key] = now
        
        print(f"  Islem {i+1:2d} | {user_id} | {cmd:10s} | {result}")
        results.append(result)
        time.sleep(0.1)  # 100ms bekle
    
    blocked = results.count("BLOKE (cooldown)")
    allowed = results.count("IZIN VERILDI")
    
    print("-" * 50)
    print(f"Sonuc: {allowed} izin, {blocked} bloke")
    print(f"Bloke orani: {blocked/len(results)*100:.0f}%")
    print()
    return results


def test_webhook(webhook_url, count=10):
    """
    Bir webhook'a hizli mesaj gondererek rate limit testi.
    SADECE kendi webhook'unuzda kullanin.
    """
    print(f"[TEST] Webhook rate limit testi: {webhook_url[:50]}...")
    print(f"[TEST] {count} mesaj gonderilecek...")
    print("-" * 50)
    
    results = []
    for i in range(count):
        start = time.time()
        r = requests.post(webhook_url, json={
            "content": f"Rate limit test #{i+1} - {time.time()}"
        })
        elapsed = time.time() - start
        
        status = "OK" if r.status_code == 204 else f"HTTP {r.status_code}"
        
        # 429 varsa rate limit bilgisi
        rate_info = ""
        if r.status_code == 429:
            data = r.json()
            retry = data.get('retry_after', '?')
            rate_info = f" (retry: {retry}ms)"
            print(f"  [{status}] Mesaj #{i+1} | {elapsed*1000:.0f}ms{rate_info}")
            break  # 429 alinca dur
        else:
            print(f"  [{status}] Mesaj #{i+1} | {elapsed*1000:.0f}ms")
        
        results.append(r.status_code)
    
    return results


def check_discord_rate_limits():
    """Discord API rate limit dokumantasyonu"""
    print("""
Discord Rate Limit Limitleri (API v10):
========================================
Global:         50 istek / saniye (tum bot icin)
Route base:     ~10.000 istek / 60 saniye (istatistiksel)

Limit         Route
-----         -----
5/s           /channels/{id}/messages (yeni kanal)
10/10s        /guilds/{id}/channels
15/60s        /guilds/{id}/roles
20/10s        /channels/{id}/messages (listeleme)
30/60s        Webhook mesaj gonderme
50/s          Global

Workers Bot Icin Onemli:
- Interaction (/) komutlari farkli limitlere tabidir
- Her komut icin rate limit Discord tarafinda uygulanir
- Bot'ta cooldown yoksa kullanici hizli komut gonderebilir
- Workers CPU limiti (30s) Discord rate limitinden once devreye girebilir
""")


def main():
    parser = argparse.ArgumentParser(description='Rate Limit Test Araci')
    parser.add_argument('--webhook', help='Webhook URL (test icin)')
    parser.add_argument('--simulate', type=int, default=5, help='Cooldown limiti (varsayilan: 5/sn)')
    parser.add_argument('--info', action='store_true', help='Discord rate limit bilgisi')
    
    args = parser.parse_args()
    
    print("=" * 50)
    print("DCSIBER - Rate Limit Test Araci")
    print("=" * 50)
    
    if args.info:
        check_discord_rate_limits()
        return
    
    print()
    
    if args.webhook:
        test_webhook(args.webhook, count=20)
        print()
    
    simulate_request(args.simulate)
    
    print()
    print("[ONERILER]")
    print("1. Bot'unuzda cooldown yoksa EKLEYIN (KV tabanli)")
    print("2. Her komut icin min 3sn cooldown")
    print("3. Admin komutlari icin ayri (daha kisa) cooldown")
    print("4. Workers botlari icin KV cooldown kullanin")
    print("5. Global rate limit: saniyede max 40 istek")


if __name__ == '__main__':
    main()
