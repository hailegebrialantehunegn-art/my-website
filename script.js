// Text-to-Speech for blind users
document.getElementById("speak-btn").addEventListener("click", () => {
  const text = document.getElementById("output-box").innerText;
  if (text.trim() !== "") {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US"; // Change language if needed
    speechSynthesis.speak(utterance);
  }
});

// Placeholder for future gesture recognition
// Later you can integrate MediaPipe Hands or TensorFlow.js here
// Example: update output-box with recognized gesture
// document.getElementById("output-box").innerText = "Hello";

