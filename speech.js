function getLangCode() {
  const lang = localStorage.getItem("language") || "en";
  return lang === "am" ? "am-ET" : "en-US";
}

// Text-to-Speech
let utterance;
document.getElementById("tts-play").addEventListener("click", () => {
  const text = document.getElementById("tts-input").value;
  if (!text.trim()) return;
  utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = getLangCode();
  utterance.rate = document.getElementById("tts-rate").value;
  utterance.pitch = document.getElementById("tts-pitch").value;
  utterance.volume = document.getElementById("tts-volume").value;
  speechSynthesis.speak(utterance);
  document.getElementById("tts-play").classList.add("active-btn");
});
document.getElementById("tts-pause").addEventListener("click", () => speechSynthesis.pause());
document.getElementById("tts-stop").addEventListener("click", () => {
  speechSynthesis.cancel();
  document.getElementById("tts-play").classList.remove("active-btn");
});

// Speech-to-Text
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const recognitionBlind = new SpeechRecognition();
  recognitionBlind.continuous = true; recognitionBlind.interimResults = true;
  recognitionBlind.onresult = e => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join("");
    document.getElementById("stt-output").innerText = transcript;
    document.getElementById("stt-output").classList.add("highlight-output");
  };
  document.getElementById("stt-start").addEventListener("click", () => { recognitionBlind.lang = getLangCode(); recognitionBlind.start(); });
  document.getElementById("stt-stop").addEventListener("click", () => recognitionBlind.stop());

  const recognitionDeaf = new SpeechRecognition();
  recognitionDeaf.continuous = true; recognitionDeaf.interimResults = true;
  recognitionDeaf.onresult = e => {
    const transcript = Array.from(e.results).map(r =>
