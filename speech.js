// ===== Text-to-Speech (TTS) =====
let utterance;

document.getElementById("tts-play").addEventListener("click", () => {
  const text = document.getElementById("tts-input").value;
  if (!text.trim()) return;

  utterance = new SpeechSynthesisUtterance(text);

  // Get chosen language from localStorage
  const lang = localStorage.getItem("language") || "en";
  utterance.lang = lang === "am" ? "am-ET" : "en-US";

  // Apply user controls
  utterance.rate = document.getElementById("tts-rate").value;
  utterance.pitch = document.getElementById("tts-pitch").value;
  utterance.volume = document.getElementById("tts-volume").value;

  speechSynthesis.speak(utterance);
});

document.getElementById("tts-pause").addEventListener("click", () => {
  if (speechSynthesis.speaking) speechSynthesis.pause();
});

document.getElementById("tts-stop").addEventListener("click", () => {
  if (speechSynthesis.speaking) speechSynthesis.cancel();
});

// ===== Speech-to-Text (STT) =====
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;

  // Set language dynamically
  function setRecognitionLang() {
    const lang = localStorage.getItem("language") || "en";
    recognition.lang = lang === "am" ? "am-ET" : "en-US";
  }

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join("");
    document.getElementById("stt-output").innerText = transcript;
    localStorage.setItem("transcript", transcript); // store locally
  };

  document.getElementById("stt-start").addEventListener("click", () => {
    setRecognitionLang();
    recognition.start();
  });

  document.getElementById("stt-stop").addEventListener("click", () => recognition.stop());
} else {
  document.getElementById("stt-output").innerText = "❌ Speech recognition not supported in this browser.";
}
