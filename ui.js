// Preference choice logic
const blindBtn = document.getElementById("blind-choice");
const deafBtn = document.getElementById("deaf-choice");
const backBtn = document.getElementById("back-btn");
const mainContent = document.getElementById("main");
const blindFeatures = document.getElementById("blind-features");
const deafFeatures = document.getElementById("deaf-features");
const preferenceSection = document.getElementById("preference");

// Show Blind features
blindBtn.addEventListener("click", () => {
  mainContent.hidden = false;
  blindFeatures.hidden = false;
  deaf
