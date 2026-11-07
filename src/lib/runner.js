const TIMEOUT_MS = 2000;

// Runs checks against code in a fresh worker. Always resolves (never throws).
export function runChecks(code, checks) {
  if (!checks.length) return Promise.resolve([]);
  return new Promise((resolve) => {
    let worker;
    try {
      worker = new Worker(new URL('./runner.worker.js', import.meta.url), { type: 'module' });
    } catch (err) {
      resolve(checks.map((c) => failed(c, 'The code runner could not start in this browser.')));
      return;
    }
    const timer = setTimeout(() => {
      worker.terminate();
      resolve(checks.map((c) => failed(c, 'Took too long to finish. Is there a loop that never ends?')));
    }, TIMEOUT_MS);
    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(e.data);
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      e.preventDefault?.();
      resolve(checks.map((c) => failed(c, `The code has a syntax error: ${e.message || 'could not be read'}`)));
    };
    worker.postMessage({ code, checks });
  });
}

function failed(check, error) {
  return { call: check.call, expected: JSON.stringify(check.expected), got: null, error, pass: false };
}
