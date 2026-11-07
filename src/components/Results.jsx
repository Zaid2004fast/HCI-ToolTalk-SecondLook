import { useMemo, useRef, useState } from 'react';
import TopBar from './TopBar.jsx';
import Dialog from './Dialog.jsx';
import { loadSessions, importSessions, deleteSession, clearSessions } from '../lib/storage.js';
import { summaryRows, taskRows, eventRows, TLX_SCALES, mean } from '../lib/metrics.js';
import { toCsv, download, stamp, isSessionShape } from '../lib/files.js';
import { announce } from '../lib/a11y.js';

const fmt = (v, d = 1) => (v === null || v === undefined ? '—' : Number(v).toFixed(d));

export default function Results({ onBack }) {
  const [sessions, setSessions] = useState(() => loadSessions());
  const [includeIncomplete, setIncludeIncomplete] = useState(false);
  const [message, setMessage] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type: 'one', session } | { type: 'all' }
  const fileRef = useRef(null);

  const used = useMemo(() => sessions.filter((s) => includeIncomplete || s.completed), [sessions, includeIncomplete]);
  const rows = useMemo(() => summaryRows(used).filter((r) => r.complete || includeIncomplete), [used, includeIncomplete]);
  const byIf = (v) => rows.filter((r) => r.interface === v);
  const A = byIf('A');
  const B = byIf('B');

  async function onImport(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const list = [];
    const bad = [];
    for (const f of files) {
      try {
        const data = JSON.parse(await f.text());
        const items = Array.isArray(data) ? data : [data];
        const valid = items.filter(isSessionShape);
        if (!valid.length) bad.push(f.name);
        list.push(...valid);
      } catch {
        bad.push(f.name);
      }
    }
    const { added, skipped } = importSessions(list);
    setSessions(loadSessions());
    const msg = [
      `${added} session${added === 1 ? '' : 's'} imported.`,
      skipped ? `${skipped} already here, skipped.` : '',
      bad.length ? `Could not read: ${bad.join(', ')}.` : '',
    ]
      .filter(Boolean)
      .join(' ');
    setMessage({ tone: bad.length ? 'warn' : 'ok', text: msg });
    announce(msg);
  }

  function exportCsv(kind) {
    const data = kind === 'summary' ? summaryRows(used) : kind === 'tasks' ? taskRows(used) : eventRows(used);
    if (!data.length) {
      setMessage({ tone: 'warn', text: 'Nothing to export yet.' });
      return;
    }
    download(`secondlook-${kind}-${stamp()}.csv`, toCsv(data), 'text/csv');
  }

  function doDelete() {
    if (confirm.type === 'all') clearSessions();
    else deleteSession(confirm.session.id);
    setSessions(loadSessions());
    setConfirm(null);
    setMessage({ tone: 'ok', text: confirm.type === 'all' ? 'All sessions deleted.' : `${confirm.session.participant} deleted.` });
  }

  const t3 = (list, badge) => {
    const l = badge ? list.filter((r) => r.task3Badge === badge) : list;
    const done = l.filter((r) => r.task3BugFixed !== null);
    return { fixed: done.filter((r) => r.task3BugFixed).length, n: done.length };
  };

  const completeCount = sessions.filter((s) => s.completed).length;

  return (
    <>
      <TopBar
        context="Results"
        right={
          <button type="button" className="sl-btn sl-btn--quiet sl-btn--sm" onClick={onBack}>
            Home
          </button>
        }
      />
      <main className="sl-page sl-wide" id="main">
        <p className="sl-eyebrow">Study data on this device</p>
        <h1 className="sl-page-title">Results</h1>
        <p className="sl-lead">
          {completeCount} complete session{completeCount === 1 ? '' : 's'}
          {sessions.length > completeCount ? ` and ${sessions.length - completeCount} incomplete` : ''}.{' '}
          <strong>Illustration only:</strong> with a handful of participants these numbers show patterns, not proof. No statistical
          tests are run.
        </p>

        <div className="sl-toolbar" role="group" aria-label="Data actions">
          <label className="sl-btn sl-btn--secondary sl-btn--file">
            Import session files
            <input ref={fileRef} type="file" accept=".json,application/json" multiple onChange={onImport} />
          </label>
          <button type="button" className="sl-btn sl-btn--secondary" onClick={() => exportCsv('summary')}>
            Summary CSV
          </button>
          <button type="button" className="sl-btn sl-btn--secondary" onClick={() => exportCsv('tasks')}>
            Tasks CSV
          </button>
          <button type="button" className="sl-btn sl-btn--secondary" onClick={() => exportCsv('events')}>
            Event log CSV
          </button>
          <button
            type="button"
            className="sl-btn sl-btn--secondary"
            onClick={() => download(`secondlook-all-sessions-${stamp()}.json`, JSON.stringify(sessions, null, 2), 'application/json')}
            disabled={!sessions.length}
          >
            Backup (JSON)
          </button>
          <label className="sl-switch">
            <input type="checkbox" checked={includeIncomplete} onChange={(e) => setIncludeIncomplete(e.target.checked)} />
            Include incomplete sessions
          </label>
        </div>
        {message && (
          <p className={`sl-banner sl-banner--${message.tone}`} role="status">
            {message.text}
          </p>
        )}

        {!rows.length ? (
          <div className="sl-empty">
            <h2>No results yet</h2>
            <p>Run a study session from the home page, or import session files from other devices.</p>
          </div>
        ) : (
          <>
            <section aria-labelledby="h-overview" className="sl-section">
              <h2 id="h-overview" className="sl-section-title">
                Overview
              </h2>
              <div className="sl-stats">
                <Stat label="Workload, Raw TLX (lower = easier)" a={fmt(mean(A.map((r) => r.rawTlx)))} b={fmt(mean(B.map((r) => r.rawTlx)))} />
                <Stat
                  label="Wrong Task 3 code fixed before submit"
                  a={`${t3(A).fixed} of ${t3(A).n}`}
                  b={`${t3(B).fixed} of ${t3(B).n}`}
                />
                <Stat label="“I felt in control” (1–5)" a={fmt(mean(A.map((r) => r.control)))} b={fmt(mean(B.map((r) => r.control)))} />
                <Stat
                  label="“I could tell right from wrong” (1–5)"
                  a={fmt(mean(A.map((r) => r.trust)))}
                  b={fmt(mean(B.map((r) => r.trust)))}
                />
              </div>
            </section>

            <section aria-labelledby="h-tlx" className="sl-section">
              <h2 id="h-tlx" className="sl-section-title">
                Workload by NASA-TLX scale
              </h2>
              <p className="sl-hint">
                Bars show the average; dots show each person. 0 = very low, 100 = very high. For Performance, 0 = perfect and 100 =
                failure.
              </p>
              <TlxChart A={A} B={B} />
            </section>

            <section aria-labelledby="h-bug" className="sl-section">
              <h2 id="h-bug" className="sl-section-title">
                Did people catch the wrong suggestion in Task 3?
              </h2>
              <table className="sl-table sl-table--compact">
                <thead>
                  <tr>
                    <th scope="col">Condition</th>
                    <th scope="col">Fixed the bug</th>
                    <th scope="col">Accepted the wrong code unchanged</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Interface A (no badge)', A],
                    ['Interface B, honest Low badge', B.filter((r) => r.task3Badge === 'low')],
                    ['Interface B, misleading High badge', B.filter((r) => r.task3Badge === 'high')],
                  ].map(([label, list]) => {
                    const done = list.filter((r) => r.task3BugFixed !== null);
                    return (
                      <tr key={label}>
                        <th scope="row">{label}</th>
                        <td>
                          {done.filter((r) => r.task3BugFixed).length} of {done.length}
                        </td>
                        <td>
                          {done.filter((r) => r.task3AcceptedUnchanged).length} of {done.length}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            <section aria-labelledby="h-people" className="sl-section">
              <h2 id="h-people" className="sl-section-title">
                Each participant
              </h2>
              <div className="sl-table-scroll">
                <table className="sl-table sl-table--compact">
                  <thead>
                    <tr>
                      <th scope="col">Person</th>
                      <th scope="col">Part</th>
                      <th scope="col">Interface</th>
                      <th scope="col">Raw TLX</th>
                      <th scope="col">Task 3 fixed</th>
                      <th scope="col">Control</th>
                      <th scope="col">Could tell</th>
                      <th scope="col">Accepts</th>
                      <th scope="col">Defers</th>
                      <th scope="col">Example runs</th>
                      <th scope="col">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={`${r.sessionId}-${r.part}`}>
                        <th scope="row">{r.participant}</th>
                        <td>{r.part}</td>
                        <td>
                          {r.interface}
                          {r.task3Badge && <span className="sl-tag sl-tag--soft">T3 {r.task3Badge}</span>}
                        </td>
                        <td>{fmt(r.rawTlx)}</td>
                        <td>{r.task3BugFixed === null ? '—' : r.task3BugFixed ? 'Yes' : 'No'}</td>
                        <td>{r.control ?? '—'}</td>
                        <td>{r.trust ?? '—'}</td>
                        <td>{r.accepts}</td>
                        <td>{r.interface === 'B' ? r.defers : '—'}</td>
                        <td>{r.exampleRuns}</td>
                        <td>{Math.floor(r.totalSeconds / 60)}m {r.totalSeconds % 60}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {sessions.length > 0 && (
          <section aria-labelledby="h-manage" className="sl-section">
            <h2 id="h-manage" className="sl-section-title">
              Manage sessions
            </h2>
            <ul className="sl-session-list">
              {sessions.map((s) => (
                <li key={s.id}>
                  <span>
                    <strong>{s.participant}</strong> · {new Date(s.createdAt).toLocaleString()} · order {s.order.join('→')} · Task 3
                    badge {s.task3Badge}
                    {!s.completed && <span className="sl-tag">incomplete</span>}
                    {s.notes && <span className="sl-session-notes">Notes: {s.notes}</span>}
                  </span>
                  <span className="sl-session-actions">
                    <button
                      type="button"
                      className="sl-btn sl-btn--quiet sl-btn--sm"
                      onClick={() => download(`secondlook-${s.participant}-${s.id}.json`, JSON.stringify(s, null, 2), 'application/json')}
                    >
                      Download
                    </button>
                    <button type="button" className="sl-btn sl-btn--quiet sl-btn--sm" onClick={() => setConfirm({ type: 'one', session: s })}>
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <button type="button" className="sl-btn sl-btn--danger sl-btn--sm" onClick={() => setConfirm({ type: 'all' })}>
              Delete all sessions
            </button>
          </section>
        )}
      </main>

      <Dialog
        open={Boolean(confirm)}
        title={confirm?.type === 'all' ? 'Delete all sessions?' : `Delete ${confirm?.session?.participant}?`}
        onClose={() => setConfirm(null)}
        actions={
          <>
            <button type="button" className="sl-btn sl-btn--quiet" onClick={() => setConfirm(null)} data-autofocus="">
              Cancel
            </button>
            <button type="button" className="sl-btn sl-btn--danger" onClick={doDelete}>
              Delete
            </button>
          </>
        }
      >
        <p>This can’t be undone. Download a backup first if you might need this data.</p>
      </Dialog>
    </>
  );
}

function Stat({ label, a, b }) {
  return (
    <div className="sl-stat">
      <p className="sl-stat-label">{label}</p>
      <div className="sl-stat-values">
        <span>
          <span className="sl-if sl-if--a">A</span>
          {a}
        </span>
        <span>
          <span className="sl-if sl-if--b">B</span>
          {b}
        </span>
      </div>
    </div>
  );
}

function TlxChart({ A, B }) {
  const cats = [...TLX_SCALES.map((s) => ({ key: s.key, name: s.name })), { key: 'rawTlx', name: 'Raw TLX' }];
  const W = 860;
  const H = 300;
  const left = 40;
  const bottom = 56;
  const top = 14;
  const plotH = H - top - bottom;
  const groupW = (W - left - 10) / cats.length;
  const barW = Math.min(30, groupW / 3.2);
  const y = (v) => top + plotH - (v / 100) * plotH;

  const series = [
    { id: 'A', rows: A, cls: 'a' },
    { id: 'B', rows: B, cls: 'b' },
  ];

  const desc = cats
    .map((c) => `${c.name}: A ${fmt(mean(A.map((r) => r[c.key])))}, B ${fmt(mean(B.map((r) => r[c.key])))}`)
    .join('; ');

  return (
    <figure className="sl-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Average NASA-TLX ratings. ${desc}.`}>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={left} x2={W - 6} y1={y(v)} y2={y(v)} className="sl-grid" />
            <text x={left - 8} y={y(v) + 4} className="sl-axis" textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        {cats.map((c, ci) => {
          const gx = left + ci * groupW + groupW / 2;
          return (
            <g key={c.key}>
              {ci === cats.length - 1 && (
                <rect x={gx - groupW / 2 + 4} y={top - 6} width={groupW - 8} height={plotH + 6} className="sl-chart-hl" />
              )}
              {series.map((s, si) => {
                const vals = s.rows.map((r) => r[c.key]).filter((v) => typeof v === 'number');
                const m = mean(vals);
                const x = gx + (si === 0 ? -barW - 3 : 3);
                return (
                  <g key={s.id}>
                    {m !== null && <rect x={x} y={y(m)} width={barW} height={y(0) - y(m)} className={`sl-bar sl-bar--${s.cls}`} rx="2" />}
                    {m !== null && (
                      <text x={x + barW / 2} y={y(m) - 6} className="sl-bar-val" textAnchor="middle">
                        {Math.round(m)}
                      </text>
                    )}
                    {vals.map((v, vi) => (
                      <circle
                        key={vi}
                        cx={x + barW / 2 + ((vi % 3) - 1) * 5}
                        cy={y(v)}
                        r="3.2"
                        className={`sl-dot sl-dot--${s.cls}`}
                      />
                    ))}
                    <text x={x + barW / 2} y={y(0) + 15} className="sl-axis sl-axis--if" textAnchor="middle">
                      {s.id}
                    </text>
                  </g>
                );
              })}
              <text x={gx} y={H - 16} className="sl-axis sl-axis--cat" textAnchor="middle">
                {c.name}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="sl-legend">
        <span>
          <span className="sl-swatch sl-swatch--a" aria-hidden="true" /> Interface A: standard suggestions
        </span>
        <span>
          <span className="sl-swatch sl-swatch--b" aria-hidden="true" /> Interface B: confidence badge + defer
        </span>
      </figcaption>
    </figure>
  );
}
