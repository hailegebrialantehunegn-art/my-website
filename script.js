/**
 * script.js
 * AccessFirst — Complete front-end app (Vanilla JS)
 *
 * Features:
 * - Local authentication (localStorage) with hashed passwords (Web Crypto SHA-256)
 * - Simulated third-party login (Google/Microsoft)
 * - Notify owner via mailto when new user signs up or Donate clicked (fallback local record)
 * - Text-to-Speech and Speech-to-Text (Web Speech API) for blind flow
 * - Speech-to-Sign mapping and Sign-to-Speech via palette
 * - Handsign/TensorFlow.js camera detection (best-effort integration with provided CDN)
 * - Accessibility preferences persisted in localStorage
 * - Interaction history persisted
 * - Reminders every 3 minutes (spoken for blind, visual for deaf)
 * - Demo mode showcasing features
 *
 * Notes on Handsign / TF model:
 * - The included Handsign script (from CDN) exposes varying APIs across versions.
 *   This code attempts common patterns: window.handsign.loadModel(), window.HandSign.init(), or tf.loadGraphModel()
 * - If model cannot be loaded, a simulated detection loop runs (still useful for demo)
 *
 * Developer: HaileGebriel
 */

/* ===========================
   Storage keys & initial state
   =========================== */
const LS = {
  USERS: 'af_users_v2',
  CURRENT: 'af_current_v2',
  PREFS: 'af_prefs_v2',
  HISTORY: 'af_history_v2',
  NOTIFICATIONS: 'af_notifications_v2'
};

const OWNER_EMAIL = 'hailegebrialantehunegn@gmail.com';

const App = {
  users: [],
  currentEmail: null,
  prefs: {
    contrast: false,
    fontSize: 'medium',
    reduceMotion: false,
    demo: false
  },
  speech: {
    ttsSupported: 'speechSynthesis' in window,
    sttSupported: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    recognition: null
  },
  handsign: {
    modelUrl: 'https://cdn.jsdelivr.net/gh/syauqy/handsign-tensorflow@main/model/model.json',
    initialized: false,
    detector: null,
    streaming: false,
    videoStream: null
  },
  reminderTimer: null,
  demoTimer: null
};

/* ===========================
   DOM cache
   =========================== */
const D = {};
document.addEventListener('DOMContentLoaded', () => {
  // cache elements
  [
    'nav-home','nav-access','nav-login','nav-signup','nav-donate','nav-about',
    'cta-get-started','cta-login','cta-signup','cta-donate','home','access-choice','blind-flow','deaf-flow','about',
    'home-tts-input','home-tts-speak','home-tts-stop','home-tts-clear',
    'flow-blind','flow-deaf',
    'blind-stt-output','blind-stt-start','blind-stt-stop','blind-stt-copy',
    'blind-voice-toggle','blind-tts-input','blind-tts-speak','blind-tts-stop','blind-tts-clear','history-blind',
    'sign-palette','assembled-phrase','s2s-speak','s2s-clear','camera-video','camera-canvas','detected-sign','start-camera','stop-camera','speak-detected','camera-status','history-deaf',
    'contrast-toggle','font-size','reduce-motion','demo-mode',
    'login-modal','signup-modal','login-form','signup-form','login-email','login-password','login-google','login-microsoft','login-close','login-submit',
    'signup-username','signup-email','signup-password','pwd-strength','pwd-feedback','signup-contrast','signup-reduce','signup-font','signup-google','signup-microsoft','signup-close','signup-submit',
    'deaf-stt-start','deaf-stt-stop','deaf-stt-output','deaf-stt-signs',
    'live','year'
  ].forEach(id => D[id] = document.getElementById(id));

  // initialize data and UI
  loadStorage();
  applyPrefsToUI();
  buildSignPalette();
  renderHistory();
  attachEventListeners();
  initSpeechRecognition();
  tryInitHandsign();
  startReminders();
  if (App.prefs.demo) startDemo();

  if (D.year) D.year.textContent = new Date().getFullYear();
});

/* ===========================
   Storage helpers
   =========================== */
function loadStorage(){
  try {
    App.users = JSON.parse(localStorage.getItem(LS.USERS) || '[]');
    App.currentEmail = localStorage.getItem(LS.CURRENT) || null;
    App.prefs = Object.assign(App.prefs, JSON.parse(localStorage.getItem(LS.PREFS) || '{}'));
  } catch (e) { console.warn('loadStorage error', e); }
}
function saveUsers(){ localStorage.setItem(LS.USERS, JSON.stringify(App.users)); }
function saveCurrent(email){ if (email) localStorage.setItem(LS.CURRENT, email); else localStorage.removeItem(LS.CURRENT); App.currentEmail = email; }
function savePrefs(){ localStorage.setItem(LS.PREFS, JSON.stringify(App.prefs)); }
function pushNotification(note){
  const arr = JSON.parse(localStorage.getItem(LS.NOTIFICATIONS) || '[]');
  arr.unshift(Object.assign({timestamp: Date.now()}, note));
  localStorage.setItem(LS.NOTIFICATIONS, JSON.stringify(arr));
}

/* ===========================
   Utility helpers
   =========================== */
function getCurrentUser(){ if (!App.currentEmail) return null; return App.users.find(u=>u.email===App.currentEmail) || null; }
function setCurrentUser(email){ saveCurrent(email); const u = getCurrentUser(); if (u && u.uiPrefs) { App.prefs = Object.assign(App.prefs, u.uiPrefs); savePrefs(); applyPrefsToUI(); } }

/* hash password using SHA-256 */
async function hashPassword(pw){
  const enc = new TextEncoder();
  const data = enc.encode(pw);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}
function validateEmail(email){ return /\S+@\S+\.\S+/.test(email); }
function passwordScore(pw){
  let score=0;
  if (!pw) return 0;
  if (pw.length>=8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, score);
}

/* accessible label extraction (for voice feedback on focus) */
function accessibleLabel(el){
  if (!el) return '';
  if (el.getAttribute && el.getAttribute('aria-label')) return el.getAttribute('aria-label');
  if (el.getAttribute && el.getAttribute('aria-labelledby')) { const id = el.getAttribute('aria-labelledby'); const n=document.getElementById(id); if (n) return n.textContent.trim(); }
  if (el.alt) return el.alt;
  if (el.innerText && el.innerText.trim()) return el.innerText.trim();
  if (el.value) return String(el.value);
  return '';
}

/* announce to SR + optional TTS if user enabled */
function announce(msg){
  if (D.live) D.live.textContent = msg;
  const user = getCurrentUser();
  if (user && user.voiceEnabled && App.speech.ttsSupported) speak(msg, {interrupt:true});
}

/* ===========================
   Apply preferences to UI
   =========================== */
function applyPrefsToUI(){
  if (App.prefs.contrast) document.documentElement.classList.add('high-contrast'); else document.documentElement.classList.remove('high-contrast');
  if (App.prefs.fontSize === 'large') document.documentElement.style.fontSize = '18px';
  else if (App.prefs.fontSize === 'small') document.documentElement.style.fontSize = '14px';
  else document.documentElement.style.fontSize = '';
  if (App.prefs.reduceMotion) document.documentElement.classList.add('reduced-motion'); else document.documentElement.classList.remove('reduced-motion');

  if (D['contrast-toggle']) D['contrast-toggle'].checked = !!App.prefs.contrast;
  if (D['font-size']) D['font-size'].value = App.prefs.fontSize || 'medium';
  if (D['reduce-motion']) D['reduce-motion'].checked = !!App.prefs.reduceMotion;
  if (D['demo-mode']) D['demo-mode'].checked = !!App.prefs.demo;
}

/* ===========================
   Event wiring
   =========================== */
function attachEventListeners(){
  // Navigation buttons (data-target)
  document.querySelectorAll('[data-target]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget.dataset.target;
      if (target) showPage(target);
    });
  });

  // Modal buttons (data-modal)
  document.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.modal;
      if (id) openModal(id);
    });
  });

  // Donate: notify owner when clicked (link itself opens)
  document.querySelectorAll('.donate').forEach(a => {
    a.addEventListener('click', (e) => {
      notifyDonate();
      // allow native navigation to proceed (new tab)
    });
  });

  // Home TTS controls
  if (D['home-tts-speak']) D['home-tts-speak'].addEventListener('click', ()=> { const t = D['home-tts-input'].value.trim() || 'Hello from AccessFirst'; speak(t); pushHistory({type:'tts', text:t}); });
  if (D['home-tts-stop']) D['home-tts-stop'].addEventListener('click', stopSpeak);
  if (D['home-tts-clear']) D['home-tts-clear'].addEventListener('click', ()=> D['home-tts-input'].value='');

  // Preference toggles
  if (D['contrast-toggle']) D['contrast-toggle'].addEventListener('change', (e)=> { App.prefs.contrast = e.target.checked; savePrefs(); applyPrefsToUI(); announce(App.prefs.contrast ? 'High contrast enabled' : 'High contrast disabled'); });
  if (D['font-size']) D['font-size'].addEventListener('change', (e)=> { App.prefs.fontSize = e.target.value; savePrefs(); applyPrefsToUI(); announce('Font size updated'); });
  if (D['reduce-motion']) D['reduce-motion'].addEventListener('change', (e)=> { App.prefs.reduceMotion = e.target.checked; savePrefs(); applyPrefsToUI(); announce(App.prefs.reduceMotion ? 'Reduced motion enabled' : 'Reduced motion disabled'); });
  if (D['demo-mode']) D['demo-mode'].addEventListener('change', (e)=> { App.prefs.demo = e.target.checked; savePrefs(); if (e.target.checked) startDemo(); else stopDemo(); });

  // Blind flow controls
  if (D['blind-stt-start']) D['blind-stt-start'].addEventListener('click', startRecognitionForBlind);
  if (D['blind-stt-stop']) D['blind-stt-stop'].addEventListener('click', stopRecognition);
  if (D['blind-stt-copy']) D['blind-stt-copy'].addEventListener('click', ()=> navigator.clipboard?.writeText(D['blind-stt-output'].value || '').then(()=> announce('Copied recognized text')));

  if (D['blind-tts-speak']) D['blind-tts-speak'].addEventListener('click', ()=> { const t = D['blind-tts-input'].value.trim(); if (!t) { announce('Type text to speak'); return; } speak(t); pushHistory({type:'tts', text:t}); });
  if (D['blind-tts-stop']) D['blind-tts-stop'].addEventListener('click', stopSpeak);
  if (D['blind-tts-clear']) D['blind-tts-clear'].addEventListener('click', ()=> D['blind-tts-input'].value='');

  // Blind voice toggle (per-user preference)
  if (D['blind-voice-toggle']) D['blind-voice-toggle'].addEventListener('click', () => {
    const user = getCurrentUser();
    if (!user) { announce('Please sign up or log in to enable voice feedback'); openModal('login-modal'); return; }
    user.voiceEnabled = !user.voiceEnabled;
    saveUser(user);
    D['blind-voice-toggle'].setAttribute('aria-pressed', user.voiceEnabled ? 'true' : 'false');
    D['blind-voice-toggle'].textContent = user.voiceEnabled ? 'Disable Voice Feedback' : 'Enable Voice Feedback';
    announce(user.voiceEnabled ? 'Voice feedback enabled' : 'Voice feedback disabled');
  });

  // Deaf sign palette
  if (D['sign-palette']) D['sign-palette'].addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sign]');
    if (!btn) return;
    appendSign(btn.dataset.sign);
  });
  if (D['s2s-speak']) D['s2s-speak'].addEventListener('click', ()=> { const phrase = (D['assembled-phrase'].textContent||'').trim(); if (!phrase) { announce('Compose a phrase first'); return; } speak(phrase); pushHistory({type:'s2s', text:phrase}); });
  if (D['s2s-clear']) D['s2s-clear'].addEventListener('click', ()=> D['assembled-phrase'].textContent='');

  // Handsign camera & detection
  if (D['start-camera']) D['start-camera'].addEventListener('click', startCameraDetection);
  if (D['stop-camera']) D['stop-camera'].addEventListener('click', stopCameraDetection);
  if (D['speak-detected']) D['speak-detected'].addEventListener('click', ()=> { const txt = D['detected-sign'].textContent; if (txt && txt !== 'No sign detected') { speak(txt); pushHistory({type:'sign', text:txt}); } });

  // Deaf speech-to-sign controls
  if (D['deaf-stt-start']) D['deaf-stt-start'].addEventListener('click', startSpeechToSign);
  if (D['deaf-stt-stop']) D['deaf-stt-stop'].addEventListener('click', stopRecognition);

  // Login/Signup forms
  if (D['login-form']) {
    D['login-form'].addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (D['login-email'].value||'').trim().toLowerCase();
      const pw = D['login-password'].value||'';
      if (!email || !pw) { alert('Email and password required'); return; }
      const user = App.users.find(u=>u.email===email);
      if (!user) { alert('No account found. Please sign up.'); return; }
      const h = await hashPassword(pw);
      if (h !== user.passwordHash) { alert('Invalid credentials'); return; }
      setCurrentUser(email);
      // apply user's prefs & voiceEnabled
      if (user.uiPrefs) { App.prefs = Object.assign(App.prefs, user.uiPrefs); savePrefs(); applyPrefsToUI(); }
      if (D['blind-voice-toggle']) { D['blind-voice-toggle'].setAttribute('aria-pressed', user.voiceEnabled ? 'true' : 'false'); D['blind-voice-toggle'].textContent = user.voiceEnabled ? 'Disable Voice Feedback' : 'Enable Voice Feedback'; }
      announce(`Welcome back, ${user.username}`);
      closeModal('login-modal');
    });
    if (D['login-close']) D['login-close'].addEventListener('click', ()=> closeModal('login-modal'));
    if (D['login-google']) D['login-google'].addEventListener('click', ()=> simulateThirdPartyLogin('Google'));
    if (D['login-microsoft']) D['login-microsoft'].addEventListener('click', ()=> simulateThirdPartyLogin('Microsoft'));
  }

  if (D['signup-form']) {
    // password strength meter
    if (D['signup-password']) D['signup-password'].addEventListener('input', (e)=> {
      const score = passwordScore(e.target.value);
      if (D['pwd-strength']) D['pwd-strength'].value = score;
      if (D['pwd-feedback']) D['pwd-feedback'].textContent = 'Password strength: ' + ['Very weak','Weak','Fair','Good','Strong'][score];
    });

    D['signup-form'].addEventListener('submit', async (e)=> {
      e.preventDefault();
      const username = (D['signup-username'].value||'').trim();
      const email = (D['signup-email'].value||'').trim().toLowerCase();
      const pw = D['signup-password'].value||'';
      if (!username || !email || !pw) { alert('Fill required fields'); return; }
      if (!validateEmail(email)) { alert('Invalid email'); return; }
      if (App.users.some(u=>u.email===email)) { alert('Email already registered'); return; }
      const score = passwordScore(pw);
      if (score < 2 && !confirm('Password is weak. Continue?')) return;
      const hash = await hashPassword(pw);
      const uiPrefs = { contrast: !!D['signup-contrast']?.checked, reduceMotion: !!D['signup-reduce']?.checked, fontSize: D['signup-font']?.value || 'medium' };
      const user = { username, email, passwordHash: hash, createdAt: Date.now(), uiPrefs, voiceEnabled: false, userType: 'none' };
      App.users.push(user);
      saveUsers();
      App.prefs = Object.assign(App.prefs, uiPrefs);
      savePrefs(); applyPrefsToUI();
      notifyOwnerNewSignup(user);
      setCurrentUser(email);
      if (D['blind-voice-toggle']) { D['blind-voice-toggle'].setAttribute('aria-pressed', 'false'); D['blind-voice-toggle'].textContent = 'Enable Voice Feedback'; }
      announce(`Account created for ${username}`);
      closeModal('signup-modal');
    });
    if (D['signup-close']) D['signup-close'].addEventListener('click', ()=> closeModal('signup-modal'));
    if (D['signup-google']) D['signup-google'].addEventListener('click', ()=> simulateThirdPartySignUp('Google'));
    if (D['signup-microsoft']) D['signup-microsoft'].addEventListener('click', ()=> simulateThirdPartySignUp('Microsoft'));
  }

  // keyboard: Escape closes modals
  document.addEventListener('keydown', (e)=> { if (e.key === 'Escape') { closeModal('login-modal'); closeModal('signup-modal'); } });

  // focus voice feedback: if current user voiceEnabled and userType blind, speak focused control label
  document.addEventListener('focusin', (e)=> {
    const user = getCurrentUser();
    if (!user || !user.voiceEnabled) return;
    if (user.userType !== 'blind') return;
    const label = accessibleLabel(e.target);
    if (label) speak(label, {interrupt:true});
  });
}

/* ===========================
   Page control
   =========================== */
function showPage(id){
  document.querySelectorAll('.page').forEach(p=> {
    if (p.id === id) { p.classList.add('page--active'); p.hidden = false; setTimeout(()=> { const f = p.querySelector('button,a,input,textarea,select'); if (f) f.focus(); }, 160); }
    else { p.classList.remove('page--active'); p.hidden = true; }
  });
  announce(`Navigated to ${id.replace('-', ' ')}`);
}

/* ===========================
   Modal helpers
   =========================== */
function openModal(id){ const d=document.getElementById(id); if (!d) return; if (typeof d.showModal === 'function') d.showModal(); else d.style.display='block'; d.querySelector('input,button,select,textarea')?.focus(); }
function closeModal(id){ const d=document.getElementById(id); if (!d) return; if (typeof d.close === 'function') d.close(); else d.style.display='none'; }

/* ===========================
   TTS & STT
   =========================== */
function speak(text, opts={interrupt:false}){
  if (!App.speech.ttsSupported) { alert('Text-to-Speech not supported in this browser.'); return; }
  try {
    if (opts.interrupt) window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length) u.voice = voices.find(v=>v.lang && v.lang.startsWith('en')) || voices[0];
    window.speechSynthesis.speak(u);
  } catch (e) { console.warn('TTS error', e); }
}
function stopSpeak(){ if (window.speechSynthesis) window.speechSynthesis.cancel(); }

/* Initialize speech recognition */
function initSpeechRecognition(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  if (!SR) { console.warn('SpeechRecognition not supported'); return; }
  try {
    const r = new SR();
    r.lang = 'en-US';
    r.interimResults = false;
    r.onstart = ()=> { announce('Listening...'); };
    r.onend = ()=> { announce('Stopped listening'); };
    r.onerror = (e)=> { console.warn('Recognition error', e); announce('Recognition error'); };
    // default handler: set recognized text to blind STT output
    r.onresult = (ev)=> {
      const txt = ev.results[0][0].transcript;
      if (D['blind-stt-output']) D['blind-stt-output'].value = txt;
      pushHistory({type:'stt', text:txt});
      announce('Speech recognized');
    };
    App.speech.recognition = r;
  } catch (e) { console.warn('initSpeechRecognition error', e); }
}

/* Start recognition for blind flow uses the default onresult above */
function startRecognitionForBlind(){
  if (!App.speech.recognition) { alert('Speech recognition not supported in this browser.'); return; }
  try { App.speech.recognition.start(); } catch(e) { console.warn(e); }
}
function stopRecognition(){
  if (App.speech.recognition) try { App.speech.recognition.stop(); } catch(e) { console.warn(e); }
}

/* ===========================
   Deaf: Speech-to-Sign mapping
   =========================== */
/* simple mapping table */
const SIGN_MAP = {
  hello: '👋', hi: '👋', yes: '👍', no: '👎', thank: '🙏', thanks: '🙏', help: '🆘', good: '🌟', 'thank you': '🙏', 'i love you': '🤟'
};

/* Start speech-to-sign: override recognition.onresult temporarily */
function startSpeechToSign(){
  if (!App.speech.recognition) { alert('Speech recognition not supported'); return; }
  const r = App.speech.recognition;
  // override handler
  r.onresult = (ev)=> {
    const txt = ev.results[0][0].transcript;
    if (D['deaf-stt-output']) D['deaf-stt-output'].value = txt;
    const mapped = mapTextToSigns(txt);
    if (D['deaf-stt-signs']) {
      D['deaf-stt-signs'].innerHTML = '';
      mapped.forEach(s => {
        const el = document.createElement('span');
        el.style.display='inline-block';
        el.style.margin='0.25rem';
        el.style.padding='0.4rem 0.6rem';
        el.style.borderRadius='8px';
        el.style.background='rgba(255,255,255,0.8)';
        el.style.border='1px solid rgba(0,0,0,0.06)';
        el.textContent = s;
        D['deaf-stt-signs'].appendChild(el);
      });
    }
    pushHistory({type:'stsign', text:txt});
    announce('Speech converted to sign placeholders');
  };
  try { r.start(); } catch(e){ console.warn(e); }
}
function mapTextToSigns(text){
  if (!text) return [];
  const words = text.split(/\s+/).slice(0,20);
  return words.map(w => {
    const key = w.toLowerCase().replace(/[^\w\s]/g,'');
    return SIGN_MAP[key] || '🤟';
  });
}

/* ===========================
   Sign-to-Speech palette
   =========================== */
function buildSignPalette(){
  if (!D['sign-palette']) return;
  D['sign-palette'].innerHTML = '';
  const SIGNS = [
    {key:'Hello', emoji:'👋'},
    {key:'Yes', emoji:'👍'},
    {key:'No', emoji:'👎'},
    {key:'Thank you', emoji:'🙏'},
    {key:'Help', emoji:'🆘'},
    {key:'Good', emoji:'🌟'}
  ];
  SIGNS.forEach(s => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sign-btn';
    btn.dataset.sign = s.key;
    btn.setAttribute('aria-label', `Sign ${s.key}`);
    btn.innerHTML = `${s.emoji} <span class="sign-label">${s.key}</span>`;
    D['sign-palette'].appendChild(btn);
  });
}
function appendSign(word){
  if (!D['assembled-phrase']) return;
  const cur = (D['assembled-phrase'].textContent||'').trim();
  D['assembled-phrase'].textContent = cur ? `${cur} ${word}` : word;
}

/* ===========================
   Camera & Handsign integration (best-effort)
   ===========================
   Tries:
   - window.handsign.loadModel(url)
   - window.HandSign.init(url)
   - tf.loadGraphModel(url)
   Fallback: simulated detection loop
   =========================== */
async function tryInitHandsign(){
  // delay a bit to let CDN script load
  await new Promise(r=>setTimeout(r, 350));
  try {
    if (window.handsign && typeof window.handsign.loadModel === 'function') {
      App.handsign.detector = await window.handsign.loadModel(App.handsign.modelUrl);
      App.handsign.initialized = true;
      console.info('Handsign loaded via window.handsign.loadModel');
      return;
    }
    if (window.HandSign && typeof window.HandSign.init === 'function') {
      await window.HandSign.init(App.handsign.modelUrl);
      App.handsign.detector = window.HandSign;
      App.handsign.initialized = true;
      console.info('HandSign initialized via HandSign.init');
      return;
    }
    if (window.tf && typeof window.tf.loadGraphModel === 'function') {
      const model = await window.tf.loadGraphModel(App.handsign.modelUrl);
      App.handsign.detector = model;
      App.handsign.initialized = true;
      console.info('Handsign model loaded via tf.loadGraphModel');
      return;
    }
  } catch (e) { console.warn('Handsign init error', e); }
  App.handsign.initialized = false;
  console.info('Handsign unavailable; using simulated detection');
}

/* Start camera and detection loop */
async function startCameraDetection(){
  if (App.handsign.streaming) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}, audio:false});
    D['camera-video'].srcObject = stream;
    App.handsign.videoStream = stream;
    App.handsign.streaming = true;
    if (D['camera-status']) D['camera-status'].textContent = 'Status: camera active';
    if (App.handsign.initialized && App.handsign.detector) runRealDetectionLoop();
    else runSimulatedDetectionLoop();
    announce('Camera started');
  } catch (e) {
    console.warn('Camera error', e);
    alert('Camera not available. Please grant permission or use the sign palette.');
    if (D['camera-status']) D['camera-status'].textContent = 'Status: camera unavailable';
  }
}
function stopCameraDetection(){
  if (!App.handsign.streaming) return;
  if (App.handsign.videoStream) { App.handsign.videoStream.getTracks().forEach(t=>t.stop()); App.handsign.videoStream = null; }
  App.handsign.streaming = false;
  if (D['camera-status']) D['camera-status'].textContent = 'Status: stopped';
  if (D['detected-sign']) D['detected-sign'].textContent = 'No sign detected';
  announce('Camera stopped');
}

/* Real detection (best-effort). Model outputs vary; we present generic label */
async function runRealDetectionLoop(){
  const video = D['camera-video'];
  const canvas = D['camera-canvas'];
  const ctx = canvas.getContext('2d');

  await new Promise(r => {
    if (video.readyState >= 2) return r();
    video.onloadeddata = ()=> r();
  });

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;

  async function loop(){
    if (!App.handsign.streaming) return;
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const det = App.handsign.detector;
      let label = 'Sign detected';
      if (det && typeof det.predict === 'function') {
        const res = await det.predict(canvas);
        label = res?.label || res?.class || JSON.stringify(res);
      } else if (det && typeof det.classify === 'function') {
        const res = await det.classify(canvas);
        label = res?.label || (Array.isArray(res) && res[0]?.className) || JSON.stringify(res);
      } else if (det && typeof det.executeAsync === 'function' && window.tf) {
        try {
          const img = window.tf.browser.fromPixels(canvas).toFloat().div(255).expandDims(0);
          await det.executeAsync(img);
          label = 'Sign detected';
          window.tf.dispose(img);
        } catch (e) { console.warn('tf inference error', e); }
      }
      if (D['detected-sign']) D['detected-sign'].textContent = label;
      pushHistory({type:'stsign', text:label});
    } catch (err) {
      console.warn('detection loop error', err);
      if (D['detected-sign']) D['detected-sign'].textContent = 'Detection error';
    }
    setTimeout(()=> { if (App.handsign.streaming) requestAnimationFrame(loop); }, 300);
  }
  loop();
}

/* Simulated detection loop for environments without model/camera support */
function runSimulatedDetectionLoop(){
  const choices = ['Hello','Yes','No','Thank you','Help','Good'];
  let idx = 0;
  function loop(){
    if (!App.handsign.streaming) return;
    const c = choices[idx % choices.length];
    if (D['detected-sign']) D['detected-sign'].textContent = c;
    pushHistory({type:'stsign', text:c});
    idx++;
    setTimeout(()=> { if (App.handsign.streaming) loop(); }, 1200);
  }
  loop();
}

/* ===========================
   Notifications to owner (mailto fallback)
   =========================== */
function notifyOwnerNewSignup(user){
  const subject = encodeURIComponent(`AccessFirst signup — ${user.username}`);
  const body = encodeURIComponent([
    `A new user signed up on AccessFirst.`,
    `Username: ${user.username}`,
    `Email: ${user.email}`,
    `Time: ${new Date().toISOString()}`,
    '',
    'This notification is generated by the frontend (no backend).'
  ].join('\n'));
  const mailto = `mailto:${OWNER_EMAIL}?subject=${subject}&body=${body}`;
  openMailClient(mailto);
  pushNotification({type:'signup', to:OWNER_EMAIL, user:{username:user.username,email:user.email}});
}

/* Donate notification */
function notifyDonate(){
  const subject = encodeURIComponent('AccessFirst: Donate click (Mekedonia)');
  const body = encodeURIComponent([
    'A visitor clicked the donate link from AccessFirst.',
    'GoFundMe: https://www.gofundme.com/f/Mekedonia-Charity-help-build-home-for-the-homeless',
    `Time: ${new Date().toISOString()}`,
    '',
    'Note: referral from AccessFirst.'
  ].join('\n'));
  const mailto = `mailto:${OWNER_EMAIL}?subject=${subject}&body=${body}`;
  openMailClient(mailto);
  pushNotification({type:'donate', to:OWNER_EMAIL, payload:{url:'https://www.gofundme.com/f/Mekedonia-Charity-help-build-home-for-the-homeless'}});
}

/* open mail client safely with fallback prompt */
function openMailClient(mailto){
  try {
    window.open(mailto, '_blank');
    announce('Opening your email client to notify the site owner.');
  } catch (e) {
    console.warn('mailto open failed', e);
    const fallback = `mailto: ${mailto}`;
    prompt('If your email client did not open, copy this and send to notify the site owner:', decodeURIComponent(mailto));
  }
}

/* ===========================
   Third-party login simulation
   =========================== */
function simulateThirdPartyLogin(provider){
  const email = `${provider.toLowerCase()}-user@example.com`;
  let user = App.users.find(u=>u.email===email);
  if (!user) {
    user = { username:`${provider}User`, email, passwordHash:'', createdAt:Date.now(), uiPrefs:{}, voiceEnabled:false, userType:'none' };
    App.users.push(user);
    saveUsers();
    notifyOwnerNewSignup(user, provider);
  }
  setCurrentUser(email);
  if (user.uiPrefs) { App.prefs = Object.assign(App.prefs, user.uiPrefs); savePrefs(); applyPrefsToUI(); }
  if (D['blind-voice-toggle']) { D['blind-voice-toggle'].setAttribute('aria-pressed', user.voiceEnabled ? 'true' : 'false'); D['blind-voice-toggle'].textContent = user.voiceEnabled ? 'Disable Voice Feedback' : 'Enable Voice Feedback'; }
  announce(`Signed in via ${provider}`);
  closeModal('login-modal');
}
function simulateThirdPartySignUp(provider){
  const email = `${provider.toLowerCase()}-user@example.com`;
  if (!App.users.some(u=>u.email===email)) {
    const user = { username:`${provider}User`, email, passwordHash:'', createdAt:Date.now(), uiPrefs:{}, voiceEnabled:false, userType:'none' };
    App.users.push(user);
    saveUsers();
    notifyOwnerNewSignup(user, provider);
    setCurrentUser(email);
    announce(`Signed up via ${provider}`);
    closeModal('signup-modal');
  } else {
    setCurrentUser(email);
    announce(`Signed in via ${provider}`);
    closeModal('signup-modal');
  }
}

/* ===========================
   User helpers: save user & get current
   =========================== */
function saveUser(user){
  const idx = App.users.findIndex(u=>u.email===user.email);
  if (idx >= 0) App.users[idx] = user; else App.users.push(user);
  saveUsers();
}
function getCurrentUser(){ return getCurrentUserValue(); }
function getCurrentUserValue(){ if (!App.currentEmail) return null; return App.users.find(u=>u.email===App.currentEmail) || null; }

/* ===========================
   History management
   =========================== */
function pushHistory(item){
  const arr = JSON.parse(localStorage.getItem(LS.HISTORY) || '[]');
  arr.unshift(Object.assign({timestamp: Date.now()}, item));
  localStorage.setItem(LS.HISTORY, JSON.stringify(arr.slice(0,200)));
  renderHistory();
}
function renderHistory(){
  const arr = JSON.parse(localStorage.getItem(LS.HISTORY) || '[]');
  if (D['history-blind']) {
    D['history-blind'].innerHTML = '';
    arr.filter(i=>['stt','tts','s2s'].includes(i.type)).slice(0,50).forEach(it=>{
      const li=document.createElement('li'); li.textContent = `${new Date(it.timestamp).toLocaleTimeString()} — ${it.type}: ${it.text}`; D['history-blind'].appendChild(li);
    });
  }
  if (D['history-deaf']) {
    D['history-deaf'].innerHTML = '';
    arr.filter(i=>['sign','stsign','s2s'].includes(i.type)).slice(0,50).forEach(it=>{
      const li=document.createElement('li'); li.textContent = `${new Date(it.timestamp).toLocaleTimeString()} — ${it.type}: ${it.text}`; D['history-deaf'].appendChild(li);
    });
  }
}

/* wrapper names used earlier */
function pushHistoryItem(item){ pushHistory(item); }

/* ===========================
   Reminders (every 3 minutes)
   =========================== */
function startReminders(){
  if (App.reminderTimer) clearInterval(App.reminderTimer);
  App.reminderTimer = setInterval(()=> {
    const user = getCurrentUserValue();
    if (user && user.email) return; // logged in -> skip
    const msg = 'Please log in to save your progress.';
    showBanner(msg);
    if (user && user.userType === 'blind' && user.voiceEnabled) speak(msg, {interrupt:true});
    if (user && user.userType === 'deaf') showSignReminder(msg);
  }, 180000);
}
function showBanner(text){
  const el = document.createElement('div'); el.className='transient-banner'; el.textContent=text;
  el.style.position='fixed'; el.style.right='1rem'; el.style.bottom='1rem'; el.style.padding='0.6rem 0.9rem'; el.style.borderRadius='8px'; el.style.background='linear-gradient(90deg,#fff7f2,#eef6ff)'; el.style.boxShadow='0 8px 30px rgba(0,0,0,0.08)'; el.style.zIndex=9999;
  document.body.appendChild(el);
  setTimeout(()=> { el.style.opacity='0'; el.style.transition='opacity 600ms'; }, 5200);
  setTimeout(()=> el.remove(), 6000);
}
function showSignReminder(text){
  const el = document.createElement('div'); el.className='sign-reminder'; el.style.position='fixed'; el.style.left='1rem'; el.style.bottom='1rem'; el.style.padding='0.6rem 0.9rem'; el.style.borderRadius='10px'; el.style.background='rgba(255,255,255,0.95)'; el.style.boxShadow='0 8px 30px rgba(0,0,0,0.06)'; el.innerHTML=`<div style="font-size:20px">🤟</div><div style="margin-top:6px">${text}</div>`; document.body.appendChild(el); setTimeout(()=> el.remove(),6000);
}

/* ===========================
   Demo mode
   =========================== */
function startDemo(){
  if (App.demoTimer) clearTimeout(App.demoTimer);
  const steps = [
    ()=> showPage('access-choice'),
    ()=> { if (document.getElementById('flow-blind')) document.getElementById('flow-blind').focus(); },
    ()=> showPage('blind-flow'),
    ()=> { if (D['blind-tts-input']) { D['blind-tts-input'].value='Hello from demo mode'; D['blind-tts-speak'].click(); } },
    ()=> showPage('deaf-flow'),
    ()=> startCameraDetection(),
    ()=> { stopCameraDetection(); showPage('home'); }
  ];
  let i=0;
  announce('Demo starting');
  function run(){ if (i>=steps.length) { announce('Demo complete'); clearTimeout(App.demoTimer); App.demoTimer=null; return; } steps[i](); i++; App.demoTimer=setTimeout(run, 1500); }
  run();
}
function stopDemo(){ if (App.demoTimer) clearTimeout(App.demoTimer); App.demoTimer=null; }

/* ===========================
   Helper: pushNotification (mail fallback) and save user helper
   =========================== */
function pushNotification(note){ pushNotificationLocal(note); }
function pushNotificationLocal(note){
  const arr = JSON.parse(localStorage.getItem(LS.NOTIFICATIONS) || '[]');
  arr.unshift(Object.assign({timestamp: Date.now()}, note));
  localStorage.setItem(LS.NOTIFICATIONS, JSON.stringify(arr));
}

/* save user */
function saveUser(user){
  const idx = App.users.findIndex(u=>u.email===user.email);
  if (idx>=0) App.users[idx]=user; else App.users.push(user);
  saveUsers();
}

/* ===========================
   small wrappers for previously-used names
   =========================== */
function saveUsers(){ localStorage.setItem(LS.USERS, JSON.stringify(App.users)); }
function savePrefs(){ localStorage.setItem(LS.PREFS, JSON.stringify(App.prefs)); }

/* expose some functions used above (compat) */
function saveUsersWrapper(){ saveUsers(); }

/* ===========================
   Startup helpers
   =========================== */
// initialize recognition already done earlier; ensure functions exist
// Ensure sign palette and history rendered on load
document.addEventListener('DOMContentLoaded', ()=> { buildSignPalette(); renderHistory(); });

/* End of script */
