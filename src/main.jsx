import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard, CalendarDays, BookOpen, ChartNoAxesCombined, CheckCircle2,
  Flame, Target, ChevronLeft, ChevronRight, Download, Upload, Menu, X, Atom,
  Calculator, GraduationCap, ClipboardCheck, AlertTriangle, Sparkles, Clock3,
  ListChecks, RotateCcw, Plus, Trash2, CalendarClock, NotebookPen, Save
} from 'lucide-react';
import './style.css';

const START = '2026-11-01';
const END = '2027-07-31';
const KEY = 'jee-verse-study-os-v2';
const SUBJECTS = [
  { id: 'maths', name: 'Mathematics', short: 'Maths', total: 184, color: '#a3aaff', icon: Calculator },
  { id: 'physics', name: 'Physics', short: 'Physics', total: 205, color: '#42d9c7', icon: Atom },
  { id: 'chemistry', name: 'Chemistry', short: 'Chemistry', total: 317, color: '#ffc16d', icon: Sparkles }
];
const DEFAULT_SLOTS = [
  { id: 's1', start: '05:30', end: '07:00', activity: 'Lecture / concept learning', kind: 'Lecture' },
  { id: 's2', start: '16:30', end: '17:15', activity: 'DPP / module questions', kind: 'Practice' },
  { id: 's3', start: '17:30', end: '18:15', activity: 'Second subject / lecture', kind: 'Lecture' },
  { id: 's4', start: '20:00', end: '20:30', activity: 'Revision and error notebook', kind: 'Revision' },
  { id: 's5', start: '20:30', end: '21:00', activity: 'Break / prepare for tomorrow', kind: 'Break' }
];
const DEFAULT = { completed: {}, notes: {}, chapters: [], tests: [], practice: {}, revisions: [], slots: DEFAULT_SLOTS, slotDone: {}, dailyFlags: {} };
const pad = n => String(n).padStart(2, '0');
const dateStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dateObj = s => new Date(`${s}T12:00:00`);
const addDays = (s, n) => { const d = dateObj(s); d.setDate(d.getDate() + n); return dateStr(d); };
const fmt = (s, opts = { day: 'numeric', month: 'short' }) => dateObj(s).toLocaleDateString('en-IN', opts);
const sunday = s => dateObj(s).getDay() === 0;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function makePlan() {
  const dates = [];
  for (let d = START; d <= END; d = addDays(d, 1)) dates.push(d);
  const studyDates = dates.filter(d => !sunday(d));
  const schedule = {};
  studyDates.forEach((date, i) => {
    schedule[date] = {};
    SUBJECTS.forEach(sub => {
      const from = Math.floor(i * sub.total / studyDates.length);
      const to = Math.floor((i + 1) * sub.total / studyDates.length);
      schedule[date][sub.id] = Array.from({ length: to - from }, (_, j) => ({ id: `${sub.id}-${from + j + 1}`, number: from + j + 1 }));
    });
  });
  dates.filter(sunday).forEach(d => { schedule[d] = { sunday: true }; });
  return { dates, schedule, studyDates };
}

const PLAN = makePlan();

function load() {
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...DEFAULT }; }
}

const todayInPlan = () => {
  const t = dateStr(new Date());
  return t < START ? START : t > END ? END : t;
};

function saveFile(data, name) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [data, setData] = useState(load);
  const [page, setPage] = useState('Dashboard');
  const [day, setDay] = useState(todayInPlan);
  const [menu, setMenu] = useState(false);
  const [chapterForm, setChapterForm] = useState({ name: '', subject: 'maths', lectures: '', questionsTarget: '' });
  const [practiceForm, setPracticeForm] = useState({ chapterId: '', type: 'DPP', count: '', date: todayInPlan(), note: '' });
  const [revisionForm, setRevisionForm] = useState({ chapterId: '', stage: 'First revision', date: todayInPlan(), note: '' });
  const [testForm, setTestForm] = useState({ name: '', date: todayInPlan(), score: '', total: '300', minutes: '', mistakes: '' });
  const [slotForm, setSlotForm] = useState({ start: '19:00', end: '19:45', activity: '', kind: 'Practice' });
  const [calendarMonth, setCalendarMonth] = useState(todayInPlan().slice(0, 7));

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(data));
  }, [data]);

  const patch = fn => setData(old => fn(old));

  const allLectures = useMemo(
    () => PLAN.dates.flatMap(date => SUBJECTS.flatMap(sub =>
      (PLAN.schedule[date]?.[sub.id] || []).map(l => ({ ...l, date, subjectId: sub.id }))
    )),
    []
  );

  const totalLectures = SUBJECTS.reduce((a, s) => a + s.total, 0);
  const doneLectures = allLectures.filter(l => data.completed[l.id]).length;
  const overdue = allLectures.filter(l => l.date < todayInPlan() && !data.completed[l.id]);
  const remainingStudyDays = PLAN.studyDates.filter(d => d >= todayInPlan()).length || 1;

  const catchupDaily = Math.ceil(
    (overdue.length + allLectures.filter(l => l.date >= todayInPlan() && !data.completed[l.id]).length) /
    remainingStudyDays
  );

  const subjectStats = SUBJECTS.map(s => {
    const ls = allLectures.filter(l => l.subjectId === s.id);
    const done = ls.filter(l => data.completed[l.id]).length;
    return { ...s, done, pending: s.total - done, percent: Math.round(done / s.total * 100) };
  });

  const dayTasks = SUBJECTS.flatMap(s =>
    (PLAN.schedule[day]?.[s.id] || []).map(l => ({ ...l, subject: s }))
  );

  const dayDone = dayTasks.filter(l => data.completed[l.id]).length;

  const questionTotal = Object.values(data.practice || {}).reduce(
    (sum, p) => sum + Number(p.count || 0), 0
  );

  const questionsByType = ['DPP', 'Module', 'PYQ', 'Other'].map(type => ({
    type,
    count: Object.values(data.practice || {})
      .filter(p => p.type === type)
      .reduce((a, p) => a + Number(p.count || 0), 0)
  }));

  const chapterDone = data.chapters.filter(c => c.status === 'Chapter completed').length;

  const streak = useMemo(() => {
    let count = 0;
    let d = todayInPlan();
    while (d >= START) {
      if (sunday(d)) {
        d = addDays(d, -1);
        continue;
      }
      const ids = SUBJECTS.flatMap(s => (PLAN.schedule[d]?.[s.id] || []).map(l => l.id));
      if (ids.length && ids.every(id => data.completed[id])) count++;
      else break;
      d = addDays(d, -1);
    }
    return count;
  }, [data.completed]);

  const weekly = useMemo(() => {
    const start = addDays(day, -6);
    const list = allLectures.filter(l => l.date >= start && l.date <= day);
    const days = PLAN.dates.filter(d => d >= start && d <= day && !sunday(d));
    const active = days.filter(d =>
      SUBJECTS.some(s => (PLAN.schedule[d]?.[s.id] || []).some(l => data.completed[l.id]))
    ).length;
    return {
      total: list.length,
      done: list.filter(l => data.completed[l.id]).length,
      active,
      days: days.length
    };
  }, [day, allLectures, data.completed]);

  const monthly = useMemo(() => {
    const list = allLectures.filter(l => l.date.startsWith(day.slice(0, 7)));
    const qs = Object.values(data.practice || {})
      .filter(p => p.date?.startsWith(day.slice(0, 7)))
      .reduce((a, p) => a + Number(p.count || 0), 0);
    return {
      total: list.length,
      done: list.filter(l => data.completed[l.id]).length,
      questions: qs
    };
  }, [day, allLectures, data.completed, data.practice]);

  const activityFor = d => {
    const ids = SUBJECTS.flatMap(s => (PLAN.schedule[d]?.[s.id] || []).map(l => l.id));
    const done = ids.filter(id => data.completed[id]).length;
    const practice = Object.values(data.practice || {})
      .filter(p => p.date === d)
      .reduce((a, p) => a + Number(p.count || 0), 0);
    const hasTest = data.tests.some(t => t.date === d);
    return {
      ids: ids.length,
      done,
      practice,
      hasTest,
      active: done > 0 || practice > 0 || hasTest || !!data.dailyFlags[d]
    };
  };

  const toggleLecture = id => patch(old => {
    const completed = { ...old.completed };
    if (completed[id]) delete completed[id];
    else completed[id] = true;
    return { ...old, completed };
  });

  const addChapter = e => {
    e.preventDefault();
    if (!chapterForm.name.trim()) return;
    patch(old => ({
      ...old,
      chapters: [...old.chapters, {
        id: crypto.randomUUID(),
        name: chapterForm.name.trim(),
        subject: chapterForm.subject,
        lectures: Number(chapterForm.lectures || 0),
        questionsTarget: Number(chapterForm.questionsTarget || 0),
        status: 'Not started',
        created: dateStr(new Date())
      }]
    }));
    setChapterForm({ name: '', subject: 'maths', lectures: '', questionsTarget: '' });
  };

  const updateChapter = (id, fields) => patch(old => ({
    ...old,
    chapters: old.chapters.map(c => c.id === id ? { ...c, ...fields } : c)
  }));

  const addPractice = e => {
    e.preventDefault();
    if (!practiceForm.chapterId || practiceForm.count === '') return;
    const id = crypto.randomUUID();
    patch(old => ({
      ...old,
      practice: {
        ...old.practice,
        [id]: {
          ...practiceForm,
          id,
          count: Number(practiceForm.count),
          date: practiceForm.date,
          note: practiceForm.note.trim()
        }
      }
    }));
    setPracticeForm(f => ({ ...f, count: '', note: '' }));
  };

  const addRevision = e => {
    e.preventDefault();
    if (!revisionForm.chapterId) return;
    patch(old => ({
      ...old,
      revisions: [...old.revisions, {
        ...revisionForm,
        id: crypto.randomUUID(),
        done: false
      }]
    }));
    setRevisionForm(f => ({ ...f, note: '' }));
  };

  const addTest = e => {
    e.preventDefault();
    if (!testForm.name.trim() || testForm.score === '' || Number(testForm.total) <= 0) return;
    patch(old => ({
      ...old,
      tests: [...old.tests, {
        ...testForm,
        id: crypto.randomUUID(),
        score: Number(testForm.score),
        total: Number(testForm.total),
        minutes: Number(testForm.minutes || 0),
        accuracy: Math.round(Number(testForm.score) / Number(testForm.total) * 100)
      }]
    }));
    setTestForm(f => ({ ...f, name: '', score: '', minutes: '', mistakes: '' }));
  };

  const addSlot = e => {
    e.preventDefault();
    if (!slotForm.activity.trim()) return;
    patch(old => ({
      ...old,
      slots: [...old.slots, { ...slotForm, id: crypto.randomUUID() }]
        .sort((a, b) => a.start.localeCompare(b.start))
    }));
    setSlotForm(f => ({ ...f, activity: '' }));
  };

  const toggleSlot = id => patch(old => ({
    ...old,
    slotDone: {
      ...old.slotDone,
      [day]: {
        ...(old.slotDone[day] || {}),
        [id]: !(old.slotDone[day] || {})[id]
      }
    }
  }));

  const exportData = () => saveFile(data, `jeeverse-backup-${dateStr(new Date())}.json`);

  const importData = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        patch(() => ({ ...DEFAULT, ...parsed }));
        alert('Backup imported successfully.');
      } catch {
        alert('Invalid backup file. Please select a valid JEEVerse JSON backup.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const resetData = () => {
    if (confirm('Reset all JEEVerse progress saved in this browser? Export a backup first if needed.')) {
      localStorage.removeItem(KEY);
      setData({ ...DEFAULT });
    }
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Daily Planner', icon: CalendarDays },
    { name: 'Chapters & Practice', icon: BookOpen },
    { name: 'Revision Scheduler', icon: RotateCcw },
    { name: 'Mock Tests', icon: ClipboardCheck },
    { name: 'Timetable', icon: Clock3 },
    { name: 'Analytics & Calendar', icon: ChartNoAxesCombined }
  ];

  const goToDay = delta => setDay(old => clampDate(addDays(old, delta), START, END));

  function clampDate(date, min, max) {
    return date < min ? min : date > max ? max : date;
  }

  const currentDayIsSunday = sunday(day);