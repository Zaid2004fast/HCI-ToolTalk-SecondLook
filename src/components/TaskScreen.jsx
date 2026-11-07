import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodeEditor from './CodeEditor.jsx';
import Badge from './Badge.jsx';
import Dialog from './Dialog.jsx';
import { runChecks } from '../lib/runner.js';
import { announce, MOD, ALT } from '../lib/a11y.js';

const THINKING_MS = 1100;

function normalise(code) {
  return code.replace(/\s+/g, ' ').trim();
}

function insertAt(starter, cursor, text) {
  const lines = starter.split('\n');
  let pos = 0;
  for (let i = 0; i < cursor.line - 1; i += 1) pos += lines[i].length + 1;
  pos += cursor.col - 1;
  return starter.slice(0, pos) + text + starter.slice(pos);
}

/**
 * One coding task.
 * mode: 'study' (scored, results hidden), 'practice' (warm-up), 'demo' (results shown after submit)
 */
export default function TaskScreen({
  task,
  version,
  badge,
  mode,
  heading,
  log,
  onSubmit,
  showHidden = false,
  onDemoReset,
}) {
  const isB = version === 'B';
  const editorRef = useRef(null);
  const startedAt = useRef(Date.now());
  const lastEditLog = useRef(0);
  const counts = useRef({
    accepts: 0,
    dismissals: 0,
    defers: 0,
    hiddenByEdit: 0,
    reasonOpened: false,
    exampleRuns: 0,
    edits: 0,
    undos: 0,
    requests: 0,
    deferredInserted: 0,
    deferredDiscarded: 0,
  });

  const [assistant, setAssistant] = useState('thinking'); // thinking | showing | idle
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState([]);
  const [examples, setExamples] = useState(null); // { results, stale }
  const [running, setRunning] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'submit' | 'reset' | null
  const [submitting, setSubmitting] = useState(false);
  const [demoResult, setDemoResult] = useState(null);
  const [editorFocused, setEditorFocused] = useState(false);

  const suggestion = useMemo(
    () => ({
      id: task.id,
      text: task.suggestion,
      badge: isB ? badge : null,
      reason: isB && task.reasons ? task.reasons[badge] : null,
      showBadge: isB,
      allowDefer: isB,
    }),
    [task, isB, badge],
  );

  const announceShown = useCallback(() => {
    const parts = ['AI suggestion available'];
    if (isB) parts.push(`${badge} confidence`);
    parts.push(`Press Tab to accept, Escape to dismiss${isB ? `, ${MOD} D to defer` : ''}.`);
    announce(parts.join('. '));
  }, [isB, badge]);

  // The assistant "thinks" briefly, then offers its suggestion where the cursor started.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const ed = editorRef.current;
      if (!ed) return;
      const untouched = ed.getCode() === task.starter;
      ed.show(suggestion, untouched ? 'anchor' : 'cursor');
      setAssistant('showing');
    }, THINKING_MS);
    // In study mode the cursor starts in the editor, as in a real IDE. In demo mode the
    // presenter keeps their place in the demo controls.
    const focusTimer = mode === 'demo' ? null : window.setTimeout(() => editorRef.current?.focus(), 50);
    log('task_start', { badge: isB ? badge : null, suggestionCorrect: task.correct });
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(focusTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Block the browser bookmark shortcut everywhere on this screen; in B it defers.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        if (e.defaultPrevented) return;
        e.preventDefault();
        if (isB) editorRef.current?.defer();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isB]);

  const requestAgain = useCallback(() => {
    const ed = editorRef.current;
    if (!ed || ed.hasSuggestion() || assistant === 'thinking') return;
    counts.current.requests += 1;
    log('suggestion_requested', {});
    ed.show(suggestion, 'cursor');
    setAssistant('showing');
  }, [assistant, log, suggestion]);

  const onEditorEvent = useCallback(
    (type, detail) => {
      const c = counts.current;
      switch (type) {
        case 'state':
          setVisible(detail.visible);
          if (!detail.visible) setAssistant((a) => (a === 'thinking' ? a : 'idle'));
          if (detail.docChanged) setExamples((ex) => (ex && !ex.stale ? { ...ex, stale: true } : ex));
          return;
        case 'suggestion_shown':
          log(type, detail);
          announceShown();
          return;
        case 'suggestion_accepted':
          c.accepts += 1;
          log(type, {});
          announce(`Suggestion accepted. Press ${MOD} Z to undo.`);
          return;
        case 'suggestion_dismissed':
          c.dismissals += 1;
          log(type, {});
          announce(`Suggestion dismissed. Press ${ALT} backslash to show it again.`);
          return;
        case 'suggestion_deferred':
          c.defers += 1;
          log(type, {});
          setDeferred((d) => [
            ...d,
            { id: detail.deferredId, text: detail.suggestion.text, badge: detail.suggestion.badge, reason: detail.suggestion.reason },
          ]);
          announce('Suggestion deferred. It is in the Deferred list below the editor.');
          return;
        case 'suggestion_hidden_by_edit':
          c.hiddenByEdit += 1;
          log(type, {});
          return;
        case 'reason_opened':
          c.reasonOpened = true;
          log(type, {});
          return;
        case 'undo':
          c.undos += 1;
          log(type, {});
          return;
        case 'edit': {
          c.edits += 1;
          const now = Date.now();
          if (now - lastEditLog.current > 2000) {
            lastEditLog.current = now;
            log('editing', {});
          }
          return;
        }
        default:
          log(type, detail || {});
      }
    },
    [log, announceShown],
  );

  async function runExamples() {
    const code = editorRef.current.getCode();
    setRunning(true);
    const results = await runChecks(code, task.examples);
    setRunning(false);
    setExamples({ results, stale: false });
    counts.current.exampleRuns += 1;
    const passed = results.filter((r) => r.pass).length;
    log('examples_run', { passed, total: results.length });
    announce(`${passed} of ${results.length} examples passed.`);
  }

  function insertDeferred(item) {
    editorRef.current.insertDeferred(item.id, item.text);
    setDeferred((d) => d.filter((x) => x.id !== item.id));
    counts.current.deferredInserted += 1;
    log('deferred_inserted', {});
    announce('Deferred suggestion inserted into your code.');
  }

  function discardDeferred(item) {
    editorRef.current.discardDeferred(item.id);
    setDeferred((d) => d.filter((x) => x.id !== item.id));
    counts.current.deferredDiscarded += 1;
    log('deferred_discarded', {});
    announce('Deferred suggestion discarded.');
  }

  function doReset() {
    setConfirm(null);
    editorRef.current.reset(task.starter);
    setExamples(null);
    log('code_reset', {});
    announce('Code reset to the starting version.');
  }

  async function doSubmit() {
    setSubmitting(true);
    const finalCode = editorRef.current.getCode();
    const checks = await runChecks(finalCode, [...task.examples, ...task.hidden]);
    const c = counts.current;
    const acceptedUnchanged =
      c.accepts + c.deferredInserted > 0 &&
      normalise(finalCode) === normalise(insertAt(task.starter, task.cursor, task.suggestion));
    const result = {
      taskId: task.id,
      slot: task.slot,
      badge: isB ? badge : null,
      suggestionCorrect: task.correct,
      startedAt: new Date(startedAt.current).toISOString(),
      durationMs: Date.now() - startedAt.current,
      finalCode,
      checks,
      allPass: checks.length > 0 && checks.every((r) => r.pass),
      acceptedUnchanged,
      pendingDeferred: deferred.length,
      ...c,
    };
    log('task_submit', {
      allPass: result.allPass,
      passed: checks.filter((r) => r.pass).length,
      total: checks.length,
      acceptedUnchanged,
      pendingDeferred: deferred.length,
    });
    setSubmitting(false);
    setConfirm(null);
    if (mode === 'demo') {
      setDemoResult(result);
    } else {
      onSubmit(result);
    }
  }

  const status =
    assistant === 'thinking'
      ? 'Assistant is thinking…'
      : visible
        ? 'Suggestion shown below the cursor'
        : `No suggestion showing · ${ALT}+\\ to show it again`;

  return (
    <div className="sl-task">
      <section className="sl-brief" aria-labelledby="task-title">
        <p className="sl-eyebrow">{heading}</p>
        <h1 id="task-title" className="sl-task-title">
          {task.title}
        </h1>
        <p className="sl-task-desc">{task.description}</p>

        <h2 className="sl-subhead">Rules</h2>
        <ul className="sl-rules">
          {task.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>

        {mode === 'practice' && <PracticeGuide isB={isB} />}

        <h2 className="sl-subhead">Examples</h2>
        <ul className="sl-examples">
          {task.examples.map((ex, i) => {
            const r = examples?.results?.[i];
            return (
              <li key={ex.call} className={r ? (r.pass ? 'is-pass' : 'is-fail') : undefined}>
                <code className="sl-call">{ex.call}</code>
                <span className="sl-expect">
                  should return <code>{JSON.stringify(ex.expected)}</code>
                </span>
                {r && (
                  <span className={`sl-result ${r.pass ? 'sl-result--pass' : 'sl-result--fail'}`}>
                    <span aria-hidden="true">{r.pass ? '✓' : '✕'}</span> {r.pass ? 'Passed' : 'Failed'}
                    {!r.pass && <span className="sl-result-detail">{r.error ? r.error : `got ${r.got}`}</span>}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {examples?.stale && (
          <p className="sl-note" role="status">
            Your code changed since the last run. Run the examples again to check it.
          </p>
        )}

        {showHidden && task.hidden.length > 0 && (
          <>
            <h2 className="sl-subhead">
              Hidden checks <span className="sl-tag">presenter only</span>
            </h2>
            <ul className="sl-examples sl-examples--hidden">
              {task.hidden.map((ex) => (
                <li key={ex.call}>
                  <code className="sl-call">{ex.call}</code>
                  <span className="sl-expect">
                    should return <code>{JSON.stringify(ex.expected)}</code>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="sl-work" aria-label="Code editor and actions">
        <div className="sl-editor-panel">
        <div className="sl-editor-head">
          <span className="sl-filetab">
            <span className="sl-filetab-dot" aria-hidden="true" />
            {task.fnName}.js
          </span>
          <span className="sl-assistant">
            <span className={`sl-pulse${assistant === 'thinking' ? ' is-on' : ''}`} aria-hidden="true" />
            {status}
          </span>
          <button
            type="button"
            className="sl-btn sl-btn--ghost-dark sl-btn--sm"
            onClick={requestAgain}
            disabled={visible || assistant === 'thinking'}
          >
            Show suggestion <kbd>{ALT}+\</kbd>
          </button>
        </div>

        <div
          className="sl-editor-wrap"
          onFocus={(e) => {
            if (e.target.closest('.cm-editor')) setEditorFocused(true);
          }}
          onBlur={(e) => {
            const next = e.relatedTarget;
            if (!(next instanceof Element && next.closest('.cm-editor'))) setEditorFocused(false);
          }}
        >
          {visible && !editorFocused && (
            <button
              type="button"
              className="sl-focus-hint"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editorRef.current?.focus()}
            >
              Click in the code first. Then the keys <kbd>Tab</kbd> <kbd>Esc</kbd>
              {isB && (
                <>
                  {' '}
                  <kbd>{MOD} D</kbd>
                </>
              )}{' '}
              work.
            </button>
          )}
          <CodeEditor
            ref={editorRef}
            initialDoc={task.starter}
            cursor={task.cursor}
            onEvent={onEditorEvent}
            onRequest={requestAgain}
            label={`Code editor for ${task.fnName}. Press Escape then Tab to leave the editor.`}
          />
        </div>
        </div>

        {isB && (
          <div className="sl-tray" aria-labelledby="tray-title">
            <div className="sl-tray-head">
              <h2 id="tray-title" className="sl-tray-title">
                Deferred <span className="sl-count">{deferred.length}</span>
              </h2>
              <span className="sl-tray-hint">
                Suggestions you set aside with <kbd>{MOD} D</kbd>. Nothing here is in your code until you insert it.
              </span>
            </div>
            {deferred.length > 0 && (
              <ul className="sl-tray-list">
                {deferred.map((item) => (
                  <li key={item.id} className="sl-tray-item">
                    <div className="sl-tray-meta">
                      <Badge level={item.badge} compact />
                      {item.reason && <span className="sl-tray-reason">{item.reason}</span>}
                    </div>
                    <pre className="sl-tray-code">{item.text.replace(/\n {2}/g, '\n')}</pre>
                    <div className="sl-tray-actions">
                      <button type="button" className="sl-btn sl-btn--primary sl-btn--sm" onClick={() => insertDeferred(item)}>
                        Insert into code
                      </button>
                      <button type="button" className="sl-btn sl-btn--quiet sl-btn--sm" onClick={() => discardDeferred(item)}>
                        Discard
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="sl-actionbar">
          <button type="button" className="sl-btn sl-btn--secondary" onClick={runExamples} disabled={running}>
            {running ? 'Running…' : 'Run examples'}
          </button>
          <button type="button" className="sl-btn sl-btn--quiet" onClick={() => setConfirm('reset')}>
            Reset code
          </button>
          <span className="sl-spacer" />
          <span className="sl-undo-hint">
            <kbd>{MOD} Z</kbd> undo
          </span>
          <button type="button" className="sl-btn sl-btn--primary" onClick={() => setConfirm('submit')}>
            {mode === 'practice' ? 'Finish practice' : 'Submit task'}
          </button>
        </div>
      </section>

      <Dialog
        open={confirm === 'submit'}
        title={mode === 'practice' ? 'Finish the practice?' : 'Submit this task?'}
        onClose={() => setConfirm(null)}
        actions={
          <>
            <button type="button" className="sl-btn sl-btn--quiet" onClick={() => setConfirm(null)} data-autofocus={deferred.length ? '' : undefined}>
              {deferred.length ? 'Go back and review' : 'Keep working'}
            </button>
            <button
              type="button"
              className="sl-btn sl-btn--primary"
              onClick={doSubmit}
              disabled={submitting}
              data-autofocus={deferred.length ? undefined : ''}
            >
              {submitting ? 'Saving…' : deferred.length ? 'Submit anyway' : mode === 'practice' ? 'Finish practice' : 'Submit'}
            </button>
          </>
        }
      >
        {mode !== 'practice' && <p>You can’t change this task after submitting.</p>}
        {deferred.length > 0 && (
          <p className="sl-warn">
            You have {deferred.length} deferred suggestion{deferred.length > 1 ? 's' : ''} you haven’t reviewed. Deferred code is
            not in your program.
          </p>
        )}
        {visible && <p className="sl-note">The grey AI suggestion is still showing. It is not part of your code unless you accept it.</p>}
      </Dialog>

      <Dialog
        open={confirm === 'reset'}
        title="Reset to the starting code?"
        onClose={() => setConfirm(null)}
        actions={
          <>
            <button type="button" className="sl-btn sl-btn--quiet" onClick={() => setConfirm(null)} data-autofocus="">
              Cancel
            </button>
            <button type="button" className="sl-btn sl-btn--danger" onClick={doReset}>
              Reset code
            </button>
          </>
        }
      >
        <p>Your changes to this task will be removed. You can undo this with {MOD} Z.</p>
      </Dialog>

      {mode === 'demo' && (
        <Dialog
          open={Boolean(demoResult)}
          wide
          title={demoResult?.allPass ? 'All checks passed' : 'Some checks failed'}
          onClose={() => setDemoResult(null)}
          actions={
            <>
              <button type="button" className="sl-btn sl-btn--quiet" onClick={() => setDemoResult(null)} data-autofocus="">
                Back to the code
              </button>
              <button type="button" className="sl-btn sl-btn--primary" onClick={onDemoReset}>
                Start this task again
              </button>
            </>
          }
        >
          {demoResult && <CheckTable checks={demoResult.checks} exampleCount={task.examples.length} />}
          {demoResult && (
            <p className="sl-note">
              The AI suggestion for this task was {task.correct ? 'correct' : 'wrong'}
              {isB ? `, and it was shown with a ${badge} confidence badge` : ''}.
            </p>
          )}
        </Dialog>
      )}
    </div>
  );
}

export function CheckTable({ checks, exampleCount }) {
  return (
    <table className="sl-table sl-table--checks">
      <thead>
        <tr>
          <th scope="col">Check</th>
          <th scope="col">Expected</th>
          <th scope="col">Got</th>
          <th scope="col">Result</th>
        </tr>
      </thead>
      <tbody>
        {checks.map((c, i) => (
          <tr key={c.call} className={c.pass ? 'is-pass' : 'is-fail'}>
            <td>
              <code>{c.call}</code>
              <span className="sl-tag sl-tag--soft">{i < exampleCount ? 'example' : 'hidden'}</span>
            </td>
            <td>
              <code>{c.expected}</code>
            </td>
            <td>{c.error ? <span className="sl-error-text">{c.error}</span> : <code>{c.got}</code>}</td>
            <td>
              <span className={`sl-result ${c.pass ? 'sl-result--pass' : 'sl-result--fail'}`}>
                <span aria-hidden="true">{c.pass ? '✓' : '✕'}</span> {c.pass ? 'Pass' : 'Fail'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PracticeGuide({ isB }) {
  return (
    <div className="sl-guide">
      <h2 className="sl-subhead">How this works</h2>
      <ol>
        <li>Wait a moment. The assistant shows a suggestion in grey text at the cursor.</li>
        <li>
          Press <kbd>Tab</kbd> to accept it, or <kbd>Esc</kbd> to dismiss it. You can also type your own code.
        </li>
        {isB && (
          <li>
            The badge shows <strong>how confident the assistant is</strong> in its suggestion. Select <em>Why?</em> to see its
            reason.
          </li>
        )}
        {isB && (
          <li>
            Press <kbd>{MOD} D</kbd> to <strong>defer</strong>: the suggestion moves to the Deferred list under the editor. Insert
            or discard it later.
          </li>
        )}
        <li>
          Use <strong>Run examples</strong> to test your code, and <kbd>{MOD} Z</kbd> to undo.
        </li>
        <li>When you are happy with your code, select the button at the bottom right.</li>
      </ol>
    </div>
  );
}
