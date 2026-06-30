from flask import Flask, render_template, request, session, redirect, url_for
import sqlite3

app = Flask(__name__)
app.secret_key = 'kanser-bank-secret-2024'
app.config['DEBUG'] = True

DB_PATH = 'bank.db'

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ========================================================
# ZAFIYET 1: SQL INJECTION — LOGIN BYPASS
#   Kullanici adi ve sifre direkt SQL sorgusuna birlestiriliyor.
#   ' OR '1'='1  ile tum kullanicilari gorme, admin'e giris
# ========================================================
@app.route('/', methods=['GET', 'POST'])
def login():
    mesaj = ''
    site_mesaji = ''
    conn = get_db()
    site_mesaji_row = conn.execute("SELECT setting_value FROM site_settings WHERE setting_key='site_mesaji'").fetchone()
    if site_mesaji_row:
        site_mesaji = site_mesaji_row['setting_value']

    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        # ZAFIYET: Direkt string birlestirme
        query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
        user = conn.execute(query).fetchone()
        conn.close()

        if user:
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['role'] = user['role']
            return redirect(url_for('dashboard'))

        mesaj = 'Gecersiz kullanici adi veya sifre'
    else:
        conn.close()

    return render_template('index.html', mesaj=mesaj, site_mesaji=site_mesaji)

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id=?", (session['user_id'],)).fetchone()
    account = conn.execute("SELECT * FROM accounts WHERE user_id=?", (session['user_id'],)).fetchone()
    transactions = conn.execute(
        "SELECT t.*, u1.username as from_name, u2.username as to_name "
        "FROM transactions t "
        "LEFT JOIN users u1 ON t.from_id=u1.id "
        "LEFT JOIN users u2 ON t.to_id=u2.id "
        "WHERE t.from_id=? OR t.to_id=? ORDER BY t.id DESC LIMIT 10",
        (session['user_id'], session['user_id'])
    ).fetchall()
    conn.close()
    return render_template('dashboard.html', user=user, account=account, transactions=transactions)

# ========================================================
# ZAFIYET 2: SQL INJECTION — TRANSFER / HAVALE
#   from_account parametresi direkt sorguya ekleniyor.
#   ' OR '1'='1  ile baska hesaplardan para cekme
# ZAFIYET 3: IDOR — Kendi hesabi mi kontrolu yok
#   Baska kullanicinin hesabindan para transferi yapilabiliyor
# ========================================================
@app.route('/transfer', methods=['GET', 'POST'])
def transfer():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    if request.method == 'POST':
        from_account = request.form['from_account']
        to_account = request.form['to_account']
        amount = request.form['amount']

        conn = get_db()

        # ZAFIYET: SQL injection — from_account direkt sorguda
        check_query = f"SELECT * FROM accounts WHERE account_no = '{from_account}'"
        sender = conn.execute(check_query).fetchone()

        # ZAFIYET: IDOR — sender bu kullaniciya ait mi kontrol edilmiyor!
        if sender and float(sender['balance']) >= float(amount):
            update_sender   = f"UPDATE accounts SET balance = balance - {amount} WHERE account_no = '{from_account}'"
            update_receiver = f"UPDATE accounts SET balance = balance + {amount} WHERE account_no = '{to_account}'"
            conn.execute(update_sender)
            conn.execute(update_receiver)
            conn.execute(
                "INSERT INTO transactions (from_id, to_id, amount, description) VALUES (?, ?, ?, ?)",
                (sender['user_id'], None, amount, 'Havale')
            )
            conn.commit()
            conn.close()
            return redirect(url_for('dashboard'))

        conn.close()
        return render_template('transfer.html', hata='Yetersiz bakiye veya gecersiz hesap')

    conn = get_db()
    accounts = conn.execute("SELECT * FROM accounts WHERE user_id=?", (session['user_id'],)).fetchall()
    conn.close()
    return render_template('transfer.html', accounts=accounts)

# ========================================================
# ZAFIYET 4: IDOR — herhangi bir hesabin detayina erisim
#   /account/2 yazinca Ahmet'in hesabini gormek mumkun
# ========================================================
@app.route('/account/<int:account_id>')
def account_detail(account_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    conn = get_db()
    account = conn.execute("SELECT * FROM accounts WHERE id=?", (account_id,)).fetchone()
    if not account:
        return 'Hesap bulunamadi', 404
    user = conn.execute("SELECT * FROM users WHERE id=?", (account['user_id'],)).fetchone()
    transactions = conn.execute(
        "SELECT t.*, u1.username as from_name, u2.username as to_name "
        "FROM transactions t "
        "LEFT JOIN users u1 ON t.from_id=u1.id "
        "LEFT JOIN users u2 ON t.to_id=u2.id "
        "WHERE t.from_id=? OR t.to_id=? ORDER BY t.id DESC LIMIT 10",
        (account['user_id'], account['user_id'])
    ).fetchall()
    conn.close()
    return render_template('account_detail.html', account=account, user=user, transactions=transactions)

# ========================================================
# ZAFIYET 5: ADMIN PANELI — yetki kontrolu YOK
#   Herkes /admin sayfasina girip tum veritabanini gorebilir
# ========================================================
@app.route('/admin')
def admin_panel():
    conn = get_db()
    users = conn.execute("SELECT * FROM users").fetchall()
    accounts = conn.execute("SELECT * FROM accounts").fetchall()
    transactions = conn.execute(
        "SELECT t.*, u1.username as from_name, u2.username as to_name "
        "FROM transactions t "
        "LEFT JOIN users u1 ON t.from_id=u1.id "
        "LEFT JOIN users u2 ON t.to_id=u2.id "
        "ORDER BY t.id DESC LIMIT 50"
    ).fetchall()
    # ZAFIYET 6: CSRF + XSS — site mesaji guncellemede token yok
    if request.method == 'POST':
        yeni_mesaj = request.form['site_mesaji']
        conn.execute("UPDATE site_settings SET setting_value=? WHERE setting_key='site_mesaji'", (yeni_mesaj,))
        conn.commit()
    site_mesaji = conn.execute("SELECT setting_value FROM site_settings WHERE setting_key='site_mesaji'").fetchone()
    site_mesaji = site_mesaji['setting_value'] if site_mesaji else ''
    conn.close()
    return render_template('admin.html', users=users, accounts=accounts, transactions=transactions, site_mesaji=site_mesaji)

# ========================================================
# DEFACE sayfasi — site hacklendiginde gosterilecek
# ========================================================
@app.route('/deface')
def defaced():
    return render_template('defaced.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.errorhandler(500)
def hata(error):
    return f"[HATA] Sunucu hatasi: {error}", 500

if __name__ == '__main__':
    print("[+] Kanser Bank baslatiliyor... http://localhost:5000")
    print("[+] DEBUG mod ACIK — hata mesajlari gorunur")
    app.run(host='0.0.0.0', port=5000)
