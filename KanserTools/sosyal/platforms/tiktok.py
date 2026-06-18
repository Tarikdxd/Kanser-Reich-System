import time
import random
import requests


def _get_session(**kw):
    s = requests.Session()
    s.proxies = kw.get("proxy")
    s.headers.update(kw.get("headers", {}))
    return s


def follow(session, target, **kw):
    try:
        s = session or _get_session(**kw)
        url = f"https://www.tiktok.com/@{target}"
        r = s.get(url, timeout=10)
        time.sleep(random.uniform(1, 3))
        return r.status_code == 200
    except Exception:
        return False


def like(session, target, **kw):
    try:
        s = session or _get_session(**kw)
        video_id = kw.get("video_id", target)
        url = f"https://www.tiktok.com/@{kw.get('username', 'user')}/video/{video_id}"
        r = s.get(url, timeout=10)
        time.sleep(random.uniform(1, 3))
        return r.status_code == 200
    except Exception:
        return False


def view(session, target, **kw):
    try:
        s = session or _get_session(**kw)
        url = target if target.startswith("http") else f"https://www.tiktok.com/@{kw.get('username', 'user')}/video/{target}"
        r = s.get(url, timeout=10)
        time.sleep(random.uniform(2, 5))
        return r.status_code == 200
    except Exception:
        return False
