from flask import Flask, render_template, request, jsonify, redirect, url_for
import json
import random
from datetime import datetime

app = Flask(__name__)

# In-memory storage for exams (loaded from JSON at startup)
with open('exams.json') as f:
    exams_data = json.load(f)['exams']
exams = exams_data.copy()

# In-memory suspicion logs
suspicion_logs = []  # Each entry: {exam_id, timestamp, events: [{type, timestamp}]}

def save_exams():
    # Optionally, write to file for persistence (not required)
    pass

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/admin', methods=['GET', 'POST'])
def admin():
    if request.method == 'POST':
        # Create new exam
        title = request.form.get('title')
        if title:
            new_id = max([e['id'] for e in exams], default=0) + 1
            exams.append({'id': new_id, 'title': title, 'questions': []})
    return render_template('admin.html', exams=exams)

@app.route('/admin/add_question', methods=['POST'])
def add_question():
    exam_id = int(request.form.get('exam_id'))
    q = request.form.get('q')
    options = [request.form.get('opt1'), request.form.get('opt2'), request.form.get('opt3')]
    answer = request.form.get('answer')
    for exam in exams:
        if exam['id'] == exam_id:
            exam['questions'].append({'q': q, 'options': options, 'answer': answer})
            break
    return redirect(url_for('admin'))

@app.route('/admin/suspicion_logs')
def admin_suspicion_logs():
    return render_template('admin_suspicion_logs.html', logs=suspicion_logs, exams=exams)

@app.route('/api/log_suspicion', methods=['POST'])
def log_suspicion():
    data = request.json
    log_entry = {
        'exam_id': data.get('exam_id'),
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'events': data.get('events', [])
    }
    suspicion_logs.append(log_entry)
    return jsonify({'status': 'ok'})

@app.route('/exam/<int:exam_id>')
def exam(exam_id):
    exam = next((e for e in exams if e['id'] == exam_id), None)
    if not exam:
        return "Exam not found", 404
    return render_template('exam.html', exam=exam)

@app.route('/api/exam/<int:exam_id>/questions')
def get_shuffled_questions(exam_id):
    exam = next((e for e in exams if e['id'] == exam_id), None)
    if not exam:
        return jsonify({'error': 'Exam not found'}), 404
    questions = exam['questions'][:]
    for i in range(len(questions)-1, 0, -1):
        j = random.randint(0, i)
        questions[i], questions[j] = questions[j], questions[i]
    return jsonify({'questions': questions})

@app.route('/api/exam/<int:exam_id>/submit', methods=['POST'])
def submit_exam(exam_id):
    data = request.json
    answers = data.get('answers', [])
    suspicion_events = data.get('suspicion_events', [])
    # Log suspicion events for this attempt
    suspicion_logs.append({
        'exam_id': exam_id,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'events': suspicion_events
    })
    exam = next((e for e in exams if e['id'] == exam_id), None)
    if not exam:
        return jsonify({'error': 'Exam not found'}), 404
    correct = 0
    # answers is now a list of {q, answer}
    for q in exam['questions']:
        # Find the submitted answer for this question
        submitted = next((a['answer'] for a in answers if a['q'] == q['q']), None)
        if submitted is not None and str(submitted).strip().lower() == str(q['answer']).strip().lower():
            correct += 1
    return jsonify({'score': correct, 'total': len(exam['questions'])})

@app.route('/student')
def student_portal():
    return render_template('student_portal.html', exams=exams)

if __name__ == '__main__':
    app.run(debug=True)
