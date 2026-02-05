// Language switcher
const langSelect = document.getElementById("language-select");
function updateLanguage(lang) {
  document.querySelectorAll("[data-lang-en]").forEach(el => {
    el.innerText = lang === "am" ? el.getAttribute("data-lang-am") : el.getAttribute("data-lang-en");
  });
  localStorage.setItem("language", lang);
}
langSelect.addEventListener("change", e => updateLanguage(e.target.value));
updateLanguage(localStorage.getItem("language") || "en");

// Login system
const loginForm = document.getElementById("login-form");
const loginSection = document.getElementById("login-section");
const preferenceSection = document.getElementById("preference");
loginForm.addEventListener("submit", e => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  document.getElementById("login-status").innerText = `✅ Logged in as ${username}`;
  loginSection.hidden = true;
  preferenceSection.hidden = false;
  // Here you could send login info to your server to notify you
});

// Accessibility choice
const blindBtn = document.getElementById("blind-choice");
const deafBtn = document.getElementById("deaf-choice");
const backBtn = document.get
