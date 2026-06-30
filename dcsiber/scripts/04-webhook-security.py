"""
Webhook Guvenlik Test Araci (Egitim)
=====================================
Amac: Discord webhook guvenligini test etmek ve nasil
      korunacagini ogretmek.

Testler:
  1. Webhook URL tahmin edilebilir mi?
  2. Webhook yetkileri dogru mu?
  3. Webhook log tutuyor mu?
  4. Webhook IP kisitlamasi var mi?

Calistirma:
  python 04-webhook-security.py --webhook https://discord.com/api/webhooks/12345/abcde
  python 04-webhook-security.py --info  (bilgi modu)
"""

import requests, json, re, hashlib, argparse

def analyze_webhook_url(url):
    """Webhook URL'sini analiz et"""
    print("[+] Webhook URL Analizi")
    print("-" * 50)
    
    if not url or 'discord.com/api/webhooks/' not in url:
        print("[HATA] Gecerli bir Discord webhook URL'si gerekli")
        return
    
    # ID ve token'i ayir
    match = re.search(r'webhooks/(\d+)/([A-Za-z0-9_-]+)', url)
    if not match:
        print("[HATA] Webhook URL formatinda hata")
        return
    
    webhook_id = match.group(1)
    webhook_token = match.group(2)
    
    print(f"  Webhook ID:    {webhook_id}")
    print(f"  Webhook Token: {webhook_token[:10]}...{webhook_token[-5:]}")
    
    # Bilgi al
    r = requests.get(url)
    if r.status_code == 200:
        data = r.json()
        print(f"  Kanal ID:      {data.get('channel_id', '?')}")
        print(f"  Guild ID:      {data.get('guild_id', '?')}")
        print(f"  Isim:          {data.get('name', '?')}")
        print(f"  Avatar:        {'Var' if data.get('avatar') else 'Yok'}")
        print(f"  Token dogru mu: {data.get('token', '')[:10]}...")
    else:
        print(f"  HTTP {r.status_code} - Bilgi alinamadi")
    
    return webhook_id, webhook_token


def test_webhook_permissions(webhook_id, webhook_token):
    """Webhook yetkilerini test et"""
    print("\n[+] Webhook Yetki Testi")
    print("-" * 50)
    
    base = f"https://discord.com/api/v10/webhooks/{webhook_id}/{webhook_token}"
    
    tests = [
        ("Mesaj gonderme (POST)", "POST", base, {"content": "Guvenlik testi"}),
        ("Mesaj silme (DELETE)", "DELETE", f"{base}/messages/@original"),
        ("Webhook bilgisi (GET)", "GET", base),
        ("Webhook guncelleme (PATCH)", "PATCH", base, {"name": "test-webhook"}),
        ("Webhook silme (DELETE)", "DELETE", base),
    ]
    
    for name, method, url, *data in tests:
        try:
            if method == "POST":
                r = requests.post(url, json=data[0] if data else {})
            elif method == "GET":
                r = requests.get(url)
            elif method == "DELETE":
                r = requests.delete(url)
            elif method == "PATCH":
                r = requests.patch(url, json=data[0] if data else {})
            
            if r.status_code == 204:
                print(f"  [BASARILI] {name}")
            elif r.status_code == 200:
                print(f"  [BASARILI] {name}")
            elif r.status_code == 401:
                print(f"  [ENGELLENDI] {name} (yetki yok)")
            elif r.status_code == 404:
                print(f"  [YOK] {name} (404)")
            else:
                print(f"  [HTTP {r.status_code}] {name}")
        except Exception as e:
            print(f"  [HATA] {name}: {e}")


def check_security_recommendations():
    """Guvenlik onerileri listele"""
    print("\n[+] Webhook Guvenlik Onerileri")
    print("=" * 50)
    
    recommendations = [
        ("Webhook URL'sini gizli tut", "Webhook URL'si bilen herkes mesaj gonderebilir. Sadece guvenilir kisilerle paylasin."),
        ("IP kisitlamasi kullan", "Discord webhook'lari IP kisitlamasini desteklemez. Ayri bir proxy/WAF kullanarak kisitlayabilirsiniz."),
        ("Webhook ismini gizle", "Webhook ismi tahmin edilebilir olmamali. 'token', 'discord' gibi kelimeler kullanmayin."),
        ("Rate limit uygula", "Webhook basina Discord rate limiti: 30 mesaj / 60 saniye. Bot tarafinda da rate limit ekleyin."),
        ("Webhook logu tut", "Tum webhook isteklerini KV veya R2'ye kaydedin. Anomali tespiti icin."),
        ("Webhook rotasyonu", "Webhook URL'sini duzenli olarak yenileyin. Ihlal durumunda hemen degistirin."),
        ("Webhook icerigini dogrula", "Webhook'a gonderilen veriyi dogrulayin. Beklenmeyen alanlari reddedin."),
        ("SADECE POST kabul et", "Webhook endpoint'i sadece POST isteklerini kabul etmeli. GET/DELETE/PATCH'i engelleyin."),
    ]
    
    for i, (title, desc) in enumerate(recommendations, 1):
        print(f"\n  {i}. {title}")
        print(f"     {desc}")


def main():
    parser = argparse.ArgumentParser(description='Webhook Guvenlik Testi')
    parser.add_argument('--webhook', help='Webhook URL (test icin)')
    parser.add_argument('--info', action='store_true', help='Guvenlik bilgisi goster')
    
    args = parser.parse_args()
    
    print("=" * 50)
    print("DCSIBER - Webhook Guvenlik Testi")
    print("=" * 50)
    print("UYARI: Bu araci SADECE kendi webhook'unuzda kullanin!")
    print()
    
    if args.info:
        check_security_recommendations()
        return
    
    if args.webhook:
        id_token = analyze_webhook_url(args.webhook)
        if id_token:
            webhook_id, webhook_token = id_token
            test_webhook_permissions(webhook_id, webhook_token)
        check_security_recommendations()
    else:
        print("[BILGI] Webhook URL'si verilmedi. Bilgi modu icin --info kullanin.")
        print()
        check_security_recommendations()


if __name__ == '__main__':
    main()
