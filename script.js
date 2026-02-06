// =====================
// script.js
// =====================

// Language dictionary
const translations = {
  en: {
    heroTitle: "Welcome to Accessible Web",
    heroSubtitle: "Choose your path to accessibility",
    login: "Login",
    signup: "Sign Up",
    guest: "Continue as Guest",
    donate: "Donate",
    accessibilityTitle: "Choose Accessibility Option",
    blind: "Blind",
    deaf: "Deaf",
    blindTitle: "Blind Accessibility",
    stt: "Speech to Text",
    tts: "Text to Speech",
    deafTitle: "Deaf Accessibility",
    sign: "Sign to Speech",
    speechSign: "Speech to Sign",
    back: "Back",
    loginTitle: "Login",
    signupTitle: "Sign Up",
    reminder: "Please log in to continue",
    reminderClose: "Close"
  },
  am: {
    heroTitle: "እንኳን ወደ አክሰሲብል ድረ-ገጽ በደህና መጡ",
    heroSubtitle: "የአክሰሲብል መንገድዎን ይምረጡ",
    login: "ግባ",
    signup: "መዝግብ",
    guest: "እንግዳ እንደሆነ ቀጥል",
    donate: "ለገንዘብ ይህበሩ",
    accessibilityTitle: "የአክሰሲብል አማራጭ ይምረጡ",
    blind: "ዕውር",
    deaf: "ድንቁርና",
    blindTitle: "የዕውር አክሰሲብል",
    stt: "ንግግር ወደ ጽሑፍ",
    tts: "ጽሑፍ ወደ ንግግር",
    deafTitle: "የድንቁርና አክሰሲብል",
    sign: "ምልክት ወደ ንግግር",
    speechSign: "ንግግር ወደ ምልክት",
    back: "ተመለስ",
    loginTitle: "ግባ",
    signupTitle: "መዝግብ",
    reminder: "እባክዎን ለመቀጠል ይግቡ",
    reminderClose: "ዝጋ"
  }
};

// Apply language
function applyLanguage(lang) {
  const t = translations[lang];
  document.getElementById("hero-title").innerText = t.heroTitle;
  document.getElementById("hero-subtitle").innerText = t.heroSubtitle;
  document.getElementById("login-btn").innerText = t.login;
  document.getElementById("signup-btn").innerText = t.signup;
  document.getElementById("guest-btn").innerText = t.guest;
  document.getElementById("donate-btn").innerText = t.donate;
  document.getElementById("accessibility-title").innerText = t.accessibilityTitle;
  document.getElementById("blind-btn").innerText = t.blind;
  document.getElementById("deaf-btn").innerText = t.deaf;
  document.getElementById("blind-title").innerText = t.blindTitle;
  document.getElementById("stt-btn").innerText = t.stt;
  document.getElementById("tts-btn").innerText = t.tts;
  document.getElementById("deaf-title").innerText = t.deafTitle;
  document.getElementById("sign-btn").innerText = t.sign;
  document.getElementById("speech-sign-btn").innerText = t.speechSign;
  document.getElementById("back-btn1").innerText = t.back;
  document.getElementById("back-btn2").innerText = t.back;
  document.getElementById("back-btn3").innerText = t.back;
  document.getElementById("login-title").innerText = t.loginTitle;
  document.getElementById("signup-title").innerText = t.signupTitle;
  document.getElementById("login-submit").innerText = t.login;
  document.getElementById("signup-submit").innerText = t.signup;
  document.getElementById("reminder-text").innerText = t.reminder;
  document.getElementById("reminder-close").innerText = t.reminderClose;
}

// Set language
function setLanguage(lang) {
  localStorage.setItem("language", lang);
  applyLanguage(lang);
}

// Load language on startup
window.onload = () => {
  const lang = localStorage.getItem("language") || "en";
  applyLanguage(lang);
  // Reminder every 3 minutes
  setInterval(showReminder, 180000);
};

// Navigation
function navigate(sectionId) {
  document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active"));
  document.getElementById(sectionId).classList.add("active");
}

// Donate
function openDonate() {
  window.open("https://www.gofundme.com/", "_blank");
}

// Modals
function openModal(type) {
  document.getElementById(type + "-modal").style.display = "block";
}
function closeModal(type) {
  document.getElementById(type + "-modal").style.display = "none";
}

// Validation
function validateLogin(e) {
  e.preventDefault();
  alert("Login successful (frontend only).");
  closeModal("login");
}
function validateSignup(e) {
  e.preventDefault();
  alert("Signup successful (frontend only).");
  closeModal("signup");
}

// Reminder
function showReminder() {
  document.getElementById("reminder-popup").style.display = "block";
}
function closeReminder() {
  document.getElementById("reminder-popup").style.display = "none";
}

// Speech to Text
function startSpeechToText() {
  const lang = localStorage.getItem("language") === "am" ? "am-ET" : "en-US";
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = lang;
  recognition.onresult = (event) => {
    document.getElementById("speech-output").value = event.results[0][0].transcript;
  };
  recognition.start();
}

// Text to Speech
function startTextToSpeech() {
  const lang = localStorage.getItem("language") === "am" ? "am-ET" : "en-US";
  const text = document.getElementById("speech-output").value;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  speechSynthesis.speak(utterance);
}

// Deaf Flow
function signToSpeech() {
  const lang = localStorage.getItem("language") === "am" ? "am-ET" : "en-US";
  const utterance = new SpeechSynthesisUtterance("Hello from Sign Language");
  utterance.lang = lang;
  speechSynthesis.speak(utterance);
  document.getElementById("sign-output").innerText = "🖐 (Sign → Speech)";
}
function speechToSign() {
  document.getElementById("sign-output").innerText = "👋 (Speech → Sign)";
}
