// Counterbalanced assignment from the participant number.
//   Order:     odd numbers do A then B, even numbers do B then A.
//   Task sets: Part 1 always uses set 1, Part 2 always uses set 2,
//              so each interface meets each set equally often.
//   Task 3 badge in B: P1, P2 honest (Low); P3, P4 misleading (High); P5, P6 honest; ...
export function defaultAssignment(n) {
  const order = n % 2 === 1 ? ['A', 'B'] : ['B', 'A'];
  const task3Badge = Math.floor((n - 1) / 2) % 2 === 0 ? 'low' : 'high';
  return { order, task3Badge };
}

export function parseParticipantNumber(text) {
  const m = String(text).trim().match(/^p?\s*(\d{1,3})$/i);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 ? n : null;
}
