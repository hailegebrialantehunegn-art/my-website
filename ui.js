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

// ===== Hero Section "Get Started" Button =====
const heroBtn = document.querySelector(".hero-btn");
const loginSection = document.getElementById("login-section");
const homeSection = document.getElementById("home");

heroBtn.addEventListener("click", () => {
  homeSection.style.display = "none";
  loginSection.style.display = "block";
  loginSection.classList.add("animated-card");
});

// ===== Login System =====
const loginForm = document.getElementById("login-form");
const preferenceSection = document.getElementById("preference");

loginForm.addEventListener("submit", e => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  document.getElementById("login-status").innerText = `✅ Logged in as ${username}`;

  // Hide login, show preference
  loginSection.style.display = "none";
  preferenceSection.style.display = "block";
  preferenceSection.classList.add("animated-card");

  // Reveal optional signup link later
  document.getElementById("signup-link").hidden = false;
});

// ===== Accessibility Choice =====
const blindBtn = document.getElementById("blind-choice");
const deafBtn = document.getElementById("deaf-choice");
const backBtn = document.getElementById("back-btn");
const mainContent = document.getElementById("main");
const blindFeatures = document.getElementById("blind-features");
const deafFeatures = document.getElementById("deaf-features");

blindBtn.addEventListener("click", () => {
  preferenceSection.style.display = "none";
  mainContent.style.display = "block";
  blindFeatures.style.display = "block";
  deafFeatures.style.display = "none";
  blindFeatures.classList.add("animated-card");
});

deafBtn.addEventListener("click", () => {
  preferenceSection.style.display = "none";
  mainContent.style.display = "block";
  deafFeatures.style.display = "block";
  blindFeatures.style.display = "none";
  deafFeatures.classList.add("animated-card");
});

backBtn.addEventListener("click", () => {
  mainContent.style.display = "none";
  blindFeatures.style.display = "none";
  deafFeatures.style.display = "none";
  preferenceSection.style.display = "block";
});

// ===== Sign Language Placeholder Trigger =====
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
