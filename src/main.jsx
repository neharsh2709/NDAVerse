
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen, CalendarDays, CheckCircle2, Circle, ChevronLeft,
  ChevronRight, Clock3, Download, GraduationCap, Menu, Plus,
  RotateCcw, Search, Settings2, Target, Trash2, TrendingUp,
  Upload, X, Atom, FlaskConical, Sigma
} from "lucide-react";
import "./style.css";

const START = "2026-11-01";
const END = "2027-07-31";


const subjects = [
  {
    id: "maths",
    name: "Maths",
    color: "#a78bfa",
    icon: Sigma,
    total: 184
  },
  {
    id: "physics",
    name: "Physics",
    color: "#60a5fa",
    icon: Atom,
    total: 205
  },
  {
    id: "chemistry",
    name: "Chemistry",
    color: "#34d399",
    icon: FlaskConical,
    total: 317
  }
];


const initial = () => ({
  chapters: subjects.map(s => ({
    id: s.id + "-starter",
    subject: s.id,
    name: s.name + " — replace with chapter names",
    total: s.total
  })),
  completed: {},
  settings: { start: START, end: END, hours: 2, questions: 45 }
});

const get = () => {
  try {
    return JSON.parse(localStorage.getItem("jeeVersePlanner") || "null") || initial();
  } catch {
    return initial();
  }
};

const dt = s => new Date(s + "T12:00:00");
const key = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const add = (s, n) => {
  const d = dt(s);
  d.setDate(d.getDate() + n);
  return key(d);
};
const fmt = s => dt(s).toLocaleDateString("en-IN", {
  weekday: "long", day: "numeric", month: "short", year: "numeric"
});


function makePlan(state) {
  const dates = [];

  for (
    let d = state.settings.start;
    d <= state.settings.end;
    d = add(d, 1)
  ) {
    dates.push(d);
  }

  const chapters = state.chapters.map(c => ({
    ...c,
    left: Math.max(0, Number(c.total) || 0)
  }));

  const lectureDays = dates.filter(d => dt(d).getDay() !== 0);
  const total = chapters.reduce((sum, c) => sum + c.left, 0);
  const totalDays = lectureDays.length;

  const output = {};
  let previousTarget = 0;
  let dayIndex = 0;
  let chapterIndex = 0;

  for (const date of dates) {
    if (dt(date).getDay() === 0) {
      output[date] = {
        test: true,
        lectures: [],
        tasks: [
          ["test", "Weekly mixed test (timed)"],
          ["analysis", "Analyse mistakes and update error log"],
          ["revision", "Revise formulas, reactions and weak topics"]
        ]
      };
      continue;
    }

    dayIndex++;

    // Spread extra lectures evenly across the whole schedule.
    const target = Math.round((dayIndex * total) / totalDays);
    let count = target - previousTarget;
    previousTarget = target;

    const lectures = [];
    let checked = 0;

    while (
      count > 0 &&
      chapters.some(c => c.left > 0) &&
      checked < chapters.length * (total + 1)
    ) {
      if (chapters.length === 0) break;

      const chapter = chapters[chapterIndex];

      if (chapter.left > 0) {
        chapter.left--;

        const existing = lectures.find(
          item => item.chapterId === chapter.id
        );

        if (existing) {
          existing.count++;
        } else {
          lectures.push({
            chapterId: chapter.id,
            name: chapter.name,
            subject: chapter.subject,
            count: 1
          });
        }

        count--;
      }

      chapterIndex = (chapterIndex + 1) % chapters.length;
      checked++;
    }

    output[date] = {
      test: false,
      lectures,
      tasks: [
        ["questions", "Solve questions from today's lecture topics"],
        ["revision", "Same-day revision: notes + active recall"],
        ["spaced", "15-minute revision of an older topic"],
        ["error", "Update formula / mistake notebook"]
      ]
    };
  }

  return output;
}


function App() {
  const [state, setState] = useState(get);
  const [page, setPage] = useState("Dashboard");
  const [date, setDate] = useState(START);
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    localStorage.setItem("jeeVersePlanner", JSON.stringify(state));
  }, [state]);

  const plan = useMemo(() => makePlan(state), [state]);
  const day = plan[date] || { lectures: [], tasks: [] };
  const total = state.chapters.reduce((a, c) => a + (Number(c.total) || 0), 0);
  const done = Object.entries(state.completed).filter(
    ([k, v]) => v && k.includes(":lecture:")
  ).length;
  const all = Object.values(state.completed).filter(Boolean).length;

  const subject = id => subjects.find(s => s.id === id) || subjects[0];

  const toggle = k => setState(s => ({
    ...s,
    completed: { ...s.completed, [k]: !s.completed[k] }
  }));

  const notify = message => {
    setToast(message);
    setTimeout(() => setToast(""), 2200);
  };

  const update = (id, field, value) => setState(s => ({
    ...s,
    chapters: s.chapters.map(c =>
      c.id === id
        ? { ...c, [field]: field === "total" ? Math.max(0, Number(value) || 0) : value }
        : c
    )
  }));

  const exportFile = () => {
    const a = document.createElement("a");
    const url = URL.createObjectURL(new Blob(
      [JSON.stringify(state, null, 2)],
      { type: "application/json" }
    ));
    a.href = url;
    a.download = "jee-verse-progress.json";
    a.click();
    URL.revokeObjectURL(url);
    notify("Backup exported");
  };

  const importFile = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.chapters && data.completed && data.settings) {
          setState(data);
          notify("Backup imported");
        } else {
          notify("Invalid backup");
        }
      } catch {
        notify("Could not read backup");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  const nav = ["Dashboard", "Daily targets", "Chapter tracker", "Revision & tests"];
  const navIcon = [TrendingUp, CalendarDays, BookOpen, RotateCcw];

  const checkRow = (id, title, detail, color, tag) => (
    <button
      className={"check " + (state.completed[id] ? "checked" : "")}
      key={id}
      onClick={() => toggle(id)}
    >
      <span style={{ color: state.completed[id] ? "#34d399" : color }}>
        {state.completed[id] ? <CheckCircle2 size={20} /> : <Circle size={20} />}
      </span>
      <span className="checkcopy">
        <b>{title}</b>
        <small>{detail}</small>
      </span>
      <em>{tag}</em>
    </button>
  );

  return (
    <div className="shell">
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <div className="brand">
          <span className="brandicon"><GraduationCap /></span>
          <span><b>JEEVerse</b><small>BACKLOG COMMAND CENTRE</small></span>
          <button className="close" onClick={() => setMenu(false)}><X /></button>
        </div>

        <p className="navlabel">WORKSPACE</p>
        {nav.map((name, i) => {
          const Icon = navIcon[i];
          return (
            <button
              key={name}
              className={"nav " + (page === name ? "active" : "")}
              onClick={() => { setPage(name); setMenu(false); }}
            >
              <Icon size={18} />{name}
            </button>
          );
        })}

        <div className="sidebottom">
          <div className="deadline">
            <small>FINAL DEADLINE</small>
            <b>31 JUL 2027</b>
            <span>Every lecture. Every revision.</span>
            <div className="bar"><i /></div>
          </div>
          <small className="saved">● Saved on this device</small>
        </div>
      </aside>

      {menu && <div className="scrim" onClick={() => setMenu(false)} />}

      <main>
        <header>
          <button className="hamb" onClick={() => setMenu(true)}><Menu /></button>
          <div>
            <small>JEE PREPARATION / {page.toUpperCase()}</small>
            <h1>{page === "Dashboard" ? "Your study cockpit" : page}</h1>
          </div>
          <div className="actions">
            <span className="autosave">● Auto-saved</span>
            <button className="iconbtn" onClick={exportFile} title="Export progress">
              <Download size={17} />
            </button>
            <label className="iconbtn" title="Import progress">
              <Upload size={17} />
              <input hidden type="file" accept="application/json" onChange={importFile} />
            </label>
          </div>
        </header>

        {page === "Dashboard" && (
          <section className="content">
            <div className="hero">
              <div>
                <small className="eyebrow">✦ YOUR 2026–27 ROADMAP</small>
                <h2>Small targets.<br /><i>Serious consistency.</i></h2>
                <p>
                  One clear day at a time. Finish your lecture backlog, practise
                  questions, and test what you learn before 31 July 2027.
                </p>
                <button className="primary" onClick={() => setPage("Daily targets")}>
                  Open daily targets <ChevronRight size={17} />
                </button>
              </div>
              <div className="heroart">
                <div className="orbit" />
                <div className="core"><Target size={34} /><b>JEE</b><small>2027</small></div>
                <span className="float">✓ Daily targets</span>
              </div>
            </div>

            <div className="stats">
              {[
                [BookOpen, "LECTURES IN PLAN", total, "Across 5 subjects"],
                [CheckCircle2, "LECTURE ITEMS CHECKED", done, "Track completion daily"],
                [TrendingUp, "CHECKLIST ITEMS", all, "Progress saved locally"],
                [CalendarDays, "FINISH BY", "31 Jul", "2027 deadline"]
              ].map(([Icon, label, value, detail]) => (
                <div className="stat" key={label}>
                  <Icon size={20} /><small>{label}</small><b>{value}</b><span>{detail}</span>
                </div>
              ))}
            </div>

            <div className="heading">
              <div><small className="eyebrow">YOUR SUBJECTS</small><h3>Backlog at a glance</h3></div>
              <button className="link" onClick={() => setPage("Chapter tracker")}>Edit chapter counts →</button>
            </div>

            <div className="subjects">
              {subjects.map(s => {
                const count = state.chapters
                  .filter(c => c.subject === s.id)
                  .reduce((a, c) => a + (Number(c.total) || 0), 0);
                const Icon = s.icon;
                return (
                  <div className="subject" key={s.id}>
                    <span style={{ color: s.color }}><Icon size={20} /></span>
                    <small>{s.name}</small>
                    <b>{count}<i> lectures</i></b>
                    <div className="bar"><i style={{ background: s.color, width: "0%" }} /></div>
                    <em>Target count: {count}</em>
                  </div>
                );
              })}
            </div>

            <div className="panels">
              <div className="panel">
                <h3>Study system</h3><p>Follow the same sequence each study day.</p>
                <div className="minirow"><b>1. Lecture</b><span>Watch actively and make concise notes</span></div>
                <div className="minirow"><b>2. Questions</b><span>25–40 questions from today's topics</span></div>
                <div className="minirow"><b>3. Revision</b><span>Same day, after 1 day, after 7 days</span></div>
              </div>
              <div className="panel">
                <h3>Plan timeline</h3><p>1 Nov 2026 — 31 Jul 2027</p>
                <div className="minirow"><b>Start the backlog</b><span>1 November 2026</span></div>
                <div className="minirow"><b>Weekly testing</b><span>Every Sunday</span></div>
                <div className="minirow"><b>Finish planned lectures</b><span>31 July 2027</span></div>
              </div>
            </div>
          </section>
        )}

        {page === "Daily targets" && (
          <section className="content">
            <div className="datehead">
              <button className="iconbtn" onClick={() => setDate(d => d <= START ? START : add(d, -1))}><ChevronLeft /></button>
              <div>
                <small className="eyebrow">YOUR TARGET SHEET</small>
                <h2>{fmt(date)}</h2>
                <p>{day.test ? "Test + revision day" : "Lecture day — complete in order, then practise"}</p>
              </div>
              <button className="iconbtn" onClick={() => setDate(d => d >= END ? END : add(d, 1))}><ChevronRight /></button>
              <button className="secondary" onClick={() => {
                const today = key(new Date());
                setDate(today < START ? START : today > END ? END : today);
              }}>Jump to today</button>
            </div>

            <div className="dailygrid">
              <div className="panel">
                <div className="paneltop">
                  <div><h3>{day.test ? "Sunday test protocol" : "Today's work"}</h3><p>Check off each item as you finish</p></div>
                  <span className="pill">
                    {Object.keys(state.completed).filter(k => k.startsWith(date + ":") && state.completed[k]).length} done
                  </span>
                </div>

                {!day.test && <>
                  <h4>LECTURE TARGETS</h4>
                  {day.lectures.map((lecture, i) => checkRow(
                    `${date}:lecture:${lecture.chapterId}:${i}`,
                    lecture.name,
                    subject(lecture.subject).name + " · " + lecture.count + " lecture(s)",
                    subject(lecture.subject).color,
                    lecture.count + "x"
                  ))}
                  {!day.lectures.length && <p className="muted">All lectures allocated. Use today for questions and revision.</p>}
                </>}

                <h4>{day.test ? "TEST & REVISION" : "QUESTIONS, REVISION & REVIEW"}</h4>
                {day.tasks.map(([id, title]) => checkRow(
                  date + ":" + id,
                  title,
                  id === "questions" ? "Aim for 25–40 questions; mark doubts" :
                  id === "test" ? "60–90 minutes, closed book" :
                  id === "revision" ? "Short focused session" : "Focused review",
                  id === "test" ? "#fb923c" : id === "revision" ? "#34d399" : "#60a5fa",
                  id.toUpperCase()
                ))}

                <div className="notice">
                  <Clock3 size={18} />
                  <span><b>Suggested order:</b> lecture → short break → questions → revise notes at night. Split long lectures into focused blocks.</span>
                </div>
              </div>

              <div className="panel">
                <h3>Weekly rhythm</h3><p>Repeat every week</p>
                {[
                  ["Mon–Sat", "Lectures + same-day questions"],
                  ["Sunday", "Mixed test + mistake analysis"],
                  ["Every evening", "Formula / reaction recall"],
                  ["Every 4 weeks", "Cumulative test + backlog audit"]
                ].map(([a, b]) => <div className="minirow" key={a}><b>{a}</b><span>{b}</span></div>)}

                <h3 className="calendarTitle">Choose a date</h3>
                <input className="dateinput" type="date" min={START} max={END} value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>
          </section>
        )}

        {page === "Chapter tracker" && (
          <section className="content">
            <div className="intro">
              <div>
                <small className="eyebrow">MAKE THE PLAN YOURS</small>
                <h2>Chapter tracker</h2>
                <p>Add exact chapter names and remaining lecture counts. The schedule redistributes targets automatically.</p>
              </div>
              <button className="primary" onClick={() => setState(s => ({
                ...s,
                chapters: [...s.chapters, {
                  id: "c-" + Date.now(), subject: "maths", name: "New chapter", total: 0
                }]
              }))}><Plus size={16} /> Add chapter</button>
            </div>

            <div className="notice">
              <Settings2 size={18} />
              <span><b>Important:</b> Starter entries use subject totals, not verified chapter breakdowns. Replace them with your actual chapters. Keep each subject's sum equal to its remaining lectures.</span>
            </div>

            <div className="toolbar">
              <div className="search"><Search size={17} /><input placeholder="Search chapters or subjects…" value={search} onChange={e => setSearch(e.target.value)} /></div>
              <span>{state.chapters.length} rows · {total} lectures</span>
            </div>

            <div className="chapterlist">
              {state.chapters.filter(c => (c.name + " " + subject(c.subject).name).toLowerCase().includes(search.toLowerCase())).map(c => (
                <div className="chapter" key={c.id}>
                  <i style={{ background: subject(c.subject).color }} />
                  <div className="fields">
                    <label>Chapter name<input value={c.name} onChange={e => update(c.id, "name", e.target.value)} /></label>
                    <label>Subject<select value={c.subject} onChange={e => update(c.id, "subject", e.target.value)}>
                      {subjects.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}
                    </select></label>
                    <label>Lectures<input type="number" min="0" value={c.total} onChange={e => update(c.id, "total", e.target.value)} /></label>
                  </div>
                  <button className="delete" onClick={() => setState(s => ({
                    ...s, chapters: s.chapters.filter(x => x.id !== c.id)
                  }))}><Trash2 size={17} /></button>
                </div>
              ))}
            </div>

            <div className="panel settings">
              <h3>Schedule settings</h3>
              <div className="fields settingsfields">
                <label>Start date<input type="date" value={state.settings.start} onChange={e => setState(s => ({ ...s, settings: { ...s.settings, start: e.target.value } }))} /></label>
                <label>Deadline<input type="date" value={state.settings.end} onChange={e => setState(s => ({ ...s, settings: { ...s.settings, end: e.target.value } }))} /></label>
                <label>Lecture length (hours)<input type="number" min=".5" step=".5" value={state.settings.hours} onChange={e => setState(s => ({ ...s, settings: { ...s.settings, hours: Number(e.target.value) } }))} /></label>
                <label>Questions (minutes/day)<input type="number" min="15" step="15" value={state.settings.questions} onChange={e => setState(s => ({ ...s, settings: { ...s.settings, questions: Number(e.target.value) } }))} /></label>
              </div>
              <p className="muted">{total} lectures · approximately {(total * state.settings.hours).toLocaleString()} total lecture-hours</p>
            </div>
          </section>
        )}

        {page === "Revision & tests" && (
          <section className="content">
            <div className="intro">
              <div>
                <small className="eyebrow">RETAIN WHAT YOU LEARN</small>
                <h2>Revision & testing system</h2>
                <p>A lecture is only the first pass. Use this cycle to turn it into exam-ready knowledge.</p>
              </div>
            </div>

            <div className="revisioncards">
              {[
                ["01", "Same day", "20–45 min", [
                  "Recall key ideas without looking", "Review notes and formulas",
                  "Solve 25–40 basic questions", "Mark doubts in an error log"
                ]],
                ["02", "After 1 day", "15–20 min", [
                  "Recall formulas from memory", "Redo yesterday's incorrect questions",
                  "Review reactions and exceptions"
                ]],
                ["03", "After 7 days", "30–45 min", [
                  "Attempt mixed chapter questions", "Redo marked / incorrect questions",
                  "Update error notebook"
                ]],
                ["04", "After 30 days", "45–60 min", [
                  "Take a timed chapter test", "Analyse accuracy and time",
                  "Revisit weak topics within 48 hours"
                ]]
              ].map(([number, title, time, items]) => (
                <div className="revisioncard" key={number}>
                  <small>{number} · {time}</small><h3>{title}</h3>
                  <ul>{items.map(item => <li key={item}>{item}</li>)}</ul>
                </div>
              ))}
            </div>

            <div className="panels">
              <div className="panel">
                <h3>Testing calendar</h3>
                {[
                  ["Every Sunday", "Mixed test on topics studied that week", "60–90 min"],
                  ["After each chapter", "Chapter test before moving on", "45–90 min"],
                  ["Last Sunday monthly", "Cumulative test from prior chapters", "2–3 hours"],
                  ["After every test", "Analyse wrong and guessed answers", "Same day"]
                ].map(item => (
                  <div className="testrow" key={item[0]}>
                    <b>{item[0]}</b><span>{item[1]}</span><em>{item[2]}</em>
                  </div>
                ))}
              </div>
              <div className="panel">
                <h3>Question practice ladder</h3>
                {[
                  ["1", "Lecture examples", "Redo without seeing the solution"],
                  ["2", "Basic chapter questions", "Build accuracy before speed"],
                  ["3", "JEE Main PYQs", "Start when core concepts are clear"],
                  ["4", "Advanced problems", "After Main-level practice"]
                ].map(item => (
                  <div className="minirow" key={item[0]}>
                    <b>{item[0]}. {item[1]}</b><span>{item[2]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="notice">
              <Clock3 size={18} />
              <span><b>Protect sleep and consistency.</b> If the daily load becomes unrealistic, adjust the target rather than skipping question practice and revision for weeks.</span>
            </div>
          </section>
        )}

        <footer>JEEVerse Planner · Progress saves in this browser on this device</footer>
      </main>

      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
