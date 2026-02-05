// Get video element
const video = document.getElementById('webcam');

// Ask for webcam access
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
  })
  .catch(err => {
    console.error("Error accessing webcam:", err);
  });

// Placeholder translation logic
// Later you can connect this to a real ML model
const output = document.getElementById('output');
output.innerText = "Waiting for sign input...";
