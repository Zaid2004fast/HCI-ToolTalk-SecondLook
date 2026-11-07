// Browser storage, wrapped so the app keeps working if storage is blocked.
const SESSIONS_KEY = 'secondlook.sessions.v1';
const PROGRESS_KEY = 'secondlook.inprogress.v1';

let storageOk = true;
try {
  const k = '__secondlook_test__';
  window.localStorage.setItem(k, '1');
  window.localStorage.removeItem(k);
} catch {
  storageOk = false;
}

export const isStorageAvailable = () => storageOk;

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const loadSessions = () => read(SESSIONS_KEY, []);

export function saveSession(session) {
  const all = loadSessions().filter((s) => s.id !== session.id);
  all.push(session);
  all.sort((a, b) => a.participantNumber - b.participantNumber || a.createdAt.localeCompare(b.createdAt));
  return write(SESSIONS_KEY, all);
}

export function deleteSession(id) {
  return write(SESSIONS_KEY, loadSessions().filter((s) => s.id !== id));
}

export function clearSessions() {
  return write(SESSIONS_KEY, []);
}

// Adds sessions from imported files. Returns { added, skipped }.
export function importSessions(list) {
  const all = loadSessions();
  const ids = new Set(all.map((s) => s.id));
  let added = 0;
  let skipped = 0;
  for (const s of list) {
    if (ids.has(s.id)) {
      skipped += 1;
    } else {
      all.push(s);
      ids.add(s.id);
      added += 1;
    }
  }
  all.sort((a, b) => a.participantNumber - b.participantNumber || a.createdAt.localeCompare(b.createdAt));
  write(SESSIONS_KEY, all);
  return { added, skipped };
}

export const loadProgress = () => read(PROGRESS_KEY, null);
export const saveProgress = (p) => write(PROGRESS_KEY, p);
export function clearProgress() {
  try {
    window.localStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* ignore */
  }
}
