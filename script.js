/**
 * script.js
 * AccessFirst — Accessibility-first interactive demo
 * Vanilla JS only. No frameworks, no backend.
 *
 * Major responsibilities:
 * - Language system (EN / AM) with auto-detect and persistence
 * - Page navigation & smooth transitions
 * - Login / signup (localStorage profile)
 * - Blind flow: Web Speech API (STT + TTS) with language support
 * - Deaf flow: simulated sign language UI and speech integration
 * - Accessibility settings: high contrast, font size, reduced motion
 * - Login reminders every 3 minutes, spoken/visual based on profile
 * - Conversation / interaction history stored in localStorage
 * - Demo mode showcasing features
 *
 * Notes:
 * - Gracefully handle unsupported APIs (SpeechRecognition, speechSynthesis)
 * - All user preferences saved to localStorage under keys prefixed with "af_"
 */

/* ============
   Utility & State
   ============ */
const State = {
  lang: 'en', // 'en' or 'am'
  profile: null,
  prefs: {
    contrast: false,
    fontSize: 'medium',
    reduceMotion: false,
    demo: false
  },
  currentPage: 'home',
  recognition: null,
  recognitionActive: false,
  sttHistoryKey: 'af_history',
  reminderIntervalId: null,
  reminderMs: 180000 // 3 minutes
};

/* Translation dictionary (English and Amharic) */
const I18N = {
  en: {
    welcome: "Welcome to AccessFirst",
    tagline: "An accessibility-first demo — English & Amharic supported",
    getStarted: "Get Started",
    continueGuest: "Continue as Guest",
    donate: "Donate",
    home: "Home",
    accessibility: "Accessibility",
    login: "Login",
    signup: "Sign Up",
    blind: "Blind",
    deaf: "Deaf",
    speechToText: "Speech-to-Text",
    textToSpeech: "Text-to-Speech",
    signToSpeech: "Sign-to-Speech",
    speechToSign: "Speech-to-Sign",
    enableVoice: "Enable Voice Feedback",
    disableVoice: "Disable Voice Feedback",
    loginReminder: "Please log in to save your progress.",
    loginReminderTitle: "Login Reminder",
    demoStart: "Demo mode starting...",
    demoEnd: "Demo complete.",
    prefsSaved: "Preferences saved",
    profileSaved: "Profile saved locally",
    speechNotSupported: "Speech features are not supported in this browser.",
    recognitionStart: "Listening...",
    recognitionStop: "Stopped listening.",
    speakNow: "Speak now",
    phraseSpoken: "Phrase spoken",
    back: "Back"
  },
  am: {
    welcome: "AccessFirst በደህና መጡ",
    tagline: "የቅድሚያ መግለጫ — እንግሊዝኛ & አማርኛ ይደግፋሉ",
    getStarted: "ጀምር",
    continueGuest: "እንደ ጉስት ይቀጥሉ",
    donate: "ድጋፍ ለመስጠት",
    home: "ቤት",
    accessibility: "አስተዳደር",
    login: "ግባ",
    signup: "ይመዝገቡ",
    blind: "የዓይን ጉዳት",
    deaf: "የመሰማት ችግኝ",
    speechToText: "ንግግር ወደ ጽሑፍ",
    textToSpeech: "ጽሑፍ ወደ ድምጽ",
    signToSpeech: "ምልክት ወደ ድምጽ",
    speechToSign: "ድምጽ ወደ ምልክት",
    enableVoice: "የድምጽ እትም እንዲሰማ",
    disableVoice: "የድምጽ እትምን ዝጋ",
    loginReminder: "እባክዎን የስራዎን ሂደት ለማስቀመጥ ይግቡ።",
    loginReminderTitle: "የግባ ማሳሰቢያ",
    demoStart: "የሞዴሉ ሙከራ ተጀምሯል...",
    demoEnd: "ሞዴሉ ጨርሏል።",
    prefsSaved: "የቅኝ ቅንብሮች ተቀይሯል",
    profileSaved: "ፕሮፋይሉ በአካል ተመዝግቧል",
    speechNotSupported: "የድምጽ ባለሞያ ስርዓት በዚህ በስር ብሮዘር አይደገፍም።",
    recognitionStart: "እየሰማሁ...",
    recognitionStop: "እየቆመ።",
    speakNow: "አሁን ናገሩ",
    phraseSpoken: "የተናገረው ንግግር",
    back: "ተመለስ"
  }
};

/* DOM elements */
const dom = {};
document.addEventListener('DOMContentLoaded', () => {
  // Cache DOM
  ['lang-select','lang-quick-select','settings-toggle','settings-panel','contrast-toggle','font-size','reduced-motion','demo-mode','reset-prefs',
   'home','access-choice','blind-flow','deaf-flow','nav-home','nav-access','nav-login','nav-signup','nav-guest','donate','cta-get-started','cta-guest','donate-cta',
   'btn-blind','btn-deaf','back-from-access','back-from-blind','back-from-deaf','login-modal','signup-modal','login-form','signup-form',
   'login-username','login-usertype','signup-username','signup-usertype','pref-contrast','pref-reduce-motion','pref-font',
   'voice-toggle','stt-start','stt-stop','stt-input','stt-clear','tts-speak','tts-stop','tts-input','tts-clear',
   'stsign-start','stsign-stop','stsign-output','sign-palette','assembled-phrase','s2s-speak','s2s-clear','history-list-blind','history-list-deaf',
   'aria-live','year'].forEach(id => { dom[id] = document.getElementById(id); });

  // Initialize
  initLang();
  loadPrefs();
  restoreProfile();
  applyPrefs();
  translateAll();
  attachListeners();
  initSpeech();
  initReminder();
  populateYear();
  loadHistory();
  maybeStartDemo();
});

/* ============
   Initialization Helpers
   ============ */

function initLang(){
  try {
    const stored = localStorage.getItem('af_lang');
    if (stored) {
      State.lang = stored;
    } else {
      const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
      State.lang = (nav && nav.indexOf('am') === 0) ? 'am' : 'en';
      localStorage.setItem('af_lang', State.lang);
    }
    // Sync selects
    dom['lang-select'].value = State.lang;
    dom['lang-quick-select'].value = State.lang;
    document.documentElement.lang = State.lang === 'am' ? 'am' : 'en';
  } catch(e){}
}

function loadPrefs(){
  try {
    const raw = localStorage.getItem('af_prefs');
    if (raw) {
      const p = JSON.parse(raw);
      State.prefs = Object.assign(State.prefs, p);
    }
    // Reflect UI
    dom['contrast-toggle'].checked = State.prefs.contrast;
    dom['font-size'].value = State.prefs.fontSize;
    dom['reduced-motion'].checked = State.prefs.reduceMotion;
    dom['demo-mode'].checked = State.prefs.demo;
  } catch(e){}
}

function restoreProfile(){
  try {
    const raw = localStorage.getItem('af_profile');
    if (raw) {
      State.profile = JSON.parse(raw);
      // Apply profile preferences if present
      if (State.profile && State.profile.uiPrefs) {
        State.prefs = Object.assign(State.prefs, State.profile.uiPrefs);
      }
    }
  } catch(e){}
}

function applyPrefs(){
  // High contrast
  if (State.prefs.contrast) document.documentElement.classList.add('high-contrast'); else document.documentElement.classList.remove('high-contrast');
  // Font size
  const size = State.prefs.fontSize || 'medium';
  document.documentElement.style.fontSize = size === 'large' ? '18px' : (size === 'small' ? '14px' : '16px');
  // Reduced motion
  if (State.prefs.reduceMotion) document.documentElement.classList.add('reduced-motion'), document.documentElement.setAttribute('reduce-motion','true');
  else document.documentElement.classList.remove('reduced-motion'), document.documentElement.removeAttribute('reduce-motion');
}

/* ============
   I18n / Translation
   ============ */
function t(key){
  return (I18N[State.lang] && I18N[State.lang][key]) || I18N.en[key] || key;
}

function translateAll(){
  // Headings & CTAs
  document.getElementById('home-heading').textContent = t('welcome');
  document.getElementById('hero-sub').textContent = t('tagline');
  dom['cta-get-started'].textContent = t('getStarted');
  dom['cta-guest'].textContent = t('continueGuest');
  dom['donate-cta'].textContent = t('donate');
  document.getElementById('nav-home').textContent = t('home');
  document.getElementById('nav-access').textContent = t('accessibility');
  document.getElementById('nav-login').textContent = t('login');
  document.getElementById('nav-signup').textContent = t('signup');
  dom['btn-blind'].querySelector('span:last-child').textContent = t('blind');
  dom['btn-deaf'].querySelector('span:last-child').textContent = t('deaf');

  // Blind / Deaf tool headings
  document.querySelector('#blind-heading').textContent = t('blind') + " Mode";
  document.querySelector('#deaf-heading').textContent = t('deaf') + " Mode";
  dom['voice-toggle'].textContent = State.profile && State.profile.voiceEnabled ? t('disableVoice') : t('enableVoice');
}

/* ============
   Navigation & Page Management
   ============ */

function showPage(id){
  const pages = document.querySelectorAll('.page');
  pages.forEach(p => {
    if (p.id === id) {
      p.classList.add('page--active');
      p.hidden = false;
      p.setAttribute('aria-hidden','false');
      // focus first focusable
      setTimeout(()=> {
        const first = p.querySelector('button, a, input, textarea, select');
        if (first) first.focus();
      }, 200);
    } else {
      p.classList.remove('page--active');
      p.hidden = true;
      p.setAttribute('aria-hidden','true');
    }
  });
  State.currentPage = id;
  announce(t('back')); // small aria hint for context-aware
}

function attachListeners(){
  // Nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget.getAttribute('data-target');
      const modal = e.currentTarget.getAttribute('data-modal');
      if (target) {
        showPage(target);
      } else if (modal) {
        openModal(`${modal}-modal`);
      }
    });
  });

  dom['nav-guest'].addEventListener('click', ()=> continueAsGuest());
  dom['donate'].addEventListener('click', ()=> announce(t('donate')));

  // CTA
  dom['cta-get-started'].addEventListener('click', ()=> showPage('access-choice'));
  dom['cta-guest'].addEventListener('click', ()=> continueAsGuest());

  // Back buttons
  dom['back-from-access'].addEventListener('click', ()=> showPage('home'));
  dom['back-from-blind'].addEventListener('click', ()=> showPage('access-choice'));
  dom['back-from-deaf'].addEventListener('click', ()=> showPage('access-choice'));

  // Language selects
  dom['lang-select'].addEventListener('change', (e) => setLang(e.target.value));
  dom['lang-quick-select'].addEventListener('change', (e) => setLang(e.target.value));

  // Settings panel toggle
  dom['settings-toggle'].addEventListener('click', (e) => {
    const expanded = e.currentTarget.getAttribute('aria-expanded') === 'true';
    e.currentTarget.setAttribute('aria-expanded', String(!expanded));
    dom['settings-panel'].hidden = expanded;
    if (!expanded) dom['settings-panel'].querySelector('input,select,button')?.focus();
  });

  // Prefs controls
  dom['contrast-toggle'].addEventListener('change', (e) => {
    State.prefs.contrast = e.target.checked;
    savePrefs();
    applyPrefs();
    announce(t('prefsSaved'));
  });
  dom['font-size'].addEventListener('change', (e) => {
    State.prefs.fontSize = e.target.value;
    savePrefs();
    applyPrefs();
  });
  dom['reduced-motion'].addEventListener('change', (e) => {
    State.prefs.reduceMotion = e.target.checked;
    savePrefs();
    applyPrefs();
  });
  dom['demo-mode'].addEventListener('change', (e) => {
    State.prefs.demo = e.target.checked;
    savePrefs();
    maybeStartDemo();
  });
  dom['reset-prefs'].addEventListener('click', resetPrefs);

  // Login / signup modals
  document.getElementById('nav-login').addEventListener('click', ()=> openModal('login-modal'));
  document.getElementById('nav-signup').addEventListener('click', ()=> openModal('signup-modal'));
  document.getElementById('login-cancel').addEventListener('click', ()=> closeModal('login-modal'));
  document.getElementById('signup-cancel').addEventListener('click', ()=> closeModal('signup-modal'));

  // Login form
  document.getElementById('login-form').addEventListener('submit', (e)=>{
    e.preventDefault();
    const username = dom['login-username'].value.trim();
    const usertype = dom['login-usertype'].value;
    if (!username || username.length < 2) {
      alert('Please enter a valid username (2+ characters).');
      return;
    }
    const profile = {
      username, userType: usertype, preferredLang: State.lang, uiPrefs: State.prefs, voiceEnabled: false
    };
    saveProfile(profile);
    closeModal('login-modal');
    announce(t('profileSaved'));
  });

  // Signup form
  document.getElementById('signup-form').addEventListener('submit', (e)=>{
    e.preventDefault();
    const username = dom['signup-username'].value.trim();
    const usertype = dom['signup-usertype'].value;
    if (!username || username.length < 2) {
      alert('Enter a username');
      return;
    }
    const pcontrast = dom['pref-contrast'].checked;
    const pmotion = dom['pref-reduce-motion'].checked;
    const pfont = dom['pref-font'].value;
    const profile = {
      username, userType: usertype, preferredLang: State.lang,
      uiPrefs: { contrast: pcontrast, fontSize: pfont, reduceMotion: pmotion },
      voiceEnabled: false
    };
    saveProfile(profile);
    closeModal('signup-modal');
    applyPrefs();
    announce(t('profileSaved'));
  });

  // Voice toggle in blind flow
  dom['voice-toggle'].addEventListener('click', () => {
    if (!State.profile) {
      alert(t('loginReminder'));
      return;
    }
    State.profile.voiceEnabled = !State.profile.voiceEnabled;
    saveProfile(State.profile);
    dom['voice-toggle'].textContent = State.profile.voiceEnabled ? t('disableVoice') : t('enableVoice');
    announce(State.profile.voiceEnabled ? t('enableVoice') : t('disableVoice'));
  });

  // Blind STT / TTS controls
  dom['stt-start'].addEventListener('click', startRecognitionForSTT);
  dom['stt-stop'].addEventListener('click', stopRecognition);
  dom['stt-clear'].addEventListener('click', ()=> { dom['stt-input'].value=''; });

  dom['tts-speak'].addEventListener('click', () => {
    speakText(dom['tts-input'].value || dom['stt-input'].value || t('speakNow'));
    addHistory({type:'tts', text: dom['tts-input'].value || dom['stt-input'].value || ''});
  });
  dom['tts-stop'].addEventListener('click', stopSpeaking);
  dom['tts-clear'].addEventListener('click', ()=> { dom['tts-input'].value=''; });

  // Deaf speech-to-sign
  dom['stsign-start'].addEventListener('click', startRecognitionForSign);
  dom['stsign-stop'].addEventListener('click', stopRecognition);

  // Sign-to-speech actions
  dom['sign-palette'].addEventListener('click', (e) => {
    const btn = e.target.closest('.sign');
    if (!btn) return;
    const word = btn.dataset.word;
    appendSignToPhrase(word);
  });
  dom['s2s-speak'].addEventListener('click', ()=> {
    const phrase = dom['assembled-phrase'].dataset.phrase || '';
    if (!phrase) return alert('No signs selected');
    speakText(phrase);
    addHistory({type:'s2s', text: phrase});
    announce(t('phraseSpoken'));
  });
  dom['s2s-clear'].addEventListener('click', ()=> {
    dom['assembled-phrase'].textContent = '';
    dom['assembled-phrase'].dataset.phrase = '';
  });

  // Keyboard nav hints
  document.addEventListener('keydown', (e) => {
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      alert('Keyboard hints:\nTab to move focus, Enter/Space to activate buttons\nUse arrow keys in sign palette.');
    }
  });

  // Ripple effect for buttons
  document.addEventListener('click', createRipple, true);

  // Focus voice feedback if blind selected and voice enabled
  document.addEventListener('focusin', (e) => {
    if (State.profile && State.profile.userType === 'blind' && State.profile.voiceEnabled) {
      const label = accessibleLabel(e.target);
      if (label) speakText(label, {interrupt:true});
    }
  });

  // Save language selector changes to localStorage
  window.addEventListener('beforeunload', ()=> {
    try { localStorage.setItem('af_lang', State.lang); } catch(e){}
  });
}

/* ============
   Modal helpers
   ============ */
function openModal(id){
  const dlg = document.getElementById(id);
  if (!dlg) return;
  if (typeof dlg.showModal === 'function') {
    dlg.showModal();
  } else {
    // fallback: make visible
    dlg.style.display = 'block';
  }
  dlg.querySelector('input, select, button')?.focus();
}
function closeModal(id){
  const dlg = document.getElementById(id);
  if (!dlg) return;
  if (typeof dlg.close === 'function') dlg.close();
  else dlg.style.display = 'none';
}

/* ============
   Language System
   ============ */
function setLang(code){
  State.lang = code === 'am' ? 'am' : 'en';
  document.documentElement.lang = State.lang === 'am' ? 'am' : 'en';
  localStorage.setItem('af_lang', State.lang);
  translateAll();
  announce(t('prefsSaved'));
}

/* ============
   Profiles & Preferences Persistence
   ============ */
function saveProfile(profile){
  State.profile = profile;
  try { localStorage.setItem('af_profile', JSON.stringify(profile)); } catch(e){}
  // Merge prefs too
  if (profile.uiPrefs) {
    State.prefs = Object.assign(State.prefs, profile.uiPrefs);
    savePrefs();
    applyPrefs();
  }
}
function savePrefs(){
  try { localStorage.setItem('af_prefs', JSON.stringify(State.prefs)); } catch(e){}
}
function resetPrefs(){
  State.prefs = { contrast:false, fontSize:'medium', reduceMotion:false, demo:false };
  savePrefs();
  applyPrefs();
  dom['contrast-toggle'].checked = false;
  dom['font-size'].value = 'medium';
  dom['reduced-motion'].checked = false;
  dom['demo-mode'].checked = false;
  announce(t('prefsSaved'));
}

/* ============
   Continue as Guest
   ============ */
function continueAsGuest(){
  State.profile = {
    username: 'Guest',
    userType: 'none',
    preferredLang: State.lang,
    uiPrefs: State.prefs,
    voiceEnabled: false
  };
  localStorage.setItem('af_profile', JSON.stringify(State.profile));
  announce(`${t('continueGuest')} ${State.profile.username}`);
  showPage('access-choice');
}

/* ============
   Speech (TTS & STT) Initialization & helpers
   ============ */

function initSpeech(){
  // TTS availability
  State.speechSupported = 'speechSynthesis' in window;
  // Recognition (STT) availability - browser dependent
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  if (SpeechRecognition) {
    try {
      State.recognition = new SpeechRecognition();
      State.recognition.continuous = false;
      State.recognition.interimResults = false;
      State.recognition.lang = State.lang === 'am' ? 'am-ET' : 'en-US';
      State.recognition.onresult = onSpeechResult;
      State.recognition.onend = ()=> {
        State.recognitionActive = false;
        announce(t('recognitionStop'));
      };
      State.recognition.onerror = (ev)=> {
        console.warn('Recognition error', ev);
      };
    } catch(e){
      State.recognition = null;
    }
  }
  // Update UI messaging if unsupported
  if (!State.speechSupported && !State.recognition) {
    // Show gentle notice
    announce(t('speechNotSupported'));
  }
}

/* STT for general use: updates stt-input and stsign-output depending on context */
function startRecognitionForSTT(){
  if (!State.recognition) return announce(t('speechNotSupported'));
  if (State.recognitionActive) return;
  State.recognition.lang = State.lang === 'am' ? 'am-ET' : 'en-US';
  State.recognition.start();
  State.recognitionActive = true;
  announce(t('recognitionStart'));
}
function startRecognitionForSign(){
  if (!State.recognition) return announce(t('speechNotSupported'));
  if (State.recognitionActive) return;
  State.recognition.lang = State.lang === 'am' ? 'am-ET' : 'en-US';
  // Different onresult: we'll set handler to populate sign-output
  State.recognition.onresult = (ev) => {
    const text = ev.results[0][0].transcript;
    simulateSpeechToSign(text);
  };
  State.recognition.start();
  State.recognitionActive = true;
  announce(t('recognitionStart'));
}

function stopRecognition(){
  if (State.recognition && State.recognitionActive) {
    try { State.recognition.stop(); } catch(e){}
    State.recognitionActive = false;
  }
}

/* Speech result handler for STT */
function onSpeechResult(ev){
  const text = ev.results[0][0].transcript;
  // If currently in blind flow and stt-input exists
  if (document.activeElement && document.activeElement.closest && document.getElementById('stt-input')) {
    dom['stt-input'].value = text;
  }
  addHistory({type:'stt', text});
  // If recognition invoked by startRecognitionForSign, onresult is overridden there
}

/* TTS convenience */
function speakText(text, opts = {}) {
  if (!('speechSynthesis' in window)) {
    announce(t('speechNotSupported'));
    return;
  }
  if (!text) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = State.lang === 'am' ? 'am-ET' : 'en-US';
  if (opts.interrupt) window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

/* Stop speaking */
function stopSpeaking(){
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

/* Accessible label extraction for focus feedback */
function accessibleLabel(el){
  if (!el) return '';
  if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
  if (el.getAttribute('aria-labelledby')) {
    const id = el.getAttribute('aria-labelledby');
    const node = document.getElementById(id);
    if (node) return node.textContent;
  }
  if (el.textContent && el.textContent.trim().length) return el.textContent.trim();
  if (el.value) return el.value;
  return '';
}

/* ============
   Deaf Flow Simulation (Sign UI)
   ============ */
function simulateSpeechToSign(text){
  // Very simple simulation: map words to emoji / cards
  const out = dom['stsign-output'];
  out.innerHTML = '';
  const words = text.split(/\s+/).slice(0,12);
  words.forEach(w => {
    const card = document.createElement('div');
    card.className = 'sign-card';
    card.style.display = 'inline-block';
    card.style.margin = '0.25rem';
    card.style.padding = '0.5rem 0.6rem';
    card.style.borderRadius = '8px';
    card.style.background = 'rgba(255,255,255,0.6)';
    card.style.border = '1px solid rgba(0,0,0,0.04)';
    // map basic words to emoji
    const map = {
      hello: '👋', hi:'👋', yes:'👍', no:'👎', thank:'🙏', help:'🆘', good:'🌟'
    };
    const emoji = map[w.toLowerCase()] || '🤟';
    card.innerHTML = `<div style="font-size:1.4rem">${emoji}</div><div style="font-size:0.85rem; color:var(--muted)">${w}</div>`;
    out.appendChild(card);
  });
  addHistory({type:'stsign', text});
}

/* Assemble selected signs to phrase */
function appendSignToPhrase(word){
  const el = dom['assembled-phrase'];
  const cur = el.dataset.phrase || '';
  const next = cur ? (cur + ' ' + word) : word;
  el.dataset.phrase = next;
  el.textContent = next;
}

/* ============
   Reminders System
   ============ */
function initReminder(){
  // Clear previous interval
  if (State.reminderIntervalId) clearInterval(State.reminderIntervalId);
  // Create interval to show reminders
  State.reminderIntervalId = setInterval(()=> {
    showLoginReminder();
  }, State.reminderMs);
}

function showLoginReminder(){
  const profile = State.profile || JSON.parse(localStorage.getItem('af_profile') || 'null');
  // If user is logged in (not guest), skip reminders
  if (profile && profile.username && profile.username !== 'Guest') return;
  // Localized reminder text
  const text = t('loginReminder');
  // Visual: small banner
  showTransientAlert(text);
  // For blind users: speak
  if (profile && profile.userType === 'blind' && profile.voiceEnabled) speakText(text);
  // For deaf users: show a sign-like animated notice
  if (profile && profile.userType === 'deaf') showSignReminder();
}

/* Small transient visual alert */
function showTransientAlert(text){
  const div = document.createElement('div');
  div.className = 'transient-alert';
  div.textContent = text;
  div.style.position='fixed';
  div.style.bottom='1rem';
  div.style.right='1rem';
  div.style.background='linear-gradient(90deg,#ffdede,#fff4e6)';
  div.style.padding='0.7rem 1rem';
  div.style.borderRadius='10px';
  div.style.boxShadow='0 8px 30px rgba(0,0,0,0.08)';
  div.style.zIndex=9999;
  document.body.appendChild(div);
  setTimeout(()=> div.style.opacity='0', 5200);
  setTimeout(()=> div.remove(), 6000);
}

/* Visual sign reminder for deaf users */
function showSignReminder(){
  const div = document.createElement('div');
  div.className = 'sign-reminder';
  div.style.position='fixed';
  div.style.bottom='1rem';
  div.style.left='1rem';
  div.style.padding='0.6rem 0.8rem';
  div.style.borderRadius='10px';
  div.style.background='rgba(255,255,255,0.9)';
  div.style.zIndex=9999;
  div.style.boxShadow='0 8px 30px rgba(0,0,0,0.06)';
  div.innerHTML = `<div style="font-size:1.2rem">🤟</div><div style="font-size:0.9rem">${t('loginReminder')}</div>`;
  document.body.appendChild(div);
  setTimeout(()=> div.remove(), 6000);
}

/* ============
   Interaction History
   ============ */
function addHistory(item){
  // item: {type, text, timestamp}
  const h = JSON.parse(localStorage.getItem(State.sttHistoryKey) || '[]');
  h.unshift(Object.assign({timestamp: Date.now()}, item));
  localStorage.setItem(State.sttHistoryKey, JSON.stringify(h.slice(0,100)));
  renderHistory();
}
function loadHistory(){
  renderHistory();
}
function renderHistory(){
  const h = JSON.parse(localStorage.getItem(State.sttHistoryKey) || '[]');
  const blindList = dom['history-list-blind'];
  const deafList = dom['history-list-deaf'];
  if (blindList) {
    blindList.innerHTML = '';
    h.filter(it => it.type === 'stt' || it.type === 'tts' || it.type === 'stsign').slice(0,20).forEach(it => {
      const li = document.createElement('li');
      li.textContent = `${new Date(it.timestamp).toLocaleTimeString()} — ${it.type}: ${it.text}`;
      blindList.appendChild(li);
    });
  }
  if (deafList) {
    deafList.innerHTML = '';
    h.filter(it => it.type === 'stsign' || it.type === 's2s').slice(0,20).forEach(it => {
      const li = document.createElement('li');
      li.textContent = `${new Date(it.timestamp).toLocaleTimeString()} — ${it.type}: ${it.text}`;
      deafList.appendChild(li);
    });
  }
}

/* ============
   Demo Mode
   ============ */
let demoTimer = null;
function maybeStartDemo(){
  if (State.prefs.demo) startDemo();
  else stopDemo();
}
function startDemo(){
  // Simple automated showcase: navigate pages & perform actions
  if (demoTimer) clearInterval(demoTimer);
  let step = 0;
  announce(t('demoStart'));
  demoTimer = setInterval(()=> {
    step++;
    switch(step){
      case 1: showPage('access-choice'); break;
      case 2: document.getElementById('btn-blind').focus(); break;
      case 3: showPage('blind-flow'); break;
      case 4: dom['tts-input'].value = State.lang==='am' ? 'ሰላም እንዴት ነህ' : 'Hello, how are you?'; dom['tts-speak'].click(); break;
      case 5: showPage('deaf-flow'); break;
      case 6: simulateSpeechToSign('Hello thank you help'); break;
      case 7: showPage('home'); break;
      case 8: announce(t('demoEnd')); stopDemo(); break;
      default: stopDemo();
    }
  }, 1800);
}
function stopDemo(){
  if (demoTimer) clearInterval(demoTimer);
  demoTimer = null;
  State.prefs.demo = false;
  dom['demo-mode'].checked = false;
  savePrefs();
}

/* ============
   Misc Helpers
   ============ */
function announce(msg){
  if (!msg) return;
  // Visual aria-live
  dom['aria-live'].textContent = msg;
  // TTS for blind users if enabled
  if (State.profile && State.profile.userType === 'blind' && State.profile.voiceEnabled) speakText(msg);
}

/* Simple ripple effect */
function createRipple(e){
  const btn = e.target.closest('.btn');
  if (!btn) return;
  // create circle
  const circle = document.createElement('span');
  circle.className = 'ripple-circle';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 0.9;
  circle.style.width = circle.style.height = size + 'px';
  circle.style.left = (e.clientX - rect.left - size/2) + 'px';
  circle.style.top = (e.clientY - rect.top - size/2) + 'px';
  btn.appendChild(circle);
  setTimeout(()=> circle.remove(), 700);
}

/* Accessible label (used for speaking focus) already implemented above */

/* Year */
function populateYear(){
  dom['year'].textContent = new Date().getFullYear();
}

/* Keyboard accessibility: allow Enter/Space on .access-btn */
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && document.activeElement && document.activeElement.classList.contains('access-btn')) {
    document.activeElement.click();
  }
});

/* Access option clicks */
document.getElementById('btn-blind').addEventListener('click', (e)=>{
  // Save preference
  if (!State.profile) continueAsGuest();
  State.profile.userType = 'blind';
  saveProfile(State.profile);
  showPage('blind-flow');
});
document.getElementById('btn-deaf').addEventListener('click', (e)=>{
  if (!State.profile) continueAsGuest();
  State.profile.userType = 'deaf';
  saveProfile(State.profile);
  showPage('deaf-flow');
});

/* Graceful handlers for unsupported features */
window.addEventListener('error', (e) => {
  console.warn('Runtime error', e.message);
});
