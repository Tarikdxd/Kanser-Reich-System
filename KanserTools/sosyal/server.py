#!/usr/bin/env python3
"""KANSERSOSYAL v2.5 — Smart CLI Bot Farm"""
import os, sys, time, threading, queue, random, re
import urllib.request
from datetime import datetime

C = {"R":"\033[91m","G":"\033[92m","Y":"\033[93m","B":"\033[94m","M":"\033[95m","W":"\033[0m","X":"\033[90m"}

def ts(): return datetime.now().strftime("%H:%M:%S")
def clear(): os.system("cls" if os.name == "nt" else "clear")

# ===================== PROXY =====================
PROXIES = []; _plock = threading.Lock(); _pidx = 0

def _scrape():
    srcs = [
        "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all",
        "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
        "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt",
    ]
    new = []
    for u in srcs:
        try:
            r = urllib.request.urlopen(u, timeout=8)
            for l in r.read().decode(errors="ignore").split("\n"):
                l = l.strip()
                if ":" in l and not l.startswith("#") and len(l) < 50:
                    new.append(l)
        except: pass
    with _plock:
        for p in set(new):
            if p not in PROXIES: PROXIES.append(p)
    return len(PROXIES)

def get_proxy():
    global _pidx
    with _plock:
        if not PROXIES: return None
        p = PROXIES[_pidx % len(PROXIES)]; _pidx += 1
        return {"http": f"http://{p}", "https": f"http://{p}"}

# ===================== HEADERS =====================
UA = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) Version/18.1 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; SM-S928B) Chrome/131.0.6778.135 Mobile Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36",
]
REF = ["https://www.google.com/","https://www.bing.com/","https://duckduckgo.com/",""]
LANG = ["en-US,en;q=0.9","tr-TR,tr;q=0.9,en;q=0.8","de-DE,de;q=0.9,en;q=0.7"]

def hdr():
    return {"User-Agent":random.choice(UA),"Accept":"text/html,application/xhtml+xml,*/*;q=0.8","Accept-Language":random.choice(LANG),"Referer":random.choice(REF),"Cache-Control":"no-cache","DNT":"1"}

# ===================== FETCH =====================
def fetch(url, retries=2):
    for a in range(retries):
        try:
            h = hdr(); p = get_proxy()
            req = urllib.request.Request(url, headers=h)
            if p: req.set_proxy(p["http"], "http")
            r = urllib.request.urlopen(req, timeout=10)
            return r.status, r.read().decode(errors="ignore")
        except:
            if a < retries-1: time.sleep(1)
    return 0, ""

# ===================== ACTIONS =====================
def yt_v(t):
    v = t.split("v=")[-1].split("&")[0] if "youtube" in t else t
    s, b = fetch(f"https://www.youtube.com/watch?v={v}")
    return s == 200 and len(b) > 5000
def yt_s(t):
    ch = t.replace("@","").split("/")[-1]
    s, _ = fetch(f"https://www.youtube.com/@{ch}")
    return s == 200

def tt_v(t): u = t.replace("@","").split("/")[-1]; s, _ = fetch(f"https://www.tiktok.com/@{u}"); return s == 200
def ig_v(t): s, _ = fetch(f"https://www.instagram.com/{t}/"); return s == 200
def gh_s(t): s, _ = fetch(f"https://github.com/{t}"); return s == 200
def sp_v(t): s, _ = fetch(f"https://open.spotify.com/track/{t}"); time.sleep(random.randint(30,35)); return s == 200
def tw_v(t): s, _ = fetch(f"https://www.twitch.tv/{t}"); return s == 200
def kk_v(t): s, _ = fetch(f"https://kick.com/{t}"); return s == 200
def dc_j(t): s, _ = fetch(f"https://discord.com/invite/{t}"); return s == 200

ACTS = {
    "youtube":   {"view":yt_v, "sub":yt_s},
    "tiktok":    {"view":tt_v, "follow":tt_v},
    "instagram": {"view":ig_v, "follow":ig_v},
    "github":    {"star":gh_s, "follow":gh_s},
    "spotify":   {"view":sp_v, "follow":sp_v},
    "twitch":    {"view":tw_v, "follow":tw_v},
    "kick":      {"view":kk_v, "follow":kk_v},
    "discord":   {"join":dc_j},
}

# ===================== TASK ENGINE =====================
_tasks = {}; _tid = 0

def run(plat, act, tgt, count=100, workers=30):
    global _tid
    fn = ACTS.get(plat, {}).get(act)
    if not fn: return None, f"No {plat}.{act}"
    tid = _tid; _tid += 1
    t = {"id":tid,"plat":plat,"act":act,"tgt":tgt,"total":count,"done":0,"fail":0,"run":True,"start":time.time()}
    _tasks[tid] = t

    q = queue.Queue()
    for _ in range(count): q.put(None)

    def w():
        while t["run"] and not q.empty():
            try: q.get_nowait()
            except queue.Empty: break
            try:
                if fn(tgt): t["done"] += 1
                else: t["fail"] += 1
                if t["done"] % 80 == 0 or t["done"]+t["fail"] == t["total"]:
                    print(f"{C['G']}[{ts()}] {plat}.{act}: {t['done']}/{t['total']} ({t['fail']} fail){C['W']}")
                time.sleep(random.uniform(0.1, 0.4))
            except: t["fail"] += 1

    for _ in range(min(workers, count)):
        threading.Thread(target=w, daemon=True).start()

    def monitor():
        t0 = time.time()
        while t["run"]:
            time.sleep(10)
            if t["done"]+t["fail"] >= t["total"]:
                elapsed = time.time() - t0
                print(f"\n{C['M']}  DONE {plat}.{act}: {t['done']}/{t['total']} ({t['fail']} fail) in {elapsed:.0f}s{C['W']}\n")
                t["run"] = False; break
    threading.Thread(target=monitor, daemon=True).start()
    return tid, None

def stats():
    if not _tasks: print(f"{C['X']}  No tasks running.{C['W']}")
    for t in _tasks.values():
        pct = int(t["done"] / max(t["total"], 1) * 100)
        bar = f"{C['G']}{'#' * (pct//4)}{C['X']}{'.' * (25 - pct//4)}{C['W']}"
        print(f"  [{t['id']}] {C['Y']}{t['plat']}.{t['act']}{C['W']} | {bar} | {t['done']}/{t['total']} ({C['R']}{t['fail']} fail{C['W']}) | {'LIVE' if t['run'] else 'DONE'}")

# ===================== CLI =====================
def main():
    clear()
    print(f"{C['R']}  KANSERSOSYAL v2.5 — CLI Bot Farm{C['W']}")
    print(f"{C['X']}  Scraping proxies...{C['W']}", end="", flush=True)
    n = _scrape()
    print(f"\r{C['G']}  Proxies: {n}{C['W']}                                      ")
    threading.Thread(target=lambda: [time.sleep(300), _scrape()]*999, daemon=True).start()

    print(f"\n{C['B']}  Quick Start:{C['W']}")
    for p, acts in ACTS.items():
        print(f"    {C['G']}{p}{C['W']} {', '.join(acts.keys())}")
    print(f"\n{C['X']}  Just type: <platform> <action> <target> [count]{C['W']}")
    print(f"  {C['X']}Example: youtube view dQw4w9WgXcQ 200{C['W']}")
    print(f"  {C['X']}Commands: stats | proxy | clear | exit{C['W']}\n")

    while True:
        try:
            raw = input(f"{C['G']}SOCIAL>{C['W']} ").strip()
            if not raw: continue
            p = raw.split()
            c = p[0].lower()

            if c in ("exit","q","quit"):
                for t in _tasks.values(): t["run"] = False
                print(f"{C['Y']}Stopped{C['W']}"); break
            elif c == "stats": stats()
            elif c == "proxy":
                n = _scrape(); print(f"{C['G']}Proxies: {n}{C['W']}")
            elif c == "clear": clear(); main(); return
            elif c == "help":
                print(f"\n{C['B']}Platforms:{C['W']}")
                for pl, acts in ACTS.items():
                    print(f"  {C['G']}{pl}{C['W']}: {', '.join(acts.keys())}")
                print(f"\n  {C['X']}<platform> <action> <target> [count=100]{C['W']}")
                print(f"  {C['X']}stats | proxy | clear | exit{C['W']}\n")
            elif c == "stop":
                if len(p) < 2: print(f"{C['Y']}Usage: stop <task_id>{C['W']}"); continue
                tid = int(p[1])
                if tid in _tasks: _tasks[tid]["run"] = False; print(f"{C['G']}Stopped task {tid}{C['W']}")
                else: print(f"{C['R']}Task {tid} not found{C['W']}")
            elif c in ACTS:
                if len(p) < 3: print(f"{C['Y']}Usage: {c} <action> <target> [count=100]{C['W']}"); continue
                act = p[1].lower()
                tgt = p[2]
                cnt = int(p[3]) if len(p) > 3 else 100
                if act not in ACTS[c]: print(f"{C['R']}No '{act}'. Try: {', '.join(ACTS[c].keys())}{C['W']}"); continue
                tid, err = run(c, act, tgt, cnt)
                if err: print(f"{C['R']}{err}{C['W']}")
                else: print(f"{C['G']}[{ts()}] Started: {c}.{act} -> {tgt[:30]} x{cnt} (ID: {tid}){C['W']}")
            else:
                # Did-you-mean
                sim = [(p2, a) for p2, acts in ACTS.items() for a in acts if c in p2 or c in a]
                hint = f"  Did you mean: {', '.join([f'{C['G']}{a}{C['W']}' for _,a in sim[:3]])}" if sim else ""
                print(f"{C['R']}Unknown: '{c}'. Type 'help'{C['W']}{hint}")

        except KeyboardInterrupt:
            for t in _tasks.values(): t["run"] = False
            print(f"\n{C['Y']}Stopped{C['W']}"); break
        except Exception as e:
            print(f"{C['R']}Error: {e}{C['W']}")

if __name__ == "__main__":
    try: main()
    except KeyboardInterrupt: pass
    except Exception as e: print(f"{C['R']}{e}{C['W']}")
