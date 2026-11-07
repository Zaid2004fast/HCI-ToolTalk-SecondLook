// CodeMirror extension: Copilot-style inline "ghost text" suggestions.
//
// The first line of a suggestion is drawn inline at the cursor; any further lines
// and the action bar are drawn as a block under that line (no line numbers),
// like real inline assistants. Nothing is inserted until the user accepts.
import { StateField, StateEffect } from '@codemirror/state';
import { EditorView, Decoration, WidgetType } from '@codemirror/view';
import { MOD } from '../lib/a11y.js';

// value: { id, text, from, badge, reason, showBadge, allowDefer }
export const showSuggestion = StateEffect.define();
// value: { reason: 'accepted' | 'dismissed' | 'deferred', suggestion }
export const clearSuggestion = StateEffect.define();
export const reasonOpened = StateEffect.define();

export const addDeferred = StateEffect.define(); // { id, pos }
export const removeDeferred = StateEffect.define(); // id

export const suggestionField = StateField.define({
  create: () => null,
  update(value, tr) {
    let next = value;
    for (const e of tr.effects) {
      if (e.is(showSuggestion)) next = e.value;
      else if (e.is(clearSuggestion)) next = null;
      else if (e.is(reasonOpened) && next) next = { ...next, reasonOpen: !next.reasonOpen };
    }
    if (next && next === value && tr.docChanged) {
      // Typing the start of the suggestion keeps the rest visible (as in Copilot).
      const changes = [];
      tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        changes.push({ fromA, toA, toB, text: inserted.toString() });
      });
      if (changes.length === 1) {
        const c = changes[0];
        if (c.fromA === c.toA && c.fromA === next.from && c.text && next.text.startsWith(c.text)) {
          const rest = next.text.slice(c.text.length);
          if (!rest) return null;
          return { ...next, text: rest, from: c.toB };
        }
      }
      // Any other edit hides the suggestion. It can be shown again on request.
      return null;
    }
    return next;
  },
});

// Positions of deferred suggestions, kept in step with edits.
export const deferredField = StateField.define({
  create: () => [],
  update(list, tr) {
    let next = tr.docChanged ? list.map((d) => ({ ...d, pos: tr.changes.mapPos(d.pos, 1) })) : list;
    for (const e of tr.effects) {
      if (e.is(addDeferred)) next = [...next, e.value];
      if (e.is(removeDeferred)) next = next.filter((d) => d.id !== e.value);
    }
    return next;
  },
});

// ---------------------------------------------------------------- commands
export function acceptCommand(view) {
  const s = view.state.field(suggestionField, false);
  if (!s) return false;
  view.dispatch({
    changes: { from: s.from, insert: s.text },
    selection: { anchor: s.from + s.text.length },
    effects: clearSuggestion.of({ reason: 'accepted', suggestion: s }),
    userEvent: 'input.complete',
    scrollIntoView: true,
  });
  return true;
}

export function dismissCommand(view) {
  const s = view.state.field(suggestionField, false);
  if (!s) return false;
  view.dispatch({ effects: clearSuggestion.of({ reason: 'dismissed', suggestion: s }) });
  return true;
}

export function deferCommand(view) {
  const s = view.state.field(suggestionField, false);
  if (!s || !s.allowDefer) return false;
  const id = `${s.id}-${Date.now()}`;
  view.dispatch({
    effects: [clearSuggestion.of({ reason: 'deferred', suggestion: s, deferredId: id }), addDeferred.of({ id, pos: s.from })],
  });
  return true;
}

// ---------------------------------------------------------------- widgets
const LEVEL_TEXT = { high: 'High', medium: 'Medium', low: 'Low' };
const LEVEL_BARS = { high: 3, medium: 2, low: 1 };

export function badgeElement(level) {
  const badge = document.createElement('span');
  badge.className = `sl-badge sl-badge--${level}`;
  const bars = document.createElement('span');
  bars.className = 'sl-bars';
  bars.setAttribute('aria-hidden', 'true');
  for (let i = 1; i <= 3; i += 1) {
    const b = document.createElement('i');
    if (i <= LEVEL_BARS[level]) b.className = 'on';
    bars.appendChild(b);
  }
  const text = document.createElement('span');
  text.textContent = `${LEVEL_TEXT[level]} confidence`;
  badge.append(bars, text);
  return badge;
}

class GhostInline extends WidgetType {
  constructor(text) {
    super();
    this.text = text;
  }
  eq(other) {
    return other.text === this.text;
  }
  toDOM() {
    const span = document.createElement('span');
    span.className = 'sl-ghost';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = this.text;
    return span;
  }
  ignoreEvent() {
    return true;
  }
}

function actionButton(label, keys, onPress, extraClass = '') {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.tabIndex = -1; // operated by the shortcut shown on the button; keeps Tab for accepting
  btn.className = `sl-act ${extraClass}`;
  const kbd = document.createElement('kbd');
  kbd.textContent = keys;
  const txt = document.createElement('span');
  txt.textContent = label;
  btn.append(kbd, txt);
  btn.addEventListener('mousedown', (e) => e.preventDefault());
  btn.addEventListener('click', onPress);
  return btn;
}

class GhostBlock extends WidgetType {
  constructor(rest, s) {
    super();
    this.rest = rest;
    this.s = s;
  }
  eq(o) {
    return (
      o.rest === this.rest &&
      o.s.id === this.s.id &&
      o.s.badge === this.s.badge &&
      o.s.showBadge === this.s.showBadge &&
      o.s.allowDefer === this.s.allowDefer &&
      Boolean(o.s.reasonOpen) === Boolean(this.s.reasonOpen)
    );
  }
  toDOM(view) {
    const wrap = document.createElement('div');
    wrap.className = 'sl-ghost-block';

    if (this.rest) {
      const pre = document.createElement('div');
      pre.className = 'sl-ghost-lines';
      pre.setAttribute('aria-hidden', 'true');
      pre.textContent = this.rest;
      wrap.appendChild(pre);
    }

    const bar = document.createElement('div');
    bar.className = 'sl-sugbar';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'AI suggestion actions');

    const label = document.createElement('span');
    label.className = 'sl-sugbar-label';
    label.textContent = 'AI suggestion';
    bar.appendChild(label);

    let why = null;
    if (this.s.showBadge && this.s.badge) {
      bar.appendChild(badgeElement(this.s.badge));
      if (this.s.reason) {
        const whyBtn = document.createElement('button');
        whyBtn.type = 'button';
        whyBtn.tabIndex = -1;
        whyBtn.className = 'sl-why';
        const open = Boolean(this.s.reasonOpen);
        whyBtn.textContent = open ? 'Hide reason' : 'Why?';
        whyBtn.setAttribute('aria-expanded', String(open));
        if (open) {
          why = document.createElement('div');
          why.className = 'sl-why-text';
          why.textContent = this.s.reason;
        }
        whyBtn.addEventListener('mousedown', (e) => e.preventDefault());
        // Open/closed lives in editor state, so the block is redrawn and re-measured
        // and the line numbers stay aligned with the code.
        whyBtn.addEventListener('click', () => view.dispatch({ effects: reasonOpened.of(null) }));
        bar.appendChild(whyBtn);
      }
    }

    const actions = document.createElement('span');
    actions.className = 'sl-sugbar-actions';
    actions.appendChild(actionButton('Accept', 'Tab', () => acceptCommand(view), 'sl-act--primary'));
    actions.appendChild(actionButton('Dismiss', 'Esc', () => dismissCommand(view)));
    if (this.s.allowDefer) actions.appendChild(actionButton('Defer', `${MOD} D`, () => deferCommand(view)));
    bar.appendChild(actions);

    wrap.appendChild(bar);
    if (why) wrap.appendChild(why);
    return wrap;
  }
  ignoreEvent() {
    return true;
  }
}

function buildDecorations(state) {
  const s = state.field(suggestionField, false);
  if (!s) return Decoration.none;
  const nl = s.text.indexOf('\n');
  const first = nl === -1 ? s.text : s.text.slice(0, nl);
  const rest = nl === -1 ? '' : s.text.slice(nl + 1);
  const line = state.doc.lineAt(s.from);
  const decos = [];
  if (first) decos.push(Decoration.widget({ widget: new GhostInline(first), side: 1 }).range(s.from));
  decos.push(Decoration.widget({ widget: new GhostBlock(rest, s), side: 1, block: true }).range(line.to));
  return Decoration.set(decos, true);
}

export const suggestionExtension = [
  suggestionField,
  deferredField,
  EditorView.decorations.compute([suggestionField], buildDecorations),
];
