// ===== Language Switcher =====
const langSelect = document.getElementById("language-select");

function updateLanguage(lang) {
  document.querySelectorAll("[data-lang-en]").forEach(el => {
    el.innerText = lang === "am" ? el.getAttribute("data-lang-am") : el.getAttribute("data-lang-en");
  });
  localStorage.setItem("language", lang);
}

// Initialize language on page load
updateLanguage(localStorage.getItem("language") || "en");

langSelect.addEventListener("change", e => {
  updateLanguage(e.target.value);
});

// ===== Login System =====
const loginForm = document.getElementById("login-form");
const loginSection = document.getElementById("login-section");
const preferenceSection = document.getElementById("preference");

loginForm.addEventListener("submit", e => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  document.getElementById("login-status").innerText = `✅ Logged in as ${username}`;
  loginSection.hidden = true;
  preferenceSection.hidden = false;

  // NOTE: To actually notify you at your email, you need a backend service (Firebase, Supabase, etc.)
  // This is just the front-end flow.
});

// ===== Accessibility Choice =====
const blindBtn = document.getElementById("blind-choice");
const deafBtn = document.getElementById("deaf-choice");
const backBtn = document.getElementById("back-btn");
const mainContent = document.getElementById("main");
const blindFeatures = document.getElementById("blind-features");
const deafFeatures = document.getElementById("deaf-features");

blindBtn.addEventListener("click", () => {
  mainContent.hidden = false;
  blindFeatures.hidden = false;
  deafFeatures.hidden = true;
  preferenceSection.hidden = true;
});

deafBtn.addEventListener("click", () => {
  mainContent.hidden = false;
  deafFeatures.hidden = false;
  blindFeatures.hidden = true;
  preferenceSection.hidden = true;
});

backBtn.addEventListener("click", () => {
  mainContent.hidden = true;
  blindFeatures.hidden = true;
  deafFeatures.hidden = true;
  preferenceSection.hidden = false;
});

// ===== Sign Language Placeholder Trigger =====
// Example: show sign translation when Blind STT starts
function showSignOutput(text) {
  const lang = localStorage.getItem("language") || "en";
  const output = document.getElementById("sign-output");

  if (lang === "am") {
    output.innerText = `👉 በአማርኛ ምልክት ተተርጎሞ: ${text}`;
  } else {
    output.innerText = `👉 Translated to Sign Language: ${text}`;
  }
}

// Example trigger: when Blind STT starts, show placeholder sign translation
const sttStartBtn = document.getElementById("stt-start");
if (sttStartBtn) {
  sttStartBtn.addEventListener("click", () => {
    showSignOutput("Hello / ሰላም");
  });
}

