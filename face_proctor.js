// Modern MediaPipe Tasks Vision face proctoring
// Assumes addWarning is available globally

let lastFaceDetected = Date.now();
let faceMissingWarned = false;
let multiFaceWarned = false;
let lastFrontal = Date.now();
let headTurnWarned = false;

const webcam = document.getElementById('webcam');
const overlay = document.getElementById('overlay');
const ctx = overlay.getContext('2d');

let stream = null;
let animationId = null;
let faceDetector = null;
let running = true;

function waitForMediaPipeTasksVision(callback) {
    if (window.FilesetResolver && window.FaceDetector) {
        callback();
    } else {
        setTimeout(() => waitForMediaPipeTasksVision(callback), 100);
    }
}

// Start webcam
navigator.mediaDevices.getUserMedia({ video: true }).then(s => {
    stream = s;
    webcam.srcObject = stream;
    webcam.onloadedmetadata = () => {
        webcam.play();
        waitForMediaPipeTasksVision(startFaceDetection);
    };
});

async function startFaceDetection() {
    const vision = await window.FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
    );
    faceDetector = await window.FaceDetector.createFromOptions(vision, {
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.6
    });
    runDetectionLoop();
}

function runDetectionLoop() {
    if (!running) return;
    if (webcam.readyState < 2) {
        animationId = requestAnimationFrame(runDetectionLoop);
        return;
    }
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    const now = Date.now();
    const detections = faceDetector.detectForVideo(webcam, now);
    // Debug: log detection results
    console.log('Face detections:', detections);
    if (!detections || !detections.detections || detections.detections.length === 0) {
        // No face detected
        if (!faceMissingWarned && Date.now() - lastFaceDetected > 3000) {
            addWarning("Face not detected");
            faceMissingWarned = true;
        }
        animationId = requestAnimationFrame(runDetectionLoop);
        return;
    }
    // Draw face boxes
    detections.detections.forEach(det => {
        const box = det.boundingBox;
        ctx.strokeStyle = '#1976d2';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.originX, box.originY, box.width, box.height);
    });
    // Face detected
    lastFaceDetected = Date.now();
    faceMissingWarned = false;
    // Multiple faces
    if (detections.detections.length > 1 && !multiFaceWarned) {
        addWarning("Multiple faces detected");
        multiFaceWarned = true;
    }
    if (detections.detections.length === 1) {
        multiFaceWarned = false;
        // Optionally: Head turned away (not directly available, so skip or use detection score if present)
        // You can add more advanced checks here if needed
    }
    animationId = requestAnimationFrame(runDetectionLoop);
}

// Add a function to stop webcam and camera
window.stopWebcam = function() {
    running = false;
    if (animationId) cancelAnimationFrame(animationId);
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    if (webcam) webcam.srcObject = null;
}; 