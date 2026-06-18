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
        url = f"https://kick.com/{target}"
        r = s.get(url, timeout=10)
        time.sleep(random.uniform(1, 3))
        return r.status_code == 200
    except Exception:
        return False


def live(session, target, **kw):
    try:
        s = session or _get_session(**kw)
        url = f"https://kick.com/{target}"
        r = s.get(url, timeout=10)
        time.sleep(random.uniform(2, 5))
        return r.status_code == 200
    except Exception:
        return False


def chat(session, target, **kw):
    try:
        s = session or _get_session(**kw)
        url = f"https://kick.com/{target}"
        r = s.get(url, timeout=10)
        time.sleep(random.uniform(1, 3))
        return r.status_code == 200
    except Exception:
        return False
