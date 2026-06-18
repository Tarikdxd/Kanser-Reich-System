import time
import random
import requests


def _get_session(**kw):
    s = requests.Session()
    s.proxies = kw.get("proxy")
    s.headers.update(kw.get("headers", {}))
    return s


def star(session, target, **kw):
    try:
        s = session or _get_session(**kw)
        parts = target.split("/", 1)
        user = parts[0]
        repo = parts[1] if len(parts) > 1 else kw.get("repo", "")
        url = f"https://github.com/{user}/{repo}"
        r = s.get(url, timeout=10)
        time.sleep(random.uniform(1, 3))
        return r.status_code == 200
    except Exception:
        return False


def fork(session, target, **kw):
    try:
        s = session or _get_session(**kw)
        parts = target.split("/", 1)
        user = parts[0]
        repo = parts[1] if len(parts) > 1 else kw.get("repo", "")
        url = f"https://github.com/{user}/{repo}/fork"
        r = s.get(url, timeout=10)
        time.sleep(random.uniform(1, 3))
        return r.status_code == 200
    except Exception:
        return False


def follow(session, target, **kw):
    try:
        s = session or _get_session(**kw)
        url = f"https://github.com/{target}"
        r = s.get(url, timeout=10)
        time.sleep(random.uniform(1, 3))
        return r.status_code == 200
    except Exception:
        return False
