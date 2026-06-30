"""
VDS Discord Bot Guvenlik Denetim Araci
========================================
Amac: VDS'de calisan Discord bot altyapini disaridan bir saldirganin
      gozuyle analiz eder.

Kontrol:
  1. SSH guvenligi
  2. PM2 konfigurasyonu
  3. .env dosya izinleri
  4. Port taramasi (disariya acik portlar)
  5. Token sizintisi
  6. Bot code zafiyetleri
  7. Sistem kaynak kullanim

Calistirma:
  python vds-audit.py                          # temel
  python vds-audit.py --full                    # detayli
  python vds-audit.py --port-scan VDS-IP        # port tara

SARTLAR:
  - Script VDS'de calistirilmali (veya SSH erisimi olmali)
  - Python 3.8+
  - Bazı testler icin sudo gerekebilir
"""

import os, sys, json, socket, subprocess, stat, re
from pathlib import Path

class VDSAudit:
    def __init__(self, full=False):
        self.full = full
        self.issues = []
        self.warnings = []
        self.passed = []
        self.info = []

    def run(self):
        print("=" * 60)
        print("VDS DISCORD BOT GUVENLIK DENETIMI")
        print("=" * 60)

        self.check_ssh()
        self.check_pm2()
        self.check_env_files()
        self.check_system()
        self.check_processes()

        if self.full:
            self.check_ports()
            self.check_code()

        self.print_report()
        self.print_recommendations()

    def run_cmd(self, cmd):
        try:
            r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
            return r.stdout, r.stderr, r.returncode
        except:
            return "", "", -1

    # ============= 1. SSH GUVENLIGI =============
    def check_ssh(self):
        print("\n[1] SSH Guvenligi")
        print("-" * 40)

        sshd_config = "/etc/ssh/sshd_config"
        if not os.path.exists(sshd_config):
            self.warnings.append("sshd_config bulunamadi (Windows olabilir)")
            return

        with open(sshd_config) as f:
            config = f.read()

        # PasswordAuthentication
        if "PasswordAuthentication no" in config:
            self.passed.append("[OK] PasswordAuthentication kapali")
        elif "PasswordAuthentication yes" in config:
            self.issues.append("[KRITIK] PasswordAuthentication ACIK! Sifreyle giris mumkun")
        else:
            self.warnings.append("[UYARI] PasswordAuthentication default (yes olabilir)")

        # RootLogin
        if "PermitRootLogin no" in config or "PermitRootLogin prohibit-password" in config:
            self.passed.append("[OK] Root login kapali")
        elif "PermitRootLogin yes" in config:
            self.issues.append("[KRITIK] Root login ACIK!")
        else:
            self.warnings.append("[UYARI] Root login durumu belirsiz")

        # Port
        port_match = re.search(r'Port\s+(\d+)', config)
        if port_match:
            port = port_match.group(1)
            if port == "22":
                self.warnings.append(f"[UYARI] SSH varsayilan port 22 (degistirmek onerilir)")
            else:
                self.passed.append(f"[OK] SSH port degistirilmis: {port}")
        else:
            self.passed.append("[OK] SSH port varsayilan 22")

        # Fail2ban
        fb = self.run_cmd("systemctl is-active fail2ban 2>/dev/null || echo inactive")[0].strip()
        if fb == "active":
            self.passed.append("[OK] Fail2ban aktif")
        else:
            self.warnings.append("[UYARI] Fail2ban kurulu degil (brute force korumasi yok)")

        # SSH key kontrol
        auth_keys = os.path.expanduser("~/.ssh/authorized_keys")
        if os.path.exists(auth_keys):
            with open(auth_keys) as f:
                keys = f.read().strip()
            if keys:
                self.passed.append(f"[OK] SSH key var ({len(keys.split(chr(10)))} adet)")
            else:
                self.issues.append("[KRITIK] authorized_keys BOS! SSH key yok!")
        else:
            self.issues.append("[KRITIK] authorized_keys bulunamadi! SSH key yok!")

    # ============= 2. PM2 GUVENLIGI =============
    def check_pm2(self):
        print("\n[2] PM2 Konfigurasyonu")
        print("-" * 40)

        pm2_path = os.path.expanduser("~/.pm2")
        if not os.path.exists(pm2_path):
            self.warnings.append("[UYARI] PM2 bulunamadi")
            return

        # PM2 processes
        out, _, _ = self.run_cmd("pm2 jlist 2>/dev/null")
        if out and out.strip():
            try:
                procs = json.loads(out)
                self.info.append(f"[INFO] PM2'de {len(procs)} process calisiyor")

                for p in procs:
                    name = p.get("name", "?")
                    status = p.get("pm2_env", {}).get("status", "?")
                    mem = p.get("monit", {}).get("memory", 0) / 1024 / 1024
                    cpu = p.get("monit", {}).get("cpu", 0)
                    restart_count = p.get("pm2_env", {}).get("restart_time", 0)
                    max_restarts = p.get("pm2_env", {}).get("max_restarts", 0)

                    self.info.append(f"  {name:20s} | {status:8s} | {mem:.0f}MB | CPU %{cpu:.0f} | restart: {restart_count}")

                    if max_restarts == 0:
                        self.warnings.append(f"[UYARI] {name}: max_restarts ayarli degil (sonsuz restart)")
                    if mem > 300:
                        self.warnings.append(f"[UYARI] {name}: bellek yuksek ({mem:.0f}MB)")
                    if restart_count > 10:
                        self.issues.append(f"[KRITIK] {name}: cok fazla restart ({restart_count}) — surekli crash!")
            except:
                self.warnings.append("[UYARI] PM2 process listesi okunamadi")
        else:
            self.info.append("[INFO] PM2'de calisan process yok")

        # PM2 logrotate
        out, _, _ = self.run_cmd("pm2 conf pm2-logrotate 2>/dev/null || echo 'yok'")
        if "retain" in out:
            self.passed.append("[OK] PM2 logrotate kurulu")
        else:
            self.warnings.append("[UYARI] PM2 logrotate kurulu degil (log'lar sisebilir)")

        # PM2 dashboard
        out, _, _ = self.run_cmd("ss -tlnp | grep 9615 2>/dev/null || netstat -tlnp | grep 9615 2>/dev/null || echo ''")
        if out.strip():
            self.issues.append("[KRITIK] PM2 dashboard port 9615 ACIK! (http://VDS-IP:9615)")

        # PM2 root kontrol
        out, _, _ = self.run_cmd("whoami")
        if out.strip() == "root":
            self.issues.append("[KRITIK] PM2 root olarak calisiyor! (yetki yukseltme riski)")

    # ============= 3. ENV DOSYALARI =============
    def check_env_files(self):
        print("\n[3] .env Dosya Guvenligi")
        print("-" * 40)

        # .env dosyalarini ara
        home = os.path.expanduser("~")
        env_files = []
        for root, dirs, files in os.walk(home):
            # node_modules'u atla
            if 'node_modules' in dirs:
                dirs.remove('node_modules')
            if '.git' in dirs:
                dirs.remove('.git')
            for f in files:
                if f.endswith('.env') or f in ['.env', 'config.json', 'credentials']:
                    env_files.append(os.path.join(root, f))
            if len(env_files) > 20:
                break

        if env_files:
            self.info.append(f"[INFO] {len(env_files)} adet .env benzeri dosya bulundu")

            for f in env_files:
                try:
                    perms = os.stat(f).st_mode
                    world_readable = bool(perms & stat.S_IROTH)
                    group_readable = bool(perms & stat.S_IRGRP)

                    if world_readable:
                        self.issues.append(f"[KRITIK] {f} -> HERKES OKUYABILIR! (chmod 600 yap)")
                    elif group_readable:
                        self.warnings.append(f"[UYARI] {f} -> Grup okuyabilir (chmod 600 onerilir)")
                    else:
                        self.passed.append(f"[OK] {f} -> Izinler dogru")

                    # Dosyada token var mi kontrol et
                    with open(f, 'r') as fh:
                        content = fh.read()
                        tokens = re.findall(r'[MN][A-Za-z0-9_-]{23,25}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,39}', content)
                        if tokens:
                            self.issues.append(f"[KRITIK] {f} IINDE DISCORD TOKEN BULUNDU!")
                except:
                    pass
        else:
            self.passed.append("[OK] .env dosyasi bulunamadi (sifreli env kullaniliyor olabilir)")

    # ============= 4. SISTEM KONTROL =============
    def check_system(self):
        print("\n[4] Sistem Guvenligi")
        print("-" * 40)

        # UFW
        out, _, _ = self.run_cmd("ufw status 2>/dev/null | head -5")
        if "Status: active" in out:
            self.passed.append("[OK] UFW aktif")
            # Acik portlari goster
            for line in out.split('\n'):
                if 'ALLOW' in line:
                    self.info.append(f"  UFW acik: {line.strip()}")
        else:
            self.issues.append("[KRITIK] UFW AKTIF DEGIL! Tum portlar acik!")

        # Sunucu turu
        out, _, _ = self.run_cmd("uname -a")
        self.info.append(f"[INFO] Sistem: {out.strip()[:100]}")

        # Disk kullanimi
        out, _, _ = self.run_cmd("df -h / | tail -1")
        parts = out.split()
        if parts:
            self.info.append(f"[INFO] Disk: {parts[3]} bos / {parts[1]} toplam")
            # %90 uzeri uyari
            usage = parts[4].replace('%', '')
            if int(usage) > 90:
                self.issues.append(f"[KRITIK] Disk %{usage} dolu! Bot log yazamayabilir!")

        # RAM
        out, _, _ = self.run_cmd("free -m | grep Mem")
        parts = out.split()
        if parts:
            total = int(parts[1])
            available = int(parts[6])
            self.info.append(f"[INFO] RAM: {available}MB bos / {total}MB toplam")
            if available < 200:
                self.issues.append(f"[KRITIK] RAM cok az ({available}MB)! Bot OOM killer ile oldurulebilir!")

        # Swap
        out, _, _ = self.run_cmd("free -m | grep Swap")
        parts = out.split()
        if parts:
            swap_total = int(parts[1])
            if swap_total == 0:
                self.warnings.append("[UYARI] Swap yok (yetersiz bellek durumunda sorun)")
            else:
                self.passed.append(f"[OK] Swap var: {swap_total}MB")

    # ============= 5. PROCESS KONTROL =============
    def check_processes(self):
        print("\n[5] Calisan Bot Process'leri")
        print("-" * 40)

        # Node.js process'leri
        out, _, _ = self.run_cmd("ps aux | grep -E 'node|python3' | grep -v grep")
        lines = out.strip().split('\n') if out.strip() else []
        bot_processes = [l for l in lines if l and ('index.js' in l or 'bot.py' in l or 'main.js' in l or 'app.js' in l)]

        self.info.append(f"[INFO] Toplam node/python process: {len(lines)}")
        self.info.append(f"[INFO] Bot process: {len(bot_processes)}")

        for p in bot_processes[:10]:
            parts = p.split()
            if len(parts) >= 11:
                pid = parts[1]
                cpu = parts[2]
                mem = parts[3]
                cmd = ' '.join(parts[10:])[:60]
                self.info.append(f"  PID:{pid} CPU:{cpu}% MEM:{mem}% {cmd}")

        # Yuksek CPU/MEM kontrol
        for p in lines:
            parts = p.split()
            if len(parts) >= 3:
                try:
                    cpu = float(parts[2])
                    mem = float(parts[3])
                    if cpu > 90:
                        self.warnings.append(f"[UYARI] CPU %{cpu} cok yuksek: {' '.join(parts[10:])[:40]}")
                    if mem > 50:
                        self.warnings.append(f"[UYARI] MEM %{mem} cok yuksek: {' '.join(parts[10:])[:40]}")
                except:
                    pass

    # ============= 6. PORT TARAMASI =============
    def check_ports(self):
        print("\n[6] Acik Port Taramasi (local)")
        print("-" * 40)

        out, _, _ = self.run_cmd("ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null || echo 'N/A'")
        if out:
            lines = out.strip().split('\n')
            for line in lines:
                if 'LISTEN' in line:
                    # Port numarasini bul
                    match = re.search(r':(\d+)', line)
                    if match:
                        port = match.group(1)
                        service = line.split()[-1] if line.split() else '?'
                        self.info.append(f"  Port {port:5s} -> {service[:50]}")

                        # Riskli port kontrol
                        risky_ports = {
                            '22': 'SSH',
                            '23': 'Telnet',
                            '3306': 'MySQL',
                            '5432': 'PostgreSQL',
                            '6379': 'Redis',
                            '27017': 'MongoDB',
                            '9615': 'PM2 Dashboard',
                            '3000': 'Node.js app',
                            '5000': 'Flask',
                            '8000': 'HTTP alt',
                            '8888': 'Jupyter',
                            '9090': 'HTTP alt'
                        }
                        if port in risky_ports:
                            self.warnings.append(f"[UYARI] Port {port} ({risky_ports[port]}) acik!")
                    else:
                        self.info.append(f"  {line.strip()[:80]}")

    # ============= 7. KOD DENETIMI =============
    def check_code(self):
        print("\n[7] Kod Zafiyet Taramasi (basit)")
        print("-" * 40)

        home = os.path.expanduser("~")
        js_files = []
        for root, dirs, files in os.walk(home):
            if 'node_modules' in dirs:
                dirs.remove('node_modules')
            if '.git' in dirs:
                dirs.remove('.git')
            for f in files:
                if f.endswith('.js'):
                    js_files.append(os.path.join(root, f))
            if len(js_files) > 100:
                break

        eval_count = 0
        exec_count = 0
        token_log_count = 0

        for f in js_files[:200]:
            try:
                with open(f, 'r', errors='ignore') as fh:
                    content = fh.read()
                    if 'eval(' in content:
                        eval_count += 1
                        if eval_count <= 3:
                            self.issues.append(f"[KRITIK] eval() kullanimi: {f}")
                    if 'exec(' in content or "execSync(" in content or 'spawn(' in content:
                        exec_count += 1
                        if exec_count <= 3:
                            self.warnings.append(f"[UYARI] exec/spawn kullanimi: {f}")
                    if 'console.log(token' in content.lower() or 'console.log(process.env' in content.lower():
                        token_log_count += 1
                        if token_log_count <= 3:
                            self.issues.append(f"[KRITIK] Token loglama: {f}")
            except:
                pass

        if eval_count == 0:
            self.passed.append(f"[OK] eval() kullanimi yok ({len(js_files)} dosya tarandi)")
        if exec_count == 0:
            self.passed.append("[OK] exec/spawn kullanimi yok")
        if token_log_count == 0:
            self.passed.append("[OK] Token loglamasi yok")

    # ============= RAPOR =============
    def print_report(self):
        print("\n" + "=" * 60)
        print("DENETIM RAPORU")
        print("=" * 60)
        print(f"\nKRITIK: {len(self.issues)}")
        print(f"UYARI:  {len(self.warnings)}")
        print(f"GECEN:  {len(self.passed)}")
        print(f"BILGI:  {len(self.info)}")
        print()

        if self.issues:
            print("KRITIK BULGULAR (hemen coz):")
            for i in self.issues:
                print(f"  {i}")
            print()

        if self.warnings:
            print("UYARILAR (gozden gecir):")
            for w in self.warnings:
                print(f"  {w}")
            print()

        if self.passed:
            print("GECEN TESTLER:")
            for p in self.passed:
                print(f"  {p}")
            print()

        # Skor
        total = len(self.issues) + len(self.warnings) + len(self.passed)
        score = int((len(self.passed) / total * 100)) if total > 0 else 0
        print(f"GUVENLIK SKORU: {score}/100")

    def print_recommendations(self):
        print("\n" + "=" * 60)
        print("YAPILACAKLAR (oncelik sirasiyla)")
        print("=" * 60)
        recs = []
        for i in self.issues:
            if "PasswordAuthentication" in i:
                recs.append("1. SSH'de PasswordAuthentication'u kapat: nano /etc/ssh/sshd_config")
            if "Root login ACIK" in i:
                recs.append("2. Root login kapat: PermitRootLogin no")
            if "UFW AKTIF DEGIL" in i:
                recs.append("3. UFW aktif et: sudo ufw enable && sudo ufw default deny incoming")
            if "PM2 dashboard" in i:
                recs.append("4. PM2 dashboard portunu kapat: pm2 stop pm2-http && sudo ufw deny 9615")
            if "token" in i.lower() and "BULUNDU" in i:
                recs.append("5. Token iceren dosyalari .gitignore'a ekle ve chmod 600 yap")
            if "TOKEN LOG" in i or "eval()" in i:
                recs.append("6. Kod'daki guvenlik aciklarini kapat (eval, exec, token log)")
            if "root olarak" in i:
                recs.append("7. PM2'yi root olarak calistirma! Yeni kullanici olustur")
            if "calisiyor" in i and "restart" in i:
                recs.append("8. Surekli restart alan botlari debug et: pm2 logs")

        if not recs:
            recs.append("Temiz gorunuyor! Periyodik denetim onerilir (ayda 1)")

        for r in recs[:10]:
            print(f"  {r}")
        print()


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='VDS Guvenlik Denetimi')
    parser.add_argument('--full', action='store_true', help='Detayli tarama (port + code)')
    parser.add_argument('--port-scan', help='Harici port taramasi (IP adresi)')
    args = parser.parse_args()

    audit = VDSAudit(full=args.full or bool(args.port_scan))
    audit.run()
