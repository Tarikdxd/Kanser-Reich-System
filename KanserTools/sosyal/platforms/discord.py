import time
import random
import requests


def _get_session(**kw):
    s = requests.Session()
    s.proxies = kw.get("proxy")
    s.headers.update(kw.get("headers", {}))
    return s


def join_server(session, target, **kw):
    try:
        s = session or _get_session(**kw)
        token = kw.get("token")
        if not token:
            return False
        url = f"https://discord.com/api/v9/invites/{target}"
        headers = dict(kw.get("headers", {}))
        headers["Authorization"] = token
        r = s.post(url, headers=headers, timeout=10)
        time.sleep(random.uniform(1, 3))
        return r.status_code == 200
    except Exception:
        return False


def dm(session, target, **kw):
    try:
        token = kw.get("token")
        if not token:
            return False
        s = session or _get_session(**kw)
        user_id = target
        message = kw.get("message", "")
        url = "https://discord.com/api/v9/users/@me/channels"
        payload = {"recipient_id": user_id}
        headers = dict(kw.get("headers", {}))
        headers["Authorization"] = token
        headers["Content-Type"] = "application/json"
        r = s.post(url, json=payload, headers=headers, timeout=10)
        if r.status_code not in (200, 201):
            return False
        channel_id = r.json().get("id", "")
        if not channel_id:
            return False
        msg_url = f"https://discord.com/api/v9/channels/{channel_id}/messages"
        msg_payload = {"content": message}
        r2 = s.post(msg_url, json=msg_payload, headers=headers, timeout=10)
        time.sleep(random.uniform(1, 3))
        return r2.status_code == 200
    except Exception:
        return False
