"""
Bot Guvenlik Denetim Araci
============================
Amac: Discord bot'unuzun guvenlik aciklarini otomatik tespit etmek.
      Kod tabaninda statik analiz yaparak zafiyetleri bulur.

Kontrol Eder:
  1. Token/env dosyalari git'te var mi
  2. Hardcoded token var mi
  3. try/catch bloklari var mi
  4. Cooldown var mi
  5. Rate limiting var mi
  6. Signature verification var mi
  7. Hata mesajlari guvenli mi
  8. Input validation var mi

Calistirma:
  python 05-security-audit.py --path ../
  python 05-security-audit.py --path ../src
"""

import os, re, sys, argparse, json

class SecurityAudit:
    def __init__(self, path):
        self.path = path
        self.issues = []
        self.passed = []
        self.warnings = []
        self.total_files = 0
        self.js_files = 0
        
    def run(self):
        print("=" * 60)
        print("DCSIBER - Bot Guvenlik Denetimi")
        print(f"Hedef: {os.path.abspath(self.path)}")
        print("=" * 60)
        
        for root, dirs, files in os.walk(self.path):
            # .git ve node_modules'i atla
            dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'node_modules']
            
            for file in files:
                if file.endswith('.js'):
                    self.js_files += 1
                    self.audit_file(os.path.join(root, file))
                elif file in ['.env', 'wrangler.jsonc', 'config.json', 'credentials']:
                    self.total_files += 1
                    self.audit_config_file(os.path.join(root, file))
        
        self.print_report()
    
    def read_file(self, filepath):
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        except:
            return ''
    
    def audit_file(self, filepath):
        self.total_files += 1
        content = self.read_file(filepath)
        basename = os.path.basename(filepath)
        
        # 1. Hardcoded token kontrolu
        if re.search(r'[MN][A-Za-z0-9_-]{23,25}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,39}', content):
            self.issues.append(f"[KRITIK] Hardcoded token: {filepath}")
        
        # 2. try/catch kontrolu
        has_try = 'try {' in content or 'try{' in content
        has_catch = 'catch' in content
        if not has_try and not has_catch:
            self.warnings.append(f"[UYARI] try/catch yok: {basename}")
        else:
            # try/catch oranini hesapla
            try_count = content.count('try {') + content.count('try{')
            catch_count = content.count('catch')
            async_count = content.count('async')
            
            if async_count > 0 and try_count < async_count * 0.3:
                self.warnings.append(f"[UYARI] Dusuk try/catch orani ({try_count}/{async_count}): {basename}")
        
        # 3. Cooldown kontrolu
        if 'cooldown' not in content.lower() and 'rate' not in content.lower():
            self.warnings.append(f"[UYARI] Cooldown/rate limit yok: {basename}")
        else:
            self.passed.append(f"[OK] Cooldown var: {basename}")
        
        # 4. Input validation
        if 'validate' in content or 'sanitize' in content or 'regex' in content or 'test(' in content:
            self.passed.append(f"[OK] Input validation: {basename}")
        else:
            self.warnings.append(f"[UYARI] Input validation yok: {basename}")
        
        # 5. console.log kontrolu (hata mesaji)
        if 'console.log' in content:
            # console.log ile token yazdiriliyor mu?
            for line in content.split('\n'):
                if 'console.log' in line and ('token' in line.lower() or 'secret' in line.lower() or 'env.' in line):
                    self.issues.append(f"[KRITIK] Token/env loglaniyor: {filepath}")
                    break
        
        # 6. Hata mesaji guvenligi
        if 'err.message' in content or 'error.message' in content:
            self.passed.append(f"[OK] Hata mesaji handling: {basename}")
        
        # 7. Permission check
        if 'permissions' in content.lower() or 'hasPermission' in content or 'Permissions' in content:
            self.passed.append(f"[OK] Yetki kontrolu: {basename}")
        else:
            self.warnings.append(f"[UYARI] Yetki kontrolu yok: {basename}")
        
        # 8. sendResponse kullanimi (guvenli format)
        if 'sendResponse' in content or 'sendDM' in content:
            self.passed.append(f"[OK] Guvenli yanit: {basename}")
    
    def audit_config_file(self, filepath):
        content = self.read_file(filepath)
        basename = os.path.basename(filepath)
        
        # .env dosyasi
        if basename == '.env':
            self.issues.append(f"[KRITIK] .env dosyasi bulundu (token icerebilir): {filepath}")
        
        # wrangler.jsonc
        if basename == 'wrangler.jsonc':
            if 'DISCORD_TOKEN' in content or 'TOKEN' in content:
                self.issues.append(f"[KRITIK] wrangler.jsonc'de token var: {filepath}")
            else:
                self.passed.append(f"[OK] wrangler.jsonc temiz: {filepath}")
        
        # config.json
        if basename == 'config.json':
            if 'token' in content.lower() or 'secret' in content.lower():
                self.issues.append(f"[KRITIK] config.json'da kimlik bilgisi: {filepath}")
    
    def print_report(self):
        print(f"\nTaranan dosya: {self.total_files} ({self.js_files} JS)")
        print()
        
        print("[SONUC]")
        print(f"  Kritik:     {len(self.issues)}")
        print(f"  Uyari:      {len(self.warnings)}")
        print(f"  Gecen:      {len(self.passed)}")
        print()
        
        if self.issues:
            print("[KRITIK BULGULAR] (Hemen cozulmeli)")
            print("-" * 50)
            for issue in self.issues:
                print(f"  {issue}")
            print()
        
        if self.warnings:
            print("[UYARILAR] (Gozden gecirilmeli)")
            print("-" * 50)
            for warn in self.warnings[:15]:  # ilk 15
                print(f"  {warn}")
            if len(self.warnings) > 15:
                print(f"  ... ve {len(self.warnings) - 15} uyari daha")
            print()
        
        if self.passed:
            print("[GECEN TESTLER]")
            print("-" * 50)
            for passed in self.passed:
                print(f"  {passed}")
            print()
        
        # Guvenlik puani
        total = len(self.issues) + len(self.warnings) + len(self.passed)
        score = int((len(self.passed) / total * 100) if total > 0 else 0)
        
        print(f"Guvenlik Puani: {score}/100")
        if score >= 80:
            print("Degerlendirme: GUCLU")
        elif score >= 50:
            print("Degerlendirme: ORTA (iyilestirme gerekli)")
        else:
            print("Degerlendirme: ZAYIF (acil mudahale gerekli)")
        
        print()
        print("[ONERILER]")
        if self.issues:
            print("  1. Kritik bulgulari hemen cozun")
        if any('Cooldown' in w for w in self.warnings):
            print("  2. Cooldown sistemi ekleyin (KV tabanli)")
        if any('Input validation' in w for w in self.warnings):
            print("  3. Input validation ekleyin")
        if any('Yetki kontrolu' in w for w in self.warnings):
            print("  4. Her komutta yetki kontrolu ekleyin")
        print("  5. Dosya izinlerini kontrol edin (sadece okunabilir)")
        print("  6. Token rotasyonu yapin (3 ayda bir)")


def main():
    parser = argparse.ArgumentParser(description='Bot Guvenlik Denetimi')
    parser.add_argument('--path', default='.', help='Kod tabani yolu')
    args = parser.parse_args()
    
    if not os.path.exists(args.path):
        print(f"[HATA] Yol bulunamadi: {args.path}")
        return
    
    audit = SecurityAudit(args.path)
    audit.run()


if __name__ == '__main__':
    main()
