
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard, CalendarDays, BookOpen, ChartNoAxesCombined,
  CheckCircle2, Flame, Clock3, Target, ChevronLeft, ChevronRight,
  RotateCcw, Download, Upload, Menu, X, Atom, Calculator,
  GraduationCap, ClipboardCheck, AlertCircle, Sparkles
} from "lucide-react";
import "./style.css";

const START = "2026-11-01";
const END = "2027-07-31";

const SUBJECTS = [
  { id: "maths", name: "Mathematics", short: "Maths", total: 184, icon: Calculator, color: "#8b9cff" },
  { id: "physics", name: "Physics", short: "Physics", total: 205, icon: Atom, color: "#38d9c5" },
  { id: "chemistry", name: "Chemistry", short: "Chemistry", total: 317, icon: Sparkles, color: "#f4b860" }
];

const STORAGE_KEY = "jee-verse-planner-v1";

const dateString = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const parseDate = (value) => new Date(`${value}T12:00:00`);

const addDays = (value, days) => {
  const d = parseDate(value);
  d.setDate(d.getDate() + days);
  return dateString(d);
};

const daysBetween = (a, b) =>
  Math.round((parseDate(b) - parseDate(a)) / 86400000);

const formatDate = (value, options = { day: "numeric", month: "short" }) =>
  parseDate(value).toLocaleDateString("en-IN", options);

const isSunday = (value) => parseDate(value).getDay() === 0;

function buildSchedule() {
  const dates = [];
  for (let d = START; d <= END; d = addDays(d, 1)) dates.push(d);

  const studyDates = dates.filter((d) => !isSunday(d));
  const schedule = {};

  studyDates.forEach((date, index) => {
    schedule[date] = {};
    SUBJECTS.forEach((subject) => {
      const before = Math.floor(index * subject.total / studyDates.length);
      const after = Math.floor((index + 1) * subject.total / studyDates.length);
      const count = after - before;

      schedule[date][subject.id] = Array.from({ length: count }, (_, i) => ({
        id: `${subject.id}-${before + i + 1}`,
        number: before + i + 1
      }));
    });
  });

  dates.filter(isSunday).forEach((date) => {
    schedule[date] = { revision: true };
  });

  return { dates, schedule };
}

const BUILT = buildSchedule();

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completed: {}, notes: {}, chapters: {}, tests: [] };
    return { completed: {}, notes: {}, chapters: {}, tests: [], ...JSON.parse(raw) };
  } catch {
    return { completed: {}, notes: {}, chapters: {}, tests: [] };
  }
}

function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function getToday() {
  const today = dateString(new Date());
  if (today < START) return START;
  if (today > END) return END;
  return today;
}

function App() {
  const [progress, setProgress] = useState(loadProgress);
  const [selectedDate, setSelectedDate] = useState(getToday);
  const [page, setPage] = useState("Dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [chapterSubject, setChapterSubject] = useState("maths");
  const [chapterName, setChapterName] = useState("");
  const [testName, setTestName] = useState("");
  const [testScore, setTestScore] = useState("");
  const [testTotal, setTestTotal] = useState("100");
  const [testDate, setTestDate] = useState(getToday);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const update = (fn) => setProgress((old) => fn(old));

  const toggleLecture = (id) => update((old) => {
    const completed = { ...old.completed };
    if (completed[id]) delete completed[id];
    else completed[id] = true;
    return { ...old, completed };
  });

  const allLectures = useMemo(() => {
    const list = [];
    BUILT.dates.forEach((date) => {
      SUBJECTS.forEach((subject) => {
        (BUILT.schedule[date]?.[subject.id] || []).forEach((lecture) => {
          list.push({ ...lecture, date, subjectId: subject.id });
        });
      });
    });
    return list;
  }, []);

  const completedCount = allLectures.filter((l) => progress.completed[l.id]).length;
  const totalCount = SUBJECTS.reduce((sum, s) => sum + s.total, 0);
  const remaining = totalCount - completedCount;
  const percent = Math.round(completedCount / totalCount * 100);

  const subjectStats = SUBJECTS.map((subject) => {
    const lectures = allLectures.filter((l) => l.subjectId === subject.id);
    const done = lectures.filter((l) => progress.completed[l.id]).length;
    return { ...subject, done, pending: subject.total - done, percent: Math.round(done / subject.total * 100) };
  });

  const todayDone = (date) => {
    const tasks = SUBJECTS.flatMap((s) =>
      (BUILT.schedule[date]?.[s.id] || []).map((l) => l.id)
    );
    return tasks.filter((id) => progress.completed[id]).length;
  };

  const todayTasks = SUBJECTS.flatMap((s) =>
    (BUILT.schedule[selectedDate]?.[s.id] || []).map((l) => ({
      ...l, subject: s
    }))
  );

  const todayCompleted = todayTasks.filter((t) => progress.completed[t.id]).length;

  const overdue = allLectures.filter(
    (l) => l.date < getToday() && !progress.completed[l.id]
  );

  const streak = useMemo(() => {
    let count = 0;
    let day = getToday();

    while (day >= START) {
      if (isSunday(day)) {
        day = addDays(day, -1);
        continue;
      }
      const ids = SUBJECTS.flatMap((s) =>
        (BUILT.schedule[day]?.[s.id] || []).map((l) => l.id)
      );
      if (!ids.length || !ids.every((id) => progress.completed[id])) break;
      count++;
      day = addDays(day, -1);
    }
    return count;
  }, [progress.completed]);

  const weekly = useMemo(() => {
    const end = parseDate(selectedDate);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const startStr = dateString(start);
    const items = allLectures.filter((l) => l.date >= startStr && l.date <= selectedDate);
    return {
      total: items.length,
      done: items.filter((l) => progress.completed[l.id]).length
    };
  }, [selectedDate, progress.completed, allLectures]);

  const monthData = useMemo(() => {
    const month = selectedDate.slice(0, 7);
    const items = allLectures.filter((l) => l.date.startsWith(month));
    return {
      total: items.length,
      done: items.filter((l) => progress.completed[l.id]).length
    };
  }, [selectedDate, progress.completed, allLectures]);

  const changeDate = (amount) => {
    const next = addDays(selectedDate, amount);
    if (next >= START && next <= END) setSelectedDate(next);
  };

  const addChapter = (e) => {
    e.preventDefault();
    if (!chapterName.trim()) return;
    const id = `${chapterSubject}-${Date.now()}`;
    update((old) => ({
      ...old,
      chapters: {
        ...old.chapters,
        [id]: { id, name: chapterName.trim(), subject: chapterSubject, done: false }
      }
    }));
    setChapterName("");
  };

  const toggleChapter = (id) => update((old) => ({
    ...old,
    chapters: {
      ...old.chapters,
      [id]: { ...old.chapters[id], done: !old.chapters[id].done }
    }
  }));

  const addTest = (e) => {
    e.preventDefault();
    if (!testName.trim() || testScore === "") return;
    update((old) => ({
      ...old,
      tests: [...old.tests, {
        id: Date.now(),
        name: testName.trim(),
        score: Number(testScore),
        total: Number(testTotal) || 100,
        date: testDate
      }]
    }));
    setTestName("");
    setTestScore("");
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(progress, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jee-verse-progress.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data && typeof data.completed === "object") {
          setProgress({
            completed: data.completed || {},
            notes: data.notes || {},
            chapters: data.chapters || {},
            tests: data.tests || []
          });
        } else {
          alert("This backup file is not valid.");
        }
      } catch {
        alert("Could not read that backup file.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const resetProgress = () => {
    if (!window.confirm("Reset all completed lectures, chapters, notes and test scores?")) return;
    setProgress({ completed: {}, notes: {}, chapters: {}, tests: [] });
  };

  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Daily Plan", icon: CalendarDays },
    { name: "Chapters", icon: BookOpen },
    { name: "Analytics", icon: ChartNoAxesCombined },
    { name: "Tests & Revision", icon: ClipboardCheck }
  ];

  return (
    <div className="app-shell">
      {mobileMenu && <button className="mobile-overlay" onClick={() => setMobileMenu(false)} aria-label="Close menu" />}
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon"><GraduationCap size={25} /></div>
          <div><strong>JEEVerse</strong><small>YOUR STUDY SPACE</small></div>
          <button className="mobile-close icon-button" onClick={() => setMobileMenu(false)}><X /></button>
        </div>

        <div className="sidebar-label">WORKSPACE</div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.name} className={`nav-link ${page === item.name ? "active" : ""}`}
                onClick={() => { setPage(item.name); setMobileMenu(false); }}>
                <Icon size={19} /><span>{item.name}</span>
                {item.name === "Daily Plan" && <span className="nav-dot" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="goal-card">
            <div className="goal-heading"><Target size={17} /> Your goal</div>
            <strong>706 lectures</strong>
            <small>Finish by 31 July 2027</small>
            <div className="mini-track"><span style={{ width: `${percent}%` }} /></div>
            <small>{percent}% completed</small>
          </div>
          <div className="sidebar-foot">Built for your JEE journey ✦</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu /></button>
          <div className="breadcrumb">Workspace <span>/</span> <strong>{page}</strong></div>
          <div className="topbar-right">
            <span className="date-pill"><CalendarDays size={15} /> {formatDate(getToday(), { day: "numeric", month: "short", year: "numeric" })}</span>
            <div className="avatar">J</div>
          </div>
        </header>

        <div className="content">
          <div className="welcome-row">
            <div>
              <p className="eyebrow">YOUR JEE PREPARATION</p>
              <h1>{page === "Dashboard" ? "Your progress, at a glance." : page}</h1>
              <p className="subheading">Small daily steps. Consistent preparation. One clear goal.</p>
            </div>
            <button className="secondary-button" onClick={exportBackup}><Download size={16} /> Export progress</button>
          </div>

          {page === "Dashboard" && (
            <>
              <section className="hero-card">
                <div className="hero-copy">
                  <div className="hero-tag"><Sparkles size={14} /> YOUR PERSONAL STUDY PLAN</div>
                  <h2>One lecture at a time.<br /><span>One step closer to JEE.</span></h2>
                  <p>Your plan runs from 1 November 2026 to 31 July 2027. Targets are spread across study days, with Sundays reserved for revision and tests.</p>
                  <button className="primary-button" onClick={() => setPage("Daily Plan")}>View today's plan <ChevronRight size={17} /></button>
                </div>
                <div className="hero-graphic"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" /><div className="planet"><GraduationCap size={43} /></div><span className="float-star star-one">✦</span><span className="float-star star-two">✧</span></div>
              </section>

              <section className="stats-grid">
                <StatCard label="Lectures completed" value={`${completedCount} / ${totalCount}`} sub={`${remaining} lectures remaining`} icon={CheckCircle2} color="mint" />
                <StatCard label="Overall progress" value={`${percent}%`} sub="Across all three subjects" icon={ChartNoAxesCombined} color="blue" />
                <StatCard label="Current streak" value={`${streak} days`} sub="Complete all daily targets" icon={Flame} color="orange" />
                <StatCard label="Backlog lectures" value={overdue.length} sub="Past targets not completed" icon={AlertCircle} color="pink" />
              </section>

              <div className="section-heading"><div><h2>Subject progress</h2><p>Track all 706 lectures</p></div><button className="text-button" onClick={() => setPage("Analytics")}>View analytics <ChevronRight size={16} /></button></div>
              <section className="subject-grid">
                {subjectStats.map((s) => {
                  const Icon = s.icon;
                  return <article className="subject-card" key={s.id}>
                    <div className="subject-top"><div className="subject-icon" style={{ "--subject-color": s.color }}><Icon size={22} /></div><span className="subject-total">{s.total} lectures</span></div>
                    <h3>{s.name}</h3><p>{s.done} completed · {s.pending} remaining</p>
                    <div className="progress-track"><span style={{ width: `${s.percent}%`, background: s.color }} /></div>
                    <div className="progress-caption"><span>{s.percent}% complete</span><span>{s.pending} left</span></div>
                  </article>;
                })}
              </section>

              <div className="bottom-grid">
                <section className="panel">
                  <div className="panel-heading"><div><h2>Today's focus</h2><p>{formatDate(getToday(), { weekday: "long", day: "numeric", month: "long" })}</p></div><button className="icon-button" onClick={() => { setSelectedDate(getToday()); setPage("Daily Plan"); }}><ChevronRight /></button></div>
                  {BUILT.schedule[getToday()]?.revision ? <div className="revision-banner"><ClipboardCheck /><div><strong>Sunday revision day</strong><p>Revise completed topics and attempt a mock test.</p></div></div> :
                    <div className="focus-list">{SUBJECTS.map((s) => {
                      const tasks = BUILT.schedule[getToday()]?.[s.id] || [];
                      return <div className="focus-row" key={s.id}><span className="focus-dot" style={{ background: s.color }} /><div><strong>{s.name}</strong><small>{tasks.length} lecture{tasks.length !== 1 ? "s" : ""} planned</small></div><span className="focus-count">{tasks.filter((l) => progress.completed[l.id]).length}/{tasks.length}</span></div>;
                    })}</div>}
                </section>
                <section className="panel">
                  <div className="panel-heading"><div><h2>Weekly consistency</h2><p>Last 7 days ending {formatDate(selectedDate)}</p></div><span className="round-icon"><Flame size={18} /></span></div>
                  <div className="weekly-number">{weekly.done}<span> / {weekly.total}</span></div><p className="muted">lectures completed this week</p>
                  <div className="progress-track"><span style={{ width: `${weekly.total ? weekly.done / weekly.total * 100 : 0}%`, background: "#38d9c5" }} /></div>
                  <button className="text-button space-top" onClick={() => setPage("Analytics")}>See weekly & monthly report <ChevronRight size={16} /></button>
                </section>
              </div>
            </>
          )}

          {page === "Daily Plan" && (
            <>
              <div className="date-navigator">
                <button className="icon-button" disabled={selectedDate <= START} onClick={() => changeDate(-1)}><ChevronLeft /></button>
                <div><h2>{formatDate(selectedDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h2><p>{isSunday(selectedDate) ? "Revision and mock-test day" : "Your planned lecture targets"}</p></div>
                <button className="icon-button" disabled={selectedDate >= END} onClick={() => changeDate(1)}><ChevronRight /></button>
                <button className="secondary-button" onClick={() => setSelectedDate(getToday())}>Today</button>
              </div>
              <div className="daily-summary"><div><span>Today's target</span><strong>{todayTasks.length} lectures</strong></div><div><span>Completed</span><strong>{todayCompleted} lectures</strong></div><div><span>Remaining</span><strong>{todayTasks.length - todayCompleted} lectures</strong></div></div>
              {isSunday(selectedDate) && <div className="revision-banner sunday-banner"><ClipboardCheck /><div><strong>Sunday: revise, don't rush ahead</strong><p>Review the week's notes, solve questions and attempt a mock test. Catch up on unfinished lectures if needed.</p></div></div>}
              <section className="panel daily-panel">
                <div className="panel-heading"><div><h2>Lecture checklist</h2><p>Tick a lecture after completing it.</p></div><span className="completion-badge">{todayCompleted}/{todayTasks.length}</span></div>
                {todayTasks.length === 0 ? <div className="empty-state"><CalendarDays size={30} /><h3>Revision day</h3><p>No regular lecture targets are scheduled for Sunday.</p></div> :
                  SUBJECTS.map((subject) => {
                    const tasks = BUILT.schedule[selectedDate]?.[subject.id] || [];
                    if (!tasks.length) return null;
                    return <div className="task-group" key={subject.id}><h3><span className="focus-dot" style={{ background: subject.color }} />{subject.name}<small>{tasks.filter((t) => progress.completed[t.id]).length}/{tasks.length}</small></h3>
                      {tasks.map((task) => <label className={`lecture-task ${progress.completed[task.id] ? "task-done" : ""}`} key={task.id}><input type="checkbox" checked={!!progress.completed[task.id]} onChange={() => toggleLecture(task.id)} /><span className="custom-check"><CheckCircle2 size={17} /></span><span className="task-name">Lecture {task.number}</span><span className="task-status">{progress.completed[task.id] ? "Completed" : "Pending"}</span></label>)}
                    </div>;
                  })}
              </section>
              <section className="panel notes-panel"><h2>Daily notes</h2><p>Write down questions, doubts or revision reminders.</p><textarea value={progress.notes?.[selectedDate] || ""} onChange={(e) => update((old) => ({ ...old, notes: { ...old.notes, [selectedDate]: e.target.value } }))} placeholder="What did you learn today? What needs revision?" rows={4} /></section>
            </>
          )}

          {page === "Chapters" && (
            <>
              <div className="panel">
                <div className="panel-heading"><div><h2>Chapter tracker</h2><p>Add chapters and mark them complete as you finish them.</p></div><BookOpen /></div>
                <form className="chapter-form" onSubmit={addChapter}>
                  <select value={chapterSubject} onChange={(e) => setChapterSubject(e.target.value)}>{SUBJECTS.map((s) => <option value={s.id} key={s.id}>{s.name}</option>)}</select>
                  <input value={chapterName} onChange={(e) => setChapterName(e.target.value)} placeholder="Enter chapter name" required />
                  <button className="primary-button" type="submit">Add chapter</button>
                </form>
                {Object.values(progress.chapters || {}).length === 0 ? <div className="empty-state"><BookOpen size={30} /><h3>No chapters added yet</h3><p>Add your first chapter above.</p></div> :
                  SUBJECTS.map((s) => {
                    const chapters = Object.values(progress.chapters || {}).filter((c) => c.subject === s.id);
                    if (!chapters.length) return null;
                    return <div className="task-group" key={s.id}><h3><span className="focus-dot" style={{ background: s.color }} />{s.name}<small>{chapters.filter((c) => c.done).length}/{chapters.length}</small></h3>
                      {chapters.map((c) => <div className={`chapter-row ${c.done ? "task-done" : ""}`} key={c.id}><label><input type="checkbox" checked={c.done} onChange={() => toggleChapter(c.id)} /><span className="custom-check"><CheckCircle2 size={17} /></span><span>{c.name}</span></label><button className="icon-button delete-button" title="Delete chapter" onClick={() => update((old) => { const chapters = { ...old.chapters }; delete chapters[c.id]; return { ...old, chapters }; })}><X size={16} /></button></div>)}
                    </div>;
                  })}
              </div>
            </>
          )}

          {page === "Analytics" && (
            <>
              <section className="stats-grid">
                <StatCard label="Total completion" value={`${percent}%`} sub={`${completedCount} of ${totalCount} lectures`} icon={Target} color="mint" />
                <StatCard label="Last 7 days" value={`${weekly.done}/${weekly.total}`} sub="Lectures completed" icon={CalendarDays} color="blue" />
                <StatCard label="This month" value={`${monthData.done}/${monthData.total}`} sub="Lectures completed" icon={ChartNoAxesCombined} color="orange" />
                <StatCard label="Overdue backlog" value={overdue.length} sub="Unfinished past targets" icon={AlertCircle} color="pink" />
              </section>
              <section className="panel analytics-panel"><div className="panel-heading"><div><h2>Subject breakdown</h2><p>Progress against each subject's total</p></div></div>
                {subjectStats.map((s) => <div className="analytics-subject" key={s.id}><div className="analytics-subject-top"><strong>{s.name}</strong><span>{s.done}/{s.total} · {s.percent}%</span></div><div className="progress-track"><span style={{ width: `${s.percent}%`, background: s.color }} /></div></div>)}
              </section>
              <section className="panel"><div className="panel-heading"><div><h2>Plan overview</h2><p>1 November 2026 – 31 July 2027</p></div></div><div className="overview-grid"><div><span>Total lectures</span><strong>706</strong></div><div><span>Study days</span><strong>{BUILT.dates.filter((d) => !isSunday(d)).length}</strong></div><div><span>Average lectures/study day</span><strong>{(706 / BUILT.dates.filter((d) => !isSunday(d)).length).toFixed(2)}</strong></div><div><span>Deadline</span><strong>31 Jul 2027</strong></div></div></section>
            </>
          )}

          {page === "Tests & Revision" && (
            <>
              <section className="panel"><div className="panel-heading"><div><h2>Log a test result</h2><p>Record your mock-test scores and track improvement.</p></div><ClipboardCheck /></div>
                <form className="test-form" onSubmit={addTest}>
                  <label>Test name<input value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="e.g. Full syllabus mock 1" required /></label>
                  <label>Test date<input type="date" value={testDate} min={START} max={END} onChange={(e) => setTestDate(e.target.value)} required /></label>
                  <div className="score-inputs"><label>Your score<input type="number" min="0" value={testScore} onChange={(e) => setTestScore(e.target.value)} required /></label><label>Maximum marks<input type="number" min="1" value={testTotal} onChange={(e) => setTestTotal(e.target.value)} required /></label></div>
                  <button className="primary-button" type="submit">Save test result</button>
                </form>
              </section>
              <section className="panel"><div className="panel-heading"><div><h2>Test history</h2><p>{progress.tests.length} test{progress.tests.length !== 1 ? "s" : ""} recorded</p></div></div>
                {!progress.tests.length ? <div className="empty-state"><ClipboardCheck size={30} /><h3>No tests recorded</h3><p>Add your first mock-test result above.</p></div> :
                  [...progress.tests].sort((a, b) => b.date.localeCompare(a.date)).map((t) => <div className="test-row" key={t.id}><div><strong>{t.name}</strong><small>{formatDate(t.date, { day: "numeric", month: "short", year: "numeric" })}</small></div><strong>{t.score}/{t.total}<small>{Math.round(t.score / t.total * 100)}%</small></strong><button className="icon-button delete-button" onClick={() => update((old) => ({ ...old, tests: old.tests.filter((x) => x.id !== t.id) }))}><X size={16} /></button></div>)}
              </section>
            </>
          )}

          <footer className="footer"><span>JEEVerse Planner</span><span>Consistency beats intensity ✦</span><button className="text-button" onClick={resetProgress}><RotateCcw size={14} /> Reset all progress</button></footer>
          <div className="data-tools"><span>Progress is saved on this device.</span><label className="text-button import-label"><Upload size={14} /> Import backup<input type="file" accept=".json,application/json" onChange={importBackup} hidden /></label></div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }) {
  return <article className="stat-card"><div className={`stat-icon ${color}`}><Icon size={20} /></div><div className="stat-label">{label}</div><strong className="stat-value">{value}</strong><p>{sub}</p></article>;
}

createRoot(document.getElementById("root")).render(<App />);
