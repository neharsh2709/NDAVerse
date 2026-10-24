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