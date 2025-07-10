import { FilesetResolver, FaceDetector } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs";

let lastFaceDetected = Date.now();
let faceMissingWarned = false;
let multiFaceWarned = false;

const webcam = document.getElementById('webcam');
const overlay = document.getElementById('overlay');
const ctx = overlay.getContext('2d');

let stream = null;
let animationId = null;
let faceDetector = null;
let running = true;

// Start webcam
navigator.mediaDevices.getUserMedia({ video: true }).then(s => {
    stream = s;
    webcam.srcObject = stream;
    webcam.onloadedmetadata = () => {
        webcam.play();
        startFaceDetection();
    };
});

async function startFaceDetection() {
    const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
    );
    faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "/static/face_detection_short_range.tflite"
        },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.6
    });
    
    runDetectionLoop();
}

async function runDetectionLoop() {
    if (!running) return;
    if (webcam.readyState < 2) {
        animationId = requestAnimationFrame(runDetectionLoop);
        return;
    }
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const now = Date.now();
    const detections = await faceDetector.detectForVideo(webcam, now);

    // Log detections
    console.log('Face detections:', detections);

    if (!detections || !detections.detections || detections.detections.length === 0) {
        // No face detected for more than 3 seconds
        if (!faceMissingWarned && Date.now() - lastFaceDetected > 3000) {
            if (window.addWarning) window.addWarning("Face not detected");
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

    // Update last detected time
    lastFaceDetected = Date.now();
    faceMissingWarned = false;

    // Multiple faces
    if (detections.detections.length > 1 && !multiFaceWarned) {
        if (window.addWarning) window.addWarning("Multiple faces detected");
        multiFaceWarned = true;
    }
    if (detections.detections.length === 1) {
        multiFaceWarned = false;
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