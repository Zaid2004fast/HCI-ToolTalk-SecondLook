// Runs participant code in a worker so infinite loops cannot freeze the page.
function format(value) {
  if (value === undefined) return 'undefined';
  if (typeof value === 'number' && Number.isNaN(value)) return 'NaN';
  if (typeof value === 'string') return JSON.stringify(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function equal(a, b) {
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) || Number.isNaN(b)) return Number.isNaN(a) && Number.isNaN(b);
    return Math.abs(a - b) < 1e-9;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => equal(x, b[i]));
  }
  return a === b;
}

self.onmessage = (event) => {
  const { code, checks } = event.data;
  const results = checks.map((check) => {
    try {
      // eslint-disable-next-line no-new-func
      const run = new Function(`"use strict";\n${code}\n;return (${check.call});`);
      const got = run();
      return { call: check.call, expected: format(check.expected), got: format(got), pass: equal(got, check.expected) };
    } catch (err) {
      return {
        call: check.call,
        expected: format(check.expected),
        got: null,
        error: `${err && err.name ? err.name : 'Error'}: ${err && err.message ? err.message : String(err)}`,
        pass: false,
      };
    }
  });
  self.postMessage(results);
};
