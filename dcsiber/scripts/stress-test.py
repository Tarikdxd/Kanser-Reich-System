"""
KANSER BOT — Stres Test Araci
===============================
Amac:  Kendi botunu gercek saldiri senaryolariyla test et.
       Botun hangi yuk altinda duscegini gormek icin.

GUVENLI KULLANIM:
  - SADECE kendi botunda kullan
  - Canli ortamda test ediyorsan, once dusukten basla
  - Discord ToS'a aykiri islem yapma (baskasinin botunu dusurme)
  - Workers limitlerine dikkat et: CPU 30s, Memory 128MB, KV 1000/s

Testler & Worker Endpoint'leri:
------------------------------------------------
Test                      Hedef               Risk
----                      -----               ----
1. Monitor Flood          POST /monitor       YUKSEK (DM kutunu doldurur)
2. PDF Log Flood          POST /log-pdf       YUKSEK (kanali doldurur)
3. Oltalama Flood         POST /o/{id}        YUKSEK (DM gonderir)
4. KV Overload            GET /not/{id}       DUSUK (sadece KV okuma)
5. Oversized Payload      POST /monitor       ORTA (bellek testi)
6. Concurrent Storm       Tum public endpoint ORTA (Worker CPU)
7. Invalid JSON           POST /monitor       DUSUK (error handling)
8. Long URL Chain         GET /l/{id}         DUSUK (redirect)

Calistirma:
  python stress-test.py --target https://discord-bot.kanserbusiness.workers.dev
  python stress-test.py --target https://discord-bot.kanserbusiness.workers.dev --test monitor --count 50
"""

import requests, json, sys, time, argparse, random, string, threading as th
from concurrent.futures import ThreadPoolExecutor, as_completed

# ===========================================================================
# KONFIHGURASYON
# ===========================================================================
RESULTS = {"ok": 0, "fail": 0, "errors": [], "times": [], "status_codes": {}}
FAIL_FAST = False
TARGET = None
FLOOD_DISCORD_UID = "536233019330002975"

def random_id(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

# ===========================================================================
# TEST: MONITOR FLOOD — /monitor endpoint'ine spam
# ===========================================================================
def test_monitor_flood(count=10, concurrency=5):
    """
    /monitor endpoint'ine hizli POST istegi gonder.
    Her istek KV'ye yazar ve Discord DM gonderir.
    Bu, Workers subrequest ve KV limitlerini test eder.

    Risk: YUKSEK — Discord DM kutunu doldurur.
    """
    print(f"\n[TEST] Monitor Flood — {count} istek, {concurrency} paralel")
    print("       Discord DM kutuna mesaj yagacak! Ctrl+C ile durdur.")

    if count > 20:
        ans = input("       DEVAM? (e/h): ").lower().strip()
        if ans != 'e':
            print("       Iptal edildi.")
            return None

    payloads = []
    for i in range(count):
        payloads.append({
            "tool": f"stress-test-{i}",
            "event": f"flood-test-{i}",
            "data": {
                "counter": i,
                "ram": "".join(random.choices(string.ascii_letters, k=500)),
                "test": True,
                "msg": f"Stres test mesaji #{i}"
            },
            "uid": FLOOD_DISCORD_UID,
            "ts": int(time.time())
        })

    return run_batch("POST", f"{TARGET}/monitor", payloads, concurrency)

# ===========================================================================
# TEST: PDF LOG FLOOD — /log-pdf endpoint
# ===========================================================================
def test_pdf_flood(count=10, concurrency=5):
    """
    /log-pdf endpoint'ine hizli POST. Her istek KV'ye yazar
    ve Discord log kanalina mesaj gonderir.

    Risk: YUKSEK — Kanal mesajlarini spam ile doldurur.
    """
    print(f"\n[TEST] PDF Log Flood — {count} istek, {concurrency} paralel")
    print("       Discord log kanalina mesaj yagacak!")

    if count > 10:
        ans = input("       DEVAM? (e/h): ").lower().strip()
        if ans != 'e':
            print("       Iptal edildi.")
            return None

    payloads = []
    for i in range(count):
        payloads.append({
            "pdfName": f"test_pdf_{i}.pdf",
            "userAgent": f"Mozilla/5.0 StressTest/{i}",
            "platform": "Win32" if i % 2 == 0 else "MacIntel",
            "timezone": "Europe/Istanbul",
            "languages": ["tr-TR", "en-US"],
            "hardwareConcurrency": random.choice([2, 4, 8, 16]),
            "deviceMemory": random.choice([4, 8, 16]),
            "screen": {"width": 1920, "height": 1080, "availWidth": 1920, "availHeight": 1040, "colorDepth": 24},
            "webgl": {"renderer": "ANGLE (NVIDIA GeForce RTX 3080)", "vendor": "Google Inc.", "version": "WebGL 2.0"},
            "audio": {"sampleRate": 48000},
            "canvas": "canvas_fingerprint_hash_" + random_id(20),
            "performance": {"usedJSHeapSize": random.randint(50000000, 200000000), "totalJSHeapSize": random.randint(200000000, 500000000)},
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
        })

    return run_batch("POST", f"{TARGET}/log-pdf", payloads, concurrency)

# ===========================================================================
# TEST: KV OKUMA OVERLOAD — /not/ ve /l/ endpoint'leri
# ===========================================================================
def test_kv_read_overload(count=50, concurrency=20):
    """
    KV okuma limitlerini test et. /not/{id} endpoint'i
    KV'den okuma yapar. Var olmayan ID'ler 404 donecek.

    Risk: DUSUK. Sadece Workers CPU ve KV okuma testi.
    """
    print(f"\n[TEST] KV Okuma Overload — {count} istek, {concurrency} paralel")

    urls = [f"{TARGET}/not/{random_id(16)}" for _ in range(count)]
    payloads = [{"url": u} for u in urls]

    return run_batch("GET", None, payloads, concurrency)

# ===========================================================================
# TEST: BUYUK PAYLOAD — Bellek sınır testi
# ===========================================================================
def test_oversized_payload(sizes_kb=[10, 50, 100, 500, 1000]):
    """
    Buyuk JSON payload'lari gondererek Workers bellek limitini test et.
    128MB siniri var. 1MB+ payload gonderince ne olur?

    Risk: ORTA. Workers error 1102 alabilirsin (gecici).
    """
    print(f"\n[TEST] Oversized Payload — Boyutlar: {sizes_kb}KB")
    print("       Workers bellek limitini (128MB) test ediyor...")

    for size_kb in sizes_kb:
        size_bytes = size_kb * 1024
        big_data = "X" * size_bytes

        payload = {
            "tool": "oversized-test",
            "event": f"payload-{size_kb}kb",
            "data": {"big_field": big_data},
            "uid": FLOOD_DISCORD_UID,
            "ts": int(time.time())
        }

        start = time.time()
        try:
            r = requests.post(f"{TARGET}/monitor",
                              json=payload, timeout=30,
                              headers={"Content-Type": "application/json"})
            elapsed = time.time() - start
            status = f"HTTP {r.status_code}"
            if r.status_code == 413:
                status += " (Payload Too Large)"
            elif r.status_code == 500:
                status += " (Internal Error - bellek mi?)"
            elif r.status_code == 200:
                ok = len(r.content)
                status += f" (OK, yanit: {ok} byte)"
            print(f"  [{status}] {size_kb}KB payload | {elapsed*1000:.0f}ms")
        except requests.exceptions.Timeout:
            print(f"  [TIMEOUT] {size_kb}KB payload | 30s asti!")
        except Exception as e:
            print(f"  [HATA] {size_kb}KB payload | {e}")

# ===========================================================================
# TEST: GECERSIZ JSON — Error handling test
# ===========================================================================
def test_invalid_payloads():
    """
    Gecersiz veriler gondererek bot'un error handling'ini test et.
    Stack trace sizdiriyor mu? 500 donuyor mu?
    """
    print(f"\n[TEST] Invalid Payloads — Error handling testi")

    test_cases = [
        ("BOMBOS JSON", {}),
        ("EKSIK ALAN", {"tool": "test"}),
        ("YANLIS TIP", {"tool": 12345, "event": None, "data": "string_degil"}),
        ("String yerine array", {"tool": ["a"], "event": ["b"], "data": {"x": "y"}}),
        ("Null degerler", {"tool": None, "event": None, "data": None}),
        ("HTML enjeksiyon", {"tool": "<script>alert(1)</script>", "event": "<b>bold</b>", "data": {"x": "<img src=x onerror=alert(1)>"}}),
        ("JSONP callback", {"tool": "callback", "event": "test", "data": {"x": "y"}}),
    ]

    for name, payload in test_cases:
        try:
            start = time.time()
            r = requests.post(f"{TARGET}/monitor",
                              json=payload, timeout=10,
                              headers={"Content-Type": "application/json"})
            elapsed = time.time() - start
            resp_text = r.text[:100] if r.text else "(bos)"
            result = f"HTTP {r.status_code} | {elapsed*1000:.0f}ms | {resp_text}"
            if r.status_code == 500:
                result += " [SORUN: 500 dondu, detay gormek icin hata sayfasina bak]"
            print(f"  [{result}] {name}")
        except Exception as e:
            print(f"  [HATA] {name}: {e}")

# ===========================================================================
# TEST: ESLIK ZAMANLI (Concurrent) STORM
# ===========================================================================
def test_concurrent_storm(count=100, concurrency=30):
    """
    Tum public endpoint'lere ayni anda saldiri.
    Worker'in ayni anda kac istegi kaldirabildigini olcer.

    Risk: ORTA. Workers CPU limitine takilabilir.
    """
    print(f"\n[TEST] Concurrent Storm — {count} istek, {concurrency} paralel")
    print("       Tum public endpoint'lere es zamanli saldiri...")

    endpoints = [
        ("GET", f"{TARGET}/not/{random_id(8)}", None),
        ("GET", f"{TARGET}/l/{random_id(8)}", None),
        ("POST", f"{TARGET}/monitor", {"tool": "storm", "event": "concurrent", "data": {"seq": 0}, "uid": FLOOD_DISCORD_UID, "ts": int(time.time())}),
    ]

    # Karisik bir liste olustur
    tasks = []
    for i in range(count):
        method, url, payload = random.choice(endpoints)
        tasks.append({
            "method": method,
            "url": url if "{id}" not in url else url,
            "payload": payload,
            "label": f"storm-{i}"
        })

    def send_one(task):
        try:
            if task["method"] == "GET":
                r = requests.get(task["url"], timeout=10)
            else:
                r = requests.post(task["url"], json=task["payload"], timeout=10)
            return r.status_code, r.elapsed.total_seconds(), None
        except Exception as e:
            return None, None, str(e)

    ok = 0
    fail = 0
    total_time = 0

    with ThreadPoolExecutor(max_workers=concurrency) as ex:
        futs = [ex.submit(send_one, t) for t in tasks]
        for f in as_completed(futs):
            status, elapsed, err = f.result()
            if status and status < 500:
                ok += 1
                total_time += elapsed
            else:
                fail += 1
                if err:
                    RESULTS["errors"].append(err[:100])

    avg_time = (total_time / ok * 1000) if ok > 0 else 0
    print(f"  Sonuc: {ok} basarili, {fail} basarisiz")
    print(f"  Ortalama yanit: {avg_time:.0f}ms")
    print(f"  Basari orani: {ok/count*100:.1f}%")

    return {"ok": ok, "fail": fail, "avg_ms": avg_time}

# ===========================================================================
# YARDIMCI: Batch istek gonderici
# ===========================================================================
def run_batch(method, url, payloads, concurrency):
    results = {"ok": 0, "fail": 0, "times": [], "status_codes": {}}

    def send_one(payload):
        nonlocal url
        try:
            start = time.time()
            if method == "GET":
                r = requests.get(payload.get("url", url), timeout=15)
            else:
                r = requests.post(url, json=payload, timeout=15,
                                  headers={"Content-Type": "application/json"})
            elapsed = time.time() - start
            results["status_codes"][r.status_code] = results["status_codes"].get(r.status_code, 0) + 1
            if r.status_code == 200:
                results["ok"] += 1
            else:
                results["fail"] += 1
            results["times"].append(elapsed)
            return r.status_code, elapsed
        except requests.exceptions.Timeout:
            results["fail"] += 1
            RESULTS["errors"].append("Timeout")
            return 0, None
        except Exception as e:
            results["fail"] += 1
            RESULTS["errors"].append(str(e)[:80])
            return -1, None

    with ThreadPoolExecutor(max_workers=concurrency) as ex:
        futs = [ex.submit(send_one, p) for p in payloads]
        for f in as_completed(futs):
            f.result()

    total = len(payloads)
    ok = results["ok"]
    fail = results["fail"]
    avg_ms = (sum(results["times"]) / len(results["times"]) * 1000) if results["times"] else 0
    min_ms = min(results["times"]) * 1000 if results["times"] else 0
    max_ms = max(results["times"]) * 1000 if results["times"] else 0

    print(f"  Sonuc: {ok}/{total} basarili, {fail} basarisiz")
    print(f"  Statu: {dict(sorted(results['status_codes'].items()))}")
    print(f"  Hiz:   min={min_ms:.0f}ms | ortalama={avg_ms:.0f}ms | max={max_ms:.0f}ms")

    # Basari oranina gore yorum
    rate = ok / total * 100 if total > 0 else 0
    if rate == 100:
        print(f"  Degerlendirme: GUCLU — tum istekler karsilandi")
    elif rate > 90:
        print(f"  Degerlendirme: ORTA — bazi istekler dustu")
    elif rate > 50:
        print(f"  Degerlendirme: ZAYIF — cok sayida istek dustu")
    else:
        print(f"  Degerlendirme: KRITIK — bot zorlaniyor!")

    return results

# ===========================================================================
# SONUC RAPORU
# ===========================================================================
def print_final_report():
    print("\n" + "=" * 60)
    print("STRES TEST RAPORU")
    print("=" * 60)
    print(f"\nToplam hata: {len(RESULTS['errors'])}")
    if RESULTS["errors"]:
        print("Ilk 10 hata:")
        for e in RESULTS["errors"][:10]:
            print(f"  - {e}")

    print()
    print("[BOT SAGLIK KONTROL]")
    try:
        r = requests.get(f"{TARGET}/", timeout=5)
        print(f"  Ana sayfa: HTTP {r.status_code} — {'Calisiyor' if r.status_code == 200 else 'SORUN VAR'}")
    except:
        print(f"  Ana sayfa: Ulasilamadi — BOT DUSTU!")

    print()
    print("[ONERILER]")
    print("  1. Bot dusmediyse -> Workers limitlerin yeterli")
    print("  2. Bot 500/502/503 donduyse -> Workers limitlerine yaklassin")
    print("  3. Cooldown yoksa -> EKLE: KV tabanli cooldown")
    print("  4. Hata mesajlari siziyorsa -> try/catch icinde gizle")
    print("  5. /monitor gibi public endpoint'leri -> auth ekle veya sil")


# ===========================================================================
# ANA FONKSIYON
# ===========================================================================
def main():
    parser = argparse.ArgumentParser(description='KANSER BOT Stres Test Araci')
    parser.add_argument('--target', required=True, help='Worker URL (orn: https://discord-bot.kanserbusiness.workers.dev)')
    parser.add_argument('--test', choices=['monitor', 'pdf', 'kv', 'oversized', 'invalid', 'storm', 'all'], default='all',
                        help='Test turu (varsayilan: all)')
    parser.add_argument('--count', type=int, default=10, help='Istek sayisi (varsayilan: 10)')
    parser.add_argument('--concurrency', type=int, default=5, help='Paralel istek sayisi (varsayilan: 5)')

    args = parser.parse_args()
    global TARGET
    TARGET = args.target.rstrip('/')

    print("=" * 60)
    print("KANSER BOT — STRES TEST ARACI")
    print("=" * 60)
    print(f"Hedef:    {TARGET}")
    print(f"Islem:    {args.count} istek, {args.concurrency} paralel")
    print(f"Test:     {args.test}")
    print()
    print("UYARI: Bu araci SADECE kendi botunda kullan!")
    print("       Discord ToS'a aykiri kullanimdan kacin.")
    print()

    input("ENTER'a basarak baslat...")
    start_time = time.time()

    if args.test in ['monitor', 'all']:
        test_monitor_flood(min(args.count, 50), min(args.concurrency, 10))

    if args.test in ['pdf', 'all']:
        test_pdf_flood(min(args.count, 20), min(args.concurrency, 5))

    if args.test in ['kv', 'all']:
        test_kv_read_overload(args.count, args.concurrency)

    if args.test in ['oversized', 'all']:
        test_oversized_payload()

    if args.test in ['invalid', 'all']:
        test_invalid_payloads()

    if args.test in ['storm', 'all']:
        test_concurrent_storm(args.count, args.concurrency)

    elapsed = time.time() - start_time
    print(f"\nTest suresi: {elapsed:.1f}s")
    print_final_report()


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n[KULLANICI DURDURDU]")
        print_final_report()
