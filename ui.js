// Show signup link only after login attempt
loginForm.addEventListener("submit", e => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  document.getElementById("login-status").innerText = `✅ Logged in as ${username}`;
  loginSection.hidden = true;
  preferenceSection.hidden = false;

  // Reveal optional signup link later
  document.getElementById("signup-link").hidden = false;
});

