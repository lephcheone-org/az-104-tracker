/* ---------- shared question rendering ---------- */
const SECTION_TITLES = [
  ["correctAnswer", "Correct Answer"],
  ["technical", "Technical Explanation"],
  ["wrongOptions", "Why Every Other Option Is Wrong"],
  ["plainEnglish", "In Plain English"],
  ["analogy", "Real-World Analogy"],
  ["jargon", "Jargon Buster"],
  ["watchOut", "Watch Out / Good to Know"],
  ["productionTip", "Real-World Production Tip"],
  ["memoryTrick", "Memory Trick"],
  ["examTip", "Exam Tip"]
];
function domainLabel(id) { const d = domainMap.get(id); return d ? `${d.id} ${d.name}` : id; }
function objectiveLabel(id) { const o = objectiveMap.get(id); return o ? `${o.id} ${o.name}` : id; }
function completeToggle(id) {
  return `<label class="complete-toggle"><input type="checkbox" data-complete="${escapeHTML(id)}" ${isDone(id) ? "checked" : ""}> Mark as Complete</label>`;
}
function refreshCompleteWidgets(id) {
  document.querySelectorAll(`input[data-complete="${CSS.escape(id)}"]`).forEach(i => { i.checked = isDone(id); });
  document.querySelectorAll(`[data-done-mark="${CSS.escape(id)}"]`).forEach(n => { n.textContent = isDone(id) ? "\u2713" : ""; });
  const counter = document.getElementById("complete-counter");
  if (counter) counter.textContent = completedCount();
}
const completedCount = () => questions.reduce((n, q) => n + (isDone(q.id) ? 1 : 0), 0);
function questionMeta(q, extra = "") {
  return `<div class="question-meta">
    <span class="pill accent">${escapeHTML(q.domain)}</span>
    <span class="pill" title="${escapeHTML(objectiveLabel(q.objective))}">${escapeHTML(objectiveLabel(q.objective))}</span>
    <span class="pill">${typeNames[q.type]}</span>
    <span class="pill">${escapeHTML(q.difficulty)}</span>
    <span class="pill mono">${escapeHTML(q.id)}</span>${extra}</div>`;
}
function optionsHTML(q, { answer = [], revealed = false, disabled = false, name = "answer" } = {}) {
  const multi = q.type === "multiple";
  const need = q.correct.length;
  const legend = multi ? `Select ${need === 2 ? "TWO" : need === 3 ? "THREE" : need} answers.` : "Select ONE answer.";
  return `<fieldset ${disabled ? "disabled" : ""}><legend>${legend}</legend>${q.options.map(o => {
    const chosen = answer.includes(o.id), right = q.correct.includes(o.id);
    let cls = "option", marker = "";
    if (revealed && right) { cls += " option-correct"; marker = `<span class="answer-marker good">Correct answer${chosen ? " (you chose this)" : ""}</span>`; }
    else if (revealed && chosen) { cls += " option-wrong"; marker = `<span class="answer-marker bad">Your choice (incorrect)</span>`; }
    return `<label class="${cls}"><input type="${multi ? "checkbox" : "radio"}" name="${escapeHTML(name)}" value="${o.id}" ${chosen ? "checked" : ""} data-option="${escapeHTML(q.id)}">
      <span class="option-letter">${o.id}.</span><span class="option-content">${mdInline(o.text)}${marker}</span></label>`;
  }).join("")}</fieldset>`;
}
function section(n, title, body, cls = "") {
  return `<details class="answer-section ${cls}" open><summary><span class="num">${String(n).padStart(2, "0")}</span>${escapeHTML(title)}</summary><div class="section-body">${body}</div></details>`;
}
function explanationHTML(q, answer) {
  const s = q.sections;
  const has = Array.isArray(answer) && answer.length;
  const ok = has && grade(q, answer);
  const verdict = !answer ? "" : !has ? `<h3>Not answered</h3>` : ok ? `<h3 class="good">Correct</h3>` : `<h3 class="bad">Incorrect. You chose ${escapeHTML([...answer].sort().join(", "))}.</h3>`;
  const parts = SECTION_TITLES.map(([key, title], i) => {
    let body = "";
    if (key === "correctAnswer") body = `<p><strong>${escapeHTML(q.correct.join(", "))}</strong></p>${md(s.correctAnswer)}`;
    else if (key === "wrongOptions") body = q.options.filter(o => !q.correct.includes(o.id)).map(o =>
      `<div class="wrong-item"><h5>Option ${o.id}: ${mdInline(o.text)}</h5>${md(s.wrongOptions?.[o.id] || "")}</div>`).join("");
    else if (key === "jargon") body = `<dl class="jargon">${(s.jargon || []).map(j => `<dt>${mdInline(j.term)}</dt><dd>${md(j.definition)}</dd>`).join("")}</dl>`;
    else if (key === "productionTip") body = `<span class="tag-official">Official behaviour</span>${md(s.productionTip?.official)}<span class="tag-advice">Recommendation</span>${md(s.productionTip?.recommendation)}`;
    else body = md(s[key]);
    return section(i + 1, title, body, key === "correctAnswer" ? "key" : "");
  }).join("");
  const extra = `<details class="answer-section"><summary><span class="num">--</span>Assumptions</summary><div class="section-body">${md(q.assumptions || "None stated.")}</div></details>
    <details class="answer-section" open><summary><span class="num">--</span>Sources (Microsoft Learn, verified ${escapeHTML(q.verified || "")})</summary><div class="section-body"><ul class="references">${(q.sources || []).map(r => `<li>${link(r.url, r.title)}</li>`).join("")}</ul></div></details>`;
  return `<div class="feedback ${!answer || !has ? "neutral" : ok ? "" : "incorrect"}">${verdict}
    <div class="section-tools"><button class="quiet" type="button" data-action="expand-all">Expand all</button><button class="quiet" type="button" data-action="collapse-all">Collapse all</button></div>
    ${parts}${extra}</div>`;
}

/* ---------- home ---------- */
function domainStats(domainId) {
  const qs = questions.filter(q => q.domain === domainId);
  const done = qs.filter(q => isDone(q.id)).length;
  return { total: qs.length, done };
}
function renderHome() {
  const total = questions.length, done = completedCount();
  const s = state.session;
  const resume = s && !s.finishedAt ? `<div class="notice">
      <strong>Unfinished ${s.mode === "exam" ? "full practice exam" : `${escapeHTML(domainLabel(s.domain))} practice`}</strong>.
      ${Object.keys(s.answers).length} of ${s.ids.length} answered, started ${fmtDate(s.startedAt)}.
      <div class="button-row"><a class="primary" href="#practice">Resume</a><button class="quiet" type="button" data-action="discard-session">Discard</button></div></div>` : "";
  const domainOptions = blueprint.domains.map(d => {
    const st = domainStats(d.id);
    return `<option value="${d.id}">${escapeHTML(`${d.id} ${d.name}`)} (${st.total} questions, ${st.done} complete)</option>`;
  }).join("");
  main.innerHTML = `
  <section class="hero">
    <div>
      <div class="eyebrow">Microsoft Certified: Azure Administrator Associate</div>
      <h1>AZ-104 <span>practice lab</span></h1>
      <p class="lead">${total} original scenario questions mapped to every objective in the official skills outline (skills measured as of ${escapeHTML(blueprint.skillsAsOf)}). Every answer has the full 10-part explanation.</p>
    </div>
    <div class="card">
      <div class="muted small">Questions marked complete</div>
      <div class="big-number"><span id="complete-counter">${done}</span><span class="muted" style="font-size:1.4rem"> / ${total}</span></div>
      ${bar(pct(done, total), done === total)}
      <div class="mini-stat-row">
        <div><strong>${state.history.length}</strong><span>Practice sets finished</span></div>
        <div><strong>${Object.keys(state.stats).length}</strong><span>Questions attempted</span></div>
        <div><strong>${gist.token ? "On" : "Off"}</strong><span>Cross-device sync</span></div>
      </div>
    </div>
  </section>
  ${resume}
  <div class="grid-2">
    <form class="card mode-card" data-form="start-domain">
      <div class="eyebrow">Option 1</div>
      <h2>Domain practice</h2>
      <p class="muted">${DOMAIN_SIZE} questions from one domain, spread across all its objectives.</p>
      <label class="field" for="domain-select">Domain</label>
      <select id="domain-select" name="domain">${domainOptions}</select>
      <label class="field" for="domain-feedback">Feedback</label>
      <select id="domain-feedback" name="feedback"><option value="immediate">After each question (study mode)</option><option value="end">At the end (exam style)</option></select>
      <label class="check-row"><input type="checkbox" name="prefer" checked> Prefer questions not yet marked complete</label>
      <div class="button-row"><button class="primary" type="submit">Start domain practice</button></div>
    </form>
    <form class="card mode-card" data-form="start-exam">
      <div class="eyebrow">Option 2</div>
      <h2>Full practice exam</h2>
      <p class="muted">${EXAM_SIZE} questions drawn across all five domains using the official weightings (${blueprint.domains.map(d => `${d.id} ${d.examQuota}`).join(", ")}). No timer.</p>
      <label class="field" for="exam-feedback">Feedback</label>
      <select id="exam-feedback" name="feedback"><option value="end">At the end (like the real exam)</option><option value="immediate">After each question (study mode)</option></select>
      <label class="check-row"><input type="checkbox" name="prefer"> Prefer questions not yet marked complete</label>
      <div class="button-row"><button class="primary" type="submit">Start full practice exam</button></div>
    </form>
  </div>
  <div class="section-head"><h2>Domains</h2><a href="#progress">Detailed progress</a></div>
  <div class="grid-5">${blueprint.domains.map(d => {
    const st = domainStats(d.id);
    return `<div class="card domain-mini"><b>${d.id} &middot; ${escapeHTML(d.weight)}</b><h3>${escapeHTML(d.fullName)}</h3>${bar(pct(st.done, st.total), st.total && st.done === st.total)}<div class="bar-label"><span>${st.done}/${st.total} complete</span><span>${fmtPct(pct(st.done, st.total))}</span></div></div>`;
  }).join("")}</div>
  <div class="notice small"><strong>About this bank.</strong> Real exam questions are confidential under the Microsoft exam agreement, so every question here is original and written against the published skills outline and Microsoft Learn documentation. The real exam (100 minutes, pass mark 700) can also include case studies, drag-and-drop, hot-area and lab items; try them in the official <a href="https://aka.ms/examdemo" target="_blank" rel="noopener noreferrer">exam sandbox</a>.</div>`;
}

/* ---------- practice ---------- */
function renderPractice() {
  const s = state.session;
  if (!s) {
    main.innerHTML = `<div class="empty-state"><h1>No active practice</h1><p class="muted">Start a domain practice or a full practice exam from the overview.</p><div class="button-row"><a class="primary" href="#home">Choose a practice</a></div></div>`;
    return;
  }
  if (s.finishedAt) { location.hash = "#results"; return; }
  const id = s.ids[s.index], q = questionMap.get(id);
  const answer = s.answers[id] || [];
  const revealed = isRevealed(s, id);
  const answeredCount = s.ids.filter(x => (s.answers[x] || []).length).length;
  const flagged = s.flags.includes(id);
  const need = q.correct.length;
  const canCheck = q.type === "multiple" ? answer.length === need : answer.length === 1;
  const title = s.label || (s.mode === "exam" ? "Full practice exam" : domainLabel(s.domain));
  const dots = s.ids.map((qid, i) => {
    const a = s.answers[qid] || [];
    let cls = "question-dot";
    if (isRevealed(s, qid) && a.length) cls += grade(questionMap.get(qid), a) ? " correct" : " incorrect";
    else if (a.length) cls += " answered";
    if (s.flags.includes(qid)) cls += " flagged";
    if (i === s.index) cls += " current";
    return `<button class="${cls}" type="button" data-goto="${i}" aria-label="Question ${i + 1}${a.length ? ", answered" : ""}${s.flags.includes(qid) ? ", flagged" : ""}" ${i === s.index ? 'aria-current="step"' : ""}>${i + 1}</button>`;
  }).join("");
  main.innerHTML = `
  <div class="practice-header">
    <div><div class="eyebrow">${s.mode === "exam" ? "Option 2" : "Option 1"} &middot; ${s.feedback === "immediate" ? "feedback after each question" : "feedback at the end"}</div>
    <h1 class="page-title">${escapeHTML(title)}</h1></div>
  </div>
  <div class="practice-layout">
    <article class="question-card" aria-labelledby="q-heading">
      <div class="practice-header"><h2 id="q-heading" style="margin-bottom:12px">Question ${s.index + 1} of ${s.ids.length}</h2>${completeToggle(id)}</div>
      ${questionMeta(q, flagged ? `<span class="pill" style="color:var(--cp-warning)">Flagged</span>` : "")}
      <div class="prompt">${md(q.prompt)}</div>
      <form data-form="answer">${optionsHTML(q, { answer, revealed, disabled: revealed })}</form>
      ${q.type === "multiple" && !revealed && answer.length > need ? `<p class="error-text">Select exactly ${need} answers.</p>` : ""}
      <div class="question-nav">
        <div class="button-row" style="margin:0">
          <button class="secondary" type="button" data-action="prev" ${s.index === 0 ? "disabled" : ""}>Previous</button>
          <button class="quiet" type="button" data-action="flag">${flagged ? "Unflag" : "Flag for review"}</button>
        </div>
        <div class="button-row" style="margin:0">
          ${s.feedback === "immediate" && !revealed ? `<button class="primary" type="button" data-action="check" ${canCheck ? "" : "disabled"}>Check answer</button>` : ""}
          ${s.index < s.ids.length - 1 ? `<button class="${s.feedback === "immediate" && !revealed ? "secondary" : "primary"}" type="button" data-action="next">Next</button>` : `<button class="primary" type="button" data-action="finish">Finish and see results</button>`}
        </div>
      </div>
      ${revealed ? explanationHTML(q, answer) : ""}
      ${revealed ? `<div class="question-nav"><span></span>${s.index < s.ids.length - 1 ? `<button class="primary" type="button" data-action="next">Next question</button>` : `<button class="primary" type="button" data-action="finish">Finish and see results</button>`}</div>` : ""}
    </article>
    <aside class="navigator" aria-label="Question navigator">
      <h2>Progress</h2>
      <div class="small muted">${answeredCount} of ${s.ids.length} answered${s.flags.length ? `, ${s.flags.length} flagged` : ""}</div>
      <progress max="${s.ids.length}" value="${answeredCount}"></progress>
      <div class="question-grid">${dots}</div>
      <div class="legend">Bold = answered &middot; amber underline = flagged${s.feedback === "immediate" ? " &middot; green/red = checked" : ""}</div>
      <div class="button-row"><button class="secondary" type="button" data-action="finish">Finish now</button><button class="quiet" type="button" data-action="discard-session">Discard practice</button></div>
    </aside>
  </div>`;
}
