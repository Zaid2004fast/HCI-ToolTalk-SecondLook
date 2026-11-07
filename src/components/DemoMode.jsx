import { useCallback, useState } from 'react';
import TopBar from './TopBar.jsx';
import TaskScreen from './TaskScreen.jsx';
import { PRACTICE, TASK_SETS, findTask, badgeFor } from '../data/tasks.js';

const OPTIONS = [
  { id: PRACTICE.id, label: 'Practice · Add two numbers' },
  ...TASK_SETS[1].map((t) => ({ id: t.id, label: `Set 1 · Task ${t.slot} · ${t.title}` })),
  ...TASK_SETS[2].map((t) => ({ id: t.id, label: `Set 2 · Task ${t.slot} · ${t.title}` })),
];

export default function DemoMode({ onBack }) {
  const [version, setVersion] = useState('B');
  const [taskId, setTaskId] = useState(TASK_SETS[1][2].id);
  const [t3, setT3] = useState('high');
  const [showHidden, setShowHidden] = useState(false);
  const [nonce, setNonce] = useState(0);
  const task = findTask(taskId);
  const isT3 = task.confidence === 'task3';
  const noop = useCallback(() => {}, []);

  return (
    <div className="sl-app-frame">
      <TopBar
        context="Demo mode · nothing is saved"
        right={
          <button type="button" className="sl-btn sl-btn--quiet sl-btn--sm" onClick={onBack}>
            Home
          </button>
        }
      />
      <div className="sl-demobar" role="group" aria-label="Demo settings">
        <fieldset className="sl-seg-field sl-seg-field--inline">
          <legend className="sl-label">Interface</legend>
          <div className="sl-seg sl-seg--dark">
            {['A', 'B'].map((v) => (
              <label key={v} className={version === v ? 'is-on' : undefined}>
                <input type="radio" name="demo-if" checked={version === v} onChange={() => setVersion(v)} />
                {v === 'A' ? 'A · Standard' : 'B · Confidence + defer'}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="sl-field sl-field--inline">
          <label htmlFor="demo-task" className="sl-label">
            Task
          </label>
          <select id="demo-task" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
            {OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="sl-seg-field sl-seg-field--inline" disabled={!(isT3 && version === 'B')}>
          <legend className="sl-label">Task 3 badge</legend>
          <div className="sl-seg sl-seg--dark">
            {[
              ['low', 'Low (honest)'],
              ['high', 'High (misleading)'],
            ].map(([v, l]) => (
              <label key={v} className={t3 === v ? 'is-on' : undefined}>
                <input type="radio" name="demo-t3" checked={t3 === v} onChange={() => setT3(v)} />
                {l}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="sl-switch sl-switch--dark">
          <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
          Show hidden checks
        </label>

        <button type="button" className="sl-btn sl-btn--ghost-dark sl-btn--sm" onClick={() => setNonce((n) => n + 1)}>
          Restart task
        </button>

        <p className="sl-demobar-note">Confidence values are simulated by the team for this demo.</p>
      </div>

      <main id="main" className="sl-main-task">
        <TaskScreen
          key={`${version}-${taskId}-${t3}-${nonce}`}
          task={task}
          version={version}
          badge={badgeFor(task, t3)}
          mode="demo"
          heading={`Demo · Interface ${version} · ${task.slot ? `Task ${task.slot}` : 'Practice'}`}
          log={noop}
          onSubmit={noop}
          showHidden={showHidden}
          onDemoReset={() => setNonce((n) => n + 1)}
        />
      </main>
    </div>
  );
}
