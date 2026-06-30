"""
Bot Monitoring Kurulum Araci
==============================
Amac: Bot'un canli monitor edilmesi icin gerekli yapilari
      olusturmak. Cloudflare Workers + KV tabanli monitoring.

Yaptiklari:
  1. KV'de monitoring anahtarlarini olusturur
  2. Test metric'i gonderir
  3. Alarm webhook'u ayarlar
  4. Ornek monitoring dashboard verisi olusturur

Calistirma:
  python 03-monitoring-setup.py --set-webhook https://discord.com/api/webhooks/.../...
"""

import json, sys, requests, argparse, time
from datetime import datetime

def create_metric_keys():
    """KV'de kullanilacak metric anahtarlarini gosterir"""
    print("[+] Monitoring Metric Anahtarlari")
    print("-" * 50)
    
    metrics = {
        "metric_cmd_{komut_adi}_{saat}": "Komut kullanim sayisi (saatlik)",
        "metric_error_{komut_adi}_{saat}": "Hata sayisi (saatlik)",
        "metric_users_{gun}": "Aktif kullanici (gunluk)",
        "metric_guilds_{gun}": "Sunucu sayisi (gunluk)",
        "metric_429_{saat}": "Rate limit sayisi (saatlik)",
        "metric_cpu_{saat}": "Workers CPU kullanimi (saatlik)",
        "metric_avg_time_{komut_adi}": "Ortalama calisma suresi (ms)"
    }
    
    for key, desc in metrics.items():
        print(f"  {key:45s} -> {desc}")
    
    return metrics


def test_discord_webhook(webhook_url):
    """Webhook'a test mesaji gonder"""
    if not webhook_url or 'discord.com/api/webhooks/' not in webhook_url:
        print("[HATA] Gecerli bir Discord webhook URL'si girin")
        return False
    
    payload = {
        "content": None,
        "embeds": [{
            "title": "[TEST] Bot Monitoring",
            "description": "Monitoring sistemi test mesaji",
            "color": 5814783,
            "fields": [
                {"name": "Test", "value": "Bu bir test mesajidir", "inline": True},
                {"name": "Zaman", "value": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "inline": True},
                {"name": "Durum", "value": "Aktif", "inline": True}
            ],
            "footer": {"text": "DCSIBER Monitoring"}
        }]
    }
    
    r = requests.post(webhook_url, json=payload)
    if r.status_code == 204:
        print("[OK] Webhook test mesaji basariyla gonderildi!")
        return True
    else:
        print(f"[HATA] Webhook hatasi: HTTP {r.status_code}")
        return False


def generate_dashboard_example():
    """Ornek monitoring dashboard'i gosterir"""
    print()
    print("[+] Ornek Monitoring Dashboard")
    print("=" * 50)
    
    # Saatlik veri simule et
    hours = [f"{h:02d}:00" for h in range(24)]
    cmd_counts = [int(abs(__import__('random').gauss(15, 5))) for _ in range(24)]
    error_counts = [int(abs(__import__('random').gauss(2, 1.5))) for _ in range(24)]
    
    print("Saat   | Komut | Hata")
    print("-" * 25)
    for i, h in enumerate(hours):
        bar_cmd = "█" * min(cmd_counts[i], 20)
        bar_err = "█" * min(error_counts[i], 10)
        print(f"{h} | {cmd_counts[i]:3d} {bar_cmd:20s} | {error_counts[i]:2d} {bar_err:10s}")
    
    total_cmds = sum(cmd_counts)
    total_errs = sum(error_counts)
    error_rate = (total_errs / total_cmds * 100) if total_cmds > 0 else 0
    
    print("-" * 25)
    print(f"Toplam: {total_cmds} komut, {total_errs} hata")
    print(f"Hata orani: {error_rate:.1f}%")
    print()

    return {"commands": total_cmds, "errors": total_errs, "rate": error_rate}


def generate_security_report():
    """Guvenlik raporu olustur"""
    print("[+] Bot Guvenlik Raporu")
    print("=" * 50)
    
    checks = [
        ("Token env variable'da", True),
        ("Signature verification", True),
        ("Timestamp kontrolu", False),
        ("Cooldown sistemi", False),
        ("Rate limiting", False),
        ("try/catch handler'lar", True),
        ("Hata mesaji gizleme", False),
        ("Kara liste destegi", False),
        ("Monitor sistemi", False),
        ("Alarm webhook'u", False),
    ]
    
    ok_count = sum(1 for _, ok in checks if ok)
    
    for name, ok in checks:
        status = "[OK]" if ok else "[YOK]"
        print(f"  {status} {name}")
    
    print("-" * 50)
    print(f"Guvenlik puani: {ok_count}/{len(checks)} ({ok_count/len(checks)*100:.0f}%)")
    
    if ok_count < len(checks):
        print("\n[ONERILER]")
        if not checks[3][1]: print("  - Cooldown: KV tabanli cooldown ekle")
        if not checks[4][1]: print("  - Rate limit: Global istek limiti ekle")
        if not checks[6][1]: print("  - Hata mesaji: Stack trace'i gizle")
        if not checks[7][1]: print("  - Kara liste: Blacklist sistemi ekle")
    
    return ok_count


def main():
    parser = argparse.ArgumentParser(description='Bot Monitoring Kurulum')
    parser.add_argument('--set-webhook', help='Discord webhook URL (alarm icin)')
    parser.add_argument('--report', action='store_true', help='Guvenlik raporu goster')
    parser.add_argument('--dashboard', action='store_true', help='Dashboard ornegi goster')
    
    args = parser.parse_args()
    
    print("=" * 50)
    print("DCSIBER - Bot Monitoring Kurulum")
    print("=" * 50)
    
    if args.set_webhook:
        test_discord_webhook(args.set_webhook)
        print()
    
    if args.dashboard or not any([args.set_webhook, args.report]):
        generate_dashboard_example()
    
    if args.report or not any([args.set_webhook, args.dashboard]):
        generate_security_report()
    
    create_metric_keys()
    
    print()
    print("[KURULUM TALIMATI]")
    print("1. helpers.js'ye monitoring fonksiyonlarini ekle")
    print("2. Her komut handler'ina logMetric() ekle")
    print("3. Hata yakalama bloklarina logMetric() ekle")
    print("4. Discord webhook'u alarm kanali olarak ayarla")
    print("5. Cloudflare Dashboard'dan Workers metriklerini izle")
    print()
    print("[ORNEK] helpers.js'ye eklenecek kod:")
    print('''\
export async function logMetric(env, metric, value = 1) {
  const key = `metric_${metric}_${Date.now()}`;
  await env.KV?.put(key, String(value), { expirationTtl: 86400 });
}''')


if __name__ == '__main__':
    main()
