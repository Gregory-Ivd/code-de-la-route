// Shared exam engine for all billet-*.html pages.
// Expects a global `QUESTIONS` array to be defined before this script runs,
// each item shaped as: {cat, q, options:[...], correct, ex, qTr?, exTr?}
// qTr/exTr (Ukrainian translation mini-quiz) are optional per question.

let current = 0;
let answers = [];
let currentFilter = 'all';

function startExam(){
  document.getElementById('screen-intro').classList.remove('active');
  document.getElementById('screen-quiz').classList.add('active');
  renderQuestion();
}

function renderQuestion(){
  const q = QUESTIONS[current];
  document.getElementById('qCategory').textContent = q.cat;
  document.getElementById('qText').textContent = (current+1) + ". " + q.q;
  document.getElementById('qProgressLabel').textContent = "Question " + (current+1) + " sur " + QUESTIONS.length;
  const opts = document.getElementById('qOptions');
  opts.innerHTML = '';
  q.options.forEach((opt, idx) => {
    const div = document.createElement('label');
    div.className = 'option';
    div.innerHTML = `<input type="radio" name="opt" value="${idx}"> <span>${opt}</span>`;
    div.addEventListener('click', () => selectOption(idx));
    opts.appendChild(div);
  });
  document.getElementById('nextBtn').disabled = true;
  document.getElementById('nextBtn').textContent = (current === QUESTIONS.length - 1) ? 'Voir les résultats' : 'Valider';
  const trBox = document.getElementById('qTranslateBox');
  if(trBox){
    if(q.qTr) renderTranslateWidget('qTranslateBox', q.qTr, 'q');
    else trBox.innerHTML = '';
  }
  updateRoad();
}

function renderTranslateWidget(containerId, data, idPrefix){
  const container = document.getElementById(containerId);
  container.innerHTML = `<button class="btn-translate" id="${idPrefix}-trbtn">🇺🇦 Перекласти</button>`;
  document.getElementById(idPrefix + '-trbtn').addEventListener('click', () => showTrQuiz(containerId, data, idPrefix));
}

function showTrQuiz(containerId, data, idPrefix){
  const container = document.getElementById(containerId);
  container.innerHTML = `<div class="tr-quiz"><div class="tr-quiz-label">Про що цей текст?</div><div class="options" id="${idPrefix}-tropts"></div></div>`;
  const opts = document.getElementById(idPrefix + '-tropts');
  data.opts.forEach((opt, idx) => {
    const div = document.createElement('div');
    div.className = 'option tr-option';
    div.textContent = opt;
    div.addEventListener('click', () => showTrResult(containerId, data, idx));
    opts.appendChild(div);
  });
}

function showTrResult(containerId, data, idx){
  const container = document.getElementById(containerId);
  const isCorrect = idx === data.correct;
  container.innerHTML = `<div class="tr-result ${isCorrect ? 'correct' : 'wrong'}"><div class="tr-verdict">${isCorrect ? '✓ Вгадали, про що текст' : '✗ Не зовсім вгадали'}</div><div>${data.text}</div></div>`;
}

function selectOption(idx){
  document.querySelectorAll('#qOptions .option').forEach((el,i) => {
    el.classList.toggle('selected', i === idx);
    el.querySelector('input').checked = (i === idx);
  });
  document.getElementById('nextBtn').disabled = false;
  document.getElementById('nextBtn').dataset.selected = idx;
}

function nextQuestion(){
  const btn = document.getElementById('nextBtn');
  const selected = parseInt(btn.dataset.selected);
  const q = QUESTIONS[current];
  answers.push({selected: selected, correct: q.correct, isCorrect: selected === q.correct});
  current++;
  if(current < QUESTIONS.length){
    renderQuestion();
  } else {
    showResults();
  }
}

function updateRoad(){
  const pct = (current / QUESTIONS.length) * 100;
  document.getElementById('roadFill').style.width = pct + '%';
  document.getElementById('roadCar').style.left = pct + '%';
  document.getElementById('roadCount').textContent = current + ' / ' + QUESTIONS.length;
}

function showResults(){
  document.getElementById('screen-quiz').classList.remove('active');
  document.getElementById('screen-results').classList.add('active');
  updateRoad();
  document.getElementById('roadFill').style.width='100%';
  document.getElementById('roadCar').style.left='100%';
  document.getElementById('roadCount').textContent = QUESTIONS.length + ' / ' + QUESTIONS.length;

  const score = answers.filter(a => a.isCorrect).length;
  const errors = QUESTIONS.length - score;
  const pass = errors <= 5;

  document.getElementById('resScore').textContent = score + ' / ' + QUESTIONS.length;
  document.getElementById('resDetail').textContent = errors + ' erreur(s) — ' + (pass ? 'seuil de réussite : max. 5 erreurs' : 'seuil de réussite dépassé (max. 5 erreurs)');
  const stamp = document.getElementById('resStamp');
  stamp.textContent = pass ? 'Reçu' : 'Ajourné';
  stamp.className = 'stamp ' + (pass ? 'pass' : 'fail');

  renderReview('all');
}

function setFilter(f){
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === f));
  renderReview(f);
}

function renderReview(filter){
  const list = document.getElementById('reviewList');
  list.innerHTML = '';
  QUESTIONS.forEach((q, i) => {
    const a = answers[i];
    if(filter === 'wrong' && a.isCorrect) return;
    const div = document.createElement('div');
    div.className = 'review-item';
    const userAnswerText = q.options[a.selected] !== undefined ? q.options[a.selected] : '(sans réponse)';
    const correctText = q.options[q.correct];
    div.innerHTML = `
      <div class="review-cat">${q.cat}</div>
      <div class="review-q">${i+1}. ${q.q}</div>
      <div class="review-line">${a.isCorrect ? '<span class="tag-right">✓ Correct</span>' : '<span class="tag-wrong">✗ Erreur</span>'} — votre réponse : ${userAnswerText}</div>
      ${a.isCorrect ? '' : `<div class="review-line">Bonne réponse : <strong>${correctText}</strong></div>`}
      <div class="explain">${q.ex}</div>
      <div id="tr-ex-${i}"></div>
    `;
    list.appendChild(div);
    if(q.exTr) renderTranslateWidget(`tr-ex-${i}`, q.exTr, `ex${i}`);
  });
  if(list.innerHTML === ''){
    list.innerHTML = '<p style="color:var(--muted);">Aucune erreur — sans faute ! 🎉</p>';
  }
}
