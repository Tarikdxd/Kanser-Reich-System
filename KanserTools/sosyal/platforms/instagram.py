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
        url = f"https://www.instagram.com/{target}/"
        r = s.get(url, timeout=10)
        time.sleep(random.uniform(1, 3))
        return r.status_code == 200
    except Exception:
        return False


def like(session, target, **kw):
    try:
        s = session or _get_session(**kw)
        post_id = kw.get("post_id", target)
        url = f"https://www.instagram.com/p/{post_id}/"
        r = s.get(url, timeout=10)
        time.sleep(random.uniform(1, 3))
        return r.status_code == 200
    except Exception:
        return False


def view_story(session, target, **kw):
    try:
        s = session or _get_session(**kw)
        url = f"https://www.instagram.com/stories/{target}/"
        r = s.get(url, timeout=10)
        time.sleep(random.uniform(1, 3))
        return r.status_code == 200
    except Exception:
        return False
