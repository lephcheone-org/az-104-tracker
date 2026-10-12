/* ---------- events ---------- */
function currentAnswerFromForm(form, q) {
  return [...form.querySelectorAll("input[data-option]:checked")].map(i => i.value).filter(v => q.options.some(o => o.id === v));
}
document.addEventListener("change", e => {
  const t = e.target;
  if (t.matches("input[data-complete]")) { setComplete(t.dataset.complete, t.checked); return; }
  const form = t.closest("form");
  if (form?.dataset.form === "answer" && t.matches("input[data-option]")) {
    const s = state.session, id = s.ids[s.index], q = questionMap.get(id);
    if (isRevealed(s, id)) return;
    const a = currentAnswerFromForm(form, q);
    if (a.length) s.answers[id] = a; else delete s.answers[id];
    touchSession(); persist();
    render({ keepScroll: true });
    return;
  }
  if (form?.dataset.form === "library" && t.name && t.name !== "q") {
    libFilter[t.name] = t.value; libFilter.limit = 40;
    if (t.name === "domain") { libFilter.objective = ""; renderLibrary(); } else renderLibraryResults();
  }
  if (t.id === "import-file" && t.files?.[0]) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const incoming = sanitizeState(JSON.parse(reader.result));
        state = mergeStates(state, incoming); persist();
        notice(`Imported progress: ${Object.values(incoming.completed).filter(v => v.done).length} completed questions, ${incoming.history.length} finished practice sets.`, "success");
        render();
      } catch (err) { notice(`That file could not be imported: ${err.message}`); }
      t.value = "";
    };
    reader.readAsText(t.files[0]);
  }
});
let searchTimer = null;
document.addEventListener("input", e => {
  if (e.target.name === "q" && e.target.closest("form")?.dataset.form === "library") {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { libFilter.q = e.target.value; libFilter.limit = 40; renderLibraryResults(); }, 200);
  }
});
document.addEventListener("toggle", e => {
  if (e.target.matches?.("details.bank-item[data-bank]") && e.target.open) fillBankItem(e.target);
}, true);
document.addEventListener("submit", async e => {
  const form = e.target, kind = form.dataset.form;
  if (!kind) return;
  e.preventDefault();
  const fd = new FormData(form);
  if (kind === "start-domain" || kind === "start-exam") {
    if (state.session && !state.session.finishedAt && !(await ask("Replace unfinished practice?", "Starting a new practice discards the unfinished one. Questions you marked complete are kept.", "Start new"))) return;
    goPractice(createSession({ mode: kind === "start-exam" ? "exam" : "domain", domain: fd.get("domain"), feedback: fd.get("feedback"), preferIncomplete: fd.get("prefer") === "on" }));
  } else if (kind === "bank-try") {
    const q = questionMap.get(form.dataset.qid);
    const a = currentAnswerFromForm(form, q);
    if (!a.length) { notice("Select an answer first.", "warning"); return; }
    recordAttempt(q, grade(q, a)); persist();
    showBankAnswer(form, q, a);
  } else if (kind === "connect") {
    const err = document.getElementById("connect-error");
    err.hidden = true;
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Connecting...";
    try { await connectGist(String(fd.get("token")), String(fd.get("gistId") || "")); if (gist.status === "err") throw new Error(gist.message); render(); }
    catch (ex) { disconnectGist(); err.textContent = ex.message; err.hidden = false; btn.disabled = false; btn.textContent = "Connect and sync"; }
  }
});
function showBankAnswer(form, q, answer) {
  form.querySelector("fieldset").outerHTML = optionsHTML(q, { answer: answer || [], revealed: true, disabled: true, name: `bank-${q.id}` });
  form.querySelector(".button-row").innerHTML = `<button class="quiet" type="button" data-action="bank-reset">Try again</button>`;
  form.parentElement.querySelector(".bank-explain").innerHTML = explanationHTML(q, answer);
}
document.addEventListener("click", async e => {
  const goto = e.target.closest("[data-goto]");
  if (goto && state.session) { state.session.index = +goto.dataset.goto; touchSession(); persist(); render(); return; }
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action, s = state.session;
  switch (action) {
    case "prev": if (s.index > 0) { s.index--; touchSession(); persist(); render(); } break;
    case "next": if (s.index < s.ids.length - 1) { s.index++; touchSession(); persist(); render(); } break;
    case "flag": {
      const id = s.ids[s.index];
      s.flags = s.flags.includes(id) ? s.flags.filter(x => x !== id) : [...s.flags, id];
      touchSession(); persist(); render({ keepScroll: true }); break;
    }
    case "check": {
      const id = s.ids[s.index], q = questionMap.get(id), a = s.answers[id] || [];
      if (!a.length || s.checked.includes(id)) break;
      s.checked.push(id); recordAttempt(q, grade(q, a)); touchSession(); persist(); render({ keepScroll: true }); break;
    }
    case "finish": {
      const open = s.ids.filter(id => !(s.answers[id] || []).length).length;
      const msg = open ? `${open} question${open === 1 ? " is" : "s are"} unanswered and will be marked wrong.` : "You have answered every question.";
      if (await ask("Finish this practice?", `${msg} You will see your results and full explanations.`, "Finish")) finishSession();
      break;
    }
    case "discard-session":
      if (await ask("Discard this practice?", "Your answers in this practice are removed. Questions marked complete and attempt stats are kept.", "Discard")) {
        state.session = null; persist(); location.hash = "#home"; render();
      }
      break;
    case "retry-wrong": {
      const ids = shuffle(s.ids.filter(id => !grade(questionMap.get(id), s.answers[id] || [])));
      if (!ids.length) break;
      goPractice({ id: uid(), mode: s.mode, domain: s.domain, label: `Retry: ${s.label?.replace(/^Retry: /, "") || (s.mode === "exam" ? "Full practice exam" : domainLabel(s.domain))}`,
        feedback: "immediate", ids, index: 0, answers: {}, checked: [], flags: [], startedAt: nowISO(), finishedAt: null, updatedAt: nowISO() });
      break;
    }
    case "expand-all": case "collapse-all":
      el.closest(".feedback").querySelectorAll("details.answer-section").forEach(d => { d.open = action === "expand-all"; }); break;
    case "lib-more": libFilter.limit += 40; renderLibraryResults(); break;
    case "bank-reveal": { const form = el.closest("form"); showBankAnswer(form, questionMap.get(form.dataset.qid), null); break; }
    case "bank-reset": {
      const details = el.closest("details.bank-item");
      delete details.querySelector(".bank-body").dataset.filled; fillBankItem(details); break;
    }
    case "export": {
      const blob = new Blob([JSON.stringify({ ...state, exportedAt: nowISO(), bankVersion: DATA.bankVersion }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = `az104-progress-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      break;
    }
    case "import": document.getElementById("import-file").click(); break;
    case "reset":
      if (await ask("Reset all progress?", `This clears every Mark as Complete tick, attempt stats, history and any unfinished practice${gist.token ? " on all synced devices" : ""}. Export first if you want a backup.`, "Reset everything")) {
        state = { ...emptyState(), resetAt: nowISO() }; persist(); render();
      }
      break;
    case "sync-now": syncNow({ rerender: true }); break;
    case "disconnect":
      if (await ask("Disconnect this device?", "The token is removed from this browser. Progress stays in this browser and in your gist.", "Disconnect")) { disconnectGist(); render(); }
      break;
    case "theme": {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("az104-theme", next); } catch { /* ignore */ }
      el.setAttribute("aria-label", `Switch to ${next === "dark" ? "light" : "dark"} theme`);
      break;
    }
  }
});
document.addEventListener("keydown", e => {
  if (!location.hash.startsWith("#practice") || !state.session || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.target.matches("input[type=text], input[type=search], input[type=password], textarea, select")) return;
  if (e.key === "ArrowRight") document.querySelector('[data-action="next"]')?.click();
  else if (e.key === "ArrowLeft") document.querySelector('[data-action="prev"]')?.click();
});
window.addEventListener("hashchange", () => render());
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncNow(); });
window.addEventListener("online", () => syncNow());
window.addEventListener("storage", e => { if (e.key === STATE_KEY && e.newValue) { try { state = sanitizeState(JSON.parse(e.newValue)); render({ keepScroll: true }); } catch { /* ignore */ } } });

/* ---------- start ---------- */
loadState();
render();
setSyncStatus(gist.token ? "idle" : "off");
if (gist.token) syncNow();
