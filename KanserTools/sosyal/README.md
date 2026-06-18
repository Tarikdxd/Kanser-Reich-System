# KANSERSOSYAL v1.0

8 platform destekli sosyal medya bot farm araci. Takipci, like, view, yorum gibi etkilesimleri coklu thread ve proxy rotasyonu ile otomatiklestirir. Tek GUI panelden tum platformlari yonetir.

---

## Dosya Yapisi

| Dosya | Aciklama |
|-------|----------|
| `server.py` | Sosyal medya GUI kontrol paneli — 8 platform, tek ekran, canli istatistik |
| `core.py` | Coklu thread bot motoru — Task kuyrugu, proxy rotasyonu, hiz sinirlama |
| `account_manager.py` | Hesap yonetimi — platform bazinda hesap ekleme, cikarma, durum takibi |
| `proxy_manager.py` | Proxy yonetimi — HTTP/SOCKS5 proxy listesi, rotasyon, olu proxy temizleme |
| `builder.py` | EXE builder — tum paketi tek EXE haline getirir |
| `platforms/discord.py` | Discord — sunucu uyesi, mesaj spam, DM bot |
| `platforms/github.py` | GitHub — repo star, fork, takipci |
| `platforms/instagram.py` | Instagram — takipci, like, yorum, hikaye izleme |
| `platforms/kick.py` | Kick — kanal takipci, canli yayin izleyici |
| `platforms/spotify.py` | Spotify — sarki dinleme, playlist takip, sanatci takip |
| `platforms/tiktok.py` | TikTok — takipci, like, view, yorum |
| `platforms/twitch.py` | Twitch — kanal takipci, canli yayin izleyici |
| `platforms/youtube.py` | YouTube — kanal abonesi, video like, view |

---

## Ozellikler

- **8 Platform Desteği** — Discord, GitHub, Instagram, Kick, Spotify, TikTok, Twitch, YouTube
- **Multi-Threaded** — Es zamanli coklu gorev, yapilandirilabilir thread sayisi
- **Proxy Rotasyonu** — HTTP ve SOCKS5 proxy destegi, her istekte proxy degisimi, olu proxy otomatik temizleme
- **Hesap Yonetimi** — Platform bazinda hesap listeleri, aktif/pasif durum, rate-limit takibi
- **Task Kuyrugu** — Gorev siralamasi, oncelik, durdurma/devam ettirme
- **Canli Istatistik** — Anlik basari/oran, tamamlanan/kalan gorev sayisi, hiz (islem/dk)
- **Hiz Sinirlama** — Platform API rate-limit'lerine uyumlu otomatik yavaslatma
- **GUI Panel** — Tkinter tabanli, tum platformlar tek ekranda

---

## Gereksinimler

```bash
cd KanserTools
pip install -r requirements.txt
pip install requests
```

---

## Kullanim

### 1. GUI Kontrol Paneli

```bash
cd sosyal
python server.py
```

GUI acilir. Panel ozellikleri:
- **Sol Panel** — Platform secimi (8 platform butonu)
- **Orta Panel** — Gorev yapilandirmasi:
  - **Platform**: Discord / GitHub / Instagram / Kick / Spotify / TikTok / Twitch / YouTube
  - **Aksiyon**: follow, like, view, comment, star, fork (platforma gore degisir)
  - **Hedef**: Kullanici adi, link, video ID
  - **Miktar**: Kac adet etkilesim yapilacagi
- **Sag Panel** — Canli istatistikler ve log akisi
- **Alt Panel** — Proxy ve hesap yonetimi

### 2. Hesap ve Proxy Yonetimi

```bash
# Hesap ekleme (panel uzerinden veya manuel):
# accounts.json dosyasina platform:hesap listesi eklenir

# Proxy ekleme (panel uzerinden veya manuel):
# proxies.txt dosyasina ip:port veya ip:port:user:pass formatinda
```

### 3. Builder

```bash
python builder.py
```

Tum paketi tek EXE haline getirir.

---

## Platform Bazinda Kullanim

| Platform | Aksiyon | Ornek Hedef |
|----------|---------|-------------|
| Discord | join_server, message_spam | sunucu-davet-linki |
| GitHub | star, fork, follow | kullaniciadi/repo |
| Instagram | follow, like, comment, view_story | kullaniciadi |
| Kick | follow, view_stream | kanal-adi |
| Spotify | play_track, follow_playlist, follow_artist | track/playlist/artist ID |
| TikTok | follow, like, view, comment | video-id |
| Twitch | follow, view_stream | kanal-adi |
| YouTube | subscribe, like, view | video-id |

---

## EXE Builder (PyInstaller)

```bash
cd sosyal

# Tum paketi tek EXE yap:
pyinstaller --onefile --name=KanserSosyal server.py
```

---

## Monitor Reporter

`monitor_reporter.py`, bot motoru calistiginda otomatik import edilir. Gorev baslangici, tamamlanmasi, hata durumlari, rate-limit tetiklenmesi merkezi olarak raporlanir.

```python
from monitor_reporter import report
report("Sosyal", "task_completed", {"platform": "instagram", "action": "follow", "count": 50})
```

---

## Guvenlik Uyarisi

Bu arac **yalnizca kendi hesaplarinizda ve egitim/test amaciyla** kullanilmalidir. Platformlarin kullanim kosullarina aykiri olabilir. Izinsiz kullanim hesap askiya alinmasina veya yasal yaptirimlara yol acabilir.
