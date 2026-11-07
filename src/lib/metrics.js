export const TLX_SCALES = [
  {
    key: 'mental',
    name: 'Mental Demand',
    question: 'How mentally demanding was the task?',
    low: 'Very low',
    high: 'Very high',
  },
  {
    key: 'physical',
    name: 'Physical Demand',
    question: 'How physically demanding was the task?',
    low: 'Very low',
    high: 'Very high',
  },
  {
    key: 'temporal',
    name: 'Temporal Demand',
    question: 'How hurried or rushed was the pace of the task?',
    low: 'Very low',
    high: 'Very high',
  },
  {
    key: 'performance',
    name: 'Performance',
    question: 'How successful were you in accomplishing what you were asked to do?',
    low: 'Perfect',
    high: 'Failure',
  },
  {
    key: 'effort',
    name: 'Effort',
    question: 'How hard did you have to work to accomplish your level of performance?',
    low: 'Very low',
    high: 'Very high',
  },
  {
    key: 'frustration',
    name: 'Frustration',
    question: 'How insecure, discouraged, irritated, stressed, and annoyed were you?',
    low: 'Very low',
    high: 'Very high',
  },
];

export const LIKERT_ITEMS = [
  { key: 'control', statement: 'I felt in control of which code ended up in my program.' },
  { key: 'trust', statement: 'I could tell when the assistant’s suggestions were right or wrong.' },
];

export const LIKERT_LABELS = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];

// Raw TLX: the plain average of the six ratings (Hart, 2006).
export function rawTlx(tlx) {
  if (!tlx) return null;
  const vals = TLX_SCALES.map((s) => tlx[s.key]);
  if (vals.some((v) => typeof v !== 'number')) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export function mean(values) {
  const v = values.filter((x) => typeof x === 'number' && !Number.isNaN(x));
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

// One row per participant x interface, used by charts and CSV.
export function summaryRows(sessions) {
  const rows = [];
  for (const s of sessions) {
    s.blocks.forEach((b, i) => {
      if (!b) return;
      const tasks = b.tasks || [];
      const t3 = tasks.find((t) => t.slot === 3);
      rows.push({
        sessionId: s.id,
        participant: s.participant,
        order: s.order.join('>'),
        part: i + 1,
        interface: b.version,
        taskSet: b.set,
        task3Badge: b.version === 'B' ? s.task3Badge : '',
        complete: Boolean(b.tlx),
        rawTlx: rawTlx(b.tlx),
        ...Object.fromEntries(TLX_SCALES.map((sc) => [sc.key, b.tlx ? b.tlx[sc.key] : null])),
        control: b.likert ? b.likert.control : null,
        trust: b.likert ? b.likert.trust : null,
        task3BugFixed: t3 ? t3.allPass : null,
        task3AcceptedUnchanged: t3 ? t3.acceptedUnchanged : null,
        tasksAllCorrect: tasks.filter((t) => t.allPass).length,
        tasksDone: tasks.length,
        accepts: sum(tasks, 'accepts'),
        dismissals: sum(tasks, 'dismissals'),
        defers: sum(tasks, 'defers'),
        exampleRuns: sum(tasks, 'exampleRuns'),
        totalSeconds: Math.round(sum(tasks, 'durationMs') / 1000),
      });
    });
  }
  return rows;
}

function sum(list, key) {
  return list.reduce((a, t) => a + (t[key] || 0), 0);
}

export function taskRows(sessions) {
  const rows = [];
  for (const s of sessions) {
    s.blocks.forEach((b, i) => {
      if (!b) return;
      for (const t of b.tasks || []) {
        rows.push({
          sessionId: s.id,
          participant: s.participant,
          part: i + 1,
          interface: b.version,
          taskSlot: t.slot,
          taskId: t.taskId,
          badge: t.badge || '',
          suggestionCorrect: t.suggestionCorrect,
          accepted: t.accepts > 0,
          acceptedUnchanged: t.acceptedUnchanged,
          dismissals: t.dismissals,
          defers: t.defers,
          reasonOpened: t.reasonOpened,
          exampleRuns: t.exampleRuns,
          allChecksPassed: t.allPass,
          checksPassed: `${t.checks.filter((c) => c.pass).length}/${t.checks.length}`,
          seconds: Math.round(t.durationMs / 1000),
          finalCode: t.finalCode,
        });
      }
    });
  }
  return rows;
}

export function eventRows(sessions) {
  const rows = [];
  for (const s of sessions) {
    for (const e of s.events || []) {
      rows.push({
        sessionId: s.id,
        participant: s.participant,
        time: e.t,
        msFromStart: e.ms,
        part: e.part,
        interface: e.version,
        taskId: e.taskId,
        event: e.type,
        detail: e.detail ? JSON.stringify(e.detail) : '',
      });
    }
  }
  return rows;
}
