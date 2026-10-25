import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard, CalendarDays, BookOpen, ChartNoAxesCombined,
  CheckCircle2, Flame, Target, ChevronLeft, ChevronRight,
  Download, Upload, Menu, X, Atom, Calculator, GraduationCap,
  ClipboardCheck, AlertTriangle, Sparkles, Clock3, ListChecks,
  RotateCcw, Plus, Trash2, CalendarClock, NotebookPen, Save,
  Zap, TrendingUp, CircleHelp, Pencil, Trash, Trophy
} from "lucide-react";
import "./style.css";

const START = "2026-11-01";
const END = "2027-07-31";
const STORAGE_KEY = "jeeverse-planner-v3";

const SUBJECTS = [
  { id: "maths", name: "Mathematics", short: "Maths", total: 184, color: "#a3aaff", icon: Calculator },
  { id: "physics", name: "Physics", short: "Physics", total: 205, color: "#42d9c7", icon: Atom },
  { id: "chemistry", name: "Chemistry", short: "Chemistry", total: 317, color: "#ffc16d", icon: Sparkles }
];

const CHAPTER_STAGES = [
  "Not started",
  "Lectures completed",
  "Questions completed",
  "Revised",
  "Chapter completed"
];

const DEFAULT_SLOTS = [
  { id: "slot-1", start: "05:30", end: "07:00", activity: "Lecture / concept learning", kind: "Lecture" },
  { id: "slot-2", start: "16:30", end: "17:15", activity: "DPP / module questions", kind: "Practice" },
  { id: "slot-3", start: "17:30", end: "18:15", activity: "Second lecture / subject", kind: "Lecture" },
  { id: "slot-4", start: "20:00", end: "20:30", activity: "Revision and error notebook", kind: "Revision" },
  { id: "slot-5", start: "20:30", end: "21:00", activity: "Break and next-day planning", kind: "Break" }
];

const DEFAULT_DATA = {
  completed: {},
  chapters: [],
  practice: [],
  revisions: [],
  tests: [],
  slots: DEFAULT_SLOTS,
  slotDone: {},
  dailyFlags: {},
  notes: {}
};

const pad = n => String(n).padStart(2, "0");

function dateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateObject(value) {
  return new Date(`${value}T12:00:00`);
}

function addDays(value, amount) {
  const date = dateObject(value);
  date.setDate(date.getDate() + amount);
  return dateString(date);
}

function formatDate(value, options = { day: "numeric", month: "short" }) {
  return dateObject(value).toLocaleDateString("en-IN", options);
}

function isSunday(value) {
  return dateObject(value).getDay() === 0;
}

function makePlan() {
  const dates = [];
  for (let date = START; date <= END; date = addDays(date, 1)) {
    dates.push(date);
  }

  const studyDates = dates.filter(date => !isSunday(date));
  const schedule = {};

  for (const date of dates) {
    schedule[date] = {};
  }

  SUBJECTS.forEach(subject => {
    studyDates.forEach((date, index) => {
      const first = Math.floor(index * subject.total / studyDates.length);
      const last = Math.floor((index + 1) * subject.total / studyDates.length);

      schedule[date][subject.id] = Array.from(
        { length: last - first },
        (_, i) => ({
          id: `${subject.id}-${first + i + 1}`,
          number: first + i + 1
        })
      );
    });
  });

  dates.filter(isSunday).forEach(date => {
    schedule[date].sunday = true;
  });

  return { dates, studyDates, schedule };
}

const PLAN = makePlan();

function getToday() {
  const today = dateString(new Date());
  if (today < START) return START;
  if (today > END) return END;
  return today;
}

function safeLoad() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_DATA, ...JSON.parse(saved) } : { ...DEFAULT_DATA };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function uid() {
  return globalThis.crypto?.randomUUID?.() ||
    `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function App() {
  const [data, setData] = useState(safeLoad);
  const [page, setPage] = useState("Dashboard");
  const [day, setDay] = useState(getToday);
  const [menuOpen, setMenuOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(getToday().slice(0, 7));

  const [chapterForm, setChapterForm] = useState({
    name: "", subject: "maths", lectures: "", questionsTarget: ""
  });

  const [practiceForm, setPracticeForm] = useState({
    chapterId: "", type: "DPP", count: "", date: getToday(), note: ""
  });

  const [revisionForm, setRevisionForm] = useState({
    chapterId: "", stage: "First revision", date: getToday(), note: ""
  });

  const [testForm, setTestForm] = useState({
    name: "", date: getToday(), score: "", total: "300", minutes: "", mistakes: ""
  });

  const [slotForm, setSlotForm] = useState({
    start: "19:00", end: "19:45", activity: "", kind: "Practice"
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // The app remains usable if browser storage is unavailable.
    }
  }, [data]);

  const updateData = updater => {
    setData(previous => updater(previous));
  };

  const allLectures = useMemo(() => {
    return PLAN.dates.flatMap(date =>
      SUBJECTS.flatMap(subject =>
        (PLAN.schedule[date][subject.id] || []).map(lecture => ({
          ...lecture, date, subjectId: subject.id, subject
        }))
      )
    );
  }, []);

  const totalLectures = SUBJECTS.reduce((sum, subject) => sum + subject.total, 0);

  const doneLectures = allLectures.filter(
    lecture => data.completed[lecture.id]
  ).length;

  const overdueLectures = allLectures.filter(
    lecture => lecture.date < getToday() && !data.completed[lecture.id]
  );

  const remainingLectures = totalLectures - doneLectures;

  const futureStudyDays = PLAN.studyDates.filter(
    date => date >= getToday()
  ).length || 1;

  const catchupTarget = Math.ceil(remainingLectures / futureStudyDays);

  const subjectStats = SUBJECTS.map(subject => {
    const list = allLectures.filter(item => item.subjectId === subject.id);
    const done = list.filter(item => data.completed[item.id]).length;

    return {
      ...subject,
      done,
      pending: subject.total - done,
      percent: Math.round(done / subject.total * 100)
    };
  });

  const todayLectures = SUBJECTS.flatMap(subject =>
    (PLAN.schedule[day][subject.id] || []).map(lecture => ({
      ...lecture, subject
    }))
  );

  const todayDone = todayLectures.filter(
    lecture => data.completed[lecture.id]
  ).length;

  const questionTotal = data.practice.reduce(
    (sum, item) => sum + Number(item.count || 0), 0
  );

  const chapterCompleted = data.chapters.filter(
    chapter => chapter.status === "Chapter completed"
  ).length;

  const testAverage = data.tests.length
    ? Math.round(data.tests.reduce(
        (sum, test) => sum + Number(test.score) / Number(test.total) * 100, 0
      ) / data.tests.length)
    : 0;

  const questionsForDate = date => data.practice
    .filter(item => item.date === date)
    .reduce((sum, item) => sum + Number(item.count || 0), 0);

  const testsForDate = date => data.tests.some(test => test.date === date);

  const activityForDate = date => {
    const ids = SUBJECTS.flatMap(subject =>
      (PLAN.schedule[date][subject.id] || []).map(lecture => lecture.id)
    );

    const completed = ids.filter(id => data.completed[id]).length;

    return {
      total: ids.length,
      completed,
      questions: questionsForDate(date),
      test: testsForDate(date),
      active: completed > 0 || questionsForDate(date) > 0 ||
        testsForDate(date) || Boolean(data.dailyFlags[date])
    };
  };

  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Daily Planner", icon: CalendarDays },
    { name: "Chapters & Practice", icon: BookOpen },
    { name: "Revision Scheduler", icon: RotateCcw },
    { name: "Mock Tests", icon: ClipboardCheck },
    { name: "Timetable", icon: Clock3 },
    { name: "Analytics & Calendar", icon: ChartNoAxesCombined }
  ];

  function changePage(name) {
    setPage(name);
    setMenuOpen(false);
  }

  function changeDay(offset) {
    const next = addDays(day, offset);
    setDay(next < START ? START : next > END ? END : next);
  }

  function toggleLecture(id) {
    updateData(previous => {
      const completed = { ...previous.completed };
      if (completed[id]) delete completed[id];
      else completed[id] = true;
      return { ...previous, completed };
    });
  }

  function addChapter(event) {
    event.preventDefault();
    if (!chapterForm.name.trim()) return;

    updateData(previous => ({
      ...previous,
      chapters: [...previous.chapters, {
        id: uid(),
        name: chapterForm.name.trim(),
        subject: chapterForm.subject,
        lectures: Number(chapterForm.lectures || 0),
        questionsTarget: Number(chapterForm.questionsTarget || 0),
        status: "Not started",
        created: getToday()
      }]
    }));

    setChapterForm({
      name: "", subject: "maths", lectures: "", questionsTarget: ""
    });
  }

  function updateChapter(id, changes) {
    updateData(previous => ({
      ...previous,
      chapters: previous.chapters.map(chapter =>
        chapter.id === id ? { ...chapter, ...changes } : chapter
      )
    }));
  }

  function deleteChapter(id) {
    if (!window.confirm("Delete this chapter and its associated practice and revision entries?")) return;

    updateData(previous => ({
      ...previous,
      chapters: previous.chapters.filter(chapter => chapter.id !== id),
      practice: previous.practice.filter(item => item.chapterId !== id),
      revisions: previous.revisions.filter(item => item.chapterId !== id)
    }));
  }

  function addPractice(event) {
    event.preventDefault();
    if (!practiceForm.chapterId || practiceForm.count === "") return;

    updateData(previous => ({
      ...previous,
      practice: [...previous.practice, {
        ...practiceForm,
        id: uid(),
        count: Math.max(0, Number(practiceForm.count)),
        note: practiceForm.note.trim()
      }]
    }));

    setPracticeForm(previous => ({ ...previous, count: "", note: "" }));
  }

  function deletePractice(id) {
    updateData(previous => ({
      ...previous,
      practice: previous.practice.filter(item => item.id !== id)
    }));
  }

  function addRevision(event) {
    event.preventDefault();
    if (!revisionForm.chapterId) return;

    updateData(previous => ({
      ...previous,
      revisions: [...previous.revisions, {
        ...revisionForm, id: uid(), done: false
      }]
    }));

    setRevisionForm(previous => ({ ...previous, note: "" }));
  }

  function toggleRevision(id) {
    updateData(previous => ({
      ...previous,
      revisions: previous.revisions.map(item =>
        item.id === id ? { ...item, done: !item.done } : item
      )
    }));
  }

  function deleteRevision(id) {
    updateData(previous => ({
      ...previous,
      revisions: previous.revisions.filter(item => item.id !== id)
    }));
  }

  function addTest(event) {
    event.preventDefault();
    if (!testForm.name.trim() || testForm.score === "" ||
        Number(testForm.total) <= 0) return;

    const score = Number(testForm.score);
    const total = Number(testForm.total);

    updateData(previous => ({
      ...previous,
      tests: [...previous.tests, {
        ...testForm,
        id: uid(),
        score,
        total,
        minutes: Number(testForm.minutes || 0),
        accuracy: Math.round(score / total * 100)
      }]
    }));

    setTestForm(previous => ({
      ...previous, name: "", score: "", minutes: "", mistakes: ""
    }));
  }

  function deleteTest(id) {
    updateData(previous => ({
      ...previous,
      tests: previous.tests.filter(test => test.id !== id)
    }));
  }

  function addSlot(event) {
    event.preventDefault();
    if (!slotForm.activity.trim()) return;

    updateData(previous => ({
      ...previous,
      slots: [...previous.slots, { ...slotForm, id: uid() }]
        .sort((a, b) => a.start.localeCompare(b.start))
    }));

    setSlotForm(previous => ({ ...previous, activity: "" }));
  }

  function deleteSlot(id) {
    updateData(previous => ({
      ...previous,
      slots: previous.slots.filter(slot => slot.id !== id)
    }));
  }

  function toggleSlot(id) {
    updateData(previous => ({
      ...previous,
      slotDone: {
        ...previous.slotDone,
        [day]: {
          ...(previous.slotDone[day] || {}),
          [id]: !(previous.slotDone[day] || {})[id]
        }
      }
    }));
  }

  function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);

        if (!parsed || typeof parsed !== "object" ||
            !parsed.completed || !Array.isArray(parsed.chapters)) {
          throw new Error("Invalid backup format");
        }

        updateData(() => ({ ...DEFAULT_DATA, ...parsed }));
        window.alert("Backup imported successfully.");
      } catch {
        window.alert("Could not import this file. Select a valid JEEVerse backup.");
      }

      event.target.value = "";
    };

    reader.readAsText(file);
  }

  function resetProgress() {
    if (!window.confirm("Reset all saved progress? Export a backup first if you need it.")) return;

    localStorage.removeItem(STORAGE_KEY);
    setData({ ...DEFAULT_DATA });
  }

  function exportBackup() {
    downloadJSON(data, `jeeverse-backup-${getToday()}.json`);
  }

  const weeklyStart = addDays(day, -6);
  const weeklyLectures = allLectures.filter(
    lecture => lecture.date >= weeklyStart && lecture.date <= day
  );
  const weeklyDone = weeklyLectures.filter(
    lecture => data.completed[lecture.id]
  ).length;

  const weeklyDays = PLAN.dates.filter(
    date => date >= weeklyStart && date <= day && !isSunday(date)
  );

  const weeklyActiveDays = weeklyDays.filter(date =>
    SUBJECTS.some(subject =>
      (PLAN.schedule[date][subject.id] || []).some(
        lecture => data.completed[lecture.id]
      )
    ) || questionsForDate(date) > 0
  ).length;

  const monthlyLectures = allLectures.filter(
    lecture => lecture.date.startsWith(day.slice(0, 7))
  );

  const monthlyDone = monthlyLectures.filter(
    lecture => data.completed[lecture.id]
  ).length;

  const monthlyQuestions = data.practice.filter(
    item => item.date.startsWith(day.slice(0, 7))
  ).reduce((sum, item) => sum + Number(item.count || 0), 0);

  const streak = useMemo(() => {
    let count = 0;
    let date = getToday();

    while (date >= START) {
      if (isSunday(date)) {
        date = addDays(date, -1);
        continue;
      }

      const ids = SUBJECTS.flatMap(subject =>
        (PLAN.schedule[date][subject.id] || []).map(lecture => lecture.id)
      );

      if (ids.length && ids.every(id => data.completed[id])) {
        count++;
        date = addDays(date, -1);
      } else {
        break;
      }
    }

    return count;
  }, [data.completed]);

  const currentMonthDate = `${calendarMonth}-01`;
  const monthFirstDay = dateObject(currentMonthDate);
  const monthOffset = monthFirstDay.getDay();
  const daysInMonth = new Date(
    monthFirstDay.getFullYear(), monthFirstDay.getMonth() + 1, 0
  ).getDate();

  const calendarCells = Array.from({ length: 42 }, (_, index) => {
    const number = index - monthOffset + 1;
    const date = new Date(
      monthFirstDay.getFullYear(),
      monthFirstDay.getMonth(),
      number,
      12
    );

    return {
      number: date.getDate(),
      date: dateString(date),
      inside: number >= 1 && number <= daysInMonth
    };
  });
  function renderHeader() {
    return (
      <header className="topbar">
        <button
          className="icon-btn mobile-menu-btn"
          onClick={() => setMenuOpen(value => !value)}
          aria-label="Open navigation"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        <div className="crumb">
          JEEVerse <span>/</span> <b>{page}</b>
        </div>

        <div className="top-actions">
          <span className="today-chip">
            <CalendarDays size={14} /> {formatDate(getToday(), {
              day: "numeric", month: "short", year: "numeric"
            })}
          </span>
          <button className="outline-btn" onClick={exportBackup}>
            <Download size={14} /> <span className="desktop-only">Backup</span>
          </button>
          <label className="outline-btn" style={{ cursor: "pointer" }}>
            <Upload size={14} /> <span className="desktop-only">Import</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={importBackup}
              style={{ display: "none" }}
            />
          </label>
        </div>
      </header>
    );
  }

  function renderPageHeading(title, description, eyebrow = "STUDY WORKSPACE") {
    return (
      <div className="page-heading">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
    );
  }

  function renderStat(label, value, subtext, Icon, color = "#42d9c7") {
    return (
      <div className="stat-card" key={label}>
        <div className="stat-top">
          <span>{label}</span>
          <span className="stat-icon" style={{ color }}>
            <Icon size={17} />
          </span>
        </div>
        <div className="stat-number">{value}</div>
        <div className="stat-bottom">{subtext}</div>
      </div>
    );
  }

  function renderSubjectCards() {
    return (
      <div className="subject-grid">
        {subjectStats.map(subject => {
          const Icon = subject.icon;

          return (
            <div className="subject-card" key={subject.id}>
              <div className="subject-head">
                <span className="subject-icon" style={{ color: subject.color }}>
                  <Icon size={20} />
                </span>
                <div>
                  <h3>{subject.name}</h3>
                  <small>{subject.total} planned lectures</small>
                </div>
                <span className="subject-percentage" style={{ color: subject.color }}>
                  {subject.percent}%
                </span>
              </div>

              <div className="subject-numbers">
                <span><strong>{subject.done}</strong> completed</span>
                <span>{subject.pending} remaining</span>
              </div>

              <div className="progress" style={{ "--subject-color": subject.color }}>
                <i style={{ width: `${subject.percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderLectureList(lectures) {
    if (!lectures.length) {
      return (
        <div className="empty-state">
          <CheckCircle2 size={28} />
          No lectures scheduled for this date. Use this time for revision or practice.
        </div>
      );
    }

    return (
      <div className="lecture-list">
        {lectures.map(lecture => {
          const done = Boolean(data.completed[lecture.id]);

          return (
            <label
              key={lecture.id}
              className={`lecture-row ${done ? "done" : ""}`}
            >
              <input
                type="checkbox"
                className="lecture-check"
                checked={done}
                onChange={() => toggleLecture(lecture.id)}
              />

              <span
                className="subject-color"
                style={{ background: lecture.subject.color }}
              />

              <span className="lecture-details">
                <strong>{lecture.subject.short} — Lecture {lecture.number}</strong>
                <small>{lecture.date === day ? "Scheduled for selected day" : formatDate(lecture.date)}</small>
              </span>

              <span className="subject-pill">
                {done ? "Completed" : lecture.subject.short}
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  function renderDashboard() {
    const selectedSunday = isSunday(day);

    return (
      <>
        {renderPageHeading(
          "Your study command centre",
          "One plan for lectures, practice, revision and mock tests.",
          "JEEVERSE • MAIN + ADVANCED"
        )}

        <section className="hero">
          <div>
            <div className="hero-tag"><Sparkles size={14} /> YOUR ROAD TO JEE</div>
            <h2>Consistency beats <em>cramming.</em></h2>
            <p>
              Track your 706-lecture target from 1 November 2026 to
              31 July 2027. Build strong concepts, practise questions
              and review your mistakes every week.
            </p>
            <button className="primary-btn" onClick={() => changePage("Daily Planner")}>
              <Target size={15} /> Open daily planner
            </button>
          </div>

          <div className="hero-art" aria-hidden="true">
            <span>✦</span>
            <div className="ring r3" />
            <div className="ring r2" />
            <div className="ring r1" />
            <div className="hero-icon"><GraduationCap size={42} /></div>
          </div>
        </section>

        <div className="stats-grid">
          {renderStat(
            "Lectures completed",
            `${doneLectures}/${totalLectures}`,
            `${Math.round(doneLectures / totalLectures * 100)}% of lecture target`,
            BookOpen
          )}
          {renderStat(
            "Backlog lectures",
            overdueLectures.length,
            "Past scheduled date and unfinished",
            AlertTriangle,
            "#ffc16d"
          )}
          {renderStat(
            "Questions solved",
            questionTotal.toLocaleString("en-IN"),
            "Across DPPs, modules and PYQs",
            ListChecks,
            "#a3aaff"
          )}
          {renderStat(
            "Mock test average",
            `${testAverage}%`,
            `${data.tests.length} test${data.tests.length === 1 ? "" : "s"} recorded`,
            Trophy,
            "#ffc16d"
          )}
        </div>

        <div className="section-title">
          <div>
            <h2>Subject progress</h2>
            <p>Lecture targets distributed across non-Sunday dates.</p>
          </div>
          <button className="text-btn" onClick={() => changePage("Analytics & Calendar")}>
            View analytics →
          </button>
        </div>

        {renderSubjectCards()}

        <div className="two-column">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Daily lecture plan</h2>
                <p>Mark each lecture complete to update your progress.</p>
              </div>
              <span className="mini-badge">
                {todayDone}/{todayLectures.length}
              </span>
            </div>

            <div className="date-control" style={{ marginBottom: 15 }}>
              <button className="icon-btn" onClick={() => changeDay(-1)} aria-label="Previous day">
                <ChevronLeft />
              </button>
              <input
                type="date"
                value={day}
                min={START}
                max={END}
                onChange={event => event.target.value && setDay(event.target.value)}
              />
              <button className="icon-btn" onClick={() => changeDay(1)} aria-label="Next day">
                <ChevronRight />
              </button>
            </div>

            {selectedSunday ? (
              <div className="sunday-card">
                <h3>Sunday = Test + Revision</h3>
                <p>Keep Sundays mainly for mock tests, reviewing mistakes, revision and catch-up work.</p>
                <div className="sunday-list">
                  {[
                    "Attempt a weekly test",
                    "Review wrong answers",
                    "Revise weak concepts",
                    "Catch up on pending lectures"
                  ].map((task, index) => (
                    <label key={task}>
                      <input
                        type="checkbox"
                        checked={Boolean((data.dailyFlags[day] || {})[index])}
                        onChange={event => updateData(previous => ({
                          ...previous,
                          dailyFlags: {
                            ...previous.dailyFlags,
                            [day]: {
                              ...(previous.dailyFlags[day] || {}),
                              [index]: event.target.checked
                            }
                          }
                        }))}
                      />
                      {task}
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {renderLectureList(todayLectures)}
                <div className="helper-text">
                  Daily target: {todayLectures.length} lecture
                  {todayLectures.length === 1 ? "" : "s"}.
                  Completed: {todayDone}. Backlog catch-up guide:
                  approximately {catchupTarget} lecture
                  {catchupTarget === 1 ? "" : "s"} per study day to finish the remaining plan.
                </div>
              </>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>This week's consistency</h2>
                <p>Selected date and the previous six days.</p>
              </div>
              <Flame color="#ffc16d" size={21} />
            </div>

            <div className="kpi-grid">
              <div className="kpi">
                <small>Lectures completed</small>
                <strong>{weeklyDone}</strong>
                <span>of {weeklyLectures.length} scheduled</span>
              </div>
              <div className="kpi">
                <small>Active days</small>
                <strong>{weeklyActiveDays}/{weeklyDays.length}</strong>
                <span>With completed work</span>
              </div>
              <div className="kpi">
                <small>Study streak</small>
                <strong>{streak} <Flame size={15} style={{ display: "inline", color: "#ffc16d" }} /></strong>
                <span>Fully completed study days</span>
              </div>
            </div>

            <div className="divider" />

            <div className="progress-label">
              <span>Weekly lecture completion</span>
              <strong>
                {weeklyLectures.length
                  ? Math.round(weeklyDone / weeklyLectures.length * 100)
                  : 0}%
              </strong>
            </div>
            <div className="progress">
              <i style={{
                width: `${weeklyLectures.length ? weeklyDone / weeklyLectures.length * 100 : 0}%`
              }} />
            </div>

            <div className="insight">
              <TrendingUp size={18} />
              <p>
                <strong>Next step:</strong> solve questions after learning a concept,
                and add difficult questions to your mistake list for Sunday review.
              </p>
            </div>

            <div className="section-title">
              <div>
                <h2>Revision overview</h2>
                <p>{data.revisions.filter(item => !item.done).length} pending revisions</p>
              </div>
              <button className="text-btn" onClick={() => changePage("Revision Scheduler")}>
                Open →
              </button>
            </div>

            <div className="progress-label">
              <span>Chapters completed</span>
              <strong>{chapterCompleted}/{data.chapters.length}</strong>
            </div>
            <div className="progress">
              <i style={{
                width: `${data.chapters.length ? chapterCompleted / data.chapters.length * 100 : 0}%`
              }} />
            </div>
          </section>
        </div>

        <div className="two-column">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Monthly progress</h2>
                <p>{formatDate(`${day.slice(0, 7)}-01`, { month: "long", year: "numeric" })}</p>
              </div>
              <CalendarDays size={20} color="#a3aaff" />
            </div>

            <div className="kpi-grid">
              <div className="kpi">
                <small>Lectures done</small>
                <strong>{monthlyDone}</strong>
                <span>of {monthlyLectures.length}</span>
              </div>
              <div className="kpi">
                <small>Questions solved</small>
                <strong>{monthlyQuestions}</strong>
                <span>Practice entries</span>
              </div>
              <div className="kpi">
                <small>Tests recorded</small>
                <strong>{data.tests.filter(test => test.date.startsWith(day.slice(0, 7))).length}</strong>
                <span>In selected month</span>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Quick actions</h2>
                <p>Choose what you want to work on.</p>
              </div>
              <Zap size={20} color="#ffc16d" />
            </div>

            <div className="lecture-list">
              {[
                ["Chapters & Practice", "Add chapters and track DPPs, modules and PYQs", BookOpen],
                ["Revision Scheduler", "Schedule first, second and later revisions", RotateCcw],
                ["Mock Tests", "Record marks, time and mistakes", ClipboardCheck],
                ["Analytics & Calendar", "Review monthly trends and activity", ChartNoAxesCombined]
              ].map(([name, description, Icon]) => (
                <button
                  key={name}
                  className="lecture-row"
                  style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
                  onClick={() => changePage(name)}
                >
                  <span className="stat-icon"><Icon size={17} /></span>
                  <span className="lecture-details">
                    <strong>{name}</strong>
                    <small>{description}</small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          </section>
        </div>
      </>
    );
  }

  function renderDailyPlanner() {
    const lectures = todayLectures;
    const done = lectures.filter(lecture => data.completed[lecture.id]).length;

    return (
      <>
        {renderPageHeading(
          "Daily planner",
          "Follow the scheduled lectures, track completion and note your daily goals."
        )}

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Choose a study date</h2>
              <p>Plan period: 1 November 2026 – 31 July 2027</p>
            </div>
            <CalendarClock size={22} color="#42d9c7" />
          </div>

          <div className="date-control">
            <button className="icon-btn" onClick={() => changeDay(-1)} aria-label="Previous day">
              <ChevronLeft />
            </button>
            <input
              type="date"
              value={day}
              min={START}
              max={END}
              onChange={event => event.target.value && setDay(event.target.value)}
            />
            <button className="icon-btn" onClick={() => changeDay(1)} aria-label="Next day">
              <ChevronRight />
            </button>
            <button className="outline-btn" onClick={() => setDay(getToday())}>Today</button>
          </div>
        </section>

        {isSunday(day) ? (
          <section className="sunday-card">
            <h3>Sunday study plan</h3>
            <p>Keep this day for tests, revision and backlog catch-up.</p>
            <div className="sunday-list">
              {[
                "Weekly mock test",
                "Analyse incorrect questions",
                "Revise weak topics",
                "Complete pending lectures",
                "Plan next week's priorities"
              ].map((task, index) => (
                <label key={task}>
                  <input
                    type="checkbox"
                    checked={Boolean((data.dailyFlags[day] || {})[index])}
                    onChange={event => updateData(previous => ({
                      ...previous,
                      dailyFlags: {
                        ...previous.dailyFlags,
                        [day]: {
                          ...(previous.dailyFlags[day] || {}),
                          [index]: event.target.checked
                        }
                      }
                    }))}
                  />
                  {task}
                </label>
              ))}
            </div>
          </section>
        ) : (
          <>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Scheduled lectures</h2>
                  <p>{formatDate(day, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <span className="mini-badge">{done}/{lectures.length} completed</span>
              </div>

              {renderLectureList(lectures)}

              <div className="divider" />

              <div className="progress-label">
                <span>Daily completion</span>
                <strong>{lectures.length ? Math.round(done / lectures.length * 100) : 0}%</strong>
              </div>
              <div className="progress">
                <i style={{ width: `${lectures.length ? done / lectures.length * 100 : 0}%` }} />
              </div>
            </section>
          </>
        )}

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Daily notes</h2>
              <p>Write goals, doubts, or topics to revisit.</p>
            </div>
            <NotebookPen size={20} color="#a3aaff" />
          </div>

          <textarea
            rows={5}
            placeholder="Today's goals, concepts I found difficult, questions to ask..."
            value={data.notes[day] || ""}
            onChange={event => updateData(previous => ({
              ...previous,
              notes: { ...previous.notes, [day]: event.target.value }
            }))}
          />

          <div className="helper-text">
            Notes are saved automatically in this browser.
          </div>
        </section>
      </>
    );
  }
  function renderChapters() {
    const chapterPractice = chapterId =>
      data.practice.filter(item => item.chapterId === chapterId);

    return (
      <>
        {renderPageHeading(
          "Chapters & practice",
          "Track each chapter from its first lecture to final completion."
        )}

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Add a chapter</h2>
              <p>Enter the chapter name and your targets.</p>
            </div>
            <Plus size={21} color="#42d9c7" />
          </div>

          <form onSubmit={addChapter}>
            <div className="form-grid">
              <div className="form-field">
                <label>Chapter name *</label>
                <input
                  required
                  placeholder="e.g. Quadratic Equations"
                  value={chapterForm.name}
                  onChange={event => setChapterForm({
                    ...chapterForm, name: event.target.value
                  })}
                />
              </div>

              <div className="form-field">
                <label>Subject</label>
                <select
                  value={chapterForm.subject}
                  onChange={event => setChapterForm({
                    ...chapterForm, subject: event.target.value
                  })}
                >
                  {SUBJECTS.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Expected lectures</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 12"
                  value={chapterForm.lectures}
                  onChange={event => setChapterForm({
                    ...chapterForm, lectures: event.target.value
                  })}
                />
              </div>

              <div className="form-field">
                <label>Question target</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 100"
                  value={chapterForm.questionsTarget}
                  onChange={event => setChapterForm({
                    ...chapterForm, questionsTarget: event.target.value
                  })}
                />
              </div>
            </div>

            <div className="form-actions">
              <button className="primary-btn" type="submit">
                <Plus size={15} /> Add chapter
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Your chapters</h2>
              <p>{chapterCompleted} of {data.chapters.length} chapters completed.</p>
            </div>
            <span className="mini-badge">{data.chapters.length} total</span>
          </div>

          {!data.chapters.length ? (
            <div className="empty-state">
              <BookOpen size={28} />
              No chapters added yet. Add your first chapter above to start tracking progress.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Chapter</th>
                    <th>Subject</th>
                    <th>Lectures</th>
                    <th>Question target</th>
                    <th>Progress stage</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.chapters.map(chapter => {
                    const subject = SUBJECTS.find(item => item.id === chapter.subject);
                    const practiced = chapterPractice(chapter.id).reduce(
                      (sum, item) => sum + Number(item.count || 0), 0
                    );

                    return (
                      <tr key={chapter.id}>
                        <td>
                          <strong>{chapter.name}</strong>
                          <small>{practiced} questions logged</small>
                        </td>
                        <td>{subject?.short || chapter.subject}</td>
                        <td>{chapter.lectures}</td>
                        <td>
                          {practiced}/{chapter.questionsTarget}
                        </td>
                        <td>
                          <select
                            className="status-select"
                            value={chapter.status}
                            onChange={event => updateChapter(chapter.id, {
                              status: event.target.value
                            })}
                          >
                            {CHAPTER_STAGES.map(stage => (
                              <option key={stage}>{stage}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button
                            className="icon-btn danger"
                            onClick={() => deleteChapter(chapter.id)}
                            aria-label={`Delete ${chapter.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Log question practice</h2>
              <p>Record DPPs, module questions, PYQs or other practice.</p>
            </div>
            <ListChecks size={21} color="#a3aaff" />
          </div>

          {!data.chapters.length ? (
            <div className="empty-state">
              Add a chapter before recording chapter-wise question practice.
            </div>
          ) : (
            <form onSubmit={addPractice}>
              <div className="form-grid three">
                <div className="form-field">
                  <label>Chapter *</label>
                  <select
                    required
                    value={practiceForm.chapterId}
                    onChange={event => setPracticeForm({
                      ...practiceForm, chapterId: event.target.value
                    })}
                  >
                    <option value="">Select chapter</option>
                    {data.chapters.map(chapter => (
                      <option key={chapter.id} value={chapter.id}>
                        {chapter.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Practice type</label>
                  <select
                    value={practiceForm.type}
                    onChange={event => setPracticeForm({
                      ...practiceForm, type: event.target.value
                    })}
                  >
                    {["DPP", "Module", "PYQ", "Other"].map(type => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Questions solved *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={practiceForm.count}
                    onChange={event => setPracticeForm({
                      ...practiceForm, count: event.target.value
                    })}
                    placeholder="e.g. 25"
                  />
                </div>

                <div className="form-field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={practiceForm.date}
                    onChange={event => setPracticeForm({
                      ...practiceForm, date: event.target.value
                    })}
                  />
                </div>

                <div className="form-field">
                  <label>Notes (optional)</label>
                  <input
                    value={practiceForm.note}
                    onChange={event => setPracticeForm({
                      ...practiceForm, note: event.target.value
                    })}
                    placeholder="Mistakes, accuracy, doubts..."
                  />
                </div>
              </div>

              <div className="form-actions">
                <button className="primary-btn" type="submit">
                  <Plus size={15} /> Save practice
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Practice history</h2>
              <p>Total recorded: {questionTotal.toLocaleString("en-IN")} questions.</p>
            </div>
          </div>

          {!data.practice.length ? (
            <div className="empty-state">Your question practice entries will appear here.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Chapter</th>
                    <th>Type</th>
                    <th>Questions</th>
                    <th>Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.practice].reverse().map(item => (
                    <tr key={item.id}>
                      <td>{formatDate(item.date)}</td>
                      <td>
                        {data.chapters.find(chapter => chapter.id === item.chapterId)?.name
                          || "Deleted chapter"}
                      </td>
                      <td><span className="subject-pill">{item.type}</span></td>
                      <td>{item.count}</td>
                      <td>{item.note || "—"}</td>
                      <td>
                        <button
                          className="icon-btn danger"
                          onClick={() => deletePractice(item.id)}
                          aria-label="Delete practice entry"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    );
  }

  function renderRevisions() {
    const sorted = [...data.revisions].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const pending = sorted.filter(item => !item.done);
    const completed = sorted.filter(item => item.done);

    return (
      <>
        {renderPageHeading(
          "Revision scheduler",
          "Schedule spaced revisions so completed chapters stay fresh."
        )}

        <div className="stats-grid">
          {renderStat("Total revisions", data.revisions.length, "All scheduled sessions", RotateCcw)}
          {renderStat("Pending", pending.length, "Sessions still to complete", CalendarClock, "#ffc16d")}
          {renderStat("Completed", completed.length, "Sessions marked done", CheckCircle2)}
          {renderStat("Chapters revised", data.chapters.filter(c =>
            ["Revised", "Chapter completed"].includes(c.status)
          ).length, "Based on chapter stages", BookOpen, "#a3aaff")}
        </div>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Schedule a revision</h2>
              <p>Choose a chapter, revision stage and date.</p>
            </div>
            <Plus size={20} color="#42d9c7" />
          </div>

          {!data.chapters.length ? (
            <div className="empty-state">
              Add chapters in Chapters & Practice before scheduling revisions.
            </div>
          ) : (
            <form onSubmit={addRevision}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Chapter *</label>
                  <select
                    required
                    value={revisionForm.chapterId}
                    onChange={event => setRevisionForm({
                      ...revisionForm, chapterId: event.target.value
                    })}
                  >
                    <option value="">Select chapter</option>
                    {data.chapters.map(chapter => (
                      <option key={chapter.id} value={chapter.id}>{chapter.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Revision stage</label>
                  <select
                    value={revisionForm.stage}
                    onChange={event => setRevisionForm({
                      ...revisionForm, stage: event.target.value
                    })}
                  >
                    {["First revision", "Second revision", "Third revision", "Later revision"].map(stage => (
                      <option key={stage}>{stage}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Revision date</label>
                  <input
                    type="date"
                    value={revisionForm.date}
                    onChange={event => setRevisionForm({
                      ...revisionForm, date: event.target.value
                    })}
                  />
                </div>

                <div className="form-field">
                  <label>Notes (optional)</label>
                  <input
                    placeholder="Topics or mistakes to revisit"
                    value={revisionForm.note}
                    onChange={event => setRevisionForm({
                      ...revisionForm, note: event.target.value
                    })}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button className="primary-btn" type="submit">
                  <Plus size={15} /> Schedule revision
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Revision sessions</h2>
              <p>Mark sessions complete after revising the chapter.</p>
            </div>
            <span className="mini-badge">{pending.length} pending</span>
          </div>

          {!sorted.length ? (
            <div className="empty-state">
              <RotateCcw size={27} />
              No revisions scheduled yet.
            </div>
          ) : (
            <div>
              {sorted.map(item => {
                const chapter = data.chapters.find(c => c.id === item.chapterId);

                return (
                  <div className="revision-item" key={item.id}>
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleRevision(item.id)}
                    />

                    <div className="revision-main">
                      <strong>{chapter?.name || "Deleted chapter"}</strong>
                      <small>{item.stage}{item.note ? ` · ${item.note}` : ""}</small>
                    </div>

                    <span className="revision-date">{formatDate(item.date)}</span>

                    <button
                      className="icon-btn danger"
                      onClick={() => deleteRevision(item.id)}
                      aria-label="Delete revision"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </>
    );
  }
  function renderMockTests() {
    return (
      <>
        {renderPageHeading(
          "Mock tests & analysis",
          "Record your scores, test duration and mistakes to revisit."
        )}

        <div className="stats-grid">
          {renderStat("Tests attempted", data.tests.length, "All recorded tests", ClipboardCheck)}
          {renderStat("Average score", `${testAverage}%`, "Average percentage score", Trophy, "#a3aaff")}
          {renderStat(
            "Best score",
            data.tests.length
              ? `${Math.max(...data.tests.map(t => Math.round(t.score / t.total * 100)))}%`
              : "—",
            "Highest percentage",
            TrendingUp
          )}
          {renderStat(
            "Study backlog",
            overdueLectures.length,
            "Unfinished past lectures",
            AlertTriangle,
            "#ffc16d"
          )}
        </div>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Record a test</h2>
              <p>Enter your result after each mock or sectional test.</p>
            </div>
            <Plus size={20} color="#42d9c7" />
          </div>

          <form onSubmit={addTest}>
            <div className="form-grid">
              <div className="form-field">
                <label>Test name *</label>
                <input
                  required
                  placeholder="e.g. NDA Mock Test 01"
                  value={testForm.name}
                  onChange={event => setTestForm({
                    ...testForm, name: event.target.value
                  })}
                />
              </div>

              <div className="form-field">
                <label>Test date</label>
                <input
                  type="date"
                  value={testForm.date}
                  onChange={event => setTestForm({
                    ...testForm, date: event.target.value
                  })}
                />
              </div>

              <div className="form-field">
                <label>Marks obtained *</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 185"
                  value={testForm.score}
                  onChange={event => setTestForm({
                    ...testForm, score: event.target.value
                  })}
                />
              </div>

              <div className="form-field">
                <label>Maximum marks *</label>
                <input
                  required
                  type="number"
                  min="1"
                  step="any"
                  value={testForm.total}
                  onChange={event => setTestForm({
                    ...testForm, total: event.target.value
                  })}
                />
              </div>

              <div className="form-field">
                <label>Time taken (minutes)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 150"
                  value={testForm.minutes}
                  onChange={event => setTestForm({
                    ...testForm, minutes: event.target.value
                  })}
                />
              </div>

              <div className="form-field">
                <label>Mistakes to revisit</label>
                <input
                  placeholder="e.g. vectors, sign errors"
                  value={testForm.mistakes}
                  onChange={event => setTestForm({
                    ...testForm, mistakes: event.target.value
                  })}
                />
              </div>
            </div>

            <div className="form-actions">
              <button className="primary-btn" type="submit">
                <Save size={15} /> Save test result
              </button>
            </div>

            {testForm.score !== "" && Number(testForm.total) > 0 && (
              <div className="helper-text">
                Calculated percentage: {
                  Math.round(Number(testForm.score) / Number(testForm.total) * 100)
                }%
              </div>
            )}
          </form>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Test history</h2>
              <p>Use the mistakes field to guide your next revision.</p>
            </div>
          </div>

          {!data.tests.length ? (
            <div className="empty-state">
              <ClipboardCheck size={27} />
              No tests recorded yet. Add your first mock result above.
            </div>
          ) : (
            <div className="lecture-list">
              {[...data.tests]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map(test => {
                  const percentage = Math.round(test.score / test.total * 100);

                  return (
                    <div className="test-item" key={test.id}>
                      <div className="score-circle">{percentage}%</div>

                      <div className="test-main">
                        <strong>{test.name}</strong>
                        <small>
                          {formatDate(test.date)} · {test.score}/{test.total} marks
                          {test.minutes ? ` · ${test.minutes} minutes` : ""}
                        </small>

                        {test.mistakes && (
                          <div className="mistakes">
                            <strong>Mistakes to revisit:</strong> {test.mistakes}
                          </div>
                        )}
                      </div>

                      <button
                        className="icon-btn danger"
                        onClick={() => deleteTest(test.id)}
                        aria-label="Delete test result"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      </>
    );
  }

  function renderTimetable() {
    const completedSlots = data.slots.filter(
      slot => (data.slotDone[day] || {})[slot.id]
    ).length;

    return (
      <>
        {renderPageHeading(
          "Daily timetable",
          "Create time slots for lectures, question practice, revision and breaks."
        )}

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Your day</h2>
              <p>Tick a slot when you've completed it.</p>
            </div>
            <Clock3 size={22} color="#a3aaff" />
          </div>

          <div className="date-control" style={{ marginBottom: 15 }}>
            <button className="icon-btn" onClick={() => changeDay(-1)} aria-label="Previous day">
              <ChevronLeft />
            </button>
            <input
              type="date"
              value={day}
              min={START}
              max={END}
              onChange={event => event.target.value && setDay(event.target.value)}
            />
            <button className="icon-btn" onClick={() => changeDay(1)} aria-label="Next day">
              <ChevronRight />
            </button>
          </div>

          <div className="progress-label">
            <span>Timetable completion</span>
            <strong>{completedSlots}/{data.slots.length}</strong>
          </div>

          <div className="progress">
            <i style={{
              width: `${data.slots.length ? completedSlots / data.slots.length * 100 : 0}%`
            }} />
          </div>

          {!data.slots.length ? (
            <div className="empty-state">Add a timetable slot below.</div>
          ) : (
            <div style={{ marginTop: 10 }}>
              {data.slots.map(slot => {
                const done = Boolean((data.slotDone[day] || {})[slot.id]);

                return (
                  <div className={`slot-item ${done ? "finished" : ""}`} key={slot.id}>
                    <input
                      type="checkbox"
                      className="lecture-check"
                      checked={done}
                      onChange={() => toggleSlot(slot.id)}
                    />

                    <div className="slot-time">
                      {slot.start} – {slot.end}
                    </div>

                    <div className="slot-main">
                      <strong>{slot.activity}</strong>
                      <small>{slot.kind}</small>
                    </div>

                    <span className="slot-kind">{slot.kind}</span>

                    <button
                      className="icon-btn danger"
                      onClick={() => deleteSlot(slot.id)}
                      aria-label="Delete timetable slot"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Add a time slot</h2>
              <p>Set the start and end time for your activity.</p>
            </div>
            <Plus size={20} color="#42d9c7" />
          </div>

          <form onSubmit={addSlot}>
            <div className="form-grid">
              <div className="form-field">
                <label>Start time</label>
                <input
                  required
                  type="time"
                  value={slotForm.start}
                  onChange={event => setSlotForm({
                    ...slotForm, start: event.target.value
                  })}
                />
              </div>

              <div className="form-field">
                <label>End time</label>
                <input
                  required
                  type="time"
                  value={slotForm.end}
                  onChange={event => setSlotForm({
                    ...slotForm, end: event.target.value
                  })}
                />
              </div>

              <div className="form-field">
                <label>Activity name</label>
                <input
                  required
                  placeholder="e.g. Maths PYQs"
                  value={slotForm.activity}
                  onChange={event => setSlotForm({
                    ...slotForm, activity: event.target.value
                  })}
                />
              </div>

              <div className="form-field">
                <label>Activity type</label>
                <select
                  value={slotForm.kind}
                  onChange={event => setSlotForm({
                    ...slotForm, kind: event.target.value
                  })}
                >
                  {["Lecture", "Practice", "Revision", "Test", "Break", "Other"].map(kind => (
                    <option key={kind}>{kind}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button className="primary-btn" type="submit">
                <Plus size={15} /> Add slot
              </button>
            </div>
          </form>
        </section>
      </>
    );
  }

  function renderAnalytics() {
    const weeklyBars = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(day, index - 6);
      const scheduled = allLectures.filter(item => item.date === date);
      const done = scheduled.filter(item => data.completed[item.id]).length;

      return {
        label: formatDate(date, { day: "numeric", month: "short" }),
        done,
        total: scheduled.length
      };
    });

    const monthNames = dateObject(`${calendarMonth}-01`).toLocaleDateString("en-IN", {
      month: "long", year: "numeric"
    });

    const prevMonth = () => {
      const date = dateObject(`${calendarMonth}-01`);
      date.setMonth(date.getMonth() - 1);
      setCalendarMonth(dateString(date).slice(0, 7));
    };

    const nextMonth = () => {
      const date = dateObject(`${calendarMonth}-01`);
      date.setMonth(date.getMonth() + 1);
      setCalendarMonth(dateString(date).slice(0, 7));
    };

    return (
      <>
        {renderPageHeading(
          "Analytics & calendar",
          "Review study consistency, monthly progress and your activity history."
        )}

        <div className="stats-grid">
          {renderStat(
            "Total lectures",
            `${doneLectures}/${totalLectures}`,
            `${Math.round(doneLectures / totalLectures * 100)}% completed`,
            BookOpen
          )}
          {renderStat(
            "Questions solved",
            questionTotal.toLocaleString("en-IN"),
            "All recorded practice",
            ListChecks,
            "#a3aaff"
          )}
          {renderStat(
            "Active study days",
            PLAN.studyDates.filter(date => activityForDate(date).active).length,
            "Days with recorded activity",
            Flame,
            "#ffc16d"
          )}
          {renderStat(
            "Backlog",
            overdueLectures.length,
            "Unfinished lectures past date",
            AlertTriangle,
            "#ff9c9c"
          )}
        </div>

        <div className="two-column">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Weekly lecture trend</h2>
                <p>Completed lectures in the selected date's seven-day window.</p>
              </div>
              <ChartNoAxesCombined size={20} color="#42d9c7" />
            </div>

            <div className="bar-chart">
              {weeklyBars.map(item => (
                <div className="bar-column" key={item.label}>
                  <span className="bar-value">{item.done}</span>
                  <div
                    className="bar"
                    style={{
                      height: `${Math.max(3, item.done / Math.max(1, ...weeklyBars.map(x => x.total)) * 100)}%`
                    }}
                    title={`${item.done} of ${item.total} lectures`}
                  />
                  <span className="bar-label">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="helper-text">
              Weekly completion: {weeklyDone} of {weeklyLectures.length} scheduled lectures.
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Monthly totals</h2>
                <p>{formatDate(`${day.slice(0, 7)}-01`, { month: "long", year: "numeric" })}</p>
              </div>
              <CalendarDays size={20} color="#a3aaff" />
            </div>

            <div className="kpi-grid">
              <div className="kpi">
                <small>Lectures done</small>
                <strong>{monthlyDone}</strong>
                <span>of {monthlyLectures.length} scheduled</span>
              </div>
              <div className="kpi">
                <small>Questions solved</small>
                <strong>{monthlyQuestions}</strong>
                <span>Practice logged this month</span>
              </div>
              <div className="kpi">
                <small>Tests attempted</small>
                <strong>{data.tests.filter(test => test.date.startsWith(day.slice(0, 7))).length}</strong>
                <span>Tests recorded this month</span>
              </div>
            </div>

            <div className="divider" />

            <div className="progress-label">
              <span>Monthly lecture completion</span>
              <strong>{monthlyLectures.length
                ? Math.round(monthlyDone / monthlyLectures.length * 100)
                : 0}%</strong>
            </div>
            <div className="progress">
              <i style={{
                width: `${monthlyLectures.length ? monthlyDone / monthlyLectures.length * 100 : 0}%`
              }} />
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Activity calendar</h2>
              <p>Tap a date to view its daily plan.</p>
            </div>
            <div className="date-control">
              <button className="icon-btn" onClick={prevMonth} aria-label="Previous month">
                <ChevronLeft />
              </button>
              <strong style={{ fontSize: 12 }}>{monthNames}</strong>
              <button className="icon-btn" onClick={nextMonth} aria-label="Next month">
                <ChevronRight />
              </button>
            </div>
          </div>

          <div className="calendar">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(name => (
              <div className="calendar-heading" key={name}>{name}</div>
            ))}

            {calendarCells.map((cell, index) => {
              const activity = activityForDate(cell.date);
              const missed = cell.inside &&
                cell.date < getToday() &&
                !isSunday(cell.date) &&
                !activity.active;

              return (
                <button
                  key={`${cell.date}-${index}`}
                  className={`calendar-day ${!cell.inside ? "outside" : ""} ${day === cell.date ? "selected" : ""}`}
                  onClick={() => {
                    if (cell.date >= START && cell.date <= END) {
                      setDay(cell.date);
                      changePage("Daily Planner");
                    }
                  }}
                  disabled={!cell.inside || cell.date < START || cell.date > END}
                  title={`${cell.date}${activity.total ? `: ${activity.completed}/${activity.total} lectures` : ""}`}
                >
                  <span className="day-number">{cell.number}</span>
                  <span className="day-dots">
                    {activity.completed > 0 && <i className="day-dot done" />}
                    {activity.test && <i className="day-dot test" />}
                    {missed && <i className="day-dot missed" />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="calendar-legend">
            <span className="legend-item"><i style={{ background: "#42d9c7" }} /> Lecture completed</span>
            <span className="legend-item"><i style={{ background: "#b2a3ff" }} /> Test recorded</span>
            <span className="legend-item"><i style={{ background: "#ffb46e" }} /> No activity logged</span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Subject analytics</h2>
              <p>Compare progress against your original lecture targets.</p>
            </div>
          </div>

          {renderSubjectCards()}
        </section>
      </>
    );
  }
  function renderCurrentPage() {
    switch (page) {
      case "Daily Planner":
        return renderDailyPlanner();

      case "Chapters & Practice":
        return renderChapters();

      case "Revision Scheduler":
        return renderRevisions();

      case "Mock Tests":
        return renderMockTests();

      case "Timetable":
        return renderTimetable();

      case "Analytics & Calendar":
        return renderAnalytics();

      case "Dashboard":
      default:
        return renderDashboard();
    }
  }

  return (
    <div className="app-shell">
      {menuOpen && (
        <div
          className="sidebar-backdrop show"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <GraduationCap size={25} />
          </div>
          <div>
            <b>JEEVerse</b>
            <small>STUDY PLANNER</small>
          </div>
        </div>

        <div className="nav-caption">WORKSPACE</div>

        <nav>
          {navItems.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`nav-item ${page === item.name ? "selected" : ""}`}
                onClick={() => changePage(item.name)}
              >
                <Icon size={17} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="goal-box">
            <span><Target size={14} /> LECTURE GOAL</span>
            <strong>{doneLectures}/{totalLectures}</strong>
            <small>
              {Math.round(doneLectures / totalLectures * 100)}% completed
            </small>
            <div className="progress">
              <i style={{
                width: `${doneLectures / totalLectures * 100}%`
              }} />
            </div>
            <small>Deadline: 31 July 2027</small>
          </div>

          <div className="sidebar-note">
            Built for your JEE journey.
          </div>

          <button
            className="outline-btn"
            style={{ width: "100%", marginTop: 12 }}
            onClick={resetProgress}
          >
            <RotateCcw size={14} /> Reset all progress
          </button>
        </div>
      </aside>

      <main className="main">
        {renderHeader()}

        <div className="content">
          {renderCurrentPage()}
        </div>

        <footer className="footer">
          <strong>JEEVerse Planner</strong> · 1 Nov 2026 – 31 Jul 2027
          · Progress is saved in this browser.
        </footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
