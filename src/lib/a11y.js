// Screen-reader announcements through one shared polite live region.
let region = null;

export function registerLiveRegion(el) {
  region = el;
}

export function announce(message) {
  if (!region) return;
  region.textContent = '';
  // A short delay makes repeated identical messages announce again.
  window.setTimeout(() => {
    if (region) region.textContent = message;
  }, 60);
}

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const MOD = isMac ? '⌘' : 'Ctrl';
export const ALT = isMac ? '⌥' : 'Alt';
