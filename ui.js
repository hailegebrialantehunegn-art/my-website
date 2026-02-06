// ===== Language Switcher =====
const langSelect = document.getElementById("language-select");

function updateLanguage(lang) {
  document.querySelectorAll("[data-lang-en]").forEach(el => {
    el.innerText = lang === "am"
      ? el.getAttribute("data-lang-am")
      : el.getAttribute("data-lang-en");
  });
  localStorage.setItem("language", lang);
}

// Initialize language on page load
updateLanguage(localStorage.getItem("language") || "en");

langSelect.addEventListener("change", e => {
  updateLanguage(e.target.value);
});

// ===== Hero Button → Login =====
const heroBtn = document.querySelector(".hero-btn");
const homeSection = document.getElementById("home");
const loginSection = document.getElementById("login-section");

heroBtn.addEventListener("click", () => {
  homeSection.classList.add("fade-out");
  setTimeout(() => {
    homeSection.style.display = "none";
    loginSection.style.display = "block";
    loginSection.classList.add("slide-up");
  }, 500);
});

// ===== Login → Preference =====
const loginForm = document.getElementById("login-form");
const preferenceSection = document.getElementById("preference");

loginForm.addEventListener("submit", e => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  document.getElementById("login-status").innerText = `✅ Logged in as ${username}`;

  loginSection.classList.add("fade-out");
  setTimeout(() => {
    loginSection.style.display = "none";
    preferenceSection.style.display = "block";
    preferenceSection.classList.add("slide-up");
    document.getElementById("signup-link").hidden = false;
  }, 500);
});

// ===== Accessibility Choice → Features =====
const blindBtn = document.getElementById("blind-choice");
const deafBtn = document.getElementById("deaf-choice");
const backBtn = document.getElementById("back-btn");
const mainContent = document.getElementById("main");
const blindFeatures = document.getElementById("blind-features");
const deafFeatures = document.getElementById("deaf-features");

blindBtn.addEventListener("click", () => {
  preferenceSection.classList.add("fade-out");
  setTimeout(() => {
    preferenceSection.style.display = "none";
    mainContent.style.display = "block";
    blindFeatures.style.display = "block";
    blindFeatures.classList.add("slide-up");
  }, 500);
});

deafBtn.addEventListener("click", () => {
  preferenceSection.classList.add("fade-out");
  setTimeout(() => {
    preferenceSection.style.display = "none";
    mainContent.style.display = "block";
    deafFeatures.style.display = "block";
    deafFeatures.classList.add("slide-up");
  }, 500);
});

// ===== Back Button → Preference =====
backBtn.addEventListener("click", () => {
  mainContent.classList.add("fade-out");
  setTimeout(() => {
    mainContent.style.display = "none";
    blindFeatures.style.display = "none";
    deafFeatures.style.display = "none";
    preferenceSection.style.display = "block";
    preferenceSection.classList.add("slide-up");
  }, 500);
});
