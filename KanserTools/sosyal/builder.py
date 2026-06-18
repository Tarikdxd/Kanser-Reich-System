#!/usr/bin/env python3
# KANSERSOSYAL BUILDER — Build EXE
import os, sys

def build():
    print("[+] KANSERSOSYAL Builder")
    print("[+] pip install pyinstaller requests")
    print("[+] pyinstaller --onefile --noconsole --name=KanserSosyal server.py")
    print("[+] EXE: dist/KanserSosyal.exe")

if __name__ == "__main__":
    build()
