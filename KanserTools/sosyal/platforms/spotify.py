import time
import random
import requests


def _get_session(**kw):
    s = requests.Session()
    s.proxies = kw.get("proxy")
    s.headers.update(kw.get("headers", {}))
    return s


def stream(session, target, **kw):
    try:
        s = session or _get_session(**kw)
        track_id = kw.get("track_id", target)
        url = f"https://open.spotify.com/track/{track_id}"
        r = s.get(url, timeout=10)
        time.sleep(30)
        return r.status_code == 200
    except Exception:
        return False


def follow(session, target, **kw):
    try:
        s = session or _get_session(**kw)
        user_id = kw.get("user_id", target)
        url = f"https://open.spotify.com/user/{user_id}"
        r = s.get(url, timeout=10)
        time.sleep(random.uniform(1, 3))
        return r.status_code == 200
    except Exception:
        return False


def save_playlist(session, target, **kw):
    try:
        s = session or _get_session(**kw)
        playlist_id = kw.get("playlist_id", target)
        url = f"https://open.spotify.com/playlist/{playlist_id}"
        r = s.get(url, timeout=10)
        time.sleep(random.uniform(1, 3))
        return r.status_code == 200
    except Exception:
        return False
