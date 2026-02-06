/**
 * script.js
 * AccessFirst — full-featured accessibility demo
 * - Vanilla JS only
 * - Local authentication (secure hashed password in browser)
 * - TTS & STT using Web Speech API
 * - Camera & TensorFlow.js Handsign integration (best-effort)
 * - Donate & signup notifications via mailto fallback
 * - Preferences persisted in localStorage
 *
 * This file continues the existing implementation and only adds missing features:
 * - Voice feedback toggle for blind users and focus-in voice feedback
 * - Speech-to-Sign (speech recognition mapping to visual sign placeholders)
 * - Ensure user uiPrefs applied on login
 * - Persist voiceEnabled per user and load it on login
 * - Hook up deaf speech-to-sign UI elements
 *
 * Developed by: HaileGebriel
 */

/* ======================================================================
   LocalStorage keys and initial state (must match existing code)
   ====================================================================== */
const LS_KEYS = {
  USERS: 'af_users_v1',
  CURRENT: 'af_current_v1',
  PREFS: 'af_prefs_v1',
  HISTORY: 'af_history_v1',
  NOTIFICATIONS: 'af_notifications_v1'
};

const State = {
  users: [],           // array of user objects {username,email,passwordHash,createdAt,uiPrefs,voiceEnabled,userType}
  current: null,       // current logged-in user (email)
  prefs: {             // UI preferences
    contrast: false,
    fontSize: 'medium',
    reduceMotion: false,
    demo: false
  },
  speech: {
    synthesisSupported: 'speechSynthesis' in window,
    recognitionSupported: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    recognition: null,
    listening: false
  },
  handsign: {
    modelUrl: 'https://cdn.jsdelivr.net/gh/syauqy/handsign-tensorflow@main/model/model.json',
    initialized: false,
    detector: null,
    streaming: false,
    videoStream: null
  },
  reminderInterval: null,
  demoTimer: null
};

/* ======================================================================
   DOM cache (enhanced with newly-added elements)
   ====================================================================== */
const DOM = {};
document.addEventListener('DOMContentLoaded', () => {
  [
    'nav-home','nav-access','nav-login','nav-signup','nav-donate','nav-about',
    'cta-get-started','cta-login','cta-signup','cta-donate','home','access-choice','blind-flow','deaf-flow','about',
    'home-tts-input','home-tts-speak','home-tts-stop','home-tts-clear',
    'flow-blind','flow-deaf',
    'blind-stt-output','blind-stt-start','blind-stt-stop','blind-stt-copy',
    'blind-tts-input','blind-tts-speak','blind-tts-stop','blind-tts-clear','history-blind','blind-voice-toggle',
    'sign-palette','assembled-phrase','s2s-speak','s2s-clear','camera-video','camera-canvas','detected-sign','start-camera','stop-camera','speak-detected','camera-status','history-deaf',
    'contrast-toggle','font-size','reduce-motion','demo-mode',
    'login-modal','signup-modal','login-form','signup-form','login-email','login-password','login-google','login-microsoft','login-close','login-submit',
    'signup-username','signup-email','signup-password','pwd-strength','pwd-feedback','signup-contrast','signup-reduce','signup-font','signup-google','signup-microsoft','signup-close','signup-submit',
    'year','live',
    'deaf-stt-start','deaf-stt-stop','deaf-stt-output','deaf-stt-signs'
  ].forEach(id => DOM[id] = document.getElementById(id));

  // Initialize state from storage
  loadFromStorage();
  applyPrefsToUI();
  populateUI();
  attachListeners();
  initSpeechRecognition();
  attemptInitHandsign();
  startReminders();
  if (State.prefs.demo) startDemo();

  if (DOM['year']) DOM['year'].textContent = new Date().getFullYear();
});

/* ======================================================================
   Storage helpers (existing)
   ====================================================================== */
function loadFromStorage(){
  try {
    State.users = JSON.parse(localStorage.getItem(LS_KEYS.USERS) || '[]');
    State.current = localStorage.getItem(LS_KEYS.CURRENT) || null;
    State.prefs = Object.assign(State.prefs, JSON.parse(localStorage.getItem(LS_KEYS.PREFS) || '{}'));
  } catch (e) {
    console.warn('Error loading storage', e);
  }
}
function saveUsers(){ localStorage.setItem(LS_KEYS.USERS, JSON.stringify(State.users)); }
function saveCurrent(email){
  if (email) localStorage.setItem(LS_KEYS.CURRENT, email);
  else localStorage.removeItem(LS_KEYS.CURRENT);
  State.current = email;
}
function savePrefs(){ localStorage.setItem(LS_KEYS.PREFS, JSON.stringify(State.prefs)); }
function pushNotification(note){
  const arr = JSON.parse(localStorage.getItem(LS_KEYS.NOTIFICATIONS) || '[]');
  arr.unshift(Object.assign({timestamp: Date.now()}, note));
  localStorage.setItem(LS_KEYS.NOTIFICATIONS, JSON.stringify(arr));
}

/* ======================================================================
   UI population & helpers (existing)
   ====================================================================== */
function populateUI(){
  showPage('home');
  buildSignPalette();
  renderHistories();
  // If a user is logged in, apply their uiPrefs and voiceEnabled
  const user = getCurrentUser();
  if (user) {
    if (user.uiPrefs) {
      State.prefs = Object.assign(State.prefs, user.uiPrefs);
      savePrefs();
      applyPrefsToUI();
    }
    // Update blind voice toggle label if present
    if (DOM['blind-voice-toggle']) {
      DOM['blind-voice-toggle'].setAttribute('aria-pressed', user.voiceEnabled ? 'true' : 'false');
      DOM['blind-voice-toggle'].textContent = user.voiceEnabled ? 'Disable Voice Feedback' : 'Enable Voice Feedback';
    }
  }
}

/* show/hide pages */
function showPage(id){
  document.querySelectorAll('.page').forEach(p => {
    if (p.id === id) { p.classList.add('page--active'); p.hidden = false; setTimeout(()=> { const focusable = p.querySelector('button, a, input, textarea, select'); if (focusable) focusable.focus(); }, 180); }
    else { p.classList.remove('page--active'); p.hidden = true; }
  });
  announce(`Navigated to ${id.replace('-', ' ')}`);
}

/* Announce helper (existing) */
function announce(msg){
  if (DOM.live) DOM.live.textContent = msg;
  const user = getCurrentUser();
  if (user && user.voiceEnabled && State.speech.synthesisSupported) speak(msg, {interrupt:true});
}

/* ======================================================================
   Event listeners & interactions (enhanced)
   ====================================================================== */
function attachListeners(){
  // Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    const modal = btn.dataset.modal;
    if (target) showPage(target);
    if (modal) openModal(modal);
  }));
  // donate
  const donateEls = document.querySelectorAll('.nav-link.donate, .btn-donate, #nav-donate, #cta-donate');
  donateEls.forEach(el => el.addEventListener('click', (e) => {
    notifyDonate();
  }));

  // Header CTAs
  if (DOM['cta-get-started']) DOM['cta-get-started'].addEventListener('click', ()=> showPage('access-choice'));
  if (DOM['cta-login']) DOM['cta-login'].addEventListener('click', ()=> openModal('login-modal'));
  if (DOM['cta-signup']) DOM['cta-signup'].addEventListener('click', ()=> openModal('signup-modal'));

  // Preferences toggles
  if (DOM['contrast-toggle']) DOM['contrast-toggle'].addEventListener('change', (e) => {
    State.prefs.contrast = e.target.checked;
    applyPrefsToUI();
    savePrefs();
    announce(State.prefs.contrast ? 'High contrast enabled' : 'High contrast disabled');
  });
  if (DOM['font-size']) DOM['font-size'].addEventListener('change', (e) => {
    State.prefs.fontSize = e.target.value;
    applyPrefsToUI();
    savePrefs();
    announce('Font size updated');
  });
  if (DOM['reduce-motion']) DOM['reduce-motion'].addEventListener('change', (e) => {
    State.prefs.reduceMotion = e.target.checked;
    applyPrefsToUI();
    savePrefs();
    announce(State.prefs.reduceMotion ? 'Reduced motion enabled' : 'Reduced motion disabled');
  });
  if (DOM['demo-mode']) DOM['demo-mode'].addEventListener('change', (e) => {
    State.prefs.demo = e.target.checked;
    savePrefs();
    if (e.target.checked) startDemo(); else stopDemo();
  });

  // Home TTS
  if (DOM['home-tts-speak']) DOM['home-tts-speak'].addEventListener('click', () => {
    const txt = DOM['home-tts-input'].value.trim() || 'Hello from AccessFirst';
    speak(txt);
    pushHistoryItem({type:'tts', text:txt});
  });
  if (DOM['home-tts-stop']) DOM['home-tts-stop'].addEventListener('click', stopSpeaking);
  if (DOM['home-tts-clear']) DOM['home-tts-clear'].addEventListener('click', ()=> { DOM['home-tts-input'].value=''; });

  // Choose flows
  if (DOM['flow-blind']) DOM['flow-blind'].addEventListener('click', ()=> {
    const user = getCurrentUser();
    if (!user) { announce('Please sign up or login to proceed to Blind mode'); openModal('login-modal'); return; }
    user.userType = 'blind';
    saveCurrentUser(user);
    showPage('blind-flow');
  });
  if (DOM['flow-deaf']) DOM['flow-deaf'].addEventListener('click', ()=> {
    const user = getCurrentUser();
    if (!user) { announce('Please sign up or login to proceed to Deaf mode'); openModal('login-modal'); return; }
    user.userType = 'deaf';
    saveCurrentUser(user);
    showPage('deaf-flow');
  });

  // Blind STT/TTS
  if (DOM['blind-stt-start']) DOM['blind-stt-start'].addEventListener('click', startRecognitionForBlind);
  if (DOM['blind-stt-stop']) DOM['blind-stt-stop'].addEventListener('click', stopRecognition);
  if (DOM['blind-stt-copy']) DOM['blind-stt-copy'].addEventListener('click', ()=> { if (DOM['blind-stt-output']) navigator.clipboard?.writeText(DOM['blind-stt-output'].value || '').then(()=> announce('Copied recognized text')); });

  if (DOM['blind-tts-speak']) DOM['blind-tts-speak'].addEventListener('click', ()=> {
    const txt = DOM['blind-tts-input'].value.trim();
    if (!txt) { announce('Type something to speak'); return; }
    speak(txt);
    pushHistoryItem({type:'tts', text:txt});
  });
  if (DOM['blind-tts-stop']) DOM['blind-tts-stop'].addEventListener('click', stopSpeaking);
  if (DOM['blind-tts-clear']) DOM['blind-tts-clear'].addEventListener('click', ()=> { DOM['blind-tts-input'].value=''; });

  // New: Blind voice feedback toggle
  if (DOM['blind-voice-toggle']) DOM['blind-voice-toggle'].addEventListener('click', ()=> {
    const user = getCurrentUser();
    if (!user) { announce('Login required to enable voice feedback'); openModal('login-modal'); return; }
    user.voiceEnabled = !user.voiceEnabled;
    saveCurrentUser(user);
    DOM['blind-voice-toggle'].setAttribute('aria-pressed', user.voiceEnabled ? 'true' : 'false');
    DOM['blind-voice-toggle'].textContent = user.voiceEnabled ? 'Disable Voice Feedback' : 'Enable Voice Feedback';
    announce(user.voiceEnabled ? 'Voice feedback enabled' : 'Voice feedback disabled');
  });

  // Deaf sign-to-speech: palette clicks
  if (DOM['sign-palette']) DOM['sign-palette'].addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sign]');
    if (!btn) return;
    appendSign(btn.dataset.sign);
  });
  if (DOM['s2s-speak']) DOM['s2s-speak'].addEventListener('click', ()=> {
    const phrase = (DOM['assembled-phrase'].textContent || '').trim();
    if (!phrase) { announce('No phrase composed'); return; }
    speak(phrase);
    pushHistoryItem({type:'s2s', text:phrase});
  });
  if (DOM['s2s-clear']) DOM['s2s-clear'].addEventListener('click', ()=> DOM['assembled-phrase'].textContent = '');

  // Camera / Handsign
  if (DOM['start-camera']) DOM['start-camera'].addEventListener('click', startCameraDetection);
  if (DOM['stop-camera']) DOM['stop-camera'].addEventListener('click', stopCameraDetection);
  if (DOM['speak-detected']) DOM['speak-detected'].addEventListener('click', ()=> {
    const txt = DOM['detected-sign'].textContent;
    if (txt && txt !== 'No sign detected') { speak(txt); pushHistoryItem({type:'sign', text:txt}); }
  });

  // Deaf speech-to-sign (new)
  if (DOM['deaf-stt-start']) DOM['deaf-stt-start'].addEventListener('click', startSpeechToSign);
  if (DOM['deaf-stt-stop']) DOM['deaf-stt-stop'].addEventListener('click', stopRecognition);

  // Login modal events - enhanced to apply user uiPrefs on login
  if (DOM['login-form']) {
    DOM['login-form'].addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (DOM['login-email'].value || '').trim().toLowerCase();
      const password = DOM['login-password'].value || '';
      if (!email || !password) { alert('Provide email and password'); return; }
      const user = State.users.find(u => u.email === email);
      if (!user) { alert('No account found. Please sign up.'); return; }
      const hash = await hashPassword(password);
      if (hash !== user.passwordHash) { alert('Invalid credentials'); return; }
      // success: apply user preferences & voiceEnabled
      saveCurrent(email);
      if (user.uiPrefs) {
        State.prefs = Object.assign(State.prefs, user.uiPrefs);
        savePrefs();
        applyPrefsToUI();
      }
      // update blind voice toggle label if present
      if (DOM['blind-voice-toggle']) {
        DOM['blind-voice-toggle'].setAttribute('aria-pressed', user.voiceEnabled ? 'true' : 'false');
        DOM['blind-voice-toggle'].textContent = user.voiceEnabled ? 'Disable Voice Feedback' : 'Enable Voice Feedback';
      }
      announce(`Welcome back, ${user.username}`);
      closeModal('login-modal');
    });
    if (DOM['login-close']) DOM['login-close'].addEventListener('click', ()=> closeModal('login-modal'));
    if (DOM['login-google']) DOM['login-google'].addEventListener('click', ()=> simulateThirdPartyLogin('Google'));
    if (DOM['login-microsoft']) DOM['login-microsoft'].addEventListener('click', ()=> simulateThirdPartyLogin('Microsoft'));
  }

  // Signup modal events - on signup we already notified owner; ensure uiPrefs applied (existing code)
  if (DOM['signup-form']) {
    if (DOM['signup-password']) {
      DOM['signup-password'].addEventListener('input', (e) => {
        const val = e.target.value;
        const score = passwordStrengthScore(val);
        if (DOM['pwd-strength']) DOM['pwd-strength'].value = score;
        if (DOM['pwd-feedback']) DOM['pwd-feedback'].textContent = 'Password strength: ' + ['Very weak','Weak','Fair','Good','Strong'][score];
      });
    }

    DOM['signup-form'].addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = (DOM['signup-username'].value || '').trim();
      const email = (DOM['signup-email'].value || '').trim().toLowerCase();
      const password = DOM['signup-password'].value || '';
      if (!username || !email || !password) { alert('Please fill required fields'); return; }
      if (!validateEmail(email)) { alert('Enter a valid email'); return; }
      if (State.users.some(u => u.email === email)) { alert('Email already registered'); return; }
      if (passwordStrengthScore(password) < 2) { if (!confirm('Password looks weak. Create account anyway?')) return; }

      const passwordHash = await hashPassword(password);
      const uiPrefs = {
        contrast: !!DOM['signup-contrast']?.checked,
        reduceMotion: !!DOM['signup-reduce']?.checked,
        fontSize: DOM['signup-font']?.value || 'medium'
      };
      const user = {username,email,passwordHash,createdAt:Date.now(),uiPrefs,voiceEnabled:false,userType:'none'};
      State.users.push(user);
      saveUsers();

      // Apply user prefs immediately
      State.prefs = Object.assign(State.prefs, uiPrefs);
      savePrefs();
      applyPrefsToUI();

      // Notify owner via mailto and record notification
      notifyOwnerNewSignup(user);

      // Auto-login user and update blind toggle
      saveCurrent(email);
      if (DOM['blind-voice-toggle']) {
        DOM['blind-voice-toggle'].setAttribute('aria-pressed', 'false');
        DOM['blind-voice-toggle'].textContent = 'Enable Voice Feedback';
      }
      announce(`Account created for ${username}`);
      closeModal('signup-modal');
    });

    if (DOM['signup-close']) DOM['signup-close'].addEventListener('click', ()=> closeModal('signup-modal'));
    if (DOM['signup-google']) DOM['signup-google'].addEventListener('click', ()=> simulateThirdPartySignUp('Google'));
    if (DOM['signup-microsoft']) DOM['signup-microsoft'].addEventListener('click', ()=> simulateThirdPartySignUp('Microsoft'));
  }

  // keyboard accessibility: Enter/Space trigger on role=button handled by native button elements; escape closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal('login-modal'); closeModal('signup-modal'); }
  });

  // Focus-in voice feedback for blind users (new)
  document.addEventListener('focusin', (e) => {
    try {
      const user = getCurrentUser();
      if (!user || !user.voiceEnabled) return;
      if (user.userType !== 'blind') return;
      const label = accessibleLabel(e.target);
      if (label && State.speech.synthesisSupported) speak(label, {interrupt:true});
    } catch (err) { console.warn('focusin voice feedback error', err); }
  });
}

/* ======================================================================
   Utility helpers (enhancements)
   ====================================================================== */
function validateEmail(email){ return /\S+@\S+\.\S+/.test(email); }
function passwordStrengthScore(pw){
  let score = 0;
  if (!pw) return 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, score);
}
async function hashPassword(pw){
  const enc = new TextEncoder();
  const data = enc.encode(pw);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
}
function getCurrentUser(){ const email = localStorage.getItem(LS_KEYS.CURRENT); if (!email) return null; return State.users.find(u => u.email === email) || null; }
function saveCurrentUser(user){ if (!user || !user.email) return; saveCurrent(user.email); const idx = State.users.findIndex(u => u.email === user.email); if (idx >= 0) { State.users[idx] = user; saveUsers(); } }
function saveCurrent(email){ if (email) localStorage.setItem(LS_KEYS.CURRENT, email); else localStorage.removeItem(LS_KEYS.CURRENT); State.current = email; }

/* Accessible label extraction (used for focus speaking) */
function accessibleLabel(el){
  if (!el) return '';
  if (el.getAttribute && el.getAttribute('aria-label')) return el.getAttribute('aria-label');
  if (el.getAttribute && el.getAttribute('aria-labelledby')) {
    const id = el.getAttribute('aria-labelledby');
    const node = document.getElementById(id);
    if (node) return node.textContent.trim();
  }
  if (el.alt) return el.alt;
  if (el.innerText && el.innerText.trim()) return el.innerText.trim();
  if (el.value) return String(el.value);
  return '';
}

/* ======================================================================
   TTS/STT functions (existing with small improvements)
   ====================================================================== */
function speak(text, opts = {interrupt:false}){
  if (!State.speech.synthesisSupported) { alert('Text-to-Speech not supported in this browser.'); return; }
  try {
    if (opts.interrupt) window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US';
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length) utt.voice = voices.find(v => v.lang && v.lang.startsWith('en')) || voices[0];
    window.speechSynthesis.speak(utt);
  } catch (e) { console.warn('TTS error', e); }
}
function stopSpeaking(){ if (window.speechSynthesis) window.speechSynthesis.cancel(); }

/* STT initialization */
function initSpeechRecognition(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  if (!SR) { console.warn('SpeechRecognition not available'); return; }
  try{
    const recog = new SR();
    recog.lang = 'en-US';
    recog.interimResults = false;

    // default onresult - used by blind STT
    recog.onresult = (ev) => {
      const txt = ev.results[0][0].transcript;
      if (DOM['blind-stt-output']) DOM['blind-stt-output'].value = txt;
      pushHistoryItem({type:'stt', text:txt});
      announce('Speech recognized');
    };
    recog.onstart = ()=> { State.speech.listening = true; announce('Listening...'); };
    recog.onend = ()=> { State.speech.listening = false; announce('Stopped listening'); };
    recog.onerror = (e) => { console.warn('Recognition error', e); announce('Recognition error'); };
    State.speech.recognition = recog;
  } catch (e) { console.warn('SpeechRecognition init failed', e); }
}

/* Start recognition specifically for Blind STT (uses default handler) */
function startRecognitionForBlind(){
  if (!State.speech.recognition) { alert('Speech recognition not supported in this browser.'); return; }
  try { State.speech.recognition.start(); } catch(e) { console.warn(e); }
}

/* Stop recognition wrapper */
function stopRecognition(){
  if (State.speech.recognition) try { State.speech.recognition.stop(); } catch(e) { console.warn(e); }
}

/* ======================================================================
   Deaf Speech-to-Sign (new feature)
   - Uses the same SpeechRecognition but overrides onresult temporarily to map text to sign placeholders
   ====================================================================== */
const SIGN_MAP = {
  hello: '👋',
  hi: '👋',
  yes: '👍',
  no: '👎',
  thank: '🙏',
  thanks: '🙏',
  help: '🆘',
  good: '🌟',
  'thank you': '🙏',
  'i love you': '🤟'
};

function mapTextToSigns(text){
  const words = text.split(/\s+/).slice(0,20);
  const mapped = words.map(w => {
    const key = w.toLowerCase().replace(/[^\w\s]/g,'');
    return SIGN_MAP[key] || '🤟';
  });
  return mapped;
}

function startSpeechToSign(){
  if (!State.speech.recognition) { alert('Speech recognition not available'); return; }
  // set specific onresult to map to signs and update deaf-stt-output & deaf-stt-signs
  State.speech.recognition.onresult = (ev) => {
    const txt = ev.results[0][0].transcript;
    if (DOM['deaf-stt-output']) DOM['deaf-stt-output'].value = txt;
    const mapped = mapTextToSigns(txt);
    if (DOM['deaf-stt-signs']) {
      DOM['deaf-stt-signs'].innerHTML = '';
      mapped.forEach(s => {
        const span = document.createElement('span');
        span.style.display='inline-block';
        span.style.margin='0.25rem';
        span.style.padding='0.4rem 0.6rem';
        span.style.borderRadius='8px';
        span.style.background='rgba(255,255,255,0.7)';
        span.style.border='1px solid rgba(0,0,0,0.06)';
        span.textContent = s;
        DOM['deaf-stt-signs'].appendChild(span);
      });
    }
    pushHistoryItem({type:'stsign', text:txt});
    announce('Speech converted to signs');
  };
  try { State.speech.recognition.start(); } catch(e) { console.warn(e); }
}

/* Stop recognition uses generic stopRecognition() above */

/* ======================================================================
   Handsign / Camera detection (existing, unchanged) - attemptInitHandsign,
   start/stop camera, detection loops are present in previous code base.
   We only ensure functions exist and are callable.
   ====================================================================== */
async function attemptInitHandsign(){
  // attempt to initialize handsign (best-effort)
  await new Promise(res => setTimeout(res, 400));
  try {
    if (window.handsign && typeof window.handsign.loadModel === 'function') {
      const detector = await window.handsign.loadModel(State.handsign.modelUrl);
      State.handsign.detector = detector;
      State.handsign.initialized = true;
      console.info('Handsign detector initialized (window.handsign)');
      return;
    }
    if (window.HandSign && typeof window.HandSign === 'object') {
      if (typeof window.HandSign.init === 'function') {
        await window.HandSign.init(State.handsign.modelUrl);
        State.handsign.detector = window.HandSign;
        State.handsign.initialized = true;
        console.info('Handsign detector initialized (HandSign.init)');
        return;
      }
    }
    if (window.tf && typeof window.tf.loadGraphModel === 'function') {
      try {
        const model = await window.tf.loadGraphModel(State.handsign.modelUrl);
        State.handsign.detector = model;
        State.handsign.initialized = true;
        console.info('Handsign model loaded via tf.loadGraphModel');
        return;
      } catch (err) { console.warn('tf.loadGraphModel failed', err); }
    }
  } catch (e) { console.warn('Handsign initialization error', e); }
  State.handsign.initialized = false;
  console.info('Handsign not available; using simulated detection');
}

async function startCameraDetection(){
  if (State.handsign.streaming) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}, audio:false});
    DOM['camera-video'].srcObject = stream;
    State.handsign.videoStream = stream;
    State.handsign.streaming = true;
    if (DOM['camera-status']) DOM['camera-status'].textContent = 'Status: camera active';
    if (State.handsign.initialized && State.handsign.detector) runRealDetectionLoop();
    else runSimulatedDetectionLoop();
    announce('Camera started for sign detection');
  } catch (e) {
    console.warn('Camera access error', e);
    alert('Camera access is required for real-time detection. Please allow camera permissions or use the manual sign palette.');
    if (DOM['camera-status']) DOM['camera-status'].textContent = 'Status: camera unavailable';
  }
}
function stopCameraDetection(){
  if (!State.handsign.streaming) return;
  if (State.handsign.videoStream) { State.handsign.videoStream.getTracks().forEach(t=>t.stop()); State.handsign.videoStream = null; }
  State.handsign.streaming = false;
  if (DOM['camera-status']) DOM['camera-status'].textContent = 'Status: stopped';
  if (DOM['detected-sign']) DOM['detected-sign'].textContent = 'No sign detected';
  announce('Camera stopped');
}
async function runRealDetectionLoop(){
  const video = DOM['camera-video']; const canvas = DOM['camera-canvas']; const ctx = canvas.getContext('2d');
  await new Promise(res => { if (video.readyState >= 2) return res(); video.onloadeddata = ()=> res(); });
  canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480;
  async function loop(){
    if (!State.handsign.streaming) return;
    try {
      ctx.drawImage(video,0,0,canvas.width,canvas.height);
      const det = State.handsign.detector;
      let label = null;
      if (det && typeof det.predict === 'function') {
        const res = await det.predict(canvas);
        label = res?.label || res?.class || JSON.stringify(res);
      } else if (det && typeof det.classify === 'function') {
        const res = await det.classify(canvas);
        label = res?.label || (Array.isArray(res) && res[0]?.className) || JSON.stringify(res);
      } else if (det && typeof det.executeAsync === 'function' && window.tf) {
        try {
          const img = tf.browser.fromPixels(canvas).toFloat().div(255).expandDims(0);
          const out = await det.executeAsync(img);
          label = 'Sign detected';
          tf.dispose(img);
        } catch (e){ console.warn('TF model inference failed', e); }
      } else { label = 'Sign detected'; }
      if (!label) label = 'Sign detected';
      if (DOM['detected-sign']) DOM['detected-sign'].textContent = label;
      pushHistoryItem({type:'stsign', text:label});
    } catch (err) { console.warn('Detection error', err); if (DOM['detected-sign']) DOM['detected-sign'].textContent = 'Detection error'; }
    setTimeout(()=> { if (State.handsign.streaming) requestAnimationFrame(loop); }, 300);
  }
  loop();
}
function runSimulatedDetectionLoop(){
  const choices = SIGN_SET.map(s=>s.key);
  let idx=0;
  function loop(){
    if (!State.handsign.streaming) return;
    const choice = choices[idx % choices.length];
    if (DOM['detected-sign']) DOM['detected-sign'].textContent = choice;
    pushHistoryItem({type:'stsign', text:choice});
    idx++;
    setTimeout(()=> { if (State.handsign.streaming) loop(); }, 1400);
  }
  loop();
}

/* ======================================================================
   Sign palette & helpers (existing)
   ====================================================================== */
const SIGN_SET = [
  {key:'Hello', emoji:'👋'},
  {key:'Yes', emoji:'👍'},
  {key:'No', emoji:'👎'},
  {key:'Thank you', emoji:'🙏'},
  {key:'Help', emoji:'🆘'},
  {key:'Good', emoji:'🌟'}
];
function buildSignPalette(){
  if (!DOM['sign-palette']) return;
  DOM['sign-palette'].innerHTML = '';
  SIGN_SET.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'sign-btn';
    btn.type = 'button';
    btn.dataset.sign = s.key;
    btn.setAttribute('aria-label', `Sign ${s.key}`);
    btn.innerHTML = `${s.emoji} <span class="sign-label">${s.key}</span>`;
    DOM['sign-palette'].appendChild(btn);
  });
}
function appendSign(word){
  if (!DOM['assembled-phrase']) return;
  const cur = DOM['assembled-phrase'].textContent.trim();
  DOM['assembled-phrase'].textContent = cur ? `${cur} ${word}` : word;
}

/* ======================================================================
   History helpers (existing)
   ====================================================================== */
function pushHistoryItem(item){
  const arr = JSON.parse(localStorage.getItem(LS_KEYS.HISTORY) || '[]');
  arr.unshift(Object.assign({timestamp: Date.now()}, item));
  localStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(arr.slice(0,200)));
  renderHistories();
}
function renderHistories(){
  const arr = JSON.parse(localStorage.getItem(LS_KEYS.HISTORY) || '[]');
  if (DOM['history-blind']) {
    DOM['history-blind'].innerHTML = '';
    arr.filter(i => ['stt','tts','s2s'].includes(i.type)).slice(0,50).forEach(it=>{
      const li = document.createElement('li');
      li.textContent = `${new Date(it.timestamp).toLocaleTimeString()} — ${it.type}: ${it.text}`;
      DOM['history-blind'].appendChild(li);
    });
  }
  if (DOM['history-deaf']) {
    DOM['history-deaf'].innerHTML = '';
    arr.filter(i => ['sign','stsign','s2s'].includes(i.type)).slice(0,50).forEach(it=>{
      const li = document.createElement('li');
      li.textContent = `${new Date(it.timestamp).toLocaleTimeString()} — ${it.type}: ${it.text}`;
      DOM['history-deaf'].appendChild(li);
    });
  }
}

/* ======================================================================
   Notifications & mailto (existing)
   ====================================================================== */
const OWNER_EMAIL = 'hailegebrialantehunegn@gmail.com';
function notifyOwnerNewSignup(user, provider){
  const subject = encodeURIComponent(`New AccessFirst signup: ${user.username}`);
  const bodyLines = [
    `A new user signed up on AccessFirst.`,
    `Username: ${user.username}`,
    `Email: ${user.email}`,
    `Provider: ${provider || 'local'}`,
    `Timestamp: ${new Date().toISOString()}`,
    '',
    'This message was initiated by the AccessFirst frontend (no backend).'
  ];
  const body = encodeURIComponent(bodyLines.join('\n'));
  const mailto = `mailto:${OWNER_EMAIL}?subject=${subject}&body=${body}`;
  openMailClient(mailto);
  pushNotification({type:'signup', to:OWNER_EMAIL, user:{username:user.username,email:user.email,provider:provider||'local'}});
}
function notifyDonate(){
  const subject = encodeURIComponent('AccessFirst: Donate click to Mekedonia');
  const bodyLines = [
    `A visitor clicked the Donate button to Mekedonia GoFundMe from AccessFirst.`,
    `URL: https://www.gofundme.com/f/Mekedonia-Charity-help-build-home-for-the-homeless`,
    `Timestamp: ${new Date().toISOString()}`,
    '',
    'Please note this donation was initiated via AccessFirst (frontend notification).'
  ];
  const body = encodeURIComponent(bodyLines.join('\n'));
  const mailto = `mailto:${OWNER_EMAIL}?subject=${subject}&body=${body}`;
  openMailClient(mailto);
  pushNotification({type:'donate', to:OWNER_EMAIL, payload:{url:'https://www.gofundme.com/f/Mekedonia-Charity-help-build-home-for-the-homeless'}});
}
function openMailClient(mailto){
  try {
    window.open(mailto, '_blank');
    announce('Opening your email client to notify the site owner.');
    pushNotification({type:'mailto_opened', to: OWNER_EMAIL, mailto});
  } catch (e) {
    console.warn('mailto failed', e);
    const fallback = `To: ${OWNER_EMAIL}\n\n${decodeURIComponent(mailto.split('?body=')[1]||'')}`;
    prompt('Copy and send the following to notify the site owner:', fallback);
    pushNotification({type:'mailto_failed', to:OWNER_EMAIL, fallback});
  }
}

/* ======================================================================
   Third-party simulated logins (existing)
   ====================================================================== */
function simulateThirdPartyLogin(provider){
  const email = `${provider.toLowerCase()}-user@example.com`;
  let user = State.users.find(u => u.email === email);
  if (!user) {
    user = {username: `${provider}User`, email, passwordHash: '', createdAt: Date.now(), uiPrefs:{}, voiceEnabled:false, userType:'none'};
    State.users.push(user);
    saveUsers();
    notifyOwnerNewSignup(user, provider);
  }
  saveCurrent(email);
  if (user.uiPrefs) { State.prefs = Object.assign(State.prefs, user.uiPrefs); savePrefs(); applyPrefsToUI(); }
  if (DOM['blind-voice-toggle']) {
    DOM['blind-voice-toggle'].setAttribute('aria-pressed', user.voiceEnabled ? 'true' : 'false');
    DOM['blind-voice-toggle'].textContent = user.voiceEnabled ? 'Disable Voice Feedback' : 'Enable Voice Feedback';
  }
  announce(`Logged in via ${provider} as ${user.username}`);
  closeModal('login-modal');
}
function simulateThirdPartySignUp(provider){
  const email = `${provider.toLowerCase()}-user@example.com`;
  if (!State.users.some(u => u.email === email)) {
    const user = {username:`${provider}User`, email, passwordHash:'', createdAt:Date.now(), uiPrefs:{}, voiceEnabled:false, userType:'none'};
    State.users.push(user);
    saveUsers();
    notifyOwnerNewSignup(user, provider);
    saveCurrent(email);
    if (DOM['blind-voice-toggle']) {
      DOM['blind-voice-toggle'].setAttribute('aria-pressed', 'false');
      DOM['blind-voice-toggle'].textContent = 'Enable Voice Feedback';
    }
    announce(`Signed up via ${provider} as ${user.username}`);
    closeModal('signup-modal');
  } else {
    saveCurrent(email);
    announce(`Signed in via ${provider}`);
    closeModal('signup-modal');
  }
}

/* ======================================================================
   Demo & reminders (existing)
   ====================================================================== */
function startDemo(){
  if (State.demoTimer) clearTimeout(State.demoTimer);
  const steps = [
    ()=> showPage('access-choice'),
    ()=> { document.getElementById('flow-blind').focus(); },
    ()=> showPage('blind-flow'),
    ()=> { if (DOM['blind-tts-input']) { DOM['blind-tts-input'].value = 'Hello from demo mode'; DOM['blind-tts-speak'].click(); } },
    ()=> showPage('deaf-flow'),
    ()=> { startCameraDetection(); },
    ()=> { stopCameraDetection(); showPage('home'); }
  ];
  let i = 0;
  announce('Demo starting');
  function run(){
    if (i >= steps.length) { announce('Demo finished'); clearTimeout(State.demoTimer); State.demoTimer=null; return; }
    try { steps[i](); } catch(e){ console.warn('Demo step error', e); }
    i++;
    State.demoTimer = setTimeout(run, 1400);
  }
  run();
}
function stopDemo(){ if (State.demoTimer) clearTimeout(State.demoTimer); State.demoTimer=null; }

function startReminders(){
  if (State.reminderInterval) clearInterval(State.reminderInterval);
  State.reminderInterval = setInterval(()=> {
    const user = getCurrentUser();
    if (user && user.email) return;
    const text = 'Please log in to save your progress.';
    showTransient(text);
    if (user && user.userType === 'blind' && user.voiceEnabled) speak(text, {interrupt:true});
    if (user && user.userType === 'deaf') showSignReminder(text);
  }, 180000);
}
function showTransient(msg){
  const el = document.createElement('div');
  el.className = 'transient';
  el.textContent = msg;
  el.style.position='fixed'; el.style.right='1rem'; el.style.bottom='1rem'; el.style.padding='0.6rem 0.9rem';
  el.style.borderRadius='8px'; el.style.background='linear-gradient(90deg,#fff7f2,#eef6ff)';
  el.style.boxShadow='0 8px 30px rgba(0,0,0,0.08)'; el.style.zIndex=9999;
  document.body.appendChild(el);
  setTimeout(()=> { el.style.opacity='0'; el.style.transition='opacity 500ms'; }, 5200);
  setTimeout(()=> el.remove(), 6000);
}
function showSignReminder(msg){
  const el = document.createElement('div');
  el.className = 'sign-reminder';
  el.style.position='fixed'; el.style.left='1rem'; el.style.bottom='1rem'; el.style.padding='0.6rem 0.9rem';
  el.style.borderRadius='10px'; el.style.background='rgba(255,255,255,0.95)'; el.style.boxShadow='0 8px 30px rgba(0,0,0,0.06)';
  el.innerHTML = `<div style="font-size:24px">🤟</div><div style="margin-top:6px">${msg}</div>`;
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 6000);
}

/* ======================================================================
   Misc helpers
   ====================================================================== */
function pushHistoryItem(item){
  const arr = JSON.parse(localStorage.getItem(LS_KEYS.HISTORY) || '[]');
  arr.unshift(Object.assign({timestamp: Date.now()}, item));
  localStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(arr.slice(0,200)));
  renderHistories();
}
function renderHistories(){
  const arr = JSON.parse(localStorage.getItem(LS_KEYS.HISTORY) || '[]');
  if (DOM['history-blind']) {
    DOM['history-blind'].innerHTML = '';
    arr.filter(i => ['stt','tts','s2s'].includes(i.type)).slice(0,50).forEach(it=>{
      const li = document.createElement('li');
      li.textContent = `${new Date(it.timestamp).toLocaleTimeString()} — ${it.type}: ${it.text}`;
      DOM['history-blind'].appendChild(li);
    });
  }
  if (DOM['history-deaf']) {
    DOM['history-deaf'].innerHTML = '';
    arr.filter(i => ['sign','stsign','s2s'].includes(i.type)).slice(0,50).forEach(it=>{
      const li = document.createElement('li');
      li.textContent = `${new Date(it.timestamp).toLocaleTimeString()} — ${it.type}: ${it.text}`;
      DOM['history-deaf'].appendChild(li);
    });
  }
}

/* ======================================================================
   Exported for other modules (none) - end of file
   ====================================================================== */
