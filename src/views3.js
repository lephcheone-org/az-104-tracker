/* ---------- study guide ---------- */
function renderStudy() {
  const R = research;
  const toc = [["facts", "Exam facts"], ["outline", "Skills outline"], ["paths", "Learning paths"], ["plan", "Study plan"], ["technique", "Exam technique"], ["links", "Official links"], ["about", "About this bank"]];
  const outline = blueprint.domains.map(d => `<h3>${d.id} ${escapeHTML(d.fullName)} <span class="muted small">(${escapeHTML(d.weight)})</span></h3>
    ${d.groups.map(g => `<h4 style="margin:12px 0 4px">${escapeHTML(g.name)}</h4><ul>${g.objectives.map(o => {
      const n = questions.filter(q => q.objective === o.id).length;
      return `<li><span class="mono small muted">${o.id}</span> ${escapeHTML(o.name)} <span class="muted small">&middot; ${n} question${n === 1 ? "" : "s"}</span></li>`;
    }).join("")}</ul>`).join("")}`).join("");
  main.innerHTML = `
  <div class="eyebrow">Study guide</div>
  <h1 class="page-title">AZ-104 study guide</h1>
  <p class="lead">${escapeHTML(R.intro || "")}</p>
  <div class="study-layout">
    <nav class="study-toc" aria-label="Study guide sections">${toc.map(([id, t]) => `<a href="#study/${id}">${t}</a>`).join("")}</nav>
    <div>
      <section class="study-section" id="study-facts"><h2>Exam facts</h2>
        <div class="table-wrap"><table><tbody>${(R.facts || []).map(f => `<tr><th scope="row" style="width:34%">${escapeHTML(f.label)}</th><td>${mdInline(f.value)}</td></tr>`).join("")}</tbody></table></div>
        <p class="muted small">Checked against Microsoft Learn on ${escapeHTML(R.checkedOn || blueprint.researchedOn)}. Microsoft can change exam details; confirm on the official pages before you book.</p></section>
      <section class="study-section" id="study-outline"><h2>Skills outline</h2><p class="muted">Official skills measured as of ${escapeHTML(blueprint.skillsAsOf)}, with the number of practice questions per objective.</p>${outline}</section>
      <section class="study-section" id="study-paths"><h2>Microsoft Learn learning paths</h2>
        <ul>${(R.learningPaths || []).map(p => `<li>${link(p.url, p.title)}${p.note ? ` <span class="muted small">&middot; ${escapeHTML(p.note)}</span>` : ""}</li>`).join("")}</ul></section>
      <section class="study-section" id="study-plan"><h2>Suggested study plan</h2><p class="muted small">Recommendation, not an official Microsoft requirement.</p>
        <ol class="steps">${(R.plan || []).map(p => `<li><strong>${escapeHTML(p.title)}</strong> ${mdInline(p.detail)}</li>`).join("")}</ol></section>
      <section class="study-section" id="study-technique"><h2>Exam technique</h2>${md(R.technique || "")}</section>
      <section class="study-section" id="study-links"><h2>Official links</h2>
        <ul class="references">${(R.links || []).map(l => `<li>${link(l.url, l.title)}${l.note ? ` <span class="muted small">&middot; ${escapeHTML(l.note)}</span>` : ""}</li>`).join("")}</ul></section>
      <section class="study-section" id="study-about"><h2>About this bank</h2>${md(R.methodology || "")}<p class="muted small">Bank version ${escapeHTML(DATA.bankVersion || "")}, built ${escapeHTML(builtOn || "")}.</p></section>
    </div>
  </div>`;
}

/* ---------- sync ---------- */
function renderSync() {
  main.innerHTML = `
  <div class="eyebrow">Cross-device sync</div>
  <h1 class="page-title">Sync progress with a GitHub Gist</h1>
  <p class="lead">Your Mark as Complete ticks, attempt stats, history and unfinished practice are saved to a <strong>secret gist</strong> in your own GitHub account. Connect each device with the same token and they stay in step.</p>
  <div class="grid-2">
    <div class="card">
      <h2>Status</h2>
      <p><span class="sync-dot ${{ ok: "ok", busy: "busy", err: "err" }[gist.status] || ""}"></span><span id="sync-status-text">${escapeHTML(syncStatusText())}</span></p>
      ${gist.token ? `<p class="small muted">Gist ID: <span class="mono">${escapeHTML(gist.gistId || "(not created yet)")}</span>${gist.gistId ? ` &middot; ${link(`https://gist.github.com/${gist.gistId}`, "open on GitHub")}` : ""}</p>
      <div class="button-row"><button class="primary" type="button" data-action="sync-now">Sync now</button><button class="quiet" type="button" data-action="disconnect">Disconnect this device</button></div>
      <p class="small muted">Disconnecting removes the token from this browser only. Your gist and local progress are kept.</p>` :
      `<form class="form-grid" data-form="connect">
        <label for="gist-token">Fine-grained personal access token</label>
        <input id="gist-token" name="token" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_..." required>
        <label for="gist-id">Gist ID <span class="muted">(optional; leave blank to find or create it automatically)</span></label>
        <input id="gist-id" name="gistId" type="text" autocomplete="off" spellcheck="false">
        <div class="button-row"><button class="primary" type="submit">Connect and sync</button></div>
        <p class="error-text" id="connect-error" hidden></p>
      </form>`}
    </div>
    <div class="card">
      <h2>Create the token (once)</h2>
      <ol class="steps small">
        <li>Sign in to GitHub and open ${link("https://github.com/settings/personal-access-tokens/new", "Settings > Developer settings > Fine-grained tokens > Generate new token")}.</li>
        <li><strong>Token name:</strong> AZ-104 practice sync. <strong>Expiration:</strong> pick a date (for example 90 days).</li>
        <li><strong>Repository access:</strong> leave as <em>Public repositories</em> (read-only). No repository access is needed.</li>
        <li><strong>Permissions &gt; Account permissions &gt; Gists:</strong> set to <em>Read and write</em>. Leave everything else as <em>No access</em>.</li>
        <li>Generate the token, copy it, and paste it here. Use the same token on your other devices, or create one per device.</li>
      </ol>
    </div>
  </div>
  <div class="section-head"><h2>Security notes</h2></div>
  <ul class="small">
    <li>The token is stored in this browser's local storage and sent only to <span class="mono">api.github.com</span>. It is never written into the HTML file or the gist.</li>
    <li>A token with only the Gists permission cannot read or change your repositories, but it can read and write <em>all</em> your gists. Do not connect on shared or public computers.</li>
    <li>Secret gists are unlisted, not encrypted: anyone with the URL can view the file. It contains only question IDs, dates and scores.</li>
    <li>When the token expires, sync shows an error. Create a new token and reconnect; your progress is still in the gist.</li>
    <li>Sync runs when the page opens, when you return to the tab, and a few seconds after each change. Conflicts are merged per question (latest change wins).</li>
  </ul>`;
}

/* ---------- router & rendering ---------- */
const routes = { home: renderHome, practice: renderPractice, results: renderResults, review: renderReview, library: renderLibrary, progress: renderProgress, study: renderStudy, sync: renderSync };
const navFor = { review: "practice", results: "practice" };
function render({ keepScroll = false } = {}) {
  const [name, arg] = (location.hash.slice(1) || "home").split("/");
  const route = routes[name] ? name : "home";
  const y = window.scrollY;
  routes[route](arg);
  const current = navFor[route] || route;
  document.querySelectorAll("nav a[data-nav]").forEach(a => {
    if (a.dataset.nav === current) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  if (route === "study" && arg) document.getElementById(`study-${arg}`)?.scrollIntoView();
  else if (keepScroll) window.scrollTo(0, y);
  else window.scrollTo(0, 0);
  document.title = `AZ-104 Practice Lab${route !== "home" ? ` - ${route[0].toUpperCase()}${route.slice(1)}` : ""}`;
}
function goPractice(session) {
  state.session = session; persist();
  if (location.hash === "#practice") render(); else location.hash = "#practice";
}
function finishSession() {
  const s = state.session;
  if (!s || s.finishedAt) return;
  for (const id of s.ids) {
    const a = s.answers[id];
    if (a && a.length && !(s.feedback === "immediate" && s.checked.includes(id))) recordAttempt(questionMap.get(id), grade(questionMap.get(id), a));
  }
  s.finishedAt = nowISO(); touchSession();
  const r = scoreSession(s);
  state.history.unshift({ id: s.id, mode: s.mode, domain: s.domain, total: r.total, correct: r.correct, answered: r.answered, percentage: r.percentage, startedAt: s.startedAt, finishedAt: s.finishedAt });
  persist();
  location.hash = "#results";
}
const confirmDialog = document.getElementById("confirm-dialog");
function ask(title, message, okLabel = "Confirm") {
  return new Promise(resolve => {
    if (!confirmDialog?.showModal) { resolve(window.confirm(message)); return; }
    confirmDialog.querySelector("h2").textContent = title;
    confirmDialog.querySelector("p").textContent = message;
    confirmDialog.querySelector("[value=ok]").textContent = okLabel;
    confirmDialog.returnValue = "";
    confirmDialog.onclose = () => resolve(confirmDialog.returnValue === "ok");
    confirmDialog.showModal();
  });
}
