"""
BOT SPAM & KAYNAK TUKETME TESTI
=================================
Kendi botunda dene, nasil davrandigini gor.

KULLANIM:
  YONTEM 1 (Webhook ile — kolay):
    Discord'da kanal ayarlari -> Entegrasyonlar -> Webhook olustur
    URL'yi al -> su sekilde calistir:
    python bot-spam-test.py --webhook https://discord.com/api/webhooks/...

  YONTEM 2 (Bot token ile — kendi botunun tokeni):
    python bot-spam-test.py --token MTIz... --kanal KANAL_ID

UYARI:
  - Discord'un rate limiti var (30 mesaj / 60sn webhook)
  - Bot tokeniyla kendi kendine mesaj atarsan bot seni duymaz
    (botlar baska botlari gormez)
  - En kolay test: webhook kullan
"""

import requests, json, sys, time, threading as th
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.parse

# ===========================================================================
# KONFIHGURASYON
# ===========================================================================
RESULTS = []
TEST_RUNNING = True
BOT_STATUS_BEFORE = None

# ===========================================================================
# TEST 1: Webhook ile Spam
# ===========================================================================
def spam_webhook(webhook_url, komut, count, threads=5, bekleme_ms=50):
    """Webhook uzerinden hizli mesaj gonder"""
    global RESULTS
    
    print(f"[TEST] Webhook spam basliyor: {count} mesaj, {threads} thread")
    print(f"       Komut: {komut}")
    print(f"       Webhook: {webhook_url[:50]}...")
    print()

    start = time.time()
    success = 0
    failed = 0
    rate_limited = 0

    def send_one(i):
        try:
            r = requests.post(webhook_url, json={
                "content": komut,
                "username": f"SpamBot-{i % 5}"
            }, timeout=10)
            if r.status_code == 204:
                return "OK", i
            elif r.status_code == 429:
                return "429", i
            else:
                return f"HTTP-{r.status_code}", i
        except Exception as e:
            return f"HATA-{str(e)[:30]}", i

    # Thread pool ile paralel spam
    pool = ThreadPoolExecutor(max_workers=threads)
    futures = [pool.submit(send_one, i) for i in range(count)]
    
    for i, f in enumerate(as_completed(futures)):
        status, idx = f.result()
        if status == "OK":
            success += 1
        elif status == "429":
            rate_limited += 1
        else:
            failed += 1
        
        # Her 10 mesajda bir durum raporu
        if (i + 1) % 10 == 0:
            print(f"  [{i+1}/{count}] OK:{success} 429:{rate_limited} HATA:{failed}")

    elapsed = time.time() - start
    print(f"\n[SONUC] {count} mesaj {elapsed:.1f}s'de tamamlandi")
    print(f"       Basarili: {success} | Rate limited: {rate_limited} | Hata: {failed}")
    
    if rate_limited > 0:
        print(f"       -> Discord rate limitine takildin! Bot 429 yedi.")
    if failed > count * 0.3:
        print(f"       -> Bot zorlaniyor olabilir.")
    
    return success, rate_limited, failed, elapsed


# ===========================================================================
# TEST 2: Bot Token ile Direkt Mesaj
# ===========================================================================
def spam_bot_token(token, kanal_id, komut, count, threads=3, bekleme_ms=100):
    """Bot tokeni kullanarak kanala mesaj gonder"""
    global RESULTS
    
    headers = {
        "Authorization": f"Bot {token}",
        "Content-Type": "application/json"
    }
    base_url = f"https://discord.com/api/v10/channels/{kanal_id}/messages"
    
    print(f"[TEST] Bot token spam: {count} mesaj, {threads} thread")
    print(f"       Kanal ID: {kanal_id}")
    print(f"       Komut: {komut}")
    print(f"       NOT: Bot kendi mesajini gormezse test ise yaramaz!")
    print()

    # Once kanal kontrol
    r = requests.get(base_url, headers=headers)
    if r.status_code == 200:
        print("[OK] Kanala erisim var")
    elif r.status_code == 403:
        print("[HATA] Botun bu kanala erisimi yok!")
        return
    elif r.status_code == 401:
        print("[HATA] Token gecersiz!")
        return
    else:
        print(f"[UYARI] Beklenmeyen HTTP {r.status_code}")
    
    start = time.time()
    success = 0
    failed = 0
    rate_limited = 0

    def send_one(i):
        try:
            r = requests.post(base_url, headers=headers, json={
                "content": komut
            }, timeout=10)
            if r.status_code == 200:
                return "OK", i
            elif r.status_code == 429:
                return "429", i
            else:
                return f"HTTP-{r.status_code}", i
        except Exception as e:
            return f"HATA-{str(e)[:30]}", i

    pool = ThreadPoolExecutor(max_workers=threads)
    futures = [pool.submit(send_one, i) for i in range(count)]
    
    for i, f in enumerate(as_completed(futures)):
        status, idx = f.result()
        if status == "OK":
            success += 1
        elif status == "429":
            rate_limited += 1
        else:
            failed += 1
        
        if (i + 1) % 10 == 0:
            print(f"  [{i+1}/{count}] OK:{success} 429:{rate_limited} HATA:{failed}")

    elapsed = time.time() - start
    print(f"\n[SONUC] {count} mesaj {elapsed:.1f}s")
    print(f"       Basarili: {success} | 429: {rate_limited} | Hata: {failed}")
    
    if success > 0 and rate_limited == 0:
        print("       [ONEMLI] Butun mesajlar gitti! Bot kendi mesajlarini isliyor mu?")
        print("       Eger bot'ta 'if message.author.bot return' varsa -> duymaz")
        print("       O zaman webhook yontemini dene: --webhook ile")


# ===========================================================================
# TEST 3: Bot'un Hala Calistigini Kontrol Et
# ===========================================================================
def check_bot_alive(token=None, webhook_url=None, kanal_id=None):
    """Testten sonra bot hala calisiyor mu kontrol et"""
    print("\n[KONTROL] Bot hala calisiyor mu?")
    
    if webhook_url:
        # Webhook'a mesaj gonder, basarili mi?
        r = requests.post(webhook_url, json={
            "content": "!ping"  # bot'un yanit verdigi basit bir komut
        }, timeout=10)
        if r.status_code == 204:
            print("[OK] Webhook calisiyor -> mesaj gidebiliyor")
        else:
            print(f"[SORUN] Webhook HTTP {r.status_code}")
    
    if token and kanal_id:
        headers = {
            "Authorization": f"Bot {token}",
            "Content-Type": "application/json"
        }
        # Son mesaji kontrol et
        r = requests.get(
            f"https://discord.com/api/v10/channels/{kanal_id}/messages?limit=1",
            headers=headers, timeout=10
        )
        if r.status_code == 200:
            print("[OK] Discord API'ye erisim var -> bot calisiyor")
            data = r.json()
            if data:
                print(f"     Son mesaj: {data[0].get('content', '-')[:50]}")
        else:
            print(f"[SORUN] Discord API HTTP {r.status_code}")


# ===========================================================================
# YARDIM: En agir komutlari bulma
# ===========================================================================
def agir_komut_onerileri():
    return [
        # Komut / Aciklama / Tahmini Yuk
        ("!profil", "Kullanici profili olusturur", "ORTA"),
        ("!seviye tum", "Herkesin seviyesini listeler", "AGIR"),
        ("!rapor ver", "Detayli rapor hazirlar", "AGIR"),
        ("!export", "Veritabanini export eder", "COK AGIR"),
        ("!kayit-yap", "Gorsel isleme yapar", "AGIR"),
        ("!otorol-ver", "Her uyeye rol atamaya calisir", "COK AGIR"),
        ("!log-tara", "Log dosyalarini tarar", "AGIR"),
        ("!yedekle", "Sunucu yedegi alir", "COK AGIR"),
        ("!say", "Uye sayar, roller, kanallar", "ORTA"),
        ("!temizle 100", "100 mesaj siler (API istegi)", "AGIR"),
    ]


# ===========================================================================
# ANA FONKSIYON
# ===========================================================================
def main():
    print("=" * 60)
    print("BOT SPAM & KAYNAK TUKETME TESTI")
    print("=" * 60)
    print("Amac:  Kendi botunu dene, nasil davrandigini gor")
    print("Uyari: Bu araci baskasinin botunda KULLANMA!")
    print()

    # KOMUT SECIMI
    komutlar = agir_komut_onerileri()
    print("Kullanilacak komutlar (en agirdan):")
    for i, (k, a, y) in enumerate(komutlar, 1):
        print(f"  {i}. {k:20s} - {a} ({y})")
    
    secim = input(f"\nHangi komutu kullanmak istersin? (1-{len(komutlar)}): ")
    try:
        komut = komutlar[int(secim)-1][0]
    except:
        komut = input("Komutu kendin yaz: ")
    
    print(f"\nSecilen komut: {komut}")
    
    # YONTEM SECIMI
    print("\nYONTEM:")
    print("  1. Webhook ile (en kolay, onerilen)")
    print("  2. Bot token ile (kendi botunun tokeni)")
    yontem = input("Yontem (1/2): ").strip()
    
    count = int(input("Kac mesaj gonderilsin? (50-500): ") or "100")
    threads = int(input("Kac thread (paralel)? (3-20): ") or "5")
    
    print()
    print("[BASLIYOR] 3 saniye icinde baslayacak...")
    print("           Discord'u ac ve kanali izle!")
    for i in range(3, 0, -1):
        print(f"           {i}...")
        time.sleep(1)
    print("[BASLADI]")
    print()
    
    if yontem == "1":
        webhook = input("Webhook URL: ").strip()
        spam_webhook(webhook, komut, count, threads)
        check_bot_alive(webhook_url=webhook)
    
    elif yontem == "2":
        token = input("Bot Token: ").strip()
        kanal = input("Kanal ID: ").strip()
        spam_bot_token(token, kanal, komut, count, threads)
        check_bot_alive(token=token, kanal_id=kanal)
    
    print()
    print("=" * 60)
    print("TEST SONUCU")
    print("=" * 60)
    print("1. Bot yanit vermeye devam etti mi? -> Kontrol et")
    print("2. Discord kanalinda mesajlar gorunuyor mu?")
    print("3. Bot 429 hatasi yedi mi? (rate limit)")
    print("4. Bot'ta cooldown var mi? (yoksa ekle!)")
    print()
    print("Cooldown eklemek icin:")
    print("  if (cooldown.has(kullanici)) return")
    print("  cooldown.set(kullanici, Date.now() + 3000)")
    print()

if __name__ == '__main__':
    main()
