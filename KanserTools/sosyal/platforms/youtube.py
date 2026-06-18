#!/usr/bin/env python3
# KANSERSOSYAL — YouTube: View, Sub, Like, Live Viewer
import requests, time, random, re, json

def view(session, target, **kw):
    """Video izlenme"""
    try:
        proxies = kw.get("proxy"); headers = kw.get("headers", {})
        vid = target.split("v=")[-1].split("&")[0] if "youtube.com" in target else target
        r = session.get(f"https://www.youtube.com/watch?v={vid}", proxies=proxies, headers=headers, timeout=10)
        if r.status_code == 200 and 'videoDetails' in r.text:
            time.sleep(random.randint(5, 15))
            return True
    except: pass
    return False

def sub(session, target, **kw):
    """Abone ol"""
    try:
        proxies = kw.get("proxy"); headers = kw.get("headers", {})
        channel = target.replace("@","").split("/")[-1] if "/" in target else target
        r = session.get(f"https://www.youtube.com/@{channel}?sub_confirmation=1", proxies=proxies, headers=headers, timeout=10)
        return r.status_code == 200
    except: return False

def like(session, target, **kw):
    """Like"""
    try:
        proxies = kw.get("proxy"); headers = kw.get("headers", {})
        vid = target.split("v=")[-1].split("&")[0] if "youtube.com" in target else target
        r = session.get(f"https://www.youtube.com/watch?v={vid}", proxies=proxies, headers=headers, timeout=10)
        return r.status_code == 200 and 'like' in r.text.lower()
    except: return False

def live(session, target, **kw):
    """Canli yayin izleyici"""
    try:
        proxies = kw.get("proxy"); headers = kw.get("headers", {})
        vid = target.split("v=")[-1].split("&")[0] if "youtube.com" in target else target
        r = session.get(f"https://www.youtube.com/watch?v={vid}", proxies=proxies, headers=headers, timeout=10)
        return r.status_code == 200
    except: return False
