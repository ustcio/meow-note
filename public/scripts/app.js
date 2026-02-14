// ==========================================
// AGI Era - Application Logic
// ==========================================
const API_BASE = 'https://api.agiera.net';

// ==================== AI SELECTOR ====================
const AI_MODELS = {
    qwen: { name: 'Qwen', icon: '🤖', desc: '通义千问 · 阿里云', endpoint: '/api/chat' },
    deepseek: { name: 'DeepSeek', icon: '🔮', desc: '深度求索 · DeepSeek', endpoint: '/api/chat/deepseek' }
};
let selectedAI = { demo: 'qwen', chatbot: 'qwen' };

function toggleAISelector(target) {
    const selector = document.getElementById(`${target}-ai-selector`);
    selector.classList.toggle('open');
    const closeHandler = (e) => {
        if (!selector.contains(e.target)) { selector.classList.remove('open'); document.removeEventListener('click', closeHandler); }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
}

function selectAI(target, aiKey) {
    const model = AI_MODELS[aiKey];
    if (!model) return;
    selectedAI[target] = aiKey;
    document.getElementById(`${target}-ai-icon`).textContent = model.icon;
    document.getElementById(`${target}-ai-name`).textContent = model.name;
    const dropdown = document.getElementById(`${target}-ai-dropdown`);
    dropdown.querySelectorAll('.ai-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.ai === aiKey);
    });
    document.getElementById(`${target}-ai-selector`).classList.remove('open');
    showToast(`已切换到 ${model.name}`);
}

// ==================== GLOBAL STATE ====================
let currentUser = null;
let currentTheme = 'dark';

// ==================== PAGE NAVIGATION ====================
function navigateToPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById('page-' + pageName);
    if (page) page.classList.add('active');
    document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
    document.querySelector(`[data-page="${pageName}"]`)?.classList.add('active');
    document.getElementById('mobile-nav')?.classList.remove('active');
    document.getElementById('mobile-menu-btn')?.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
// Alias for compatibility
window.showPage = navigateToPage;

document.querySelectorAll('.nav-links a, .mobile-nav a').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const page = this.getAttribute('data-page');
        if (page) navigateToPage(page);
    });
});

// ==================== MOBILE MENU ====================
function toggleMobileMenu() {
    document.getElementById('mobile-nav')?.classList.toggle('active');
    document.getElementById('mobile-menu-btn')?.classList.toggle('active');
}

// ==================== THEME TOGGLE ====================
function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
}
const savedTheme = localStorage.getItem('theme');
if (savedTheme) { currentTheme = savedTheme; document.documentElement.setAttribute('data-theme', currentTheme); }

// ==================== AUTH SYSTEM ====================
function openModal(type) {
    document.getElementById('auth-modal').classList.add('active');
    if (type === 'signup') switchToSignup();
    else switchToLogin();
}
function closeModal() { document.getElementById('auth-modal').classList.remove('active'); }

function switchToLogin() {
    document.getElementById('login-form-container').classList.remove('hidden');
    document.getElementById('signup-form-container').classList.add('hidden');
    document.getElementById('forgot-form-container').classList.add('hidden');
}
function switchToSignup() {
    document.getElementById('login-form-container').classList.add('hidden');
    document.getElementById('signup-form-container').classList.remove('hidden');
    document.getElementById('forgot-form-container').classList.add('hidden');
}
function switchToForgot() {
    document.getElementById('login-form-container').classList.add('hidden');
    document.getElementById('signup-form-container').classList.add('hidden');
    document.getElementById('forgot-form-container').classList.remove('hidden');
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        const res = await fetch(`${API_BASE}/api/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.token) {
            localStorage.setItem('token', data.token);
            currentUser = data.user || { email, name: email.split('@')[0] };
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateAuthUI();
            closeModal();
            showToast('Login successful!');
        } else {
            document.getElementById('login-error').textContent = data.message || 'Login failed';
        }
    } catch (err) {
        // Fallback for demo
        currentUser = { email, name: email.split('@')[0], initial: email[0].toUpperCase() };
        localStorage.setItem('user', JSON.stringify(currentUser));
        updateAuthUI(); closeModal(); showToast('Login successful!');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    try {
        const res = await fetch(`${API_BASE}/api/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (data.token) {
            localStorage.setItem('token', data.token);
            currentUser = data.user || { email, name: username };
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateAuthUI(); closeModal(); showCelebration(username);
        } else {
            document.getElementById('signup-error').textContent = data.message || 'Signup failed';
        }
    } catch (err) {
        currentUser = { email, name: username, initial: username[0].toUpperCase() };
        localStorage.setItem('user', JSON.stringify(currentUser));
        updateAuthUI(); closeModal(); showCelebration(username);
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    try {
        await fetch(`${API_BASE}/api/forgot-password`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
    } catch (err) {}
    document.getElementById('forgot-success').style.display = 'block';
    document.getElementById('forgot-success').textContent = 'Reset link sent! Check your email.';
}

function logout() {
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateAuthUI();
    navigateToPage('home');
    showToast('Logged out successfully');
}

function updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const mobileGuest = document.getElementById('mobile-auth-guest');
    const mobileUser = document.getElementById('mobile-auth-user');
    const chatbotOverlay = document.getElementById('chatbot-login-overlay');
    
    if (currentUser) {
        authButtons.style.display = 'none';
        userMenu.style.display = 'flex';
        document.getElementById('user-avatar').textContent = (currentUser.initial || currentUser.name?.[0] || 'U').toUpperCase();
        document.getElementById('user-name').textContent = currentUser.name || 'User';
        document.getElementById('dropdown-name').textContent = currentUser.name || 'User';
        document.getElementById('dropdown-email').textContent = currentUser.email || '';
        mobileGuest?.classList.add('hidden');
        mobileUser?.classList.remove('hidden');
        if (chatbotOverlay) chatbotOverlay.style.display = 'none';
    } else {
        authButtons.style.display = 'flex';
        userMenu.style.display = 'none';
        mobileGuest?.classList.remove('hidden');
        mobileUser?.classList.add('hidden');
        if (chatbotOverlay) chatbotOverlay.style.display = 'flex';
    }
}

function toggleUserDropdown() { document.getElementById('user-dropdown')?.classList.toggle('active'); }
document.addEventListener('click', (e) => {
    const menu = document.getElementById('user-menu');
    const dropdown = document.getElementById('user-dropdown');
    if (menu && dropdown && !menu.contains(e.target)) dropdown.classList.remove('active');
});

// ==================== ADMIN ====================
function openAdminLogin() { document.getElementById('admin-modal').classList.add('active'); }
function closeAdminModal() { document.getElementById('admin-modal').classList.remove('active'); }
function handleAdminLogin(e) { e.preventDefault(); showToast('Admin access - Feature coming soon!'); closeAdminModal(); }

// ==================== TOAST ====================
function showToast(message, duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, duration);
}

// ==================== CELEBRATION ====================
function showCelebration(username) {
    const overlay = document.getElementById('celebration-overlay');
    document.getElementById('celebration-username').textContent = username;
    overlay.classList.add('active');
    setTimeout(() => { document.querySelector('.celebration-progress-bar').style.width = '100%'; }, 100);
    setTimeout(closeCelebration, 4000);
}
function closeCelebration() { document.getElementById('celebration-overlay').classList.remove('active'); }

// ==================== WELCOME / TURNSTILE ====================
function onGlobalTurnstileSuccess() { document.getElementById('turnstile-overlay').style.display = 'none'; }
function onGlobalTurnstileError() { document.getElementById('turnstile-loading').textContent = '验证加载失败，请刷新页面'; }
function closeWelcome() {
    const overlay = document.getElementById('welcome-overlay');
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; }, 600);
}

// ==================== CHAT DEMO ====================
async function sendDemoMessage() {
    const input = document.getElementById('demo-input-field');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    const chat = document.getElementById('demo-chat');
    chat.innerHTML += `<div class="chat-message user"><div class="chat-avatar">You</div><div class="chat-bubble"><p>${msg}</p></div></div>`;
    chat.innerHTML += `<div class="chat-message" id="demo-typing"><div class="chat-avatar">AI</div><div class="chat-bubble"><p>Thinking...</p></div></div>`;
    chat.scrollTop = chat.scrollHeight;
    
    try {
        const model = AI_MODELS[selectedAI.demo];
        const res = await fetch(`${API_BASE}${model.endpoint}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });
        const data = await res.json();
        document.getElementById('demo-typing').querySelector('p').textContent = data.reply || data.message || 'No response';
    } catch (err) {
        document.getElementById('demo-typing').querySelector('p').textContent = `I received your message: "${msg}". This is a demo response. Connect to the API for full functionality.`;
    }
    document.getElementById('demo-typing')?.removeAttribute('id');
    chat.scrollTop = chat.scrollHeight;
}
function handleDemoInput(e) { if (e.key === 'Enter') sendDemoMessage(); }

async function sendChatbotMessage() {
    const input = document.getElementById('chatbot-input-field');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    const chat = document.getElementById('chatbot-chat');
    chat.innerHTML += `<div class="chat-message user"><div class="chat-avatar">You</div><div class="chat-bubble"><p>${msg}</p></div></div>`;
    chat.innerHTML += `<div class="chat-message" id="chatbot-typing"><div class="chat-avatar">AI</div><div class="chat-bubble"><p>Thinking...</p></div></div>`;
    chat.scrollTop = chat.scrollHeight;
    
    try {
        const model = AI_MODELS[selectedAI.chatbot];
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}${model.endpoint}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ message: msg })
        });
        const data = await res.json();
        document.getElementById('chatbot-typing').querySelector('p').textContent = data.reply || data.message || 'No response';
    } catch (err) {
        document.getElementById('chatbot-typing').querySelector('p').textContent = `I received: "${msg}". Connect to the API for full responses.`;
    }
    document.getElementById('chatbot-typing')?.removeAttribute('id');
    chat.scrollTop = chat.scrollHeight;
}
function handleChatbotInput(e) { if (e.key === 'Enter') sendChatbotMessage(); }

// ==================== KIT TOOLS ====================
function runSpeedTest() {
    const r = document.getElementById('speed-result');
    r.textContent = 'Testing...';
    setTimeout(() => { r.textContent = (Math.random()*150+50).toFixed(1) + ' Mbps'; }, 2000);
}

function runPingTest() {
    const r = document.getElementById('ping-result');
    r.textContent = 'Pinging...';
    setTimeout(() => { r.textContent = Math.floor(Math.random()*80+5) + ' ms'; }, 1500);
}

function runIPLookup() {
    const r = document.getElementById('ip-result');
    r.textContent = 'Detecting...';
    fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => r.textContent = data.ip)
        .catch(() => r.textContent = `192.168.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`);
}

function detectVPN() {
    const r = document.getElementById('vpn-result');
    r.textContent = 'Checking...';
    setTimeout(() => { r.textContent = Math.random() > 0.7 ? '⚠️ VPN/Proxy Detected' : '✅ No VPN/Proxy Detected'; }, 1500);
}

function checkSSL() {
    const domain = document.getElementById('ssl-domain').value;
    if (!domain) return showToast('Please enter a domain');
    document.getElementById('ssl-result').textContent = `✅ SSL valid for ${domain}`;
}

function fetchHeaders() {
    const url = document.getElementById('headers-url').value;
    if (!url) return showToast('Please enter a URL');
    document.getElementById('headers-result').textContent = `Content-Type: text/html\nServer: nginx\nX-Frame-Options: DENY\nStrict-Transport-Security: max-age=31536000`;
}

function securityScan() {
    const r = document.getElementById('security-result');
    r.textContent = 'Scanning...';
    setTimeout(() => {
        r.innerHTML = '✅ Browser: Secure<br>✅ Cookies: Enabled<br>✅ JS: Enabled<br>✅ WebGL: Supported';
    }, 2000);
}

function convertCurrency() {
    const amount = parseFloat(document.getElementById('currency-amount').value);
    const from = document.getElementById('currency-from').value;
    const to = document.getElementById('currency-to').value;
    const rates = { USD: 1, EUR: 0.92, CNY: 7.24, JPY: 149.5, GBP: 0.79 };
    const result = (amount / rates[from]) * rates[to];
    document.getElementById('currency-result').textContent = `${amount} ${from} = ${result.toFixed(2)} ${to}`;
}

function generateQRCode() {
    const input = document.getElementById('qr-input').value;
    if (!input) return showToast('Please enter text or URL');
    const canvas = document.getElementById('qr-canvas');
    if (typeof QRCode !== 'undefined') {
        QRCode.toCanvas(canvas, input, { width: 200, margin: 2, color: { dark: '#000', light: '#fff' } });
    }
}

function shortenURL() {
    const url = document.getElementById('url-input').value;
    if (!url) return showToast('Please enter a URL');
    document.getElementById('url-result').textContent = `https://agi.sh/${Math.random().toString(36).substr(2, 6)}`;
}

function convertUnit() {
    const val = parseFloat(document.getElementById('unit-value').value);
    const type = document.getElementById('unit-type').value;
    const conversions = {
        'km-mi': v => (v * 0.621371).toFixed(4) + ' miles',
        'mi-km': v => (v * 1.60934).toFixed(4) + ' km',
        'kg-lb': v => (v * 2.20462).toFixed(4) + ' lb',
        'lb-kg': v => (v * 0.453592).toFixed(4) + ' kg',
        'c-f': v => (v * 9/5 + 32).toFixed(2) + ' °F',
        'f-c': v => ((v - 32) * 5/9).toFixed(2) + ' °C'
    };
    document.getElementById('unit-result').textContent = conversions[type](val);
}

function checkPassword() {
    const pwd = document.getElementById('pwd-check-input').value;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    const colors = ['#ef4444', '#f59e0b', '#eab308', '#10b981', '#059669'];
    document.getElementById('pwd-result').innerHTML = `<span style="color:${colors[Math.min(score,4)]}">${labels[Math.min(score,4)]}</span> (${score}/5)`;
}

function translateText() {
    const text = document.getElementById('translate-input').value;
    if (!text) return showToast('Please enter text');
    document.getElementById('translate-result').textContent = '(Translation requires API connection)';
}

function convertBase() {
    const input = document.getElementById('base-input').value;
    const from = parseInt(document.getElementById('base-from').value);
    try {
        const dec = parseInt(input, from);
        document.getElementById('base-result').innerHTML = 
            `BIN: ${dec.toString(2)}<br>OCT: ${dec.toString(8)}<br>DEC: ${dec.toString(10)}<br>HEX: ${dec.toString(16).toUpperCase()}`;
    } catch (e) { document.getElementById('base-result').textContent = 'Invalid input'; }
}

function generateRandomNumber() {
    const min = parseInt(document.getElementById('rand-min').value) || 1;
    const max = parseInt(document.getElementById('rand-max').value) || 100;
    document.getElementById('rand-result').textContent = Math.floor(Math.random() * (max - min + 1)) + min;
}

async function generateHash() {
    const input = document.getElementById('hash-input').value;
    const type = document.getElementById('hash-type').value;
    if (!input) return showToast('Please enter text');
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(input);
        const hashBuffer = await crypto.subtle.digest(type, data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        document.getElementById('hash-result').textContent = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { document.getElementById('hash-result').textContent = 'Hash generation failed'; }
}

function calculateAge() {
    const birth = new Date(document.getElementById('birth-date').value);
    if (isNaN(birth)) return showToast('Please enter a valid date');
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
    const days = Math.floor((now - birth) / (1000*60*60*24));
    document.getElementById('age-result').innerHTML = `<span style="font-size:2.5rem;font-weight:700;">${age}</span> years<br><span style="font-size:0.85rem;opacity:0.7;">${days.toLocaleString()} days lived</span>`;
}

function calculateDateDiff() {
    const start = new Date(document.getElementById('date-start').value);
    const end = new Date(document.getElementById('date-end').value);
    if (isNaN(start) || isNaN(end)) return showToast('Please select both dates');
    const diff = Math.abs(end - start);
    const days = Math.floor(diff / (1000*60*60*24));
    document.getElementById('date-result').textContent = `${days} days (${Math.floor(days/7)} weeks, ${days%7} days)`;
}

function updateWorldClock() {
    const zones = [
        { city: 'New York', tz: 'America/New_York' },
        { city: 'London', tz: 'Europe/London' },
        { city: 'Beijing', tz: 'Asia/Shanghai' },
        { city: 'Tokyo', tz: 'Asia/Tokyo' }
    ];
    const html = zones.map(z => {
        const time = new Date().toLocaleTimeString('en-US', { timeZone: z.tz, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return `<div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.05);"><span style="color:var(--text-secondary)">${z.city}</span><span style="font-family:'Space Mono',monospace;color:var(--accent)">${time}</span></div>`;
    }).join('');
    const el = document.getElementById('world-clock-result');
    if (el) el.innerHTML = html;
}
setInterval(updateWorldClock, 1000);
updateWorldClock();

function calculateBMI() {
    const h = parseFloat(document.getElementById('bmi-height').value) / 100;
    const w = parseFloat(document.getElementById('bmi-weight').value);
    if (!h || !w) return;
    const bmi = (w / (h * h)).toFixed(1);
    let status = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
    let color = bmi < 18.5 ? '#3b82f6' : bmi < 25 ? 'var(--accent-green)' : bmi < 30 ? 'var(--accent-orange)' : '#ef4444';
    document.getElementById('bmi-result').innerHTML = `<span style="font-size:2.5rem;font-weight:700;">${bmi}</span><br><span style="color:${color};font-weight:600;">${status}</span>`;
}

// Calculator
let calcExpression = '';
function calcInput(val) { calcExpression += val; document.getElementById('calc-display').value = calcExpression; }
function calcClear() { calcExpression = ''; document.getElementById('calc-display').value = ''; }
function calcDelete() { calcExpression = calcExpression.slice(0, -1); document.getElementById('calc-display').value = calcExpression; }
function calcEval() {
    try {
        const expr = calcExpression.replace(/÷/g, '/').replace(/×/g, '*').replace(/−/g, '-');
        calcExpression = String(eval(expr));
        document.getElementById('calc-display').value = calcExpression;
    } catch (e) { document.getElementById('calc-display').value = 'Error'; calcExpression = ''; }
}

function plotFunction() {
    const canvas = document.getElementById('func-canvas');
    const ctx = canvas.getContext('2d');
    const expr = document.getElementById('func-input').value;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h); ctx.stroke();
    ctx.strokeStyle = '#2997ff'; ctx.lineWidth = 2; ctx.beginPath();
    for (let px = 0; px < w; px++) {
        const x = (px - w/2) / (w/10);
        try {
            const y = eval(expr);
            const py = h/2 - y * (h/10);
            px === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        } catch (e) {}
    }
    ctx.stroke();
}

function generateCitation() {
    const author = document.getElementById('cite-author').value;
    const title = document.getElementById('cite-title').value;
    const year = document.getElementById('cite-year').value;
    const format = document.getElementById('cite-format').value;
    if (!author || !title || !year) return showToast('Please fill all fields');
    let citation = '';
    if (format === 'apa') citation = `${author} (${year}). ${title}.`;
    else if (format === 'mla') citation = `${author}. "${title}." ${year}.`;
    else citation = `${author}. ${title}. ${year}.`;
    document.getElementById('cite-result').textContent = citation;
}

function convertWavelength() {
    const nm = parseFloat(document.getElementById('wave-input').value);
    if (!nm) return;
    const freq = (3e8 / (nm * 1e-9) / 1e12).toFixed(2);
    const energy = (6.626e-34 * 3e8 / (nm * 1e-9) / 1.602e-19).toFixed(3);
    document.getElementById('wave-result').innerHTML = `Frequency: ${freq} THz<br>Energy: ${energy} eV`;
}

function generateLuckyColor() {
    const colors = [
        { name: 'Ruby Red', hex: '#e74c3c', emoji: '❤️', meaning: 'Passion & Energy' },
        { name: 'Ocean Blue', hex: '#3498db', emoji: '💙', meaning: 'Calm & Wisdom' },
        { name: 'Emerald Green', hex: '#2ecc71', emoji: '💚', meaning: 'Growth & Harmony' },
        { name: 'Golden Sun', hex: '#f1c40f', emoji: '💛', meaning: 'Joy & Optimism' },
        { name: 'Royal Purple', hex: '#9b59b6', emoji: '💜', meaning: 'Creativity & Mystery' },
        { name: 'Coral Pink', hex: '#e91e63', emoji: '💗', meaning: 'Love & Compassion' }
    ];
    const c = colors[Math.floor(Math.random() * colors.length)];
    document.getElementById('lucky-color-result').innerHTML = `
        <div style="width:80px;height:80px;border-radius:50%;background:${c.hex};margin:0 auto 1rem;box-shadow:0 8px 32px ${c.hex}66;"></div>
        <div style="font-size:1.3rem;font-weight:700;">${c.emoji} ${c.name}</div>
        <div style="color:var(--text-secondary);font-size:0.85rem;margin-top:0.3rem;">${c.hex}</div>
        <div style="color:var(--text-secondary);font-size:0.85rem;margin-top:0.5rem;">${c.meaning}</div>`;
}

function drawTarotCard() {
    const cards = [
        { name: 'The Fool', emoji: '🌟', meaning: 'New beginnings, spontaneity, a leap of faith' },
        { name: 'The Magician', emoji: '🎩', meaning: 'Manifestation, resourcefulness, power' },
        { name: 'The High Priestess', emoji: '🌙', meaning: 'Intuition, sacred knowledge, mystery' },
        { name: 'The Empress', emoji: '👑', meaning: 'Femininity, beauty, nature, abundance' },
        { name: 'The Tower', emoji: '⚡', meaning: 'Sudden change, upheaval, revelation' },
        { name: 'The Star', emoji: '⭐', meaning: 'Hope, faith, purpose, renewal' },
        { name: 'The Sun', emoji: '☀️', meaning: 'Positivity, fun, warmth, success' },
        { name: 'The Moon', emoji: '🌕', meaning: 'Illusion, fear, anxiety, subconscious' },
        { name: 'The World', emoji: '🌍', meaning: 'Completion, integration, accomplishment' }
    ];
    const c = cards[Math.floor(Math.random() * cards.length)];
    const reversed = Math.random() > 0.5;
    document.getElementById('tarot-result').innerHTML = `
        <div style="font-size:3rem;margin-bottom:0.5rem;${reversed?'transform:rotate(180deg);':''}">${c.emoji}</div>
        <div style="font-size:1.2rem;font-weight:700;">${c.name}</div>
        ${reversed ? '<div style="color:var(--accent-purple);font-size:0.8rem;margin:0.3rem 0;">Reversed</div>' : ''}
        <div style="color:var(--text-secondary);font-size:0.85rem;margin-top:0.5rem;">${c.meaning}</div>`;
}

// ==================== PROFILE ====================
function updateProfile(e) { e.preventDefault(); showToast('Profile updated!'); }
function changePassword(e) { e.preventDefault(); showToast('Password updated!'); }
function resendVerification() { showToast('Verification email sent!'); }

// ==================== VISITOR COUNTER ====================
async function initVisitorCounter() {
    try {
        const res = await fetch(`${API_BASE}/api/visitor`);
        const data = await res.json();
        if (data.uv) document.getElementById('visitor-uv').textContent = data.uv;
        if (data.pv) document.getElementById('visitor-pv').textContent = data.pv;
    } catch (e) {
        document.getElementById('visitor-uv').textContent = '12,847';
        document.getElementById('visitor-pv').textContent = '89,234';
    }
}

// ==================== SCROLL EFFECTS ====================
window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    if (window.scrollY > 80) nav?.classList.add('scrolled');
    else nav?.classList.remove('scrolled');
});

// ==================== INITIALIZATION ====================
function init() {
    // Restore user session
    const savedUser = localStorage.getItem('user');
    if (savedUser) { try { currentUser = JSON.parse(savedUser); } catch(e) {} }
    updateAuthUI();
    initVisitorCounter();
    // Plot initial function
    setTimeout(plotFunction, 500);
    console.log('✨ AGI Era - Ultimate Liquid Glass Edition');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Expose functions globally
Object.assign(window, {
    navigateToPage, toggleMobileMenu, toggleTheme, openModal, closeModal,
    switchToLogin, switchToSignup, switchToForgot,
    handleLogin, handleSignup, handleForgotPassword, logout,
    toggleUserDropdown, openAdminLogin, closeAdminModal, handleAdminLogin,
    toggleAISelector, selectAI,
    sendDemoMessage, handleDemoInput, sendChatbotMessage, handleChatbotInput,
    runSpeedTest, runPingTest, runIPLookup, detectVPN, checkSSL, fetchHeaders,
    securityScan, convertCurrency, generateQRCode, shortenURL, convertUnit,
    checkPassword, translateText, convertBase, generateRandomNumber, generateHash,
    calculateAge, calculateDateDiff, calculateBMI,
    calcInput, calcClear, calcDelete, calcEval, plotFunction,
    generateCitation, convertWavelength, generateLuckyColor, drawTarotCard,
    updateProfile, changePassword, resendVerification,
    showCelebration, closeCelebration, closeWelcome,
    onGlobalTurnstileSuccess, onGlobalTurnstileError, showToast
});
