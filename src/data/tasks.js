// All study tasks live here so the team can review or change them in one place.
//
// Each task:
//   starter      code shown when the task opens; the cursor starts at `cursor`
//                (line and column, both 1-based) inside the empty function body
//   suggestion   what the "AI" offers, inserted at the cursor (written by us; no real model)
//   correct      whether the suggestion meets every rule in the brief
//   confidence   badge level shown in Interface B ('high' | 'medium' | 'low')
//                Task 3's badge is decided per participant (honest = low, misleading = high)
//   reasons      one-line explanation shown when the participant opens "Why?"
//   examples     visible checks the participant can run with "Run examples"
//   hidden       extra checks run only on submit; used to score correctness
//
// Checks are JavaScript calls evaluated against the participant's code.

export const PRACTICE = {
  id: 'practice',
  slot: 0,
  title: 'Add two numbers',
  fnName: 'add',
  description: 'Return the sum of a and b. This is a warm-up so you can try the controls; it is not scored.',
  rules: ['Return a + b.'],
  starter: 'function add(a, b) {\n  \n}\n',
  cursor: { line: 2, col: 3 },
  suggestion: 'return a + b;',
  correct: true,
  confidence: 'high',
  reasons: { high: 'Very common pattern; matches the function name and parameters.' },
  examples: [
    { call: 'add(2, 3)', expected: 5 },
    { call: 'add(-1, 1)', expected: 0 },
  ],
  hidden: [],
};

const SET_1 = [
  {
    id: 's1-format-date',
    slot: 1,
    title: 'Format a date',
    fnName: 'formatDate',
    description: 'Return the date as text in the format DD/MM/YYYY.',
    rules: [
      'Day and month always have two digits (5 becomes 05).',
      'Use the date’s own day, month and year.',
    ],
    starter: 'function formatDate(date) {\n  \n}\n',
    cursor: { line: 2, col: 3 },
    suggestion:
      'const day = String(date.getDate()).padStart(2, "0");\n' +
      '  const month = String(date.getMonth() + 1).padStart(2, "0");\n' +
      '  return `${day}/${month}/${date.getFullYear()}`;',
    correct: true,
    confidence: 'high',
    reasons: { high: 'Matches a very common, well-tested pattern for date formatting.' },
    examples: [
      { call: 'formatDate(new Date(2026, 10, 7))', expected: '07/11/2026' },
      { call: 'formatDate(new Date(2025, 0, 5))', expected: '05/01/2025' },
    ],
    hidden: [
      { call: 'formatDate(new Date(2024, 11, 31))', expected: '31/12/2024' },
      { call: 'formatDate(new Date(2026, 1, 9))', expected: '09/02/2026' },
    ],
  },
  {
    id: 's1-valid-email',
    slot: 2,
    title: 'Check an email address',
    fnName: 'isValidEmail',
    description: 'Return true if the text is a valid email address, otherwise false.',
    rules: [
      'There must be at least one character before the @.',
      'The part after the @ must contain a dot (for example gmail.com).',
    ],
    starter: 'function isValidEmail(text) {\n  \n}\n',
    cursor: { line: 2, col: 3 },
    suggestion: 'return text.includes("@");',
    correct: false,
    confidence: 'medium',
    reasons: { medium: 'Covers the common case, but some of the rules may not be checked.' },
    examples: [
      { call: 'isValidEmail("ali@gmail.com")', expected: true },
      { call: 'isValidEmail("ali.gmail.com")', expected: false },
    ],
    hidden: [
      { call: 'isValidEmail("ali@gmail")', expected: false },
      { call: 'isValidEmail("@gmail.com")', expected: false },
      { call: 'isValidEmail("sara.khan@uni.edu.pk")', expected: true },
    ],
  },
  {
    id: 's1-average',
    slot: 3,
    title: 'Average of a list',
    fnName: 'average',
    description: 'Return the average (mean) of the numbers in the list.',
    rules: ['If the list is empty, return 0.'],
    starter: 'function average(numbers) {\n  \n}\n',
    cursor: { line: 2, col: 3 },
    suggestion: 'return numbers.reduce((sum, n) => sum + n) / numbers.length;',
    correct: false,
    confidence: 'task3',
    reasons: {
      high: 'Matches a common pattern seen in many similar functions.',
      low: 'Unusual inputs, such as an empty list, may not be handled.',
    },
    examples: [
      { call: 'average([2, 4, 6])', expected: 4 },
      { call: 'average([10])', expected: 10 },
    ],
    hidden: [
      { call: 'average([])', expected: 0 },
      { call: 'average([1, 2])', expected: 1.5 },
    ],
  },
];

const SET_2 = [
  {
    id: 's2-format-time',
    slot: 1,
    title: 'Format a time',
    fnName: 'formatTime',
    description: 'Return the time as text in 24-hour format HH:MM.',
    rules: [
      'Hours and minutes always have two digits (9 becomes 09).',
      'Use the date’s own hours and minutes.',
    ],
    starter: 'function formatTime(date) {\n  \n}\n',
    cursor: { line: 2, col: 3 },
    suggestion:
      'const hours = String(date.getHours()).padStart(2, "0");\n' +
      '  const minutes = String(date.getMinutes()).padStart(2, "0");\n' +
      '  return `${hours}:${minutes}`;',
    correct: true,
    confidence: 'high',
    reasons: { high: 'Matches a very common, well-tested pattern for time formatting.' },
    examples: [
      { call: 'formatTime(new Date(2026, 0, 1, 9, 5))', expected: '09:05' },
      { call: 'formatTime(new Date(2026, 0, 1, 23, 45))', expected: '23:45' },
    ],
    hidden: [
      { call: 'formatTime(new Date(2026, 0, 1, 0, 0))', expected: '00:00' },
      { call: 'formatTime(new Date(2026, 0, 1, 12, 30))', expected: '12:30' },
    ],
  },
  {
    id: 's2-valid-phone',
    slot: 2,
    title: 'Check a mobile number',
    fnName: 'isValidPhone',
    description: 'Return true if the text is a valid Pakistani mobile number, otherwise false.',
    rules: [
      'It must be exactly 11 characters long.',
      'It must start with 03.',
      'It must contain digits only (no spaces or dashes).',
    ],
    starter: 'function isValidPhone(text) {\n  \n}\n',
    cursor: { line: 2, col: 3 },
    suggestion: 'return text.length === 11;',
    correct: false,
    confidence: 'medium',
    reasons: { medium: 'Covers the common case, but some of the rules may not be checked.' },
    examples: [
      { call: 'isValidPhone("03001234567")', expected: true },
      { call: 'isValidPhone("0300123")', expected: false },
    ],
    hidden: [
      { call: 'isValidPhone("12345678901")', expected: false },
      { call: 'isValidPhone("0300-123456")', expected: false },
      { call: 'isValidPhone("03331234567")', expected: true },
    ],
  },
  {
    id: 's2-max-value',
    slot: 3,
    title: 'Largest number in a list',
    fnName: 'maxValue',
    description: 'Return the largest number in the list.',
    rules: ['The list always has at least one number.', 'Numbers can be negative.'],
    starter: 'function maxValue(numbers) {\n  \n}\n',
    cursor: { line: 2, col: 3 },
    suggestion:
      'let max = 0;\n' +
      '  for (const n of numbers) {\n' +
      '    if (n > max) max = n;\n' +
      '  }\n' +
      '  return max;',
    correct: false,
    confidence: 'task3',
    reasons: {
      high: 'Matches a common pattern seen in many similar functions.',
      low: 'Some kinds of numbers, such as negatives, may not be handled.',
    },
    examples: [
      { call: 'maxValue([3, 9, 4])', expected: 9 },
      { call: 'maxValue([7])', expected: 7 },
    ],
    hidden: [
      { call: 'maxValue([-5, -2, -9])', expected: -2 },
      { call: 'maxValue([0, -1])', expected: 0 },
    ],
  },
];

export const TASK_SETS = { 1: SET_1, 2: SET_2 };
export const ALL_TASKS = [...SET_1, ...SET_2];

export function findTask(id) {
  if (id === PRACTICE.id) return PRACTICE;
  return ALL_TASKS.find((t) => t.id === id);
}

// Badge level for a task in Interface B. Task 3 depends on the participant's condition.
export function badgeFor(task, task3Badge) {
  return task.confidence === 'task3' ? task3Badge : task.confidence;
}

export const CONFIDENCE_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };
