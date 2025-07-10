// Classic MediaPipe Face Detection proctoring
// Assumes addWarning is available globally

let lastFaceDetected = Date.now();
let faceMissingWarned = false;
let multiFaceWarned = false;

const webcam = document.getElementById('webcam');
const overlay = document.getElementById('overlay');
const ctx = overlay.getContext('2d');

let running = true;
let camera = null;

function onResults(results) {
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (!results.detections || results.detections.length === 0) {
        // No face detected for more than 3 seconds
        if (!faceMissingWarned && Date.now() - lastFaceDetected > 3000) {
            if (window.addWarning) window.addWarning("Face not detected");
            faceMissingWarned = true;
        }
        return;
    }
    // Draw face boxes
    results.detections.forEach(det => {
        const box = det.boundingBox;
        ctx.strokeStyle = '#1976d2';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.xCenter * 320 - box.width * 320 / 2, box.yCenter * 240 - box.height * 240 / 2, box.width * 320, box.height * 240);
    });
    // Face detected
    lastFaceDetected = Date.now();
    faceMissingWarned = false;
    // Multiple faces
    if (results.detections.length > 1 && !multiFaceWarned) {
        if (window.addWarning) window.addWarning("Multiple faces detected");
        multiFaceWarned = true;
    }
    if (results.detections.length === 1) {
        multiFaceWarned = false;
    }
}

const faceDetection = new FaceDetection({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
});
faceDetection.setOptions({
    model: 'short',
    minDetectionConfidence: 0.6
});
faceDetection.onResults(onResults);

camera = new Camera(webcam, {
    onFrame: async () => {
        if (running) await faceDetection.send({image: webcam});
    },
    width: 320,
    height: 240
});
camera.start();

window.stopWebcam = function() {
    running = false;
    if (camera) camera.stop();
    if (webcam && webcam.srcObject) {
        webcam.srcObject.getTracks().forEach(track => track.stop());
        webcam.srcObject = null;
    }
}; 