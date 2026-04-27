from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
import json
import os
import sqlite3
from datetime import datetime
from functools import wraps

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'gndpc-secret-key-change-in-production')

# ── DATABASE SETUP ──────────────────────────────────────────────
DB_PATH = 'gndpc.db'

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            name      TEXT NOT NULL,
            roll      TEXT NOT NULL,
            role      TEXT NOT NULL CHECK(role IN ('student','admin','faculty')),
            password  TEXT NOT NULL,
            created   TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS chat_history (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            sender     TEXT NOT NULL CHECK(sender IN ('user','bot')),
            message    TEXT NOT NULL,
            timestamp  TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    # Seed demo accounts if not present
    demos = [
        ('Student',  '2025001', 'student', 'student123'),
        ('Admin',    'ADMIN01', 'admin',   'admin123'),
        ('Faculty',  'FAC001',  'faculty', 'faculty123'),
    ]
    for name, roll, role, pw in demos:
        cur.execute('SELECT id FROM users WHERE name=? AND role=?', (name, role))
        if not cur.fetchone():
            cur.execute(
                'INSERT INTO users (name, roll, role, password, created) VALUES (?,?,?,?,?)',
                (name, roll, role, generate_password_hash(pw), datetime.utcnow().isoformat())
            )

    conn.commit()
    conn.close()

# ── INTENTS ─────────────────────────────────────────────────────
def load_intents():
    with open('intents.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def get_bot_response(message):
    intents = load_intents()
    msg_lower = message.lower().strip()
    for intent in intents:
        for pattern in intent['patterns']:
            if pattern in msg_lower:
                return intent['response']
    return (
        "Sorry, I didn't find specific info on that topic.<br><br>"
        "Please contact GNDPC directly:<br>"
        "📞 <strong>0161-2490654</strong><br>"
        "📧 <strong>principalgndp@gmail.com</strong><br>"
        "🌐 <a href='https://www.gndpoly.org' target='_blank' style='color:#64b5f6'>www.gndpoly.org</a>"
    )

# ── AUTH DECORATOR ───────────────────────────────────────────────
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

# ── ROUTES ───────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login-page')
def login_page():
    return render_template('login.html')

# ── AUTH API ─────────────────────────────────────────────────────

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    name = (data.get('name') or '').strip()
    role = (data.get('role') or '').strip()
    password = data.get('password') or ''

    if not name or not role or not password:
        return jsonify({'success': False, 'message': 'All fields are required.'}), 400

    conn = get_db()
    user = conn.execute(
        'SELECT * FROM users WHERE LOWER(name)=LOWER(?) AND role=?', (name, role)
    ).fetchone()
    conn.close()

    if user and check_password_hash(user['password'], password):
        session['user_id'] = user['id']
        session['user_name'] = user['name']
        session['user_role'] = user['role']
        session['user_roll'] = user['roll']
        return jsonify({
            'success': True,
            'user': {
                'name': user['name'],
                'role': user['role'],
                'roll': user['roll']
            }
        })

    return jsonify({'success': False, 'message': 'Incorrect name, role, or password.'}), 401


@app.route('/api/signup', methods=['POST'])
def api_signup():
    data = request.get_json()
    name     = (data.get('name') or '').strip()
    roll     = (data.get('roll') or '').strip()
    role     = (data.get('role') or '').strip()
    password = data.get('password') or ''
    confirm  = data.get('confirm') or ''

    if not name or not roll or not role or not password or not confirm:
        return jsonify({'success': False, 'message': 'All fields are required.'}), 400
    if len(password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters.'}), 400
    if password != confirm:
        return jsonify({'success': False, 'message': 'Passwords do not match.'}), 400
    if role not in ('student', 'admin', 'faculty'):
        return jsonify({'success': False, 'message': 'Invalid role.'}), 400

    conn = get_db()
    existing = conn.execute(
        'SELECT id FROM users WHERE LOWER(name)=LOWER(?) AND role=?', (name, role)
    ).fetchone()
    if existing:
        conn.close()
        return jsonify({'success': False, 'message': 'An account with this name already exists.'}), 409

    conn.execute(
        'INSERT INTO users (name, roll, role, password, created) VALUES (?,?,?,?,?)',
        (name, roll, role, generate_password_hash(password), datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': f'Account created for {name}!'})


@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'success': True})


@app.route('/api/session')
def api_session():
    if 'user_id' in session:
        return jsonify({
            'loggedIn': True,
            'user': {
                'name': session['user_name'],
                'role': session['user_role'],
                'roll': session['user_roll']
            }
        })
    return jsonify({'loggedIn': False})

# ── CHAT API ─────────────────────────────────────────────────────

@app.route('/api/chat', methods=['POST'])
@login_required
def api_chat():
    data    = request.get_json()
    message = (data.get('message') or '').strip()
    if not message:
        return jsonify({'error': 'Empty message'}), 400

    bot_reply = get_bot_response(message)
    user_id   = session['user_id']
    now       = datetime.utcnow().isoformat()

    conn = get_db()
    conn.execute(
        'INSERT INTO chat_history (user_id, sender, message, timestamp) VALUES (?,?,?,?)',
        (user_id, 'user', message, now)
    )
    conn.execute(
        'INSERT INTO chat_history (user_id, sender, message, timestamp) VALUES (?,?,?,?)',
        (user_id, 'bot', bot_reply, now)
    )
    conn.commit()
    conn.close()

    return jsonify({'reply': bot_reply})


@app.route('/api/history')
@login_required
def api_history():
    user_id = session['user_id']
    conn    = get_db()
    rows    = conn.execute(
        'SELECT sender, message, timestamp FROM chat_history WHERE user_id=? ORDER BY id ASC',
        (user_id,)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

# ── MAIN ─────────────────────────────────────────────────────────

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
