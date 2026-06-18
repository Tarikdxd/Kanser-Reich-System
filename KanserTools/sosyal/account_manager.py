#!/usr/bin/env python3
# KANSERSOSYAL — Account Manager
import json, os, random, string

class AccountManager:
    def __init__(self):
        self.accounts = {"youtube":[],"tiktok":[],"instagram":[],"github":[],"discord":[],"spotify":[],"kick":[],"twitch":[]}
        self._load()

    def _load(self):
        try:
            with open("accounts.json","r") as f: self.accounts = json.load(f)
        except: pass

    def save(self):
        with open("accounts.json","w") as f: json.dump(self.accounts, f)

    def add(self, platform, username, password, cookies=None):
        self.accounts.setdefault(platform, []).append({"user":username,"pass":password,"cookies":cookies or {}})
        self.save()

    def get(self, platform):
        pool = self.accounts.get(platform, [])
        return random.choice(pool) if pool else None

    def generate_email(self):
        return f"user{random.randint(10000,99999)}@{"".join(random.choices(string.ascii_lowercase,k=8))}.com"
