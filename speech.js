// ===== Utility: Get Language Code =====
function getLangCode() {
  const lang = localStorage.getItem("language") || "en";
  return lang === "am" ? "am-ET" : "en-US";
}

// ===== Text-to-Speech (TTS) =====
let utterance;

document.getElementById("tts-play").addEventListener("click", () => {
  const text = document.getElementById("tts-input").value;
  if (!text.trim()) return;

  utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = getLangCode();

  // Controls from sliders
  utterance.rate = document.getElementById("tts-rate").value;
  utterance.pitch = document.getElementById("tts-pitch").value;
  utterance.volume = document.getElementById("tts-volume").value;

  speechSynthesis.speak(utterance);

  // Add design feedback
  document.getElementById("tts-play").classList.add("active-btn");
});

document.getElementById("tts-pause").addEventListener("click", () => {
  if (speechSynthesis.speaking) speechSynthesis.pause();
});

document.getElementById("tts-stop").addEventListener("click", () => {
  if (speechSynthesis.speaking) speechSynthesis.cancel();
  document.getElementById("tts-play").classList.remove("active-btn");
});

// ===== Speech-to-Text (STT) =====
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  // Blind Mode Recognition
  const recognitionBlind = new SpeechRecognition();
  recognitionBlind.continuous = true;
  recognitionBlind.interimResults = true;

  // Deaf Mode Recognition
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

    // Design feedback
    document.getElementById("stt-output").classList.add("highlight-output");
  };

  document.getElementById("stt-start").addEventListener("click", () => {
    setRecognitionLang(recognitionBlind);
    recognitionBlind.start();
    document.getElementById("stt-start").classList.add("active-btn");
  });

  document.getElementById("stt-stop").addEventListener("click", () => {
    recognitionBlind.stop();
    document.getElementById("stt-start").classList.remove("active-btn");
  });

  // Deaf Mode STT
  recognitionDeaf.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join("");
    document.getElementById("stt-output-deaf").innerText = transcript;
    localStorage.setItem("transcriptDeaf", transcript);

    document.getElementById("stt-output-deaf").classList.add("highlight-output");
  };

  document.getElementById("stt-start-deaf").addEventListener("click", () => {
    setRecognitionLang(recognitionDeaf);
    recognitionDeaf.start();
    document.getElementById("stt-start-deaf").classList.add("active-btn");
  });

  document.getElementById("stt-stop-deaf").addEventListener("click", () => {
    recognitionDeaf.stop();
    document.getElementById("stt-start-deaf").classList.remove("active-btn");
  });

} else {
  document.getElementById("stt-output").innerText = "❌ Speech recognition not supported in this browser.";
  document.getElementById("stt-output-deaf").innerText = "❌ Speech recognition not supported in this browser.";
}

// ===== Sign Language Placeholder =====
function showSignOutput(text) {
  const lang = localStorage.getItem("language") || "en";
  const output = document.getElementById("sign-output");

  if (lang === "am") {
    output.innerText = `👉 በአማርኛ ምልክት ተተርጎሞ: ${text}`;
  } else {
    output.innerText = `👉 Translated to Sign Language: ${text}`;
  }

  // Add design feedback
  output.classList.add("highlight-output");
}

// Example trigger: show sign translation when Blind STT starts
const sttStartBtn = document.getElementById("stt-start");
if (sttStartBtn) {
  sttStartBtn.addEventListener("click", () => {
    showSignOutput("Hello / ሰላም");
  });
}


