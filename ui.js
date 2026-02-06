// Language Switcher
const langSelect = document.getElementById("language-select");
function updateLanguage(lang) {
  document.querySelectorAll("[data-lang-en]").forEach(el => {
    el.innerText = lang === "am" ? el.getAttribute("data-lang-am") : el.getAttribute("data-lang-en");
  });
  localStorage.setItem("language", lang);
}
updateLanguage(localStorage.getItem("language") || "en");
langSelect.addEventListener("change", e => updateLanguage(e.target.value));

// Hero Button → Login
document.querySelector(".hero-btn").addEventListener("click", () => {
  document.getElementById("home").style.display = "none";
  document.getElementById("login-section").style.display = "block";
});

// Login → Preference
document.getElementById("login-form").addEventListener("submit", e => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  document.getElementById("login-status").innerText = `✅ Logged in as ${username}`;
  document.getElementById("login-section").style.display = "none";
  document.getElementById("preference").style.display = "block";
  document.getElementById("signup-link").hidden = false;
});

// Accessibility Choice
document.getElementById("blind-choice").addEventListener("click", () => {
  document.getElementById("preference").style.display = "none";
  document.getElementById("main").style.display = "block";
  document.getElementById("blind-features").style.display = "block";
});
document.getElementById("deaf-choice").addEventListener("click", () => {
  document.getElementById("preference").style.display = "none";
  document.getElementById("main").style.display = "block";
  document.getElementById("deaf-features").style.display = "block";
});
document.getElementById("back-btn").addEventListener("click", () => {
  document.getElementById("main").style.display = "none";
  document.getElementById("blind-features").style.display = "none";
  document.getElementById("deaf-features").style.display = "none";
  document.getElementById("preference").style.display = "block";
});
