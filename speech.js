// ===== Text-to-Speech (TTS) =====
let utterance;

function getLangCode() {
  const lang = localStorage.getItem("language") || "en";
  return lang === "am" ? "am-ET" : "en-US";
}

// Blind Mode TTS
document.getElementById("tts-play").addEventListener("click", () => {
  const text = document.getElementById("tts-input").value;
  if (!text.trim()) return;

  utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = getLangCode();

  // Controls
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
  const recognitionBlind = new SpeechRecognition();
  recognitionBlind.continuous = true;
  recognitionBlind.interimResults = true;

  const recognitionDeaf = new SpeechRecognition();
  recognitionDeaf.continuous = true;
  recognitionDeaf.interimResults = true;

  function setRecognitionLang(recognition) {
    recognition.lang = getLangCode();
  }

  // Blind Mode STT
  recognitionBlind.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join("");
    document.getElementById("stt-output").innerText = transcript;
    localStorage.setItem("transcriptBlind", transcript);
  };

  document.getElementById("stt-start").addEventListener("click", () => {
    setRecognitionLang(recognitionBlind);
    recognitionBlind.start();
  });

  document.getElementById("stt-stop").addEventListener("click", () => recognitionBlind.stop());

  // Deaf Mode STT
  recognitionDeaf.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join("");
    document.getElementById("stt-output-deaf").innerText = transcript;
    localStorage.setItem("transcriptDeaf", transcript);
  };

  document.getElementById("stt-start-deaf").addEventListener("click", () => {
    setRecognitionLang(recognitionDeaf);
    recognitionDeaf.start();
  });

  document.getElementById("stt-stop-deaf").addEventListener("click", () => recognitionDeaf.stop());

} else {
  document.getElementById("stt-output").innerText = "❌ Speech recognition not supported in this browser.";
  document.getElementById("stt-output-deaf").innerText = "❌ Speech recognition not supported in this browser.";
}

// ===== Sign Language Placeholder =====
// Later you can connect this to a dataset or animation library
function showSignOutput(text) {
  const lang = localStorage.getItem("language") || "en";
  const output = document.getElementById("sign-output");

  if (lang === "am") {
    output.innerText = `👉 በአማርኛ ምልክት ተተርጎሞ: ${text}`;
  } else {
    output.innerText = `👉 Translated to Sign Language: ${text}`;
  }
}

// Example trigger (you can connect this to STT or a button)
document.getElementById("stt-start").addEventListener("click", () => {
  showSignOutput("Hello / ሰላም");
});

