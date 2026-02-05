// TEXT TO SPEECH
document.getElementById("tts-btn").addEventListener("click", () => {
  const text = document.getElementById("tts-input").value;
  if (text.trim() !== "") {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
  }
});

// SPEECH TO TEXT
const sttBtn = document.getElementById("stt-btn");
const sttOutput = document.getElementById("stt-output");
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const recog = new SpeechRecognition();
  recog.lang = "en-US";
  recog.interimResults = false;

  sttBtn.addEventListener("click", () => {
    recog.start();
  });

  recog.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    sttOutput.innerText = transcript;
  };
} else {
  sttOutput.innerText = "Speech recognition not supported in this browser.";
}

// SIGN LANGUAGE TO TEXT (placeholder using webcam)
const webcam = document.getElementById("webcam");
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => webcam.srcObject = stream)
  .catch(err => console.error("Webcam error:", err));

// Placeholder: integrate MediaPipe Hands or TensorFlow.js here
document.getElementById("sign-output").innerText = "Gesture recognition coming soon...";

// TEXT TO SIGN LANGUAGE (simple placeholder)
document.getElementById("text-sign-btn").addEventListener("click", () => {
  const input = document.getElementById("text-sign-input").value;
  const display = document.getElementById("sign-display");
  if (input.trim() !== "") {
    display.innerHTML = input.split("")
      .map(char => `<span>[SIGN: ${char.toUpperCase()}]</span>`)
      .join(" ");
  }
});

