/*
================================================================
 PM2 SECURE ECOSYSTEM CONFIG — ORNEK
================================================================
 Kullanici:  botadmin (root DEGIL!)
 Platform:   Linux VDS (Ubuntu 22.04+)
 Botlar:    Her bot ayri .env, ayri log, izole process

 KULLANIM:
   1. Bu dosyayi VDS'e kopyala
   2. Her bot icin ayri .env dosyasi olustur
   3. pm2 start ecosystem.config.js
   4. pm2 save
   5. pm2 startup (yeniden baslatmalarda otomatik calissin)

================================================================
*/

module.exports = {
  apps: [
    // ==========================================================
    // BOT 1: Ekonomi Botu (Discord.js v14)
    // ==========================================================
    {
      name: "ekonomi-bot",
      script: "/home/botadmin/ekonomi-bot/index.js",
      cwd: "/home/botadmin/ekonomi-bot",

      // .env dosyasi
      env_file: "/home/botadmin/ekonomi-bot/.env",

      // Calisma modu
      instances: 1,
      exec_mode: "fork",         // cluster degil (bot state'li)

      // ========================================================
      // RESTART POLITIKASI (sonsuz loop'u onler)
      // ========================================================
      max_restarts: 5,            // 5 denemeden sonra durdur
      min_uptime: 10000,          // 10sn'den az calisirsa restart sayilmaz
      kill_timeout: 5000,         // 5sn'de kapanmazsa SIGKILL
      restart_delay: 3000,        // restart arasi 3sn bekle
      autorestart: true,          // crash'te otomatik baslat
      stop_exit_codes: [0],       // sadece exit code 0'da durdurma

      // ========================================================
      // BELLEK YONETIMI
      // ========================================================
      max_memory_restart: "400M", // 400MB uzerinde otomatik restart
      // Not: max_memory_restart asildiginda PM2 process'i oldurur
      // ve tekrar baslatir. Bu dilere memory leak'i onler.

      // ========================================================
      // LOG YONETIMI
      // ========================================================
      log_type: "json",           // JSON formatinda log
      error_file: "/home/botadmin/logs/ekonomi-error.log",
      out_file: "/home/botadmin/logs/ekonomi-out.log",
      merge_logs: true,           // tum instance'lari tek log'da birlestir
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      time: true,                 // log'lara zaman damgasi ekle

      // ========================================================
      // ORTAM DEGISKENLERI
      // ========================================================
      env: {
        NODE_ENV: "production",
        TZ: "Europe/Istanbul"
      },
      // .env dosyasindaki DEGISKENLER:
      // DISCORD_TOKEN=MTIz...
      // CLIENT_ID=123456...
      // GUILD_ID=789012...

      // ========================================================
      // DIGER AYARLAR
      // ========================================================
      watch: false,               // dosya degisikligini izleme (production)
      force: true,                // var olan process'i zorla guncelle
    },

    // ==========================================================
    // BOT 2: Moderasyon Botu
    // ==========================================================
    {
      name: "moderasyon-bot",
      script: "/home/botadmin/moderasyon/index.js",
      cwd: "/home/botadmin/moderasyon",
      env_file: "/home/botadmin/moderasyon/.env",

      instances: 1,
      exec_mode: "fork",
      max_restarts: 5,
      min_uptime: 10000,
      kill_timeout: 5000,
      max_memory_restart: "300M",

      log_type: "json",
      error_file: "/home/botadmin/logs/moderasyon-error.log",
      out_file: "/home/botadmin/logs/moderasyon-out.log",
      merge_logs: true,
      time: true,

      env: {
        NODE_ENV: "production",
        TZ: "Europe/Istanbul"
      }
    },

    // ==========================================================
    // BOT 3: Log/Logger Botu (Python)
    // ==========================================================
    {
      name: "log-bot",
      script: "/home/botadmin/logger/bot.py",
      cwd: "/home/botadmin/logger",
      interpreter: "python3",           // Python ile calistir
      env_file: "/home/botadmin/logger/.env",

      instances: 1,
      exec_mode: "fork",
      max_restarts: 3,
      min_uptime: 5000,
      kill_timeout: 5000,
      max_memory_restart: "200M",

      log_type: "json",
      error_file: "/home/botadmin/logs/logger-error.log",
      out_file: "/home/botadmin/logs/logger-out.log",
      merge_logs: true,
      time: true,

      env: {
        PYTHONUNBUFFERED: "1",          // Python log buffer'i kapat
        TZ: "Europe/Istanbul"
      }
    },

    // ==========================================================
    // BOT 4: Dashboard / Web API (Express)
    // ==========================================================
    {
      name: "dashboard-api",
      script: "/home/botadmin/dashboard/server.js",
      cwd: "/home/botadmin/dashboard",
      env_file: "/home/botadmin/dashboard/.env",

      instances: 1,
      exec_mode: "fork",
      max_restarts: 5,
      min_uptime: 10000,
      max_memory_restart: "200M",

      log_type: "json",
      error_file: "/home/botadmin/logs/dashboard-error.log",
      out_file: "/home/botadmin/logs/dashboard-out.log",
      merge_logs: true,
      time: true,

      env: {
        NODE_ENV: "production",
        PORT: 3000,                     // UFW'den 3000'i ac
        TZ: "Europe/Istanbul"
      }
    }
  ],

  // ===========================================================
  // PM2 GENEL AYARLAR
  // ===========================================================
  deploy: {
    production: {
      user: "botadmin",
      host: "localhost",
      ref: "origin/main",
      repo: "",                         // Git repo (opsiyonel)
      path: "/home/botadmin",
      "pre-deploy": "git pull",
      "post-deploy": "pm2 reload ecosystem.config.js --env production"
    }
  }
};


/*
================================================================
 PM2 KOMUTLARI (HATIRLATMA)
================================================================

 # Baslatma
 pm2 start ecosystem.config.js        -> tum botlari baslat
 pm2 start ecosystem.config.js --only ekonomi-bot  -> sadece 1 bot

 # Durum
 pm2 status              -> tum botlarin durumu
 pm2 show ekonomi-bot     -> detayli bilgi (.env'yi GOSTERME!)
 pm2 monit                -> canli CPU/RAM takip
 pm2 list                 -> basit liste

 # Log
 pm2 logs ekonomi-bot     -> canli log takip
 pm2 logs ekonomi-bot --lines 50  -> son 50 satir
 pm2 flush                -> tum log'lari temizle

 # Restart/Durdurma
 pm2 restart all          -> tum botlari yeniden baslat
 pm2 stop ekonomi-bot     -> botu durdur
 pm2 delete ekonomi-bot   -> PM2'den kaldir (process'i oldur)

 # Kalici ayarlar
 pm2 save                 -> mevcut process'leri kaydet
 pm2 startup              -> sistem acilinca PM2 otomatik baslasin

 # Log rotate
 pm2 install pm2-logrotate
 pm2 set pm2-logrotate:max_size 10M
 pm2 set pm2-logrotate:retain 5
 pm2 set pm2-logrotate:compress true

================================================================
 PM2 GUVENLIK UYARILARI
================================================================

 1. ROOT ILE CALISTIRMA!
    pm2 start ...    -> normal kullanici
    sudo pm2 ...     -> YAPMA! Root olarak calisirsa tum sistem risk altinda

 2. TOKEN .env'DE KALSIN
    ecosystem.config.js icinde token yazma!
    KOTU: env: { DISCORD_TOKEN: "MTIz..." }  -> YAPMA!
    IYI:  env_file: ".env"

 3. LOG'LARDA TOKEN KONTROL ET
    grep -r "MT[0-9]" ~/.pm2/logs/
    Varsa: pm2 flush

 4. DASHBOARD KAPAT
    pm2 stop pm2-http    (9615 portu)
    sudo ufw deny 9615

 5. DUZENLI YEDEKLE
    pm2 save
    cp ~/.pm2/dump.pm2 ~/backups/
    (dump.pm2, hangi botlarin calistigini kaydeder)

================================================================
*/
