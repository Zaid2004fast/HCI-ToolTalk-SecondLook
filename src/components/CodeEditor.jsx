import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { EditorState, Prec } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { indentOnInput, bracketMatching } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { editorTheme, editorHighlight } from '../editor/theme.js';
import {
  suggestionExtension,
  suggestionField,
  deferredField,
  showSuggestion,
  clearSuggestion,
  reasonOpened,
  removeDeferred,
  acceptCommand,
  dismissCommand,
  deferCommand,
} from '../editor/suggestion.js';

function posFromCursor(doc, cursor) {
  const line = doc.line(Math.min(cursor.line, doc.lines));
  return Math.min(line.from + cursor.col - 1, line.to);
}

/**
 * Code editor with inline AI suggestions.
 * onEvent(type, detail) receives: suggestion_shown, suggestion_accepted, suggestion_dismissed,
 * suggestion_deferred, suggestion_hidden_by_edit, reason_opened, undo, redo, edit, state.
 */
const CodeEditor = forwardRef(function CodeEditor({ initialDoc, cursor, onEvent, onRequest, label }, ref) {
  const host = useRef(null);
  const viewRef = useRef(null);
  const eventRef = useRef(onEvent);
  const requestRef = useRef(onRequest);
  eventRef.current = onEvent;
  requestRef.current = onRequest;

  useEffect(() => {
    const emit = (type, detail) => eventRef.current && eventRef.current(type, detail);
    const doc = initialDoc;
    const startState = EditorState.create({ doc });
    const anchor = posFromCursor(startState.doc, cursor);

    const listener = EditorView.updateListener.of((u) => {
      const prev = u.startState.field(suggestionField, false);
      const next = u.state.field(suggestionField, false);
      let explained = false;
      for (const tr of u.transactions) {
        for (const e of tr.effects) {
          if (e.is(showSuggestion)) {
            explained = true;
            emit('suggestion_shown', { badge: e.value.badge || null });
          } else if (e.is(clearSuggestion)) {
            explained = true;
            emit(`suggestion_${e.value.reason}`, { suggestion: e.value.suggestion, deferredId: e.value.deferredId });
          } else if (e.is(reasonOpened)) {
            if (next && next.reasonOpen) emit('reason_opened', {});
          }
        }
        if (tr.isUserEvent('undo')) emit('undo', {});
        else if (tr.isUserEvent('redo')) emit('redo', {});
        else if (tr.docChanged && (tr.isUserEvent('input.type') || tr.isUserEvent('delete') || tr.isUserEvent('input.paste'))) {
          emit('edit', {});
        }
      }
      if (prev && !next && !explained) emit('suggestion_hidden_by_edit', {});
      if (Boolean(prev) !== Boolean(next) || u.docChanged) {
        emit('state', { visible: Boolean(next), docChanged: u.docChanged });
      }
    });

    const shortcuts = Prec.highest(
      keymap.of([
        { key: 'Tab', run: acceptCommand },
        { key: 'Escape', run: dismissCommand },
        // Stops the browser's bookmark shortcut in both interfaces so they feel the same.
        { key: 'Mod-d', run: deferCommand, preventDefault: true },
        {
          key: 'Alt-\\',
          run: () => {
            if (requestRef.current) requestRef.current();
            return true;
          },
        },
      ]),
    );

    const state = EditorState.create({
      doc,
      selection: { anchor },
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        drawSelection(),
        indentOnInput(),
        bracketMatching(),
        highlightActiveLine(),
        javascript(),
        editorTheme,
        editorHighlight,
        EditorState.tabSize.of(2),
        suggestionExtension,
        shortcuts,
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.contentAttributes.of({ 'aria-label': label || 'Code editor' }),
        listener,
      ],
    });

    const view = new EditorView({ state, parent: host.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // The editor is created once per task; the parent remounts it with a new key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    focus() {
      viewRef.current?.focus();
    },
    getCode() {
      return viewRef.current ? viewRef.current.state.doc.toString() : '';
    },
    hasSuggestion() {
      return Boolean(viewRef.current?.state.field(suggestionField, false));
    },
    // Show a suggestion. `at` = 'anchor' (task start position) or 'cursor'.
    show(s, at = 'cursor') {
      const view = viewRef.current;
      if (!view) return;
      const from = at === 'anchor' ? posFromCursor(view.state.doc, cursor) : view.state.selection.main.head;
      view.dispatch({ effects: showSuggestion.of({ ...s, from }) });
    },
    accept() {
      return viewRef.current ? acceptCommand(viewRef.current) : false;
    },
    dismiss() {
      return viewRef.current ? dismissCommand(viewRef.current) : false;
    },
    defer() {
      return viewRef.current ? deferCommand(viewRef.current) : false;
    },
    // Insert a deferred suggestion where it was originally offered.
    insertDeferred(id, text) {
      const view = viewRef.current;
      if (!view) return;
      const d = view.state.field(deferredField, false).find((x) => x.id === id);
      const pos = d ? Math.min(d.pos, view.state.doc.length) : view.state.selection.main.head;
      view.dispatch({
        changes: { from: pos, insert: text },
        selection: { anchor: pos + text.length },
        effects: removeDeferred.of(id),
        userEvent: 'input.complete',
        scrollIntoView: true,
      });
      view.focus();
    },
    discardDeferred(id) {
      viewRef.current?.dispatch({ effects: removeDeferred.of(id) });
    },
    reset(doc) {
      const view = viewRef.current;
      if (!view) return;
      const s = view.state.field(suggestionField, false);
      const anchor = posFromCursor(EditorState.create({ doc }).doc, cursor);
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: doc },
        selection: { anchor },
        effects: s ? clearSuggestion.of({ reason: 'cleared_by_reset', suggestion: s }) : [],
        userEvent: 'reset',
      });
      view.focus();
    },
  }));

  return <div className="sl-editor" ref={host} />;
});

export default CodeEditor;
