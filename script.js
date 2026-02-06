/**
 * script.js
 * AccessFirst — Full accessible front-end demo
 * - Vanilla JavaScript only
 * - Implements speech features, sign detection (HandsSign + TensorFlow), preferences,
 *   profiles, history, reminders, demo mode, and accessible interactions.
 *
 * Note:
 * - This file gracefully handles missing APIs (SpeechRecognition, speechSynthesis, camera, TensorFlow/Handsign)
 * - Persistent data keys in localStorage:
 *   - af_profile
 *   - af_prefs
 *   - af_history
 *
 * Developed by: HaileGebriel
 */

/* ============================
   Constants & State
   ============================ */
const KEYS = {
  PROFILE: 'af_profile',
  PREFS: 'af_prefs',
  HISTORY: 'af_history'
};

const State = {
  profile: null,
  prefs: {
    contrast: false,
    fontSize: 'medium', // small | medium | large
    reduceMotion: false,
    demo: false
  },
  speech: {
    supported: 'speechSynthesis' in window,
    recognitionSupported: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    recognition: null,
    recognizing: false
  },
  handsign: {
    enabled: false,
    modelUrl: 'https://cdn.jsdelivr.net/gh/syauqy/handsign-tensorflow@main/model/model.json',
    initialized: false,
    detector: null, // will hold handsign object or fallback
    streaming: false,
    videoStream: null
  },
  reminderInterval: null,
  demoTimer: null
};

/* ============================
   DOM Cache
   ============================ */
const DOM = {};
document.addEventListener('DOMContentLoaded', () => {
  // Page elements
  [
    'main',
    'home','access-choice','blind-flow','deaf-flow',
    'nav-home','nav-access','nav-login','nav-signup','nav-guest','donate-link',
    'cta-start','cta-guest','cta-donate','contrast-toggle','font-size','reduced-motion','demo-mode',
    'tts-area','tts-speak','tts-stop','tts-clear',
    'choose-blind','choose-deaf',
    'stt-output','stt-start','stt-stop','stt-copy','blind-tts','blind-tts-speak','blind-tts-stop','blind-tts-clear','history-blind',
    'sign-palette','assembled-phrase','s2s-speak','s2s-clear','camera-video','camera-canvas','start-detection','stop-detection','detected-sign','speak-detected','camera-status','history-deaf',
    'login-modal','signup-modal','login-form','signup-form','login-username','login-type','signup-username','signup-type','signup-contrast','signup-reduced','signup-font',
    'login-cancel','signup-cancel','year','sr-live'
  ].forEach(id => DOM[id] = document.getElementById(id));

  // Setup initial UI
  loadPrefs();
  loadProfile();
  applyPrefsToUI();
  populateYear();
  translateStatic(); // small helper for static labels if needed

  // Attach event listeners
  attachUIListeners();

  // Initialize speech recognition if supported
  initSpeechRecognition();

  // Initialize handsign if scripts loaded
  initHandsignIfAvailable();

  // Load history
  renderHistory();

  // Start reminders
  startReminders();

  // Maybe demo
  if (State.prefs.demo) startDemoMode();
});

/* ============================
   Helpers: Storage & UI
   ============================ */

function saveProfile(profile) {
  State.profile = profile;
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  announce(`Profile saved for ${profile.username}`);
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(KEYS.PROFILE);
    if (raw) State.profile = JSON.parse(raw);
  } catch (e) {
    console.warn('Load profile error', e);
  }
}

function savePrefs() {
  localStorage.setItem(KEYS.PREFS, JSON.stringify(State.prefs));
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(KEYS.PREFS);
    if (raw) State.prefs = Object.assign(State.prefs, JSON.parse(raw));
  } catch (e) {
    console.warn('Load prefs', e);
  }
}

function saveHistory(arr) {
  localStorage.setItem(KEYS.HISTORY, JSON.stringify(arr));
}
function loadHistoryArray() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]');
  } catch (e) {
    return [];
  }
}

function pushHistory(item) {
  const arr = loadHistoryArray();
  arr.unshift(Object.assign({timestamp: Date.now()}, item));
  saveHistory(arr.slice(0, 200));
  renderHistory();
}

function renderHistory() {
  const arr = loadHistoryArray();
  if (DOM['history-blind']) {
    DOM['history-blind'].innerHTML = '';
    arr.filter(i => ['stt', 'tts', 's2s'].includes(i.type)).slice(0, 50).forEach(it => {
      const li = document.createElement('li');
      li.textContent = `${new Date(it.timestamp).toLocaleTimeString()} — ${it.type}: ${it.text}`;
      DOM['history-blind'].appendChild(li);
    });
  }
  if (DOM['history-deaf']) {
    DOM['history-deaf'].innerHTML = '';
    arr.filter(i => ['sign', 'stsign', 's2s'].includes(i.type)).slice(0, 50).forEach(it => {
      const li = document.createElement('li');
      li.textContent = `${new Date(it.timestamp).toLocaleTimeString()} — ${it.type}: ${it.text}`;
      DOM['history-deaf'].appendChild(li);
    });
  }
}

/* Apply preference toggles to UI state */
function applyPrefsToUI() {
  // Contrast
  if (State.prefs.contrast) document.documentElement.classList.add('high-contrast');
  else document.documentElement.classList.remove('high-contrast');

  // Font size
  if (State.prefs.fontSize === 'large') document.documentElement.style.fontSize = '18px';
  else if (State.prefs.fontSize === 'small') document.documentElement.style.fontSize = '14px';
  else document.documentElement.style.fontSize = '';

  // Reduced motion
  if (State.prefs.reduceMotion) document.documentElement.classList.add('reduced-motion');
  else document.documentElement.classList.remove('reduced-motion');

  // Sync controls
  if (DOM['contrast-toggle']) DOM['contrast-toggle'].checked = !!State.prefs.contrast;
  if (DOM['font-size']) DOM['font-size'].value = State.prefs.fontSize || 'medium';
  if (DOM['reduced-motion']) DOM['reduced-motion'].checked = !!State.prefs.reduceMotion;
  if (DOM['demo-mode']) DOM['demo-mode'].checked = !!State.prefs.demo;
}

/* ============================
   Small UI & Accessibility Utilities
   ============================ */

function announce(message) {
  // Update SR live region
  if (DOM['sr-live']) DOM['sr-live'].textContent = message;
  // If profile blind + voice enabled, speak
  if (State.profile && State.profile.userType === 'blind' && State.profile.voiceEnabled) {
    speak(message, {interrupt:true});
  }
}

/* Simple show/hide page - all pages are sections with ids */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => {
    if (p.id === id) {
      p.classList.add('page-active');
      p.removeAttribute('hidden');
      // focus first interactive element
      setTimeout(()=> {
        const focusable = p.querySelector('button,a,input,textarea,select');
        if (focusable) focusable.focus();
      }, 200);
    } else {
      p.classList.remove('page-active');
      p.hidden = true;
    }
  });
  // Announce navigation
  announce(`Navigated to ${id.replace('-', ' ')}`);
}

/* Populate year in footer */
function populateYear(){
  if (DOM['year']) DOM['year'].textContent = new Date().getFullYear();
}

/* Translate static text if needed - site is English only per spec */
function translateStatic(){
  // No-op for English site; kept for structure
}

/* ============================
   Event Attachments
   ============================ */
function attachUIListeners() {
  // Navigation buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = btn.dataset.target;
      const modal = btn.dataset.modal;
      if (target) showPage(target);
      if (modal) openModal(modal);
    });
    // keyboard activation (Enter/Space)
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
    });
  });

  // CTA buttons
  if (DOM['cta-start']) DOM['cta-start'].addEventListener('click', ()=> showPage('access-choice'));
  if (DOM['cta-guest']) DOM['cta-guest'].addEventListener('click', continueAsGuest);
  if (DOM['cta-donate']) DOM['cta-donate'].addEventListener('click', ()=> announce('Opening donate link'));

  // Preference controls
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
  if (DOM['reduced-motion']) DOM['reduced-motion'].addEventListener('change', (e) => {
    State.prefs.reduceMotion = e.target.checked;
    applyPrefsToUI();
    savePrefs();
    announce(State.prefs.reduceMotion ? 'Reduced motion enabled' : 'Reduced motion disabled');
  });
  if (DOM['demo-mode']) DOM['demo-mode'].addEventListener('change', (e) => {
    State.prefs.demo = e.target.checked;
    savePrefs();
    if (State.prefs.demo) startDemoMode(); else stopDemoMode();
    announce(State.prefs.demo ? 'Demo mode enabled' : 'Demo mode disabled');
  });

  // TTS area on Home
  if (DOM['tts-speak']) DOM['tts-speak'].addEventListener('click', ()=> {
    const text = (DOM['tts-area'] && DOM['tts-area'].value) || 'Hello, welcome to AccessFirst';
    speak(text);
    pushHistory({type:'tts', text});
  });
  if (DOM['tts-stop']) DOM['tts-stop'].addEventListener('click', ()=> stopSpeaking());
  if (DOM['tts-clear']) DOM['tts-clear'].addEventListener('click', ()=> { if (DOM['tts-area']) DOM['tts-area'].value=''; });

  // Access choice
  if (DOM['choose-blind']) DOM['choose-blind'].addEventListener('click', ()=> {
    if (!State.profile) continueAsGuest();
    State.profile.userType = 'blind';
    saveProfile(State.profile);
    showPage('blind-flow');
    announce('Blind mode enabled');
  });
  if (DOM['choose-deaf']) DOM['choose-deaf'].addEventListener('click', ()=> {
    if (!State.profile) continueAsGuest();
    State.profile.userType = 'deaf';
    saveProfile(State.profile);
    showPage('deaf-flow');
    announce('Deaf mode enabled');
  });

  // Blind flow: STT & TTS
  if (DOM['stt-start']) DOM['stt-start'].addEventListener('click', startSpeechRecognition);
  if (DOM['stt-stop']) DOM['stt-stop'].addEventListener('click', stopSpeechRecognition);
  if (DOM['stt-copy']) DOM['stt-copy'].addEventListener('click', ()=> {
    if (DOM['stt-output']) {
      navigator.clipboard?.writeText(DOM['stt-output'].value || '').then(()=> announce('Copied to clipboard'));
    }
  });

  if (DOM['blind-tts-speak']) DOM['blind-tts-speak'].addEventListener('click', ()=> {
    const t = DOM['blind-tts'].value || 'Hello';
    speak(t);
    pushHistory({type:'tts', text:t});
  });
  if (DOM['blind-tts-stop']) DOM['blind-tts-stop'].addEventListener('click', ()=> stopSpeaking());
  if (DOM['blind-tts-clear']) DOM['blind-tts-clear'].addEventListener('click', ()=> { if (DOM['blind-tts']) DOM['blind-tts'].value = ''; });

  // Deaf flow: Sign-to-speech palette
  populateSignPalette();
  if (DOM['sign-palette']) DOM['sign-palette'].addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sign]');
    if (!btn) return;
    const word = btn.dataset.sign;
    appendToPhrase(word);
  });
  if (DOM['s2s-speak']) DOM['s2s-speak'].addEventListener('click', ()=> {
    const phrase = DOM['assembled-phrase'].textContent.trim();
    if (!phrase) { announce('No phrase to speak'); return; }
    speak(phrase);
    pushHistory({type:'s2s', text:phrase});
  });
  if (DOM['s2s-clear']) DOM['s2s-clear'].addEventListener('click', ()=> { DOM['assembled-phrase'].textContent=''; });

  // Deaf flow: camera & detection
  if (DOM['start-detection']) DOM['start-detection'].addEventListener('click', startHandsignDetection);
  if (DOM['stop-detection']) DOM['stop-detection'].addEventListener('click', stopHandsignDetection);
  if (DOM['speak-detected']) DOM['speak-detected'].addEventListener('click', ()=> {
    const txt = DOM['detected-sign'].textContent || '';
    if (txt && txt !== 'No sign detected') { speak(txt); pushHistory({type:'sign', text:txt}); }
  });

  // Login / Signup modals
  const navLogin = document.getElementById('nav-login');
  const navSignup = document.getElementById('nav-signup');
  if (navLogin) navLogin.addEventListener('click', ()=> openModal('login-modal'));
  if (navSignup) navSignup.addEventListener('click', ()=> openModal('signup-modal'));

  if (DOM['login-form']) {
    DOM['login-form'].addEventListener('submit', (e) => {
      e.preventDefault();
      const username = (DOM['login-username'] && DOM['login-username'].value.trim()) || '';
      const type = (DOM['login-type'] && DOM['login-type'].value) || 'none';
      if (!username || username.length < 2) { alert('Please enter a valid username (2+ characters).'); return; }
      saveProfile({username, userType: type, uiPrefs: Object.assign({}, State.prefs), voiceEnabled: false});
      closeModal('login-modal');
    });
    if (DOM['login-cancel']) DOM['login-cancel'].addEventListener('click', ()=> closeModal('login-modal'));
  }

  if (DOM['signup-form']) {
    DOM['signup-form'].addEventListener('submit', (e) => {
      e.preventDefault();
      const username = (DOM['signup-username'] && DOM['signup-username'].value.trim()) || '';
      const type = (DOM['signup-type'] && DOM['signup-type'].value) || 'none';
      const contrast = DOM['signup-contrast']?.checked || false;
      const reduced = DOM['signup-reduced']?.checked || false;
      const font = DOM['signup-font']?.value || 'medium';
      if (!username || username.length < 2) { alert('Please enter a valid username (2+ characters).'); return; }
      const profile = {username, userType: type, uiPrefs: {contrast, fontSize: font, reduceMotion: reduced}, voiceEnabled: false};
      saveProfile(profile);
      // apply preferences
      State.prefs = Object.assign(State.prefs, profile.uiPrefs);
      savePrefs();
      applyPrefsToUI();
      closeModal('signup-modal');
    });
    if (DOM['signup-cancel']) DOM['signup-cancel'].addEventListener('click', ()=> closeModal('signup-modal'));
  }

  // back buttons (data-target attr)
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-target]');
    if (!b) return;
    const target = b.dataset.target;
    if (target) showPage(target);
  });

  // keyboard global: Escape closes dialogs
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal('login-modal'); closeModal('signup-modal');
    }
  });
}

/* ============================
   Modal helpers
   ============================ */
function openModal(id) {
  const dlg = document.getElementById(id);
  if (!dlg) return;
  if (typeof dlg.showModal === 'function') dlg.showModal();
  else dlg.style.display = 'block';
  // focus first input
  setTimeout(()=> dlg.querySelector('input,select,button')?.focus(), 120);
}
function closeModal(id) {
  const dlg = document.getElementById(id);
  if (!dlg) return;
  if (typeof dlg.close === 'function') dlg.close();
  else dlg.style.display = 'none';
}

/* ============================
   Speech: TTS & STT
   ============================ */

/* TTS */
function speak(text, opts = {}) {
  if (!('speechSynthesis' in window)) { alert('Speech synthesis not supported.'); return; }
  if (!text) return;
  try {
    if (opts.interrupt) window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    // voice selection fallback
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length) {
      // try to pick a neutral English voice
      u.voice = voices.find(v => v.lang && v.lang.startsWith('en')) || voices[0];
    }
    window.speechSynthesis.speak(u);
  } catch (e) {
    console.warn('TTS error', e);
  }
}
function stopSpeaking() { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }

/* STT (SpeechRecognition) */
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  if (!SpeechRecognition) {
    console.warn('SpeechRecognition not supported');
    return;
  }
  try {
    State.speech.recognition = new SpeechRecognition();
    State.speech.recognition.lang = 'en-US';
    State.speech.recognition.interimResults = false;
    State.speech.recognition.onresult = (ev) => {
      const text = ev.results[0][0].transcript;
      if (DOM['stt-output']) DOM['stt-output'].value = text;
      pushHistory({type:'stt', text});
      announce('Speech recognized');
    };
    State.speech.recognition.onstart = ()=> { State.speech.recognizing = true; announce('Listening...'); };
    State.speech.recognition.onend = ()=> { State.speech.recognizing = false; announce('Stopped listening'); };
    State.speech.recognition.onerror = (e)=> { console.warn('Recognition error', e); announce('Recognition error'); };
  } catch (e) {
    console.warn('Init recognition failed', e);
  }
}

function startSpeechRecognition() {
  if (!State.speech.recognition) { alert('Speech recognition not supported in this browser.'); return; }
  try { State.speech.recognition.start(); } catch(e){ console.warn(e); }
}
function stopSpeechRecognition() {
  if (State.speech.recognition) try { State.speech.recognition.stop(); } catch(e) {}
}

/* ============================
   Sign-to-Speech (palette) helpers
   ============================ */

const DEFAULT_SIGNS = [
  {key:'Hello', emoji:'👋'},
  {key:'Yes', emoji:'👍'},
  {key:'No', emoji:'👎'},
  {key:'Thank you', emoji:'🙏'},
  {key:'Help', emoji:'🆘'},
  {key:'Good', emoji:'🌟'}
];

function populateSignPalette() {
  const palette = DOM['sign-palette'];
  if (!palette) return;
  palette.innerHTML = '';
  DEFAULT_SIGNS.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'sign-btn';
    btn.type = 'button';
    btn.dataset.sign = s.key;
    btn.innerHTML = `${s.emoji} <span class="sign-label">${s.key}</span>`;
    btn.setAttribute('aria-label', `Sign ${s.key}`);
    palette.appendChild(btn);
  });
}

function appendToPhrase(word) {
  const el = DOM['assembled-phrase'];
  if (!el) return;
  if (!el.textContent || el.textContent.trim() === '') el.textContent = word;
  else el.textContent = (el.textContent.trim() + ' ' + word);
}

/* ============================
   Handsign (TensorFlow) integration + Camera
   ============================ */

/*
  Integration approach:
  - Try to use the Handsign library (loaded via script tag).
  - If available, call the library's initializer. Since external library API may vary,
    we attempt common calls and fallback gracefully.
  - If unavailable or fails, we fallback to simple simulated detection (periodic random picks)
    but still provide a camera preview.
*/

async function initHandsignIfAvailable(){
  // Wait a bit for tf/handsign scripts to load
  await new Promise(res => setTimeout(res, 300));
  // If handsign library exposes a known global, try to initialize with model URL
  try {
    // Example: some libs set window.HandSign, window.handsign, window.HandSignModel
    const HS = window.handsign || window.HandSign || window.HandSignModel || window.HandSignTensor;
    if (HS && typeof HS === 'object') {
      // If library provides an async init, call it
      if (HS.init && typeof HS.init === 'function') {
        try {
          await HS.init(State.handsign.modelUrl);
          State.handsign.detector = HS;
          State.handsign.enabled = true;
          State.handsign.initialized = true;
          console.info('Handsign library initialized (object API)');
          return;
        } catch (err) { console.warn('HS.init failed', err); }
      }
      // otherwise, if it provides loadModel
      if (HS.loadModel && typeof HS.loadModel === 'function') {
        try {
          State.handsign.detector = await HS.loadModel(State.handsign.modelUrl);
          State.handsign.enabled = true;
          State.handsign.initialized = true;
          console.info('Handsign model loaded via loadModel');
          return;
        } catch (err) { console.warn('HS.loadModel failed', err); }
      }
    }
    // Another attempt: if tf is present, try to load model directly (best-effort)
    if (window.tf && window.tf.loadGraphModel) {
      try {
        const model = await window.tf.loadGraphModel(State.handsign.modelUrl);
        State.handsign.detector = model;
        State.handsign.enabled = true;
        State.handsign.initialized = true;
        console.info('Handsign model loaded via tf.loadGraphModel (generic)');
        return;
      } catch (err) {
        console.warn('tf.loadGraphModel failed', err);
      }
    }
  } catch (e) {
    console.warn('Handsign initialization error', e);
  }
  // If we reach here, no model available — disable camera detection but allow manual sign palette
  State.handsign.enabled = false;
  State.handsign.initialized = false;
  console.info('Handsign not available; camera detection will fallback to simulation');
}

/* Camera start/stop + detection loop */
async function startHandsignDetection() {
  if (State.handsign.streaming) return;
  // request camera
  try {
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}, audio:false});
    const video = DOM['camera-video'];
    video.srcObject = stream;
    State.handsign.videoStream = stream;
    State.handsign.streaming = true;
    DOM['camera-status'].textContent = 'Camera active';
    announce('Camera started for sign detection');
    // if we have a real detector, start inference loop; else simulate
    if (State.handsign.initialized && State.handsign.enabled && State.handsign.detector) {
      runDetectionLoopReal();
    } else {
      runDetectionLoopSimulated();
    }
  } catch (e) {
    console.warn('Camera error', e);
    DOM['camera-status'].textContent = 'Camera unavailable';
    alert('Unable to access camera. Please allow camera permissions or use manual sign palette.');
  }
}

function stopHandsignDetection(){
  if (!State.handsign.streaming) return;
  if (State.handsign.videoStream) {
    State.handsign.videoStream.getTracks().forEach(t => t.stop());
    State.handsign.videoStream = null;
  }
  State.handsign.streaming = false;
  DOM['camera-status'].textContent = 'Camera stopped';
  DOM['detected-sign'].textContent = 'No sign detected';
  announce('Camera stopped');
  // cancel any loops by flipping streaming flag — loops check this flag
}

/* Real detection loop — best-effort using detector interface */
async function runDetectionLoopReal(){
  const video = DOM['camera-video'];
  const canvas = DOM['camera-canvas'];
  const ctx = canvas.getContext('2d');
  // ensure canvas matches video
  function resizeCanvas() {
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
  }
  // Wait for video to be ready
  await new Promise(res => {
    if (video.readyState >= 2) return res();
    video.onloadeddata = () => res();
  });
  resizeCanvas();

  // detection loop
  async function loop() {
    if (!State.handsign.streaming) return;
    try {
      // draw frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // extract tensor from canvas
      if (window.tf && State.handsign.detector && typeof State.handsign.detector.executeAsync === 'function') {
        // Best-effort attempt: convert canvas to tensor and run model
        const img = tf.browser.fromPixels(canvas).expandDims(0).toFloat().div(255);
        const result = await State.handsign.detector.executeAsync(img);
        // Interpret result into a 'label' — model-specific; attempt to extract names
        let label = null;
        try {
          // Some models return logits or probabilities. We'll try to find a top label if present.
          if (Array.isArray(result) && result.length) {
            // search for a tensor that looks like label indices/probs
            for (const r of result) {
              if (r.arraySync) {
                const arr = await r.array();
                // flatten and find top index
                const flat = arr.flat ? arr.flat() : arr;
                if (flat && flat.length && typeof flat[0] === 'number') {
                  const maxIdx = flat.indexOf(Math.max(...flat));
                  label = `Sign(${maxIdx})`;
                  break;
                }
              }
            }
          } else if (result.array) {
            const arr = await result.array();
            const flat = arr.flat ? arr.flat() : arr;
            const maxIdx = flat.indexOf(Math.max(...flat));
            label = `Sign(${maxIdx})`;
          }
        } catch (e) {
          console.warn('Interpreting model result failed', e);
          label = null;
        }
        tf.dispose(img);
        if (!label) label = 'Sign detected';
        DOM['detected-sign'].textContent = label;
        pushHistory({type:'stsign', text: label});
      } else if (State.handsign.detector && State.handsign.detector.predict) {
        // some libs expose predict(image)
        const prediction = await State.handsign.detector.predict(canvas);
        const label = prediction?.label || prediction?.class || JSON.stringify(prediction);
        DOM['detected-sign'].textContent = label || 'Sign detected';
        pushHistory({type:'stsign', text: label});
      } else {
        // fallback: show generic detection
        DOM['detected-sign'].textContent = 'Sign detected';
      }
    } catch (err) {
      console.warn('Detection loop error', err);
      DOM['detected-sign'].textContent = 'Detection error';
    }
    // schedule next
    setTimeout(()=> {
      if (State.handsign.streaming) requestAnimationFrame(loop);
    }, 200); // small throttle
  }
  loop();
}

/* Simulated detection loop when model unavailable */
function runDetectionLoopSimulated(){
  const video = DOM['camera-video'];
  // simple loop that samples frames and randomly "detects" a sign (for demo)
  const choices = DEFAULT_SIGNS.map(s => s.key);
  async function loop() {
    if (!State.handsign.streaming) return;
    // draw simple overlay for feel
    const canvas = DOM['camera-canvas'];
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(8,8,canvas.width-16,canvas.height-16);
    // every 1.5s pick a random sign to show
    const sign = choices[Math.floor(Math.random()*choices.length)];
    DOM['detected-sign'].textContent = sign;
    pushHistory({type:'stsign', text: sign});
    await new Promise(res => setTimeout(res, 1500));
    if (State.handsign.streaming) requestAnimationFrame(loop);
  }
  loop();
}

/* ============================
   Reminders & Demo Mode
   ============================ */

function startReminders() {
  // 3 minutes (180000 ms) reminder
  if (State.reminderInterval) clearInterval(State.reminderInterval);
  State.reminderInterval = setInterval(() => {
    const profile = State.profile || null;
    const text = 'Please log in to save your progress.';
    // Visual banner
    showTransientBanner(text);
    // If blind user + voice enabled
    if (profile && profile.userType === 'blind' && profile.voiceEnabled) speak(text, {interrupt:true});
    // Deaf visual sign (simple card)
    if (profile && profile.userType === 'deaf') showSignReminder(text);
  }, 180000);
}

function showTransientBanner(msg) {
  const div = document.createElement('div');
  div.className = 'transient-banner';
  div.style.position = 'fixed';
  div.style.right = '1rem';
  div.style.bottom = '1rem';
  div.style.background = 'linear-gradient(90deg,#fff7f2,#eef2ff)';
  div.style.border = '1px solid rgba(0,0,0,0.06)';
  div.style.padding = '0.8rem 1rem';
  div.style.borderRadius = '10px';
  div.style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)';
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(()=> { div.style.opacity = '0'; div.style.transition = 'opacity 400ms'; }, 5200);
  setTimeout(()=> div.remove(), 6000);
}

function showSignReminder(msg) {
  const div = document.createElement('div');
  div.className = 'sign-reminder';
  div.style.position = 'fixed';
  div.style.left = '1rem';
  div.style.bottom = '1rem';
  div.style.background = 'rgba(255,255,255,0.95)';
  div.style.border = '1px solid rgba(0,0,0,0.06)';
  div.style.padding = '0.6rem 0.8rem';
  div.style.borderRadius = '10px';
  div.style.boxShadow = '0 8px 30px rgba(0,0,0,0.06)';
  div.innerHTML = `<div style="font-size:20px">🤟</div><div style="margin-top:4px">${msg}</div>`;
  document.body.appendChild(div);
  setTimeout(()=> div.remove(), 6000);
}

/* Demo mode: cycles through features gently */
function startDemoMode() {
  if (State.demoTimer) clearTimeout(State.demoTimer);
  let steps = [
    ()=> { showPage('access-choice'); },
    ()=> { document.getElementById('choose-blind').focus(); },
    ()=> { showPage('blind-flow'); },
    ()=> { if (DOM['blind-tts']) { DOM['blind-tts'].value = 'Hello from demo mode'; DOM['blind-tts-speak'].click(); } },
    ()=> { showPage('deaf-flow'); },
    ()=> { startHandsignDetection(); },
    ()=> { stopHandsignDetection(); showPage('home'); }
  ];
  let idx = 0;
  function runStep() {
    if (idx >= steps.length) { announce('Demo complete'); stopDemoMode(); return; }
    try { steps[idx](); } catch(e){ console.warn('Demo step error', e); }
    idx++;
    State.demoTimer = setTimeout(runStep, 1600);
  }
  announce('Demo starting');
  runStep();
}

function stopDemoMode() {
  if (State.demoTimer) clearTimeout(State.demoTimer);
  State.demoTimer = null;
}

/* ============================
   Utility: continue as guest
   ============================ */
function continueAsGuest() {
  const guest = {username:'Guest', userType:'none', uiPrefs:Object.assign({}, State.prefs), voiceEnabled:false};
  saveProfile(guest);
  announce('Continuing as Guest');
  showPage('access-choice');
}

/* ============================
   Finishing touches & safety
   ============================ */

// Speak detected-sign when pressing speak-detected (bound above)
if (DOM['speak-detected']) DOM['speak-detected'].addEventListener && DOM['speak-detected'].addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); DOM['speak-detected'].click(); }
});

// Ensure history rendered initially
renderHistory();

// warn user when leaving with unsaved data (soft)
window.addEventListener('beforeunload', (e) => {
  // keep light; no blocking by default
});

/* ============================
   End of script
   ============================ */
