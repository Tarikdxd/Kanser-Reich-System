import sqlite3, os

DB_PATH = 'bank.db'

if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

c.executescript('''
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'user'
    );

    CREATE TABLE accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        account_no TEXT UNIQUE NOT NULL,
        balance REAL DEFAULT 0.0,
        type TEXT DEFAULT 'vadesiz',
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_id INTEGER,
        to_id INTEGER,
        amount REAL NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        description TEXT,
        FOREIGN KEY (from_id) REFERENCES users(id),
        FOREIGN KEY (to_id) REFERENCES users(id)
    );

    CREATE TABLE site_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT
    );

    INSERT INTO site_settings (setting_key, setting_value) VALUES ('site_mesaji', 'Kanser Bank - Guvenli Bankacilik');
''')

users_data = [
    ('admin',    'admin123', 'Admin Kullanici',    'admin@kanserbank.com', 'admin'),
    ('ahmet',    '123456',   'Ahmet Yilmaz',       'ahmet@email.com',      'user'),
    ('mehmet',   '123456',   'Mehmet Demir',       'mehmet@email.com',     'user'),
    ('tarikdxd', 'tarik123', 'Tarik Saldirgan',    'tarik@email.com',      'user'),
    ('zeynep',   '123456',   'Zeynep Kaya',         'zeynep@email.com',     'user'),
    ('ali',      '123456',   'Ali Yildiz',          'ali@email.com',        'user'),
    ('ayse',     '123456',   'Ayse Celik',          'ayse@email.com',       'user'),
]

for u in users_data:
    c.execute("INSERT INTO users (username, password, full_name, email, role) VALUES (?, ?, ?, ?, ?)", u)

accounts_data = [
    (1, 'TR0000000001', 99999.0, 'admin'),    # admin
    (2, 'TR1234567890', 5000.0,  'vadesiz'),  # ahmet
    (3, 'TR0987654321', 2500.0,  'vadesiz'),  # mehmet
    (4, 'TR5555555555', 0.0,     'vadesiz'),  # tarikdxd
    (5, 'TR1111111111', 10000.0, 'vadesiz'),  # zeynep
    (6, 'TR2222222222', 3200.0,  'vadesiz'),  # ali
    (7, 'TR3333333333', 7800.0,  'vadesiz'),  # ayse
]

for a in accounts_data:
    c.execute("INSERT INTO accounts (user_id, account_no, balance, type) VALUES (?, ?, ?, ?)", a)

c.executemany("INSERT INTO transactions (from_id, to_id, amount, description) VALUES (?, ?, ?, ?)", [
    (2, 3, 200.0, 'Market alisverisi'),
    (3, 2, 150.0, 'Yemek parasi'),
    (5, 2, 500.0, 'Hediye'),
    (2, 4, 0.0,   'Baslangic'),
    (1, 2, 1000.0,'Maas avansi'),
])

conn.commit()
conn.close()

print("[+] bank.db basariyla olusturuldu")
print("[+] Kullanicilar:")
for u in users_data:
    print(f"    {u[0]:12s} / {u[1]:12s}  ({u[3]})")
print("\n[+] Site baslatmak icin: python app.py")
