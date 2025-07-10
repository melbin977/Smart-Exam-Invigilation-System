let warnings = []; // Use as a queue
let suspicionEvents = []; // Track suspicion events with timestamps
let studentAnswers = [];
let currentQuestions = [];
let idleTimeout = 60000; // 1 minute
let examId = null;

function addWarning(reason) {
    const timestamp = new Date().toLocaleTimeString();
    warnings.push({reason, timestamp});
    suspicionEvents.push({type: reason, timestamp});
    document.getElementById('warning-box').innerText =
        `Warning ${warnings.length}/3: ${reason} at ${timestamp}`;
    if (warnings.length >= 3) {
        suspendExam();
    }
}

function suspendExam() {
    alert("Exam suspended due to suspicious activity.");
    document.getElementById('question-container').innerHTML = "<b>Exam Suspended</b>";
    if (window.stopWebcam) window.stopWebcam();
    document.getElementById('webcam-area').style.display = 'none';
    document.getElementById('warning-box').innerText = '';
    document.getElementById('warning-box').style.display = 'none';
    sendSuspicionLog();
}

// Detect tab switch, window unfocus, or minimize
window.onblur = () => addWarning("Tab switch or window unfocus/minimize detected");

// Detect inactivity (idle for too long)
let inactivityTimer;
function resetInactivity() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => addWarning("Idle for too long (1 minute of inactivity)"), idleTimeout);
}
window.onmousemove = resetInactivity;
window.onkeydown = resetInactivity;
window.onclick = resetInactivity;
resetInactivity();

// Detect right-click
window.addEventListener('contextmenu', function(e) {
    addWarning("Right-click detected");
    e.preventDefault();
});

// Detect copy
window.addEventListener('copy', function(e) {
    addWarning("Copy action detected");
    e.preventDefault();
});

// Detect paste
window.addEventListener('paste', function(e) {
    addWarning("Paste action detected");
    e.preventDefault();
});

// Show questions and allow answer selection
function showQuestions(questions) {
    currentQuestions = questions;
    studentAnswers = Array(questions.length).fill(null);
    let container = document.getElementById('question-container');
    container.innerHTML = '';
    questions.forEach((q, idx) => {
        let div = document.createElement('div');
        div.innerHTML = `<b>Q${idx+1}:</b> ${q.q}<br>` +
            q.options.map(opt => `<label><input type=\"radio\" name=\"q${idx}\" value=\"${opt}\" onchange=\"selectAnswer(${idx}, '${opt}')\">${opt}</label>`).join('<br>');
        container.appendChild(div);
    });
    // Add submit button
    let submitBtn = document.createElement('button');
    submitBtn.innerText = 'Submit Exam';
    submitBtn.onclick = submitExam;
    container.appendChild(document.createElement('br'));
    container.appendChild(submitBtn);
    // Set examId from URL
    let path = window.location.pathname;
    examId = parseInt(path.split('/').pop());
}

// Called when a student selects an answer
window.selectAnswer = function(idx, value) {
    studentAnswers[idx] = value;
}

// Submit answers to backend and show score
function submitExam() {
    // Get exam id from URL
    let path = window.location.pathname;
    let examId = path.split('/').pop();
    // Send answers as array of {q, answer}
    let answersToSend = currentQuestions.map((q, idx) => ({q: q.q, answer: studentAnswers[idx]}));
    fetch(`/api/exam/${examId}/submit`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({answers: answersToSend, suspicion_events: suspicionEvents})
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById('question-container').innerHTML = `<b>Your Score: ${data.score} / ${data.total}</b>`;
        if (window.stopWebcam) window.stopWebcam();
        document.getElementById('webcam-area').style.display = 'none';
        document.getElementById('warning-box').innerText = '';
        document.getElementById('warning-box').style.display = 'none';
        sendSuspicionLog();
    });
}

// Send suspicion log to backend (for suspension or after submit)
function sendSuspicionLog() {
    if (!examId || suspicionEvents.length === 0) return;
    fetch('/api/log_suspicion', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({exam_id: examId, events: suspicionEvents})
    });
    suspicionEvents = [];
}
