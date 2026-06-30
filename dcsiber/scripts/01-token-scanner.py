"""
Discord Token Tarama (Egitim Araci)
=====================================
Amac: Kendi projelerinizde yanlislikla biraktiginiz token'lari
      bulmaniz icin. Baskalarinin projelerinde KULLANMAYIN.

Calistirma:
  python 01-token-scanner.py --path C:\Projects\discord-bot
  python 01-token-scanner.py --path .          (su anki dizin)

Uyari: Bu script SADECE egitim amaciyla kullanilmalidir.
"""

import os, re, sys, argparse

# Discord token pattern: MTxx...xx.xx.xx seklinde
TOKEN_PATTERN = re.compile(r'[MN][A-Za-z0-9_-]{23,25}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,39}')
ENV_PATTERN = re.compile(r'(?:token|discord_token|bot_token|secret|password)\s*[:=]\s*["\']?[A-Za-z0-9_\-\.]+', re.IGNORECASE)

# Taranmayacak dosya/dizinler
IGNORE_DIRS = {'.git', 'node_modules', '__pycache__', 'venv', '.venv', 'dist', 'build', '.wrangler'}
IGNORE_FILES = {'.gitignore', 'package-lock.json', '*.pyc'}

# Riski dosyalar (token bulunma olasiligi yuksek)
RISK_PATTERNS = ['register', 'config', 'credential', 'secret', 'token', '.env', 'wrangler', 'auth']

def scan_file(filepath):
    findings = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        # Discord token ara
        tokens = TOKEN_PATTERN.findall(content)
        for t in tokens:
            findings.append({
                'type': 'DISCORD_TOKEN',
                'match': t[:20] + '...' + t[-5:],
                'file': filepath
            })
            
        # .env / config benzeri dosyalarda token pattern
        basename = os.path.basename(filepath).lower()
        is_risk_file = any(p in basename for p in RISK_PATTERNS)
        
        if is_risk_file and ('token' in content.lower() or 'secret' in content.lower()):
            for line_no, line in enumerate(content.split('\n'), 1):
                if 'token' in line.lower() or 'secret' in line.lower():
                    cleaned = re.sub(r'["\'][A-Za-z0-9_\-\.]{10,}["\']', '"***GIZLI***"', line)
                    findings.append({
                        'type': 'RISK_FILE',
                        'match': f'Satir {line_no}: {cleaned.strip()[:80]}',
                        'file': filepath
                    })
    except Exception as e:
        pass
    return findings

def scan_directory(start_path):
    all_findings = []
    total_files = 0
    
    print(f"[+] Taranan klasor: {start_path}")
    print("[+] Baslatiyor...\n")
    
    for root, dirs, files in os.walk(start_path):
        # Ignore dizinleri atla
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith('.')]
        
        for file in files:
            if file in IGNORE_FILES or file.endswith(('.pyc', '.png', '.jpg', '.zip', '.exe', '.dll')):
                continue
                
            filepath = os.path.join(root, file)
            total_files += 1
            
            # Sadece text dosyalarini tara
            ext = os.path.splitext(file)[1].lower()
            if ext in ['.js', '.py', '.json', '.txt', '.yml', '.yaml', '.env', '.sh', '.bat', '.md', '.html', '.css']:
                findings = scan_file(filepath)
                all_findings.extend(findings)
    
    return all_findings, total_files


def main():
    parser = argparse.ArgumentParser(description='Discord Token Scanner (Egitim)')
    parser.add_argument('--path', default='.', help='Taranacak klasor')
    args = parser.parse_args()
    
    if not os.path.exists(args.path):
        print(f"[HATA] Klasor bulunamadi: {args.path}")
        return
    
    findings, total = scan_directory(args.path)
    
    print("\n" + "="*60)
    print(f"TARAMA SONUCU")
    print(f"Taranan dosya: {total}")
    print(f"Toplam bulgu: {len(findings)}")
    print("="*60)
    
    if not findings:
        print("\n[GUVENLI] Token veya kimlik bilgisi bulunamadi.")
        print("[OK] Projeniz guvende.")
    else:
        print("\n[UYARI] Asagidaki bulgular incelenmeli:")
        for f in findings:
            print(f"  [{f['type']}] {f['file']}")
            print(f"           {f['match']}")
            print()
        
        print("[ONERI] Riskli dosyalari .gitignore'a ekleyin:")
        print("  echo 'register*.js' >> .gitignore")
        print("  echo '.env' >> .gitignore")
        print("  echo 'wrangler.jsonc' >> .gitignore")
        print("  echo 'config.json' >> .gitignore")
        print("  echo '*credentials*' >> .gitignore")
        print()
        print("[ONERI] Token'lari env variable'a tasiyin:")
        print("  wrangler secret put DISCORD_TOKEN")

if __name__ == '__main__':
    main()
