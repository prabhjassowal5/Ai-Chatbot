/* ═══════════════════════════════════════════════════
   GNDPC Help Desk — script.js
   ═══════════════════════════════════════════════════ */

/* ── ANIMATED BACKGROUND CANVAS ── */
(function () {
  const c   = document.getElementById('bgCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, pts;

  function resize() { W = c.width = innerWidth; H = c.height = innerHeight; init(); }
  function init() {
    pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * 0.4, vy: (Math.random() - .5) * 0.4,
      r: 1 + Math.random() * 1.5
    }));
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const orbs = [
      { x: W * .1, y: H * .5, r: 350, c: 'rgba(26,108,245,0.06)' },
      { x: W * .9, y: H * .2, r: 280, c: 'rgba(0,194,168,0.05)' },
      { x: W * .5, y: H * .8, r: 200, c: 'rgba(122,45,245,0.04)' }
    ];
    orbs.forEach(o => {
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      g.addColorStop(0, o.c); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
    });
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.fillStyle = 'rgba(26,108,245,0.5)';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    });
    pts.forEach((a, i) => {
      pts.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 120) {
          ctx.strokeStyle = `rgba(26,108,245,${0.08 * (1 - d / 120)})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      });
    });
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize', resize);
  resize(); draw();
})();

/* ── HELPERS ── */
function showAlert(id, type, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'alert alert-' + type;
  el.innerHTML = msg;
  el.style.display = 'block';
}

function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

/* ── AUTH VIEW SWITCH ── */
function switchView(v) {
  const lv = document.getElementById('loginView');
  const sv = document.getElementById('signupView');
  if (lv) lv.style.display  = v === 'login'  ? '' : 'none';
  if (sv) sv.style.display  = v === 'signup' ? '' : 'none';
  hideAlert('loginAlert');
  hideAlert('signupAlert');
}

/* ── DEMO CREDENTIAL FILL ── */
function fillLogin(name, role, pass) {
  document.getElementById('l_name').value = name;
  document.getElementById('l_role').value = role;
  document.getElementById('l_pass').value = pass;
}

/* ── LOGIN ── */
async function doLogin() {
  const name = document.getElementById('l_name').value.trim();
  const role = document.getElementById('l_role').value;
  const pass = document.getElementById('l_pass').value;
  const btn  = document.getElementById('loginBtn');

  if (!name || !role || !pass) {
    showAlert('loginAlert', 'err', '⚠️ Please fill in all fields.'); return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>Logging in...';

  try {
    const res  = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role, password: pass })
    });
    const data = await res.json();

    if (data.success) {
      showAlert('loginAlert', 'ok', '✅ Login successful! Welcome ' + data.user.name + '!');
      setTimeout(() => launchApp(data.user.name, data.user.role), 700);
    } else {
      showAlert('loginAlert', 'err', '⚠️ ' + data.message);
      btn.disabled = false;
      btn.innerHTML = '🚀 Login to Help Desk';
    }
  } catch {
    showAlert('loginAlert', 'err', '⚠️ Server error. Please try again.');
    btn.disabled = false;
    btn.innerHTML = '🚀 Login to Help Desk';
  }
}

/* ── SIGNUP ── */
async function doSignup() {
  const name = document.getElementById('s_name').value.trim();
  const roll = document.getElementById('s_roll').value.trim();
  const role = document.getElementById('s_role').value;
  const pass = document.getElementById('s_pass').value;
  const conf = document.getElementById('s_conf').value;
  const btn  = document.getElementById('signupBtn');

  if (!name || !roll || !role || !pass || !conf) {
    showAlert('signupAlert', 'err', '⚠️ All fields are required.'); return;
  }
  if (pass.length < 6) {
    showAlert('signupAlert', 'err', '⚠️ Password must be at least 6 characters.'); return;
  }
  if (pass !== conf) {
    showAlert('signupAlert', 'err', '⚠️ Passwords do not match!'); return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>Creating Account...';

  try {
    const res  = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, roll, role, password: pass, confirm: conf })
    });
    const data = await res.json();

    if (data.success) {
      showAlert('signupAlert', 'ok', '✅ ' + data.message + ' Switching to login...');
      setTimeout(() => { switchView('login'); btn.disabled = false; btn.innerHTML = '🚀 Create My Account'; }, 1400);
    } else {
      showAlert('signupAlert', 'err', '⚠️ ' + data.message);
      btn.disabled = false;
      btn.innerHTML = '🚀 Create My Account';
    }
  } catch {
    showAlert('signupAlert', 'err', '⚠️ Server error. Please try again.');
    btn.disabled = false;
    btn.innerHTML = '🚀 Create My Account';
  }
}

/* ── LOGOUT ── */
async function doLogout() {
  await fetch('/api/logout', { method: 'POST' });
  document.getElementById('chatApp').style.display   = 'none';
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('chatArea').innerHTML = '';
  switchView('login');
  ['l_name', 'l_pass'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const lr = document.getElementById('l_role'); if (lr) lr.value = '';
}

/* ── LAUNCH APP ── */
function launchApp(name, role) {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('chatApp').style.display    = 'block';

  const init = name.charAt(0).toUpperCase();
  document.getElementById('uAvatar').textContent = init;
  document.getElementById('uName').textContent   = name;
  document.getElementById('uRole').textContent   = role.charAt(0).toUpperCase() + role.slice(1);
  window._uInit = init;

  document.getElementById('chatArea').innerHTML = '';
  addBotMsg(
    `ਸਤ ਸ੍ਰੀ ਅਕਾਲ! 🙏 Welcome, <strong>${name}</strong>!<br><br>
    I'm your <strong>Guru Nanak Dev Polytechnic College</strong> Help Assistant.<br><br>
    I can answer questions about:<br>
    📋 Admissions &nbsp;|&nbsp; 💰 Fees &nbsp;|&nbsp; 📚 Courses<br>
    🏠 Hostel &nbsp;|&nbsp; 🎓 LEET &nbsp;|&nbsp; 🏆 Scholarships<br>
    💼 Placements &nbsp;|&nbsp; 🏛️ Administration &nbsp;|&nbsp; 📞 Contact<br><br>
    Use the quick buttons on the left or type your question below 👇`
  );
}

/* ── SEND MESSAGE ── */
async function sendMsg() {
  const inp  = document.getElementById('msgInput');
  const text = inp.value.trim();
  if (!text) return;

  addUserMsg(text);
  inp.value = '';
  showTyping();

  try {
    const res  = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    removeTyping();
    addBotMsg(data.reply || 'Sorry, something went wrong. Please try again.');
  } catch {
    removeTyping();
    addBotMsg('⚠️ Connection error. Please refresh and try again.');
  }
}

/* Quick chip handler */
function qa(text) {
  document.getElementById('msgInput').value = text;
  sendMsg();
  document.getElementById('sidebar').classList.remove('open');
}

/* ── CHAT RENDER ── */
function addBotMsg(html) {
  const c = document.getElementById('chatArea');
  const r = document.createElement('div');
  r.className = 'msg-row bot-row';
  r.innerHTML = `<div class="av av-bot">🤖</div>
    <div class="bubble b-bot"><div class="b-hdr">GNDPC Assistant</div><span>${html}</span></div>`;
  c.appendChild(r);
  c.scrollTop = c.scrollHeight;
}

function addUserMsg(text) {
  const init = window._uInit || 'U';
  const c    = document.getElementById('chatArea');
  const r    = document.createElement('div');
  r.className = 'msg-row user-row';
  r.innerHTML = `<div class="bubble b-user"><span>${text}</span></div>
    <div class="av av-user">${init}</div>`;
  c.appendChild(r);
  c.scrollTop = c.scrollHeight;
}

function showTyping() {
  const c = document.getElementById('chatArea');
  const r = document.createElement('div');
  r.id = 'typingRow'; r.className = 'msg-row bot-row';
  r.innerHTML = `<div class="av av-bot">🤖</div>
    <div class="bubble b-bot typing-dots"><span></span><span></span><span></span></div>`;
  c.appendChild(r);
  c.scrollTop = c.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('typingRow');
  if (t) t.remove();
}

/* ── SIDEBAR TOGGLE ── */
function toggleSb() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ── PASSWORD HELPERS ── */
function toggleEye(id, btn) {
  const inp = document.getElementById(id);
  inp.type  = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁️' : '🙈';
}

function checkStr(val) {
  const fill = document.getElementById('strFill');
  const lbl  = document.getElementById('strLbl');
  let s = 0;
  if (val.length >= 6)          s++;
  if (val.length >= 10)         s++;
  if (/[A-Z]/.test(val))        s++;
  if (/[0-9]/.test(val))        s++;
  if (/[^A-Za-z0-9]/.test(val)) s++;
  const lv = [
    { w: '0%',   c: 'transparent', t: '' },
    { w: '20%',  c: '#f44336',     t: 'Very Weak 😟' },
    { w: '45%',  c: '#ff9800',     t: 'Weak 😐' },
    { w: '65%',  c: '#ffeb3b',     t: 'Fair 🙂' },
    { w: '82%',  c: '#8bc34a',     t: 'Good 😊' },
    { w: '100%', c: '#4caf50',     t: 'Strong 💪' },
  ][Math.min(s, 5)];
  fill.style.width      = lv.w;
  fill.style.background = lv.c;
  lbl.textContent       = lv.t;
  lbl.style.color       = lv.c === 'transparent' ? 'var(--muted)' : lv.c;
}

/* ── KEYBOARD SHORTCUTS ── */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const sv = document.getElementById('signupView');
  const as = document.getElementById('authScreen');
  if (sv && sv.style.display !== 'none') { doSignup(); }
  else if (as && as.style.display !== 'none') { doLogin(); }
  else {
    const inp = document.getElementById('msgInput');
    if (inp && document.activeElement === inp) sendMsg();
  }
});

/* ── AUTO-LOGIN CHECK ── */
(async function () {
  try {
    const res  = await fetch('/api/session');
    const data = await res.json();
    if (data.loggedIn) {
      launchApp(data.user.name, data.user.role);
    }
  } catch { /* not logged in, stay on auth screen */ }
})();
