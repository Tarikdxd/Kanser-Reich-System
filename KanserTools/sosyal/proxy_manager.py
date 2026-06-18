#!/usr/bin/env python3
# KANSERSOSYAL — Proxy Manager (auto-scrape, test, rotate)
import requests, threading, time, random, json, os

class ProxyManager:
    def __init__(self):
        self.proxies = []
        self.index = 0
        self.lock = threading.Lock()
        self._scrape()
        threading.Thread(target=self._refresh_loop, daemon=True).start()

    def _scrape(self):
        sources = [
            "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=all&ssl=all&anonymity=all",
            "https://www.proxy-list.download/api/v1/get?type=http",
            "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt",
            "https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt",
            "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt",
        ]
        new = []
        for url in sources:
            try:
                resp = requests.get(url, timeout=10)
                for line in resp.text.strip().split("\n"):
                    line = line.strip()
                    if ":" in line and not line.startswith("#"):
                        new.append(line)
            except: pass
        with self.lock:
            for p in set(new):
                if p not in self.proxies:
                    self.proxies.append(p)

    def _refresh_loop(self):
        while True:
            time.sleep(300)
            self._scrape()

    def get(self):
        with self.lock:
            if not self.proxies: return None
            p = self.proxies[self.index % len(self.proxies)]
            self.index += 1
            return {"http": f"http://{p}", "https": f"http://{p}"}

    def test(self, proxy, timeout=5):
        try:
            r = requests.get("http://httpbin.org/ip", proxies={"http": proxy, "https": proxy}, timeout=timeout)
            return r.status_code == 200
        except: return False
