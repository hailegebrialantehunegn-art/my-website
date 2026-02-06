/**
 * script.js
 * AccessFirst — Accessibility-first interactive demo
 * Vanilla JS only. No frameworks, no backend.
 *
 * NOTE: This file continues and augments the previously provided implementation.
 * Only missing features were added:
 * - Global header back button + navigation history stack
 * - Comprehensive i18n keys for modals, labels, placeholders, settings, sign palette
 * - Language application to Login/Signup, placeholders, alerts, reminders, STT/TTS, Sign UI
 * - Announcements for mode changes (contrast/font/reduced-motion/demo)
 * - Graceful keyboard "Escape" -> back behavior
 * - Minor styling references (transient alerts/sign reminders) handled
 *
 * Existing functionality was preserved and extended.
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
  reminderMs: 180000, // 3 minutes
  historyStack: [] // navigation history for global back
};

/* ============
   I18n: expanded keys including modal labels and messages
   ============ */
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
    speakNow: "Please speak now",
    phraseSpoken: "Phrase spoken",
    back: "Back",
    loginTitle: "Login",
    loginDesc: "Enter a username to create a local profile (no backend).",
    signupTitle: "Sign Up",
    signupDesc: "Create a local profile stored in your browser.",
    usernameLabel: "Username",
    usertypeLabel: "User type",
    userTypeNone: "None / Not specified",
    invalidUsername: "Please enter a valid username (2+ characters).",
    cancel: "Cancel",
    sttPlaceholder: "Speak or type; recognized text will appear here",
    ttsPlaceholder: "Type text to be spoken",
    sttTitle: "Speech-to-Text",
    ttsTitle: "Text-to-Speech",
    stsignTitle: "Speech-to-Sign (Simulated)",
    s2sTitle: "Sign-to-Speech (Simulated)",
    s2sPrompt: "Select signs to form a phrase",
    settingsTitle: "Accessibility Settings",
    highContrast: "High Contrast",
    fontSize: "Font Size",
    reduceMotion: "Reduce Motion",
    demoMode: "Demo Mode",
    resetPrefs: "Reset Preferences",
    contrastOn: "High contrast enabled",
    contrastOff: "High contrast disabled",
    reducedMotionOn: "Reduced motion enabled",
    reducedMotionOff: "Reduced motion disabled",
    fontSizeChanged: "Font size updated",
    demoModeOn: "Demo mode enabled",
    demoModeOff: "Demo mode disabled",
    prefsReset: "Preferences reset",
    signPalette: ["Hello","Yes","No","Thank you","Help","Good"],
    signPaletteEmoji: {"Hello":"👋","Yes":"👍","No":"👎","Thank you":"🙏","Help":"🆘","Good":"🌟"},
    signPaletteAm: ["ሰላም","አዎ","አይ","አመሰግናለሁ","እገዛ","ጎድ"],
    signPaletteEmojiAm: {"ሰላም":"👋","አዎ":"👍","አይ":"👎","አመሰግናለሁ":"🙏","እገዛ":"🆘","ጎድ":"🌟"}
  },
  am: {
    welcome: "AccessFirst በደህና መጡ",
    tagline: "የቅ���ሚያ መግለጫ — እንግሊዝኛ & አማርኛ ይደግፋሉ",
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
    back: "ተመለስ",
    loginTitle: "ግባ",
    loginDesc: "የአካል ፕሮፋይል ለማቅረብ ስም ያስገቡ (አንደ ዳታ ብቻ).",
    signupTitle: "ይመዝገቡ",
    signupDesc: "ፕሮፋይል በአካሉ በአካል ይጠብቃሉ።",
    usernameLabel: "የተጠቃሚ ስም",
    usertypeLabel: "የተጠቃሚ አይነት",
    userTypeNone: "ምንም / ያልተገለጸ",
    invalidUsername: "እባክዎን መልካም የሆነ የተጠቃሚ ስም ያስገቡ (2+ ቁምፊ).",
    cancel: "ሰርዝ",
    sttPlaceholder: "ይናገሩ ወይም ይጻፉ; የተወሰደ ጽሑፍ እዚህ ይታያል",
    ttsPlaceholder: "የሚናገር ጽሑፍ ያስገቡ",
    sttTitle: "ንግግር ወደ ጽሑፍ",
    ttsTitle: "ጽሑፍ ወደ ድምጽ",
    stsignTitle: "ድምጽ ወደ ምልክት (ምሳሌ)",
    s2sTitle: "ምልክት ወደ ድምጽ (ምሳሌ)",
    s2sPrompt: "ንግግር ለማመንጨት ምልክቶችን ይምረጡ",
    settingsTitle: "የማስተካከያ ቅንብሮች",
    highContrast: "ከፍተኛ ኮንትራስት",
    fontSize: "የቁምፊ መጠን",
    reduceMotion: "እንቅስቃሴን አሳስበው",
    demoMode: "የሙከራ ሁኔታ",
    resetPrefs: "የቅንብሮችን እርምጃ ዳግም",
    contrastOn: "ከፍተኛ ኮንትራስት ተነስቷል",
    contrastOff: "ከፍተኛ ኮንትራስት ተዘጋ",
    reducedMotionOn: "እንቅስቃሴ ተቀነሰ",
    reducedMotionOff: "እንቅስቃሴ እንደገና ተፈትቷል",
    fontSizeChanged: "የቁምፊ መጠን ተቀይሯል",
    demoModeOn: "የሙከራ ሁኔታ ተነስቷል",
    demoModeOff: "የሙከራ ሁኔታ ተዘጋ",
    prefsReset: "የቅንብሮች እንደገና ተቀናብሯል",
    signPalette: ["ሰላም","አዎ","አይ","አመሰግናለሁ","እገዛ","ጎድ"],
    signPaletteEmoji: {"ሰላም":"👋","አዎ":"👍","አይ":"👎","አመሰግናለሁ":"🙏","እገዛ":"🆘","ጎድ":"🌟"}
  }
};

/* DOM cache - will be filled after DOMContentLoaded */
const dom = {};
document.addEventListener('DOMContentLoaded', () => {
  // gather elements used below (keep existing ids)
  [
    'lang-select','lang-quick-select','settings-toggle','settings-panel','contrast-toggle','font-size','reduced-motion','demo-mode','reset-prefs',
    'home','access-choice','blind-flow','deaf-flow','nav-home','nav-access','nav-login','nav-signup','nav-guest','donate','cta-get-started','cta-guest','donate-cta',
    'btn-blind','btn-deaf','back-from-access','back-from-blind','back-from-deaf','login-modal','signup-modal','login-form','signup-form',
    'login-username','login-usertype','signup-username','signup-usertype','pref-contrast','pref-reduce-motion','pref-font',
    'voice-toggle','stt-start','stt-stop','stt-input','stt-clear','tts-speak','tts-stop','tts-input','tts-clear',
    'stsign-start','stsign-stop','stsign-output','sign-palette','assembled-phrase','s2s-speak','s2s-clear','history-list-blind','history-list-deaf',
    'aria-live','year','global-back','settings-title','stt-title','tts-title','stsign-title','s2s-title','s2s-prompt','label-login-username','label-login-usertype',
    'label-signup-username','label-signup-usertype','login-desc','signup-desc','login-title','signup-title','login-cancel','signup-cancel','reset-prefs'
  ].forEach(id => {
    dom[id] = document.getElementById(id);
  });

  // Initialize language, prefs, profile, speech, reminders
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
    if (dom['lang-select']) dom['lang-select'].value = State.lang;
    if (dom['lang-quick-select']) dom['lang-quick-select'].value = State.lang;
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
    if (dom['contrast-toggle']) dom['contrast-toggle'].checked = State.prefs.contrast;
    if (dom['font-size']) dom['font-size'].value = State.prefs.fontSize;
    if (dom['reduced-motion']) dom['reduced-motion'].checked = State.prefs.reduceMotion;
    if (dom['demo-mode']) dom['demo-mode'].checked = State.prefs.demo;
  } catch(e){}
}

function restoreProfile(){
  try {
    const raw = localStorage.getItem('af_profile');
    if (raw) {
      State.profile = JSON.parse(raw);
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
   I18n & Translation
   ============ */
function t(key){
  const map = I18N[State.lang] || I18N.en;
  return map[key] !== undefined ? map[key] : (I18N.en[key] || key);
}

function translateAll(){
  // Main headings & nav
  const homeHeading = document.getElementById('home-heading');
  if (homeHeading) homeHeading.textContent = t('welcome');
  const heroSub = document.getElementById('hero-sub');
  if (heroSub) heroSub.textContent = t('tagline');

  if (dom['cta-get-started']) dom['cta-get-started'].textContent = t('getStarted');
  if (dom['cta-guest']) dom['cta-guest'].textContent = t('continueGuest');
  if (dom['donate-cta']) dom['donate-cta'].textContent = t('donate');

  if (dom['nav-home']) dom['nav-home'].textContent = t('home');
  if (dom['nav-access']) dom['nav-access'].textContent = t('accessibility');
  if (dom['nav-login']) dom['nav-login'].textContent = t('login');
  if (dom['nav-signup']) dom['nav-signup'].textContent = t('signup');

  // Access choice labels
  if (dom['btn-blind']) dom['btn-blind'].querySelector('span:last-child').textContent = t('blind');
  if (dom['btn-deaf']) dom['btn-deaf'].querySelector('span:last-child').textContent = t('deaf');

  // Blind & Deaf headings
  const blindHeading = document.getElementById('blind-heading');
  if (blindHeading) blindHeading.textContent = t('blind') + " Mode";
  const deafHeading = document.getElementById('deaf-heading');
  if (deafHeading) deafHeading.textContent = t('deaf') + " Mode";

  // Tool titles & placeholders
  if (dom['stt-title']) dom['stt-title'].textContent = t('sttTitle');
  if (dom['tts-title']) dom['tts-title'].textContent = t('ttsTitle');
  if (dom['stsign-title']) dom['stsign-title'].textContent = t('stsignTitle');
  if (dom['s2s-title']) dom['s2s-title'].textContent = t('s2sTitle');
  if (dom['s2s-prompt']) dom['s2s-prompt'].textContent = t('s2sPrompt');

  if (dom['stt-input']) dom['stt-input'].placeholder = t('sttPlaceholder');
  if (dom['tts-input']) dom['tts-input'].placeholder = t('ttsPlaceholder');

  // Settings
  if (dom['settings-title']) dom['settings-title'].textContent = t('settingsTitle');
  const contrastLabel = document.getElementById('contrast-label');
  if (contrastLabel) contrastLabel.textContent = t('highContrast');
  const fontLabel = document.getElementById('font-size-label');
  if (fontLabel) fontLabel.textContent = t('fontSize');
  const reduceLabel = document.getElementById('reduced-motion-label');
  if (reduceLabel) reduceLabel.textContent = t('reduceMotion');
  const demoLabel = document.getElementById('demo-mode-label');
  if (demoLabel) demoLabel.textContent = t('demoMode');
  if (dom['reset-prefs']) dom['reset-prefs'].textContent = t('resetPrefs');

  // Login / Signup modals
  if (dom['login-title']) dom['login-title'].textContent = t('loginTitle');
  if (dom['login-desc']) dom['login-desc'].textContent = t('loginDesc');
  if (dom['label-login-username']) dom['label-login-username'].textContent = t('usernameLabel');
  if (dom['label-login-usertype']) dom['label-login-usertype'].textContent = t('usertypeLabel');
  if (dom['login-cancel']) dom['login-cancel'].textContent = t('cancel');

  if (dom['signup-title']) dom['signup-title'].textContent = t('signupTitle');
  if (dom['signup-desc']) dom['signup-desc'].textContent = t('signupDesc');
  if (dom['label-signup-username']) dom['label-signup-username'].textContent = t('usernameLabel');
  if (dom['label-signup-usertype']) dom['label-signup-usertype'].textContent = t('usertypeLabel');
  if (dom['signup-cancel']) dom['signup-cancel'].textContent = t('cancel');

  // Voice toggle label (depends on profile state)
  if (dom['voice-toggle']) dom['voice-toggle'].textContent = (State.profile && State.profile.voiceEnabled) ? t('disableVoice') : t('enableVoice');

  // Sign palette localization - regenerate buttons based on language
  const palette = dom['sign-palette'];
  if (palette) {
    palette.innerHTML = '';
    if (State.lang === 'am') {
      const words = t('signPalette');
      const emojiMap = (I18N[State.lang] && I18N[State.lang].signPaletteEmoji) || {};
      words.forEach(w => {
        const e = emojiMap[w] || '🤟';
        const btn = document.createElement('button');
        btn.className = 'sign';
        btn.type = 'button';
        btn.dataset.word = w;
        btn.setAttribute('role','listitem');
        btn.innerHTML = `${e} ${w}`;
        palette.appendChild(btn);
      });
    } else {
      const words = t('signPalette');
      const emojiMap = (I18N[State.lang] && I18N[State.lang].signPaletteEmoji) || {};
      words.forEach(w => {
        const e = emojiMap[w] || '🤟';
        const btn = document.createElement('button');
        btn.className = 'sign';
        btn.type = 'button';
        btn.dataset.word = w;
        btn.setAttribute('role','listitem');
        btn.innerHTML = `${e} ${w}`;
        palette.appendChild(btn);
      });
    }
  }
}

/* ============
   Navigation & Page Management (with history stack & global back)
   ============ */

function showPage(id, opts = { fromHistory: false }) {
  const pages = document.querySelectorAll('.page');
  // Push previous to history if not from history navigation and different
  if (!opts.fromHistory && State.currentPage && State.currentPage !== id) {
    State.historyStack.push(State.currentPage);
  }
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
  // Toggle global back visibility
  updateGlobalBackVisibility();
  // small aria hint
  announce(t('back'));
}

function updateGlobalBackVisibility(){
  const gb = dom['global-back'];
  if (!gb) return;
  if (State.historyStack.length > 0 && State.currentPage !== 'home') {
    gb.setAttribute('aria-hidden','false');
  } else {
    gb.setAttribute('aria-hidden','true');
  }
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

  if (dom['nav-guest']) dom['nav-guest'].addEventListener('click', ()=> continueAsGuest());
  if (dom['donate']) dom['donate'].addEventListener('click', ()=> announce(t('donate')));

  // CTA
  if (dom['cta-get-started']) dom['cta-get-started'].addEventListener('click', ()=> showPage('access-choice'));
  if (dom['cta-guest']) dom['cta-guest'].addEventListener('click', ()=> continueAsGuest());

  // Back buttons inside pages
  if (dom['back-from-access']) dom['back-from-access'].addEventListener('click', ()=> showPage('home'));
  if (dom['back-from-blind']) dom['back-from-blind'].addEventListener('click', ()=> showPage('access-choice'));
  if (dom['back-from-deaf']) dom['back-from-deaf'].addEventListener('click', ()=> showPage('access-choice'));

  // Global header back
  if (dom['global-back']) dom['global-back'].addEventListener('click', ()=> {
    if (State.historyStack.length === 0) {
      showPage('home');
      return;
    }
    const prev = State.historyStack.pop();
    showPage(prev, { fromHistory: true });
  });

  // Language selects
  if (dom['lang-select']) dom['lang-select'].addEventListener('change', (e) => setLang(e.target.value));
  if (dom['lang-quick-select']) dom['lang-quick-select'].addEventListener('change', (e) => setLang(e.target.value));

  // Settings panel toggle
  if (dom['settings-toggle']) dom['settings-toggle'].addEventListener('click', (e) => {
    const expanded = e.currentTarget.getAttribute('aria-expanded') === 'true';
    e.currentTarget.setAttribute('aria-expanded', String(!expanded));
    dom['settings-panel'].hidden = expanded;
    dom['settings-panel'].setAttribute('aria-hidden', String(expanded));
    if (!expanded) dom['settings-panel'].querySelector('input,select,button')?.focus();
  });

  // Prefs controls
  if (dom['contrast-toggle']) dom['contrast-toggle'].addEventListener('change', (e) => {
    State.prefs.contrast = e.target.checked;
    savePrefs();
    applyPrefs();
    announce(e.target.checked ? t('contrastOn') : t('contrastOff'));
  });
  if (dom['font-size']) dom['font-size'].addEventListener('change', (e) => {
    State.prefs.fontSize = e.target.value;
    savePrefs();
    applyPrefs();
    announce(t('fontSizeChanged'));
  });
  if (dom['reduced-motion']) dom['reduced-motion'].addEventListener('change', (e) => {
    State.prefs.reduceMotion = e.target.checked;
    savePrefs();
    applyPrefs();
    announce(e.target.checked ? t('reducedMotionOn') : t('reducedMotionOff'));
  });
  if (dom['demo-mode']) dom['demo-mode'].addEventListener('change', (e) => {
    State.prefs.demo = e.target.checked;
    savePrefs();
    announce(e.target.checked ? t('demoModeOn') : t('demoModeOff'));
    maybeStartDemo();
  });
  if (dom['reset-prefs']) dom['reset-prefs'].addEventListener('click', resetPrefs);

  // Login / signup modals
  const navLogin = document.getElementById('nav-login');
  const navSignup = document.getElementById('nav-signup');
  if (navLogin) navLogin.addEventListener('click', ()=> openModal('login-modal'));
  if (navSignup) navSignup.addEventListener('click', ()=> openModal('signup-modal'));

  const loginCancel = document.getElementById('login-cancel');
  const signupCancel = document.getElementById('signup-cancel');
  if (loginCancel) loginCancel.addEventListener('click', ()=> closeModal('login-modal'));
  if (signupCancel) signupCancel.addEventListener('click', ()=> closeModal('signup-modal'));

  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const username = (dom['login-username'] && dom['login-username'].value.trim()) || '';
    const usertype = (dom['login-usertype'] && dom['login-usertype'].value) || 'none';
    if (!username || username.length < 2) {
      alert(t('invalidUsername'));
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
  const signupForm = document.getElementById('signup-form');
  if (signupForm) signupForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const username = (dom['signup-username'] && dom['signup-username'].value.trim()) || '';
    const usertype = (dom['signup-usertype'] && dom['signup-usertype'].value) || 'none';
    if (!username || username.length < 2) {
      alert(t('invalidUsername'));
      return;
    }
    const pcontrast = (document.getElementById('pref-contrast') && document.getElementById('pref-contrast').checked) || false;
    const pmotion = (document.getElementById('pref-reduce-motion') && document.getElementById('pref-reduce-motion').checked) || false;
    const pfont = (document.getElementById('pref-font') && document.getElementById('pref-font').value) || 'medium';
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
  if (dom['voice-toggle']) dom['voice-toggle'].addEventListener('click', () => {
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
  if (dom['stt-start']) dom['stt-start'].addEventListener('click', startRecognitionForSTT);
  if (dom['stt-stop']) dom['stt-stop'].addEventListener('click', stopRecognition);
  if (dom['stt-clear']) dom['stt-clear'].addEventListener('click', ()=> { if (dom['stt-input']) dom['stt-input'].value=''; });

  if (dom['tts-speak']) dom['tts-speak'].addEventListener('click', () => {
    const text = (dom['tts-input'] && dom['tts-input'].value) || (dom['stt-input'] && dom['stt-input'].value) || t('speakNow');
    speakText(text);
    addHistory({type:'tts', text});
  });
  if (dom['tts-stop']) dom['tts-stop'].addEventListener('click', stopSpeaking);
  if (dom['tts-clear']) dom['tts-clear'].addEventListener('click', ()=> { if (dom['tts-input']) dom['tts-input'].value=''; });

  // Deaf speech-to-sign
  if (dom['stsign-start']) dom['stsign-start'].addEventListener('click', startRecognitionForSign);
  if (dom['stsign-stop']) dom['stsign-stop'].addEventListener('click', stopRecognition);

  // Sign-to-speech actions
  if (dom['sign-palette']) dom['sign-palette'].addEventListener('click', (e) => {
    const btn = e.target.closest('.sign');
    if (!btn) return;
    const word = btn.dataset.word;
    appendSignToPhrase(word);
  });
  if (dom['s2s-speak']) dom['s2s-speak'].addEventListener('click', ()=> {
    const phrase = dom['assembled-phrase'] && dom['assembled-phrase'].dataset.phrase || '';
    if (!phrase) return alert(t('invalidUsername')); // reuse invalid prompt as generic notice (localized)
    speakText(phrase);
    addHistory({type:'s2s', text: phrase});
    announce(t('phraseSpoken'));
  });
  if (dom['s2s-clear']) dom['s2s-clear'].addEventListener('click', ()=> {
    if (dom['assembled-phrase']) {
      dom['assembled-phrase'].textContent = '';
      dom['assembled-phrase'].dataset.phrase = '';
    }
  });

  // Keyboard nav hints (simple)
  document.addEventListener('keydown', (e) => {
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      alert('Keyboard hints:\nTab to move focus, Enter/Space to activate buttons\nUse arrow keys in sign palette.');
    }
    // Escape: global back if applicable
    if (e.key === 'Escape') {
      if (State.historyStack.length > 0) {
        const prev = State.historyStack.pop();
        showPage(prev, { fromHistory: true });
      } else {
        showPage('home');
      }
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

  // Save language selector changes to localStorage on unload
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
  // If user profile exists, persist preferredLang
  if (State.profile) {
    State.profile.preferredLang = State.lang;
    try { localStorage.setItem('af_profile', JSON.stringify(State.profile)); } catch(e){}
  }
  translateAll();
  // Update speech recognition & synthesis languages
  updateSpeechLangs();
  announce(t('prefsSaved'));
}

/* Update Web Speech API language settings after a language change */
function updateSpeechLangs(){
  if (State.recognition) {
    try {
      State.recognition.lang = State.lang === 'am' ? 'am-ET' : 'en-US';
    } catch(e){}
  }
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
  if (dom['contrast-toggle']) dom['contrast-toggle'].checked = false;
  if (dom['font-size']) dom['font-size'].value = 'medium';
  if (dom['reduced-motion']) dom['reduced-motion'].checked = false;
  if (dom['demo-mode']) dom['demo-mode'].checked = false;
  announce(t('prefsReset'));
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
  State.speechSupported = 'speechSynthesis' in window;
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
  if (!State.speechSupported && !State.recognition) {
    announce(t('speechNotSupported'));
  }
}

/* STT for blind flow */
function startRecognitionForSTT(){
  if (!State.recognition) return announce(t('speechNotSupported'));
  if (State.recognitionActive) return;
  // restore handler
  State.recognition.onresult = onSpeechResult;
  State.recognition.lang = State.lang === 'am' ? 'am-ET' : 'en-US';
  try {
    State.recognition.start();
    State.recognitionActive = true;
    announce(t('recognitionStart'));
  } catch(e){
    console.warn(e);
    announce(t('speechNotSupported'));
  }
}

/* STT for sign flow - override onresult to produce sign output */
function startRecognitionForSign(){
  if (!State.recognition) return announce(t('speechNotSupported'));
  if (State.recognitionActive) return;
  State.recognition.lang = State.lang === 'am' ? 'am-ET' : 'en-US';
  State.recognition.onresult = (ev) => {
    const text = ev.results[0][0].transcript;
    simulateSpeechToSign(text);
  };
  try {
    State.recognition.start();
    State.recognitionActive = true;
    announce(t('recognitionStart'));
  } catch(e){
    console.warn(e);
    announce(t('speechNotSupported'));
  }
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
  if (dom['stt-input']) dom['stt-input'].value = text;
  addHistory({type:'stt', text});
}

/* TTS convenience */
function speakText(text, opts = {}) {
  if (!('speechSynthesis' in window)) {
    announce(t('speechNotSupported'));
    return;
  }
  if (!text) return;
  try {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = State.lang === 'am' ? 'am-ET' : 'en-US';
    if (opts.interrupt) window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch(e){
    console.warn('TTS error', e);
  }
}

/* Stop speaking */
function stopSpeaking(){
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

/* Accessible label extraction for focus feedback */
function accessibleLabel(el){
  if (!el) return '';
  if (el.getAttribute && el.getAttribute('aria-label')) return el.getAttribute('aria-label');
  if (el.getAttribute && el.getAttribute('aria-labelledby')) {
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
  const out = dom['stsign-output'];
  if (!out) return;
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
    // map basic words to emoji - include Amharic mapping
    let emoji = '🤟';
    if (State.lang === 'am') {
      const mapAm = I18N.am.signPaletteEmoji || {};
      // attempt to match direct word or common romanization
      emoji = mapAm[w] || mapAm[w.toLowerCase()] || '🤟';
    } else {
      const mapEn = I18N.en.signPaletteEmoji || {};
      emoji = mapEn[w] || mapEn[w.toLowerCase()] || '🤟';
    }
    card.innerHTML = `<div style="font-size:1.4rem">${emoji}</div><div style="font-size:0.85rem; color:var(--muted)">${w}</div>`;
    out.appendChild(card);
  });
  addHistory({type:'stsign', text});
}

/* Assemble selected signs to phrase */
function appendSignToPhrase(word){
  const el = dom['assembled-phrase'];
  if (!el) return;
  const cur = el.dataset.phrase || '';
  const next = cur ? (cur + ' ' + word) : word;
  el.dataset.phrase = next;
  el.textContent = next;
}

/* ============
   Reminders System
   ============ */
function initReminder(){
  if (State.reminderIntervalId) clearInterval(State.reminderIntervalId);
  State.reminderIntervalId = setInterval(()=> {
    showLoginReminder();
  }, State.reminderMs);
}

function showLoginReminder(){
  const profile = State.profile || JSON.parse(localStorage.getItem('af_profile') || 'null');
  if (profile && profile.username && profile.username !== 'Guest') return;
  const text = t('loginReminder');
  showTransientAlert(text);
  if (profile && profile.userType === 'blind' && profile.voiceEnabled) speakText(text);
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
  if (demoTimer) clearInterval(demoTimer);
  let step = 0;
  announce(t('demoStart'));
  demoTimer = setInterval(()=> {
    step++;
    switch(step){
      case 1: showPage('access-choice'); break;
      case 2: document.getElementById('btn-blind').focus(); break;
      case 3: showPage('blind-flow'); break;
      case 4:
        if (dom['tts-input']) dom['tts-input'].value = State.lang==='am' ? 'ሰላም እንዴት ነህ' : 'Hello, how are you?';
        if (dom['tts-speak']) dom['tts-speak'].click();
        break;
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
  if (dom['demo-mode']) dom['demo-mode'].checked = false;
  savePrefs();
}

/* ============
   Misc Helpers
   ============ */
function announce(msg){
  if (!msg) return;
  if (dom['aria-live']) dom['aria-live'].textContent = msg;
  if (State.profile && State.profile.userType === 'blind' && State.profile.voiceEnabled) speakText(msg);
}

/* Ripple */
function createRipple(e){
  const btn = e.target.closest('.btn');
  if (!btn) return;
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

/* Year */
function populateYear(){
  if (dom['year']) dom['year'].textContent = new Date().getFullYear();
}

/* Ensure access option clicks preserve history and set profile type */
document.addEventListener('DOMContentLoaded', () => {
  const btnB = document.getElementById('btn-blind');
  const btnD = document.getElementById('btn-deaf');
  if (btnB) btnB.addEventListener('click', (e)=>{
    if (!State.profile) continueAsGuest();
    State.profile.userType = 'blind';
    saveProfile(State.profile);
    showPage('blind-flow');
  });
  if (btnD) btnD.addEventListener('click', (e)=>{
    if (!State.profile) continueAsGuest();
    State.profile.userType = 'deaf';
    saveProfile(State.profile);
    showPage('deaf-flow');
  });
});

/* Graceful handlers for unsupported features */
window.addEventListener('error', (e) => {
  console.warn('Runtime error', e.message);
});
