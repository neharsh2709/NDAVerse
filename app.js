"use strict";
const KEY = "nda-planner-v2", REV = [1, 3, 7, 14], Q_AFTER = 2, E_AFTER = 5, BUFFER = 30;
const DEF = { exam: "", perDay: 0, lectures: [], done: {}, log: {}, tab: "today", theme: "dark" };
let S = load(), OPEN = new Set();

function load() { try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY))); } catch (e) { return { ...DEF }; } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const P = s => new Date(s + "T00:00:00");
const add = (s, n) => { const d = P(s); d.setDate(d.getDate() + n); return iso(d); };
const diff = (a, b) => Math.round((P(b) - P(a)) / 864e5);
const today = () => iso(new Date());
const nice = s => P(s).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const fmt = s => P(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const bar = (a, b) => `<div class="bar"><i style="width:${b ? Math.round(a / b * 100) : 0}%"></i></div>`;

/* ---------- scheduling logic ---------- */
// Revision 1-4 (next day, 3, 7, 14 days after the lecture), then question practice and error review.
function revTasks() {
  const out = [];
  S.lectures.filter(l => l.done).forEach(l => {
    REV.forEach((n, i) => out.push({ k: l.id + ":R" + (i + 1), due: add(l.doneOn, n), type: "R", label: "Revision " + (i + 1), l }));
    out.push({ k: l.id + ":Q", due: add(l.doneOn, Q_AFTER), type: "Q", label: "Question practice", l });
    out.push({ k: l.id + ":E", due: add(l.doneOn, E_AFTER), type: "E", label: "Error review", l });
  });
  return out.filter(x => !S.exam || x.due <= S.exam);
}
const isDone = x => !!S.done[x.k];

function perDay() {
  if (S.perDay > 0) return S.perDay;
  const t = today(), tot = S.lectures.filter(l => !l.done || l.doneOn === t).length;
  if (!tot) return 0;
  if (!S.exam) return Math.min(tot, 2);
  return Math.ceil(tot / Math.max(1, diff(t, S.exam) - BUFFER + 1)); // finish syllabus BUFFER days before exam
}
function targets() {
  const t = today(), doneToday = S.lectures.filter(l => l.done && l.doneOn === t);
  const pend = S.lectures.filter(l => !l.done);
  return [...doneToday, ...pend.slice(0, Math.max(0, perDay() - doneToday.length))];
}
function streak() {
  let n = 0, d = today();
  if (!(S.log[d] > 0)) d = add(d, -1);
  while (S.log[d] > 0) { n++; d = add(d, -1); }
  return n;
}
function estimate() {
  const done = S.lectures.filter(l => l.done), rem = S.lectures.length - done.length;
  if (!S.lectures.length) return "Add lectures to see the estimate.";
  if (!rem) return "Syllabus complete 🎉";
  let pace = perDay() || 1;
  if (done.length >= 2) {
    const first = done.map(l => l.doneOn).sort()[0];
    pace = done.length / Math.max(1, diff(first, today()) + 1);
  }
  const end = add(today(), Math.ceil(rem / pace));
  let s = `At your pace you finish lectures by <b>${fmt(end)}</b>.`;
  if (S.exam) s += end <= add(S.exam, -BUFFER) ? " ✅ On track." : " ⚠️ Behind: speed up to keep the last 30 days for revision.";
  return s;
}

/* ---------- views ---------- */
const taskCard = (x, over) => `<div class="task ${x.type}${over ? " over" : ""}${isDone(x) ? " done" : ""}"><button class="chk" data-t="${x.k}" aria-label="Toggle"></button><div><b>${esc(x.l.name)}</b><small>${esc(x.l.subject)} · ${esc(x.l.chapter)}${over ? " · due " + nice(x.due) : ""}</small></div><span class="pill">${x.label}</span></div>`;
const lecCard = l => `<div class="task L${l.done ? " done" : ""}"><button class="chk" data-t="${l.id}:L" aria-label="Toggle"></button><div><b>${esc(l.name)}</b><small>${esc(l.subject)} · ${esc(l.chapter)}</small></div><span class="pill">Lecture</span></div>`;

function vToday() {
  const t = today(), tg = targets();
  const due = revTasks().filter(x => (!isDone(x) && x.due <= t) || S.done[x.k] === t);
  const od = due.filter(x => !isDone(x) && x.due < t);
  const rest = due.filter(x => !od.includes(x));
  const total = tg.length + due.length, dn = tg.filter(l => l.done).length + due.filter(isDone).length;
  const pct = total ? Math.round(dn / total * 100) : 0;
  const sec = (title, list, fn) => list.length ? `<h2>${title}</h2>` + list.map(fn).join("") : "";
  return `<section class="hero"><div class="ring" style="--p:${pct}"><span>${pct}%</span></div><div><h1>Good Day!</h1><p>${dn} of ${total} tasks done today</p><p class="streak">🔥 ${streak()} day streak</p></div></section>`
    + sec("Overdue", od, x => taskCard(x, true))
    + sec("Today’s lecture targets", tg, lecCard)
    + sec("Revision", rest.filter(x => x.type === "R"), x => taskCard(x))
    + sec("Question practice and error review", rest.filter(x => x.type !== "R"), x => taskCard(x))
    + (total ? "" : `<p class="empty">Nothing due today. Add your lectures in the Lectures tab.</p>`);
}

function vLectures() {
  const g = {};
  S.lectures.forEach(l => { ((g[l.subject] ??= {})[l.chapter] ??= []).push(l); });
  const tree = Object.entries(g).map(([s, chs]) => {
    const all = Object.values(chs).flat(), d = all.filter(l => l.done).length;
    return `<details data-o="${esc(s)}" ${OPEN.has(s) ? "open" : ""}><summary><b>${esc(s)}</b><small>${d}/${all.length} done · ${all.length - d} pending</small>${bar(d, all.length)}</summary>`
      + Object.entries(chs).map(([c, ls]) => {
        const k = s + "/" + c, dd = ls.filter(l => l.done).length;
        return `<details class="ch" data-o="${esc(k)}" ${OPEN.has(k) ? "open" : ""}><summary>${esc(c)}<small>${dd}/${ls.length}</small></summary>`
          + ls.map(l => `<div class="lec${l.done ? " done" : ""}"><button class="chk" data-t="${l.id}:L" aria-label="Toggle"></button><span>${esc(l.name)}</span><button class="x" data-del="${l.id}" aria-label="Delete">×</button></div>`).join("") + `</details>`;
      }).join("") + `</details>`;
  }).join("");
  return `<h2>Add lectures</h2><div class="card"><label>One per line: Subject | Chapter | Lecture</label>
    <textarea id="bulk" placeholder="Maths | Sets | Lecture 1&#10;Maths | Sets | Lecture 2&#10;Physics | Motion | Lecture 1"></textarea>
    <button class="btn" id="addBulk">Add lectures</button></div>
    <h2>Subject → Chapter → Lecture (${S.lectures.length})</h2>` + (tree || `<p class="empty">No lectures yet.</p>`);
}

function vProgress() {
  const t = today(), tl = S.lectures.length, dl = S.lectures.filter(l => l.done).length;
  const subs = [...new Set(S.lectures.map(l => l.subject))];
  const up = revTasks().filter(x => !isDone(x) && x.due > t && x.due <= add(t, 7));
  let upHtml = "", cur = "";
  up.sort((a, b) => a.due.localeCompare(b.due)).forEach(x => { if (x.due !== cur) { cur = x.due; upHtml += `<div class="day">${nice(cur)}</div>`; } upHtml += taskCard(x); });
  return `<h2>Syllabus</h2><div class="card"><b>${dl}/${tl} lectures completed · ${tl - dl} pending</b>${bar(dl, tl)}<p>${estimate()}</p>${S.exam ? `<small>${Math.max(0, diff(t, S.exam))} days to exam</small>` : ""}</div>`
    + subs.map(s => { const a = S.lectures.filter(l => l.subject === s), d = a.filter(l => l.done).length; return `<div class="card"><b>${esc(s)}</b> <small>${d}/${a.length}</small>${bar(d, a.length)}</div>`; }).join("")
    + `<h2>Next 7 days</h2>` + (upHtml || `<p class="empty">No upcoming revisions.</p>`)
    + `<h2>Settings</h2><div class="card"><div class="g"><div><label>Exam date</label><input type="date" id="exam" value="${S.exam}"></div>
    <div><label>Lectures per day (0 = auto)</label><input type="number" id="perday" min="0" value="${S.perDay}"></div></div>
    <label>Backup (data lives only in this browser)</label><textarea id="bk" style="min-height:70px"></textarea>
    <div class="g"><button class="btn s" id="exp">Show backup</button><button class="btn s" id="imp">Restore</button></div>
    <button class="btn s" id="reset">Delete all data</button></div>`;
}

function vAbout() {
  return `<section class="hero about"><div class="mark">📚</div><div><h1>NDA Study Planner</h1><p>Plan lectures, revise on time, practise questions and finish the syllabus before the exam.</p></div></section>
    <h2>How it works</h2>
    <div class="card"><b>1. Track lectures</b><br><small>Add Subject, Chapter and Lecture, then tick each one when done.</small></div>
    <div class="card"><b>2. Smart revision</b><br><small>Revision 1, 2, 3 and 4 come after 1, 3, 7 and 14 days.</small></div>
    <div class="card"><b>3. Practice</b><br><small>Question practice on day 2 and error review on day 5.</small></div>
    <div class="card"><b>4. Stay on pace</b><br><small>Set your exam date to get daily lecture targets and an estimated completion date.</small></div>
    <p class="credit">Designed and developed by<br><b>Neharsh Shende</b></p>`;
}

function render() {
  document.documentElement.dataset.theme = S.theme;
  const V = { today: vToday, lectures: vLectures, progress: vProgress, about: vAbout };
  $("#app").innerHTML = V[S.tab]();
  $("#nav").innerHTML = [["today", "Today"], ["lectures", "Lectures"], ["progress", "Progress"], ["about", "About"]]
    .map(([k, n]) => `<button data-tab="${k}" class="${S.tab === k ? "on" : ""}">${n}</button>`).join("");
}

/* ---------- events ---------- */
function toggle(key) {
  const [id, ty] = key.split(":"), t = today();
  if (ty === "L") {
    const l = S.lectures.find(x => x.id === id); if (!l) return;
    l.done = !l.done; l.doneOn = l.done ? t : null;
    S.log[t] = Math.max(0, (S.log[t] || 0) + (l.done ? 1 : -1));
  } else if (S.done[key]) { delete S.done[key]; S.log[t] = Math.max(0, (S.log[t] || 0) - 1); }
  else { S.done[key] = t; S.log[t] = (S.log[t] || 0) + 1; }
}
document.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.id === "theme") { S.theme = S.theme === "dark" ? "light" : "dark"; save(); render(); return; }
  if (b.dataset.tab) { S.tab = b.dataset.tab; save(); render(); scrollTo(0, 0); return; }
  if (b.dataset.t) { toggle(b.dataset.t); save(); render(); return; }
  if (b.dataset.del) { S.lectures = S.lectures.filter(l => l.id !== b.dataset.del); save(); render(); return; }
  if (b.id === "addBulk") {
    $("#bulk").value.split("\n").map(s => s.trim()).filter(Boolean).forEach(line => {
      const p = line.split("|").map(s => s.trim()); if (p.length < 2 || !p[0] || !p[1]) return;
      S.lectures.push({ id: uid(), subject: p[0], chapter: p[1], name: p[2] || p[1], done: false, doneOn: null });
    });
    save(); render(); return;
  }
  if (b.id === "exp") { $("#bk").value = JSON.stringify(S); return; }
  if (b.id === "imp") { try { const p = JSON.parse($("#bk").value); if (Array.isArray(p.lectures)) { S = Object.assign({}, DEF, p); save(); render(); } } catch (err) {} return; }
  if (b.id === "reset") { if (confirm("Delete all lectures and progress?")) { S = { ...DEF }; save(); render(); } }
});
document.addEventListener("change", e => {
  if (e.target.id === "exam") { S.exam = e.target.value; save(); render(); }
  if (e.target.id === "perday") { S.perDay = Math.max(0, parseInt(e.target.value) || 0); save(); render(); }
});
document.addEventListener("toggle", e => {
  const o = e.target.dataset && e.target.dataset.o; if (!o) return;
  e.target.open ? OPEN.add(o) : OPEN.delete(o);
}, true);
render();
