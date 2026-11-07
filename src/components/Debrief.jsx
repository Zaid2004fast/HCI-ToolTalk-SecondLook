import { useState } from 'react';
import { findTask } from '../data/tasks.js';
import { rawTlx } from '../lib/metrics.js';
import { download } from '../lib/files.js';

export default function Debrief({ session, onNotes, onFinish }) {
  const [notes, setNotes] = useState(session.notes || '');
  const [saved, setSaved] = useState(false);
  const bPart = session.order.indexOf('B') + 1;
  const honest = session.task3Badge === 'low';

  function saveNotes() {
    onNotes(notes);
    setSaved(true);
  }

  function downloadFile() {
    onNotes(notes);
    download(`secondlook-${session.participant}-${session.id}.json`, JSON.stringify({ ...session, notes }, null, 2), 'application/json');
  }

  return (
    <main className="sl-page sl-debrief" id="main">
      <p className="sl-eyebrow">All done</p>
      <h1 className="sl-page-title">Thank you. Here is what we were testing.</h1>

      <section className="sl-card" aria-labelledby="what">
        <h2 id="what" className="sl-section-title">
          What this was about
        </h2>
        <p>
          We are comparing a standard AI code assistant (<strong>Interface A</strong>) with one that shows a{' '}
          <strong>confidence badge</strong> and lets you <strong>defer</strong> a suggestion (<strong>Interface B</strong>). We want
          to know whether this changes how people check AI code, and how demanding it feels.
        </p>
        <p>
          <strong>The assistant was not a real AI.</strong> Our team wrote every suggestion and every confidence level in advance.
          Some suggestions were wrong on purpose so we could see whether they were caught.
        </p>
        <p>
          In Part {bPart} (Interface B), the last task’s suggestion was wrong and was labelled{' '}
          <strong>{honest ? 'Low confidence, which was honest' : 'High confidence, which was misleading'}</strong>.{' '}
          {honest
            ? 'Other participants saw the same wrong code labelled High.'
            : 'Other participants saw the same wrong code labelled Low. Real AI confidence can be wrong in exactly this way.'}
        </p>
      </section>

      <section className="sl-card" aria-labelledby="yours">
        <h2 id="yours" className="sl-section-title">
          Your results
        </h2>
        <table className="sl-table">
          <thead>
            <tr>
              <th scope="col">Part</th>
              <th scope="col">Task</th>
              <th scope="col">AI suggestion was</th>
              <th scope="col">Your final code</th>
            </tr>
          </thead>
          <tbody>
            {session.blocks.flatMap((b, i) =>
              b.tasks.map((t) => {
                const task = findTask(t.taskId);
                const passed = t.checks.filter((c) => c.pass).length;
                return (
                  <tr key={t.taskId}>
                    <td>
                      {i + 1} · Interface {b.version}
                    </td>
                    <td>
                      {task ? task.title : t.taskId}
                      {t.badge && <span className="sl-tag sl-tag--soft">{t.badge} badge</span>}
                    </td>
                    <td>{t.suggestionCorrect ? 'Correct' : 'Wrong'}</td>
                    <td>
                      <span className={`sl-result ${t.allPass ? 'sl-result--pass' : 'sl-result--fail'}`}>
                        <span aria-hidden="true">{t.allPass ? '✓' : '✕'}</span>{' '}
                        {t.allPass ? 'Passed all checks' : `Passed ${passed} of ${t.checks.length} checks`}
                      </span>
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
        <p className="sl-hint">
          Workload score (Raw NASA-TLX, 0 = very low, 100 = very high):{' '}
          {session.blocks.map((b, i) => `Interface ${b.version} ${rawTlx(b.tlx) ?? '—'}`).join(' · ')}
        </p>
      </section>

      <section className="sl-card sl-card--facilitator" aria-labelledby="fac">
        <h2 id="fac" className="sl-section-title">
          Facilitator: short interview
        </h2>
        <ol className="sl-prompts">
          <li>When did you check the AI’s code carefully, and when did you just accept it?</li>
          <li>Did the confidence badge change what you did? How?</li>
          <li>Did you use Defer? Why, or why not?</li>
          <li>Did any badge make you trust code you shouldn’t have?</li>
        </ol>
        <label htmlFor="notes" className="sl-label">
          Notes (no names)
        </label>
        <textarea
          id="notes"
          rows={6}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
          onBlur={saveNotes}
        />
        <p className="sl-hint" role="status">
          {saved ? 'Notes saved on this device.' : 'Notes save when you leave the box.'}
        </p>
        <div className="sl-form-actions">
          <button type="button" className="sl-btn sl-btn--secondary" onClick={downloadFile}>
            Download session file
          </button>
          <button
            type="button"
            className="sl-btn sl-btn--primary"
            onClick={() => {
              onNotes(notes);
              onFinish();
            }}
          >
            Finish and go home
          </button>
        </div>
        <p className="sl-hint">
          The session is already saved in this browser. If you are testing on someone else’s device, download the session file and
          import it on the Results page of the team laptop.
        </p>
      </section>
    </main>
  );
}
