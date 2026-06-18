#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANSERSOSYAL v1.0 — Core Engine
Multi-thread bot farm, proxy rotation, request queue
"""
import threading, queue, time, random, json, os, sys, requests
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))
from proxy_manager import ProxyManager
from account_manager import AccountManager

class Task:
    def __init__(self, platform, action, target, amount, **kwargs):
        self.platform = platform
        self.action = action
        self.target = target
        self.amount = amount
        self.done = 0
        self.failed = 0
        self.running = True
        self.kwargs = kwargs
        self.start_time = None
        self.end_time = None

class CoreEngine:
    def __init__(self):
        self.proxy = ProxyManager()
        self.accounts = AccountManager()
        self.tasks = {}
        self.task_id = 0
        self.stats = {"total_requests": 0, "total_success": 0, "total_failed": 0}
        self.callback = None

    def set_callback(self, cb):
        self.callback = cb

    def log(self, msg, level="info"):
        if self.callback: self.callback(level, msg)

    def add_task(self, platform, action, target, amount, **kwargs):
        tid = self.task_id; self.task_id += 1
        task = Task(platform, action, target, amount, **kwargs)
        self.tasks[tid] = task
        threading.Thread(target=self._run_task, args=(tid,), daemon=True).start()
        return tid

    def stop_task(self, tid):
        if tid in self.tasks:
            self.tasks[tid].running = False

    def _run_task(self, tid):
        task = self.tasks[tid]
        task.start_time = datetime.now()
        module = self._load_platform(task.platform)
        if not module:
            self.log(f"[{task.platform}] Platform not found")
            return

        func = getattr(module, task.action, None)
        if not func:
            self.log(f"[{task.platform}] Action '{task.action}' not found")
            return

        threads = min(task.amount, 100)
        workers = min(threads, 50)

        q = queue.Queue()
        for _ in range(task.amount):
            q.put(None)

        def worker():
            session = requests.Session()
            while task.running and not q.empty():
                try:
                    q.get_nowait()
                    proxy = self.proxy.get()
                    ua = self._random_ua()
                    headers = self._random_headers(ua)
                    result = func(session, task.target, proxy=proxy, headers=headers, **task.kwargs)
                    if result:
                        task.done += 1; self.stats["total_success"] += 1
                    else:
                        task.failed += 1; self.stats["total_failed"] += 1
                    self.stats["total_requests"] += 1
                    if task.done % 50 == 0:
                        self.log(f"[{task.platform}] {task.action}: {task.done}/{task.amount} ({task.failed} failed)")
                except queue.Empty: break
                except: task.failed += 1

        threads_list = []
        for _ in range(workers):
            t = threading.Thread(target=worker, daemon=True)
            t.start(); threads_list.append(t)

        for t in threads_list:
            t.join()

        task.end_time = datetime.now()
        task.running = False
        self.log(f"[{task.platform}] DONE: {task.done}/{task.amount} ({task.failed} failed) in {task.end_time - task.start_time}")

    def _load_platform(self, name):
        try:
            import importlib
            return importlib.import_module(f"platforms.{name}")
        except: return None

    def _random_ua(self):
        ua_list = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1",
            "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36",
            "Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
        ]
        return random.choice(ua_list)

    def _random_headers(self, ua=None):
        return {
            "User-Agent": ua or self._random_ua(),
            "Accept": random.choice(["text/html,application/xhtml+xml", "*/*"]),
            "Accept-Language": random.choice(["en-US,en;q=0.9", "tr-TR,tr;q=0.9,en;q=0.8", "de-DE,de;q=0.9"]),
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120"',
            "Sec-Ch-Ua-Platform": random.choice(['"Windows"', '"macOS"', '"Android"']),
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
        }

    def get_stats(self):
        return {
            "stats": self.stats,
            "tasks": {tid: {"platform": t.platform, "action": t.action, "target": t.target, "amount": t.amount, "done": t.done, "failed": t.failed, "running": t.running} for tid, t in self.tasks.items()},
            "proxy_count": len(self.proxy.proxies),
            "account_count": len(self.accounts.accounts),
        }

if __name__ == "__main__":
    e = CoreEngine()
