#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANSER MONITOR — Reporter Module
Tum KanserTools araclari bu modulu import edip olay bildirir.
"""
import requests, json, time, threading, queue, os

MONITOR_URL = "https://discord-bot.kanserbusiness.workers.dev/monitor"
DISCORD_UID = "536233019330002975"
BATCH_INTERVAL = 2  # Mesajlar arasi bekleme (saniye)

_send_queue = queue.Queue()
_running = False

def _sender_loop():
    """Arka planda sirayla gonderir"""
    global _running
    _running = True
    while _running:
        try:
            item = _send_queue.get(timeout=5)
            if item is None: break
            data, retries = item
            for attempt in range(retries + 1):
                try:
                    r = requests.post(MONITOR_URL, json=data, timeout=10)
                    if r.status_code == 200: break
                except: pass
                time.sleep(1)
            time.sleep(BATCH_INTERVAL)
        except queue.Empty:
            pass

_sender_thread = threading.Thread(target=_sender_loop, daemon=True)
_sender_thread.start()

def report(tool, event, data=None, uid=None):
    """Olay bildir — otomatik siraya alir, Discord'a gonderir"""
    payload = {
        "tool": tool,
        "event": event,
        "data": _safe_json(data),
        "uid": uid or DISCORD_UID,
        "ts": int(time.time())
    }
    _send_queue.put((payload, 2))

def _safe_json(obj):
    """Buyuk verileri kisalt, json uyumlu yap"""
    if obj is None: return {}
    if isinstance(obj, (str, int, float, bool)):
        return {"value": str(obj)[:1500]}
    if isinstance(obj, dict):
        return {k: str(v)[:800] if not isinstance(v, (dict, list)) else _safe_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [str(x)[:500] for x in obj[:20]]
    return {"value": str(obj)[:1500]}

def shutdown():
    global _running
    _running = False
    _send_queue.put(None)

# Otomatik mod — import edilince calisir
__all__ = ["report", "shutdown", "MONITOR_URL", "DISCORD_UID"]
