import { useMemo, useState } from 'react';
import TopBar from './TopBar.jsx';
import { defaultAssignment, parseParticipantNumber } from '../lib/assign.js';
import { loadSessions } from '../lib/storage.js';

export const INTRO_SCRIPT =
  'This is a class demo, not real research. You will write six small functions with an AI coding assistant, in two parts. ' +
  'Accept, change, ignore or set aside the suggestions however you normally would. We are testing the interface, not you. ' +
  'After each part you will rate how demanding it felt. It takes about 15 minutes. Your answers are anonymous, and you can stop at any time.';

export default function Setup({ onStart, onCancel }) {
  const [raw, setRaw] = useState('');
  const [touched, setTouched] = useState(false);
  const [override, setOverride] = useState(null); // { order, task3Badge } or null
  const [checks, setChecks] = useState({ script: false, consent: false });

  const n = parseParticipantNumber(raw);
  const existing = useMemo(() => loadSessions(), []);
  const duplicate = n !== null && existing.some((s) => s.participantNumber === n);
  const auto = n !== null ? defaultAssignment(n) : null;
  const assignment = override || auto;
  const ready = n !== null && checks.script && checks.consent;

  function start(e) {
    e.preventDefault();
    setTouched(true);
    if (!ready) return;
    const now = new Date();
    onStart({
      id: `P${n}-${now.getTime().toString(36)}`,
      participant: `P${n}`,
      participantNumber: n,
      createdAt: now.toISOString(),
      startedMs: now.getTime(),
      order: assignment.order,
      task3Badge: assignment.task3Badge,
      assignmentOverridden: Boolean(override),
      blocks: assignment.order.map((version, i) => ({ version, set: i + 1, tasks: [], tlx: null, likert: null })),
      events: [],
      notes: '',
      completed: false,
      appVersion: '1.0.0',
      userAgent: navigator.userAgent,
    });
  }

  const setOrder = (order) => setOverride({ ...(override || auto), order });
  const setBadge = (task3Badge) => setOverride({ ...(override || auto), task3Badge });

  return (
    <>
      <TopBar context="New study session · Facilitator" right={<button type="button" className="sl-btn sl-btn--quiet sl-btn--sm" onClick={onCancel}>Cancel</button>} />
      <main className="sl-page sl-setup" id="main">
        <p className="sl-eyebrow">Step 1 of 2 · Facilitator only</p>
        <h1 className="sl-page-title">Set up the session</h1>
        <p className="sl-lead">Fill this in before handing the laptop to the participant.</p>

        <form onSubmit={start} noValidate>
          <div className="sl-field">
            <label htmlFor="pid" className="sl-label">
              Participant number
            </label>
            <p className="sl-hint" id="pid-hint">
              Use the next free number: 1, 2, 3… Do not enter names.
            </p>
            <div className="sl-input-prefix">
              <span aria-hidden="true">P</span>
              <input
                id="pid"
                inputMode="numeric"
                autoComplete="off"
                value={raw}
                onChange={(e) => {
                  setRaw(e.target.value);
                  setOverride(null);
                }}
                onBlur={() => setTouched(true)}
                aria-describedby={`pid-hint${touched && n === null ? ' pid-err' : ''}${duplicate ? ' pid-dup' : ''}`}
                aria-invalid={touched && n === null ? 'true' : undefined}
              />
            </div>
            {touched && n === null && (
              <p className="sl-field-error" id="pid-err">
                Enter a number, for example 3.
              </p>
            )}
            {duplicate && (
              <p className="sl-field-warn" id="pid-dup">
                P{n} already has a saved session on this device. Use a different number unless you are repeating it on purpose.
              </p>
            )}
          </div>

          {assignment && (
            <div className="sl-assign" aria-live="polite">
              <h2 className="sl-section-title">Assigned conditions {override ? <span className="sl-tag">changed by hand</span> : <span className="sl-tag sl-tag--soft">automatic</span>}</h2>
              <p className="sl-hint">
                Set automatically from the participant number so the order and Task 3 badge are balanced across people. Only change
                these if you need to.
              </p>
              <fieldset className="sl-seg-field">
                <legend className="sl-label">Interface order</legend>
                <div className="sl-seg">
                  {[
                    ['A', 'B'],
                    ['B', 'A'],
                  ].map((o) => (
                    <label key={o.join('')} className={assignment.order.join('') === o.join('') ? 'is-on' : undefined}>
                      <input type="radio" name="order" checked={assignment.order.join('') === o.join('')} onChange={() => setOrder(o)} />
                      {o[0]} first, then {o[1]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="sl-seg-field">
                <legend className="sl-label">Task 3 badge in Interface B (the wrong suggestion)</legend>
                <div className="sl-seg">
                  <label className={assignment.task3Badge === 'low' ? 'is-on' : undefined}>
                    <input type="radio" name="t3" checked={assignment.task3Badge === 'low'} onChange={() => setBadge('low')} />
                    Low (honest)
                  </label>
                  <label className={assignment.task3Badge === 'high' ? 'is-on' : undefined}>
                    <input type="radio" name="t3" checked={assignment.task3Badge === 'high'} onChange={() => setBadge('high')} />
                    High (misleading)
                  </label>
                </div>
              </fieldset>
              <dl className="sl-plan">
                {assignment.order.map((v, i) => (
                  <div key={i}>
                    <dt>Part {i + 1}</dt>
                    <dd>
                      Interface {v} · Task set {i + 1}
                      {v === 'B' ? ` · Task 3 badge ${assignment.task3Badge === 'low' ? 'Low' : 'High'}` : ''}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="sl-script">
            <h2 className="sl-section-title">Read this aloud</h2>
            <blockquote>{INTRO_SCRIPT}</blockquote>
          </div>

          <fieldset className="sl-checks">
            <legend className="sl-label">Before you start</legend>
            <label>
              <input type="checkbox" checked={checks.script} onChange={(e) => setChecks((c) => ({ ...c, script: e.target.checked }))} />
              I read the script above to the participant.
            </label>
            <label>
              <input type="checkbox" checked={checks.consent} onChange={(e) => setChecks((c) => ({ ...c, consent: e.target.checked }))} />
              The participant agreed to take part.
            </label>
            {touched && (!checks.script || !checks.consent) && (
              <p className="sl-field-error">Tick both boxes to start.</p>
            )}
          </fieldset>

          <div className="sl-form-actions">
            <button type="submit" className="sl-btn sl-btn--primary sl-btn--lg" aria-disabled={!ready}>
              Hand over to participant
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
