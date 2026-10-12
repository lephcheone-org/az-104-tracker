"use strict";
const DATA = JSON.parse(document.getElementById("bank").textContent);
const { blueprint, research, questions, builtOn } = DATA;
const questionMap = new Map(questions.map(q => [q.id, q]));
const domainMap = new Map(blueprint.domains.map(d => [d.id, d]));
const objectiveMap = new Map();
const groupMap = new Map();
for (const d of blueprint.domains) for (const g of d.groups) {
  groupMap.set(g.id, { ...g, domain: d.id });
  for (const o of g.objectives) objectiveMap.set(o.id, { ...o, group: g.id, domain: d.id });
}
for (const q of questions) {
  const o = objectiveMap.get(q.objective);
  q.domain = o.domain; q.group = o.group;
}
const EXAM_SIZE = blueprint.domains.reduce((s, d) => s + d.examQuota, 0);
const DOMAIN_SIZE = 25;
const STATE_KEY = "az104-state-v1";
const GIST_KEY = "az104-gist-v1";
const GIST_FILE = "az104-progress.json";
const main = document.getElementById("main");
const typeNames = { single: "Single choice", multiple: "Multiple answers" };

/* ---------- utilities ---------- */
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function shuffle(values) {
  const r = [...values];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}
const pct = (n, d) => d ? 100 * n / d : 0;
const fmtPct = v => `${Math.round(v)}%`;
const nowISO = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
function fmtDate(iso) {
  if (!iso) return "--";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
function link(url, title) {
  return `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(title)} <span aria-hidden="true">&#8599;</span><span class="sr-only"> (opens a new tab)</span></a>`;
}
function bar(value, ok = false) {
  return `<div class="bar ${ok ? "ok" : ""}" role="presentation"><i style="width:${Math.min(100, Math.max(0, value)).toFixed(1)}%"></i></div>`;
}

/* ---------- tiny safe markdown ---------- */
function mdInline(src) {
  return String(src).split(/(`[^`\n]+`)/).map(part => {
    if (/^`[^`\n]+`$/.test(part)) return `<code>${escapeHTML(part.slice(1, -1))}</code>`;
    let s = escapeHTML(part);
    s = s.replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, (m, t, u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`);
    s = s.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, "$1<em>$2</em>");
    return s;
  }).join("");
}
function md(src) {
  if (src == null) return "";
  const lines = String(src).replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let i = 0;
  const isTableSep = l => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
  const cells = l => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.trim());
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const fence = line.match(/^\s*```(\w[\w-]*)?\s*$/);
    if (fence) {
      const buf = []; i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code${fence[1] ? ` data-lang="${escapeHTML(fence[1])}"` : ""}>${escapeHTML(buf.join("\n"))}</code></pre>`);
      continue;
    }
    if (/^\s*#{1,6}\s+/.test(line)) { out.push(`<h5>${mdInline(line.replace(/^\s*#{1,6}\s+/, ""))}</h5>`); i++; continue; }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = cells(line); i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push(`<div class="md-table"><table><thead><tr>${head.map(h => `<th scope="col">${mdInline(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${mdInline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        let item = lines[i++].replace(/^\s*[-*]\s+/, "");
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i])) item += " " + lines[i++].trim();
        items.push(item);
      }
      out.push(`<ul>${items.map(t => `<li>${mdInline(t)}</li>`).join("")}</ul>`);
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      const start = parseInt(line, 10) || 1;
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        let item = lines[i++].replace(/^\s*\d+[.)]\s+/, "");
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+[.)])\s+/.test(lines[i])) item += " " + lines[i++].trim();
        items.push(item);
      }
      out.push(`<ol${start !== 1 ? ` start="${start}"` : ""}>${items.map(t => `<li>${mdInline(t)}</li>`).join("")}</ol>`);
      continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^\s*(```|#{1,6}\s|[-*]\s|\d+[.)]\s|\|)/.test(lines[i])) buf.push(lines[i++].trim());
    if (!buf.length) buf.push(lines[i++].trim());
    out.push(`<p>${mdInline(buf.join(" "))}</p>`);
  }
  return out.join("");
}

/* ---------- state (local + synced) ---------- */
function emptyState() { return { v: 1, completed: {}, stats: {}, history: [], session: null }; }
let state = emptyState();
let storageOK = true;
function notice(message, kind = "warning") {
  const node = document.getElementById("app-notice");
  node.className = `notice ${kind}`;
  node.innerHTML = `${escapeHTML(message)} <button class="quiet" type="button" onclick="this.parentElement.hidden=true" style="margin-left:8px">Dismiss</button>`;
  node.hidden = false;
}
function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) state = sanitizeState(JSON.parse(raw));
  } catch (e) {
    storageOK = false;
    notice(`Browser storage is unavailable (${e.name}). Progress works in this tab only; use Export or Gist sync to keep it.`);
  }
}
function persist({ sync = true } = {}) {
  if (storageOK) {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); }
    catch (e) { storageOK = false; notice(`Could not save progress in this browser (${e.name}). Use Export or Gist sync.`); }
  }
  if (sync) scheduleSync();
}
function sanitizeSession(s) {
  if (!s || typeof s !== "object" || !Array.isArray(s.ids) || !s.ids.length) return null;
  if (s.ids.some(id => !questionMap.has(id))) return null;
  s.answers = s.answers && typeof s.answers === "object" ? s.answers : {};
  for (const [id, a] of Object.entries(s.answers)) {
    if (!s.ids.includes(id) || !Array.isArray(a)) delete s.answers[id];
  }
  s.flags = Array.isArray(s.flags) ? s.flags.filter(id => s.ids.includes(id)) : [];
  s.checked = Array.isArray(s.checked) ? s.checked.filter(id => s.ids.includes(id)) : [];
  s.index = Number.isInteger(s.index) && s.index >= 0 && s.index < s.ids.length ? s.index : 0;
  if (!["immediate", "end"].includes(s.feedback)) s.feedback = "immediate";
  return s;
}
function sanitizeState(raw) {
  const s = emptyState();
  if (!raw || typeof raw !== "object") return s;
  for (const [id, v] of Object.entries(raw.completed || {})) if (v && typeof v.at === "string") s.completed[id] = { done: !!v.done, at: v.at };
  for (const [id, v] of Object.entries(raw.stats || {})) if (v && typeof v.at === "string") s.stats[id] = { n: +v.n || 0, correct: +v.correct || 0, last: !!v.last, at: v.at };
  s.history = Array.isArray(raw.history) ? raw.history.filter(h => h && h.id && h.finishedAt).slice(0, 500) : [];
  s.session = sanitizeSession(raw.session);
  if (typeof raw.resetAt === "string") s.resetAt = raw.resetAt;
  return s;
}
function applyReset(s) {
  const r = s.resetAt;
  if (!r) return s;
  for (const key of ["completed", "stats"]) for (const [id, v] of Object.entries(s[key])) if (v.at < r) delete s[key][id];
  s.history = s.history.filter(h => h.finishedAt >= r);
  if (s.session && (s.session.updatedAt || "") < r) s.session = null;
  return s;
}
function mergeStates(a, b) {
  const out = emptyState();
  const later = (x, y) => !x ? y : !y ? x : (x.at >= y.at ? x : y);
  for (const key of ["completed", "stats"]) {
    const ids = new Set([...Object.keys(a[key]), ...Object.keys(b[key])]);
    for (const id of ids) out[key][id] = later(a[key][id], b[key][id]);
  }
  const hist = new Map();
  for (const h of [...a.history, ...b.history]) hist.set(h.id, h);
  out.history = [...hist.values()].sort((x, y) => y.finishedAt.localeCompare(x.finishedAt)).slice(0, 500);
  const sa = a.session, sb = b.session;
  out.session = !sa ? sb : !sb ? sa : ((sa.updatedAt || "") >= (sb.updatedAt || "") ? sa : sb);
  const resets = [a.resetAt, b.resetAt].filter(Boolean).sort();
  if (resets.length) out.resetAt = resets.pop();
  return applyReset(out);
}
const isDone = id => !!state.completed[id]?.done;
function setComplete(id, done) {
  state.completed[id] = { done, at: nowISO() };
  persist();
  refreshCompleteWidgets(id);
}
function recordAttempt(q, ok) {
  const s = state.stats[q.id] || { n: 0, correct: 0 };
  state.stats[q.id] = { n: s.n + 1, correct: s.correct + (ok ? 1 : 0), last: ok, at: nowISO() };
}

/* ---------- grading & sessions ---------- */
function grade(q, answer) {
  if (!Array.isArray(answer) || new Set(answer).size !== answer.length) return false;
  return answer.length === q.correct.length && answer.every(id => q.correct.includes(id));
}
function pickStratified(pool, count, preferIncomplete) {
  const byObjective = new Map();
  const ordered = preferIncomplete ? [...shuffle(pool.filter(q => !isDone(q.id))), ...shuffle(pool.filter(q => isDone(q.id)))] : shuffle(pool);
  for (const q of ordered) {
    if (!byObjective.has(q.objective)) byObjective.set(q.objective, []);
    byObjective.get(q.objective).push(q);
  }
  const buckets = shuffle([...byObjective.values()]);
  if (preferIncomplete) buckets.sort((x, y) => (isDone(x[0].id) ? 1 : 0) - (isDone(y[0].id) ? 1 : 0));
  const picked = [];
  while (picked.length < count && buckets.some(b => b.length)) {
    for (const b of buckets) {
      if (picked.length >= count) break;
      if (!b.length) continue;
      if (preferIncomplete && isDone(b[0].id) && buckets.some(o => o.length && !isDone(o[0].id))) continue;
      picked.push(b.shift());
    }
  }
  return picked;
}
function createSession({ mode, domain, feedback, preferIncomplete }) {
  let chosen = [];
  if (mode === "domain") {
    const pool = questions.filter(q => q.domain === domain);
    chosen = pickStratified(pool, Math.min(DOMAIN_SIZE, pool.length), preferIncomplete);
  } else {
    for (const d of blueprint.domains) {
      const pool = questions.filter(q => q.domain === d.id);
      chosen.push(...pickStratified(pool, Math.min(d.examQuota, pool.length), preferIncomplete));
    }
    chosen = shuffle(chosen);
  }
  return { id: uid(), mode, domain: mode === "domain" ? domain : null, feedback, ids: chosen.map(q => q.id), index: 0,
    answers: {}, checked: [], flags: [], startedAt: nowISO(), finishedAt: null, updatedAt: nowISO() };
}
function touchSession() { if (state.session) state.session.updatedAt = nowISO(); }
function isRevealed(s, id) { return !!s.finishedAt || (s.feedback === "immediate" && s.checked.includes(id)); }
function scoreSession(s) {
  let correct = 0, answered = 0;
  const byDomain = {}, byGroup = {};
  for (const id of s.ids) {
    const q = questionMap.get(id);
    const d = byDomain[q.domain] ||= { total: 0, answered: 0, correct: 0 };
    const g = byGroup[q.group] ||= { total: 0, answered: 0, correct: 0 };
    d.total++; g.total++;
    const a = s.answers[id];
    if (a && a.length) {
      answered++; d.answered++; g.answered++;
      if (grade(q, a)) { correct++; d.correct++; g.correct++; }
    }
  }
  return { total: s.ids.length, answered, correct, unanswered: s.ids.length - answered,
    percentage: pct(correct, s.ids.length), accuracy: pct(correct, answered), byDomain, byGroup };
}

/* ---------- GitHub Gist sync ---------- */
let gist = { token: "", gistId: "", login: "", lastSync: null, status: "off", message: "" };
try { Object.assign(gist, JSON.parse(localStorage.getItem(GIST_KEY) || "{}")); } catch { /* ignore */ }
gist.status = gist.token ? "idle" : "off";
function saveGistConfig() {
  const { token, gistId, login, lastSync } = gist;
  try { localStorage.setItem(GIST_KEY, JSON.stringify({ token, gistId, login, lastSync })); } catch { /* ignore */ }
}
async function gh(path, options = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${gist.token}`, "X-GitHub-Api-Version": "2022-11-28",
      ...(options.body ? { "Content-Type": "application/json" } : {}) },
    cache: "no-store"
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).message || ""; } catch { /* ignore */ }
    const hint = res.status === 401 ? " The token is invalid or expired." : res.status === 403 || res.status === 404 ? " Check the token has the Gists (read and write) permission." : "";
    throw new Error(`GitHub API ${res.status}${detail ? `: ${detail}` : ""}.${hint}`);
  }
  return res.status === 204 ? null : res.json();
}
async function findOrCreateGist() {
  for (let page = 1; page <= 10; page++) {
    const list = await gh(`/gists?per_page=100&page=${page}`);
    const found = list.find(g => g.files && g.files[GIST_FILE]);
    if (found) return found.id;
    if (list.length < 100) break;
  }
  const created = await gh("/gists", { method: "POST", body: JSON.stringify({
    description: "AZ-104 Practice Lab progress (auto-managed)", public: false,
    files: { [GIST_FILE]: { content: JSON.stringify(emptyState()) } } }) });
  return created.id;
}
async function pullRemote() {
  const g = await gh(`/gists/${gist.gistId}`);
  const file = g.files?.[GIST_FILE];
  if (!file) return null;
  let content = file.content;
  if (file.truncated) content = await (await fetch(file.raw_url, { cache: "no-store" })).text();
  try { return sanitizeState(JSON.parse(content)); } catch { return null; }
}
let syncTimer = null, syncing = false, syncAgain = false;
function scheduleSync() {
  if (!gist.token) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncNow(), 2500);
}
function setSyncStatus(status, message = "") {
  gist.status = status; gist.message = message;
  const dot = document.getElementById("sync-dot");
  const label = document.getElementById("sync-label");
  if (dot) dot.className = `sync-dot ${{ ok: "ok", busy: "busy", err: "err" }[status] || ""}`;
  if (label) label.textContent = { off: "Sync off", idle: "Sync", busy: "Syncing", ok: "Synced", err: "Sync error" }[status] || "Sync";
  const box = document.getElementById("sync-status-text");
  if (box) box.textContent = syncStatusText();
}
function syncStatusText() {
  if (!gist.token) return "Not connected. Progress is stored only in this browser.";
  if (gist.status === "err") return `Last sync failed: ${gist.message}`;
  if (gist.status === "busy") return "Syncing...";
  return gist.lastSync ? `Last synced ${fmtDate(gist.lastSync)}${gist.login ? ` as ${gist.login}` : ""}.` : "Connected. Not synced yet.";
}
async function syncNow({ rerender = false } = {}) {
  if (!gist.token) return;
  if (!navigator.onLine) { setSyncStatus("err", "You are offline. Changes are saved locally and will sync later."); return; }
  if (syncing) { syncAgain = true; return; }
  syncing = true; setSyncStatus("busy");
  try {
    if (!gist.gistId) { gist.gistId = await findOrCreateGist(); saveGistConfig(); }
    const remote = await pullRemote();
    const before = JSON.stringify(state);
    const merged = remote ? mergeStates(state, remote) : state;
    const mergedText = JSON.stringify(merged);
    if (!remote || mergedText !== JSON.stringify(remote)) {
      await gh(`/gists/${gist.gistId}`, { method: "PATCH", body: JSON.stringify({ files: { [GIST_FILE]: { content: mergedText } } }) });
    }
    if (mergedText !== before) {
      const editing = state.session && !state.session.finishedAt && location.hash.startsWith("#practice");
      const sameSession = merged.session?.id === state.session?.id;
      state = merged; persist({ sync: false });
      if (rerender || !(editing && sameSession)) render({ keepScroll: true });
    }
    gist.lastSync = nowISO(); saveGistConfig(); setSyncStatus("ok");
  } catch (e) {
    setSyncStatus("err", e.message);
  } finally {
    syncing = false;
    if (syncAgain) { syncAgain = false; scheduleSync(); }
  }
}
async function connectGist(token, gistId) {
  gist.token = token.trim(); gist.gistId = gistId.trim();
  const user = await gh("/user");
  gist.login = user.login;
  saveGistConfig();
  await syncNow({ rerender: true });
}
function disconnectGist() {
  gist = { token: "", gistId: "", login: "", lastSync: null, status: "off", message: "" };
  try { localStorage.removeItem(GIST_KEY); } catch { /* ignore */ }
  setSyncStatus("off");
}
