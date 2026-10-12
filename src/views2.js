/* ---------- results & review ---------- */
function renderResults() {
  const s = state.session;
  if (!s || !s.finishedAt) {
    const last = state.history[0];
    main.innerHTML = `<div class="empty-state"><h1>No results yet</h1><p class="muted">${last ? `Your last finished practice scored ${fmtPct(last.percentage)}. See the Progress page for history.` : "Finish a practice to see results here."}</p><div class="button-row"><a class="primary" href="#home">Start a practice</a><a class="secondary" href="#progress">Progress</a></div></div>`;
    return;
  }
  const r = scoreSession(s);
  const rows = Object.entries(r.byDomain).sort().map(([d, v]) => `<tr><td>${escapeHTML(domainLabel(d))}</td><td>${v.correct} / ${v.total}</td><td>${fmtPct(pct(v.correct, v.total))}</td><td>${bar(pct(v.correct, v.total), pct(v.correct, v.total) >= 70)}</td></tr>`).join("");
  const grows = Object.entries(r.byGroup).sort().map(([g, v]) => `<tr><td>${escapeHTML(g)} ${escapeHTML(groupMap.get(g)?.name || "")}</td><td>${v.correct} / ${v.total}</td><td class="${pct(v.correct, v.total) >= 70 ? "good" : "bad"}">${fmtPct(pct(v.correct, v.total))}</td></tr>`).join("");
  const list = s.ids.map((id, i) => {
    const q = questionMap.get(id), a = s.answers[id] || [];
    const status = !a.length ? `<span class="muted">Not answered</span>` : grade(q, a) ? `<span class="good">Correct</span>` : `<span class="bad">Incorrect</span>`;
    return `<tr><td class="mono">${i + 1}</td><td><a href="#review/${i}">${escapeHTML(q.id)}</a></td><td>${escapeHTML(objectiveLabel(q.objective))}</td><td>${status}</td><td>${completeToggle(id)}</td></tr>`;
  }).join("");
  main.innerHTML = `
  <div class="eyebrow">${s.mode === "exam" ? "Full practice exam" : escapeHTML(domainLabel(s.domain))} &middot; finished ${fmtDate(s.finishedAt)}</div>
  <h1 class="page-title">Results</h1>
  <div class="score-strip">
    <div class="stat accent"><strong>${fmtPct(r.percentage)}</strong><span>Score (${r.correct} of ${r.total})</span></div>
    <div class="stat"><strong>${r.answered}</strong><span>Answered</span></div>
    <div class="stat"><strong>${r.total - r.correct - r.unanswered}</strong><span>Incorrect</span></div>
    <div class="stat"><strong>${r.unanswered}</strong><span>Unanswered</span></div>
  </div>
  <div class="notice small">Microsoft reports the real exam on a scaled 1&ndash;1000 range with 700 to pass, which may not equal 70% of the points. Treat a consistent 80%+ here on fresh questions as a sign of readiness (a recommendation), not a prediction of your score.</div>
  <div class="button-row"><a class="primary" href="#review/0">Review all answers</a><button class="secondary" type="button" data-action="retry-wrong" ${r.correct === r.total ? "disabled" : ""}>Practise incorrect and unanswered again</button><a class="quiet" href="#home">New practice</a></div>
  <div class="section-head"><h2>By domain</h2></div>
  <div class="table-wrap"><table><thead><tr><th>Domain</th><th>Correct</th><th>Score</th><th style="width:30%">Bar</th></tr></thead><tbody>${rows}</tbody></table></div>
  <div class="section-head"><h2>By skill group</h2></div>
  <div class="table-wrap"><table><thead><tr><th>Skill group</th><th>Correct</th><th>Score</th></tr></thead><tbody>${grows}</tbody></table></div>
  <div class="section-head"><h2>Questions</h2><span class="muted small">Tick the questions you have fully understood.</span></div>
  <div class="table-wrap"><table><thead><tr><th>#</th><th>ID</th><th>Objective</th><th>Result</th><th>Progress</th></tr></thead><tbody>${list}</tbody></table></div>`;
}
function renderReview(arg) {
  const s = state.session;
  if (!s || !s.finishedAt) { location.hash = "#results"; return; }
  const i = Math.min(Math.max(parseInt(arg, 10) || 0, 0), s.ids.length - 1);
  const id = s.ids[i], q = questionMap.get(id), a = s.answers[id] || [];
  const dots = s.ids.map((qid, k) => {
    const aa = s.answers[qid] || [];
    const cls = `question-dot ${aa.length ? (grade(questionMap.get(qid), aa) ? "correct" : "incorrect") : ""} ${k === i ? "current" : ""}`;
    return `<a class="${cls}" style="text-align:center;text-decoration:none" href="#review/${k}">${k + 1}</a>`;
  }).join("");
  main.innerHTML = `
  <div class="eyebrow">Review &middot; <a href="#results">back to results</a></div>
  <h1 class="page-title">Question ${i + 1} of ${s.ids.length}</h1>
  <div class="practice-layout">
    <article class="question-card">
      <div class="practice-header"><span></span>${completeToggle(id)}</div>
      ${questionMeta(q)}
      <div class="prompt">${md(q.prompt)}</div>
      ${optionsHTML(q, { answer: a, revealed: true, disabled: true, name: "review" })}
      ${explanationHTML(q, a)}
      <div class="question-nav">
        ${i > 0 ? `<a class="secondary" href="#review/${i - 1}">Previous</a>` : "<span></span>"}
        ${i < s.ids.length - 1 ? `<a class="primary" href="#review/${i + 1}">Next</a>` : `<a class="primary" href="#results">Back to results</a>`}
      </div>
    </article>
    <aside class="navigator"><h2>Questions</h2><div class="question-grid">${dots}</div><div class="legend">Green = correct &middot; red = incorrect &middot; plain = unanswered</div></aside>
  </div>`;
}

/* ---------- question bank ---------- */
const libFilter = { q: "", domain: "", objective: "", status: "", type: "", difficulty: "", limit: 40 };
function libraryMatches() {
  const term = libFilter.q.trim().toLowerCase();
  return questions.filter(q => {
    if (libFilter.domain && q.domain !== libFilter.domain) return false;
    if (libFilter.objective && q.objective !== libFilter.objective) return false;
    if (libFilter.type && q.type !== libFilter.type) return false;
    if (libFilter.difficulty && q.difficulty !== libFilter.difficulty) return false;
    const st = state.stats[q.id];
    if (libFilter.status === "complete" && !isDone(q.id)) return false;
    if (libFilter.status === "incomplete" && isDone(q.id)) return false;
    if (libFilter.status === "wrong" && !(st && !st.last)) return false;
    if (libFilter.status === "unseen" && st) return false;
    if (term && !(q.id.toLowerCase().includes(term) || q.prompt.toLowerCase().includes(term) || q.options.some(o => o.text.toLowerCase().includes(term)))) return false;
    return true;
  });
}
function renderLibrary() {
  const objOptions = blueprint.domains.filter(d => !libFilter.domain || d.id === libFilter.domain).flatMap(d => d.groups.flatMap(g => g.objectives))
    .map(o => `<option value="${o.id}" ${libFilter.objective === o.id ? "selected" : ""}>${escapeHTML(`${o.id} ${o.name}`)}</option>`).join("");
  const sel = (name, value, opts) => `<select name="${name}">${opts.map(([v, t]) => `<option value="${v}" ${value === v ? "selected" : ""}>${escapeHTML(t)}</option>`).join("")}</select>`;
  main.innerHTML = `
  <div class="eyebrow">Question bank</div>
  <h1 class="page-title">All ${questions.length} questions</h1>
  <p class="lead">Browse, search and mark questions complete. Open a question to see its answer and full explanation.</p>
  <form class="filter-bar" data-form="library" onsubmit="return false">
    <div class="search-field"><label for="lib-q">Search</label><input id="lib-q" type="search" name="q" value="${escapeHTML(libFilter.q)}" placeholder="Words in the question or options, or an ID"></div>
    <div><label>Domain</label>${sel("domain", libFilter.domain, [["", "All domains"], ...blueprint.domains.map(d => [d.id, `${d.id} ${d.name}`])])}</div>
    <div><label>Objective</label><select name="objective"><option value="">All objectives</option>${objOptions}</select></div>
    <div><label>Status</label>${sel("status", libFilter.status, [["", "Any"], ["incomplete", "Not complete"], ["complete", "Complete"], ["wrong", "Last attempt wrong"], ["unseen", "Never attempted"]])}</div>
    <div><label>Type</label>${sel("type", libFilter.type, [["", "Any"], ["single", "Single choice"], ["multiple", "Multiple answers"]])}</div>
    <div><label>Difficulty</label>${sel("difficulty", libFilter.difficulty, [["", "Any"], ["foundation", "Foundation"], ["applied", "Applied"], ["advanced", "Advanced"]])}</div>
  </form>
  <div id="library-results"></div>`;
  renderLibraryResults();
}
function renderLibraryResults() {
  const box = document.getElementById("library-results");
  if (!box) return;
  const list = libraryMatches();
  const shown = list.slice(0, libFilter.limit);
  box.innerHTML = `<p class="muted small">${list.length} matching &middot; ${list.filter(q => isDone(q.id)).length} complete</p>
  <div class="question-list">${shown.map(q => {
    const first = q.prompt.split(/\n\s*\n/).pop().replace(/[*`#|]/g, "");
    return `<details class="bank-item" data-bank="${escapeHTML(q.id)}"><summary><span class="done-mark" data-done-mark="${escapeHTML(q.id)}">${isDone(q.id) ? "\u2713" : ""}</span><span class="mono small muted">${escapeHTML(q.id)}</span><span class="s-text">${escapeHTML(first.length > 220 ? first.slice(0, 217) + "..." : first)}</span></summary><div class="bank-body"></div></details>`;
  }).join("") || `<div class="empty-state"><p>No questions match these filters.</p></div>`}</div>
  ${list.length > shown.length ? `<div class="button-row" style="justify-content:center"><button class="secondary" type="button" data-action="lib-more">Show more (${list.length - shown.length} remaining)</button></div>` : ""}`;
}
function fillBankItem(details) {
  const body = details.querySelector(".bank-body");
  if (body.dataset.filled) return;
  const q = questionMap.get(details.dataset.bank);
  const st = state.stats[q.id];
  body.innerHTML = `<div class="practice-header" style="margin-bottom:8px">${questionMeta(q, st ? `<span class="pill ${st.last ? "ok" : ""}">Attempted ${st.n}x, ${st.correct} correct</span>` : "")}${completeToggle(q.id)}</div>
    <div class="prompt">${md(q.prompt)}</div>
    <form data-form="bank-try" data-qid="${escapeHTML(q.id)}">${optionsHTML(q, { name: `bank-${q.id}` })}
    <div class="button-row"><button class="primary" type="submit">Check answer</button><button class="quiet" type="button" data-action="bank-reveal">Just show the answer</button></div></form>
    <div class="bank-explain"></div>`;
  body.dataset.filled = "1";
}

/* ---------- progress ---------- */
function renderProgress() {
  const total = questions.length, done = completedCount();
  const attempted = Object.keys(state.stats).filter(id => questionMap.has(id));
  const tot = attempted.reduce((a, id) => { a.n += state.stats[id].n; a.c += state.stats[id].correct; return a; }, { n: 0, c: 0 });
  const domainCards = blueprint.domains.map(d => {
    const rows = d.groups.flatMap(g => g.objectives).map(o => {
      const qs = questions.filter(q => q.objective === o.id);
      const c = qs.filter(q => isDone(q.id)).length;
      const at = qs.filter(q => state.stats[q.id]);
      const right = at.filter(q => state.stats[q.id].last).length;
      return `<tr><td>${escapeHTML(o.id)} ${escapeHTML(o.name)}</td><td>${c} / ${qs.length}</td><td>${bar(pct(c, qs.length), qs.length && c === qs.length)}</td><td>${at.length ? `${fmtPct(pct(right, at.length))} <span class="muted small">(${at.length})</span>` : `<span class="muted">--</span>`}</td></tr>`;
    }).join("");
    const st = domainStats(d.id);
    return `<details class="bank-item" ${libFilter.domain === d.id ? "open" : ""}><summary><b class="mono">${d.id}</b><span class="s-text">${escapeHTML(d.fullName)} <span class="muted small">(${escapeHTML(d.weight)})</span></span><span class="small">${st.done}/${st.total}</span></summary>
      <div class="bank-body">${bar(pct(st.done, st.total), st.total && st.done === st.total)}
      <div class="table-wrap obj-table"><table><thead><tr><th>Objective</th><th>Complete</th><th>Bar</th><th>Last-attempt accuracy</th></tr></thead><tbody>${rows}</tbody></table></div></div></details>`;
  }).join("");
  const hist = state.history.slice(0, 50).map(h => `<tr><td>${fmtDate(h.finishedAt)}</td><td>${h.mode === "exam" ? "Full exam" : escapeHTML(domainLabel(h.domain))}</td><td>${h.correct} / ${h.total}</td><td class="${h.percentage >= 70 ? "good" : "bad"}">${fmtPct(h.percentage)}</td></tr>`).join("");
  main.innerHTML = `
  <div class="eyebrow">Progress</div>
  <h1 class="page-title">Your progress</h1>
  <p class="muted">${gist.token ? `Syncing across devices through your GitHub Gist. ${escapeHTML(syncStatusText())}` : `Stored in this browser only. <a href="#sync">Turn on cross-device sync</a>.`}</p>
  <div class="score-strip">
    <div class="stat accent"><strong>${done} / ${total}</strong><span>Marked complete (${fmtPct(pct(done, total))})</span></div>
    <div class="stat"><strong>${attempted.length}</strong><span>Different questions attempted</span></div>
    <div class="stat"><strong>${tot.n ? fmtPct(pct(tot.c, tot.n)) : "--"}</strong><span>All-time accuracy (${tot.n} attempts)</span></div>
    <div class="stat"><strong>${state.history.length}</strong><span>Practice sets finished</span></div>
  </div>
  ${bar(pct(done, total), done === total)}
  <div class="section-head"><h2>By domain and objective</h2></div>
  <div class="question-list">${domainCards}</div>
  <div class="section-head"><h2>Practice history</h2></div>
  ${hist ? `<div class="table-wrap"><table><thead><tr><th>Finished</th><th>Practice</th><th>Correct</th><th>Score</th></tr></thead><tbody>${hist}</tbody></table></div>` : `<p class="muted">No finished practice sets yet.</p>`}
  <div class="section-head"><h2>Backup</h2></div>
  <p class="muted small">Export saves all progress to a JSON file. Import merges a file into this browser (latest change wins per question).</p>
  <div class="button-row"><button class="secondary" type="button" data-action="export">Export progress</button><button class="secondary" type="button" data-action="import">Import progress</button><button class="quiet" type="button" data-action="reset">Reset all progress</button></div>`;
}
