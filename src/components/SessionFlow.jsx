import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TopBar from './TopBar.jsx';
import TaskScreen from './TaskScreen.jsx';
import TlxForm from './TlxForm.jsx';
import Dialog from './Dialog.jsx';
import Debrief from './Debrief.jsx';
import { PRACTICE, TASK_SETS, badgeFor } from '../data/tasks.js';
import { saveProgress, clearProgress, saveSession } from '../lib/storage.js';

function buildSteps(session) {
  const steps = [{ type: 'intro' }];
  session.blocks.forEach((b, part) => {
    if (part > 0) steps.push({ type: 'between', part });
    steps.push({ type: 'practice', part });
    TASK_SETS[b.set].forEach((task) => steps.push({ type: 'task', part, taskId: task.id, slot: task.slot }));
    steps.push({ type: 'tlx', part });
  });
  steps.push({ type: 'debrief' });
  return steps;
}

export default function SessionFlow({ progress, onExit }) {
  const sessionRef = useRef(progress.session);
  const [step, setStep] = useState(progress.step || 0);
  const [, force] = useState(0);
  const [menu, setMenu] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const steps = useMemo(() => buildSteps(progress.session), [progress.session]);
  const current = steps[step];
  const session = sessionRef.current;

  // Note a resume in the event log so analysis can see the session was interrupted.
  useEffect(() => {
    if ((progress.step || 0) > 0) {
      const s = sessionRef.current;
      s.events.push({ t: new Date().toISOString(), ms: Date.now() - s.startedMs, type: 'session_resumed', detail: { step: progress.step } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback((nextStep) => {
    saveProgress({ session: sessionRef.current, step: nextStep });
  }, []);

  // Warn before closing the tab mid-session.
  useEffect(() => {
    if (current.type === 'debrief') return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [current.type]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const h = document.querySelector('main h1');
    if (h && current.type !== 'task' && current.type !== 'practice') {
      h.setAttribute('tabindex', '-1');
      h.focus();
    }
  }, [step, current.type]);

  const advance = useCallback(() => {
    const next = step + 1;
    if (steps[next].type === 'debrief') {
      sessionRef.current = { ...sessionRef.current, completed: true, completedAt: new Date().toISOString() };
      saveSession(sessionRef.current);
      clearProgress();
    } else {
      persist(next);
    }
    setStep(next);
  }, [step, steps, persist]);

  const block = current.part !== undefined ? session.blocks[current.part] : null;
  const task =
    current.type === 'practice'
      ? PRACTICE
      : current.type === 'task'
        ? TASK_SETS[block.set].find((t) => t.id === current.taskId)
        : null;

  const log = useCallback(
    (type, detail) => {
      const s = sessionRef.current;
      s.events.push({
        t: new Date().toISOString(),
        ms: Date.now() - s.startedMs,
        part: current.part !== undefined ? current.part + 1 : null,
        version: block ? block.version : null,
        taskId: task ? task.id : null,
        type,
        detail: detail && Object.keys(detail).length ? detail : undefined,
      });
    },
    [current, block, task],
  );

  function onTaskSubmit(result) {
    if (current.type === 'task') {
      const s = sessionRef.current;
      s.blocks[current.part].tasks.push(result);
    }
    advance();
  }

  function onTlx({ tlx, likert }) {
    const s = sessionRef.current;
    s.blocks[current.part].tlx = tlx;
    s.blocks[current.part].likert = likert;
    log('questionnaire_submit', {});
    advance();
  }

  function endEarly() {
    const s = { ...sessionRef.current, completed: false, endedEarly: true, endedAt: new Date().toISOString() };
    const anyData = s.blocks.some((b) => b.tasks.length || b.tlx);
    if (anyData) saveSession(s);
    clearProgress();
    onExit();
  }

  function updateNotes(notes) {
    sessionRef.current = { ...sessionRef.current, notes };
    saveSession(sessionRef.current);
    force((x) => x + 1);
  }

  // Progress dots: one per task and questionnaire.
  const dots = steps
    .map((st, i) => ({ st, i }))
    .filter(({ st }) => st.type === 'task' || st.type === 'tlx')
    .map(({ st, i }) => ({
      label: st.type === 'task' ? `Part ${st.part + 1}, task ${st.slot}` : `Part ${st.part + 1}, questionnaire`,
      state: i < step ? 'done' : i === step ? 'current' : undefined,
    }));

  const partLabel = current.part !== undefined ? `Part ${current.part + 1} of 2` : '';
  const context =
    current.type === 'task'
      ? `${partLabel} · Task ${current.slot} of 3`
      : current.type === 'practice'
        ? `${partLabel} · Practice`
        : current.type === 'tlx'
          ? `${partLabel} · Questions`
          : current.type === 'debrief'
            ? 'Finished'
            : 'Welcome';

  const facilitatorBtn = (
    <button type="button" className="sl-btn sl-btn--quiet sl-btn--sm" onClick={() => setMenu(true)}>
      Facilitator
    </button>
  );

  let body;
  if (current.type === 'intro') {
    body = (
      <main className="sl-page sl-narrow" id="main">
        <p className="sl-eyebrow">Welcome</p>
        <h1 className="sl-page-title">Thanks for helping us test this</h1>
        <ul className="sl-bullets">
          <li>You will write <strong>six short JavaScript functions</strong> with an AI coding assistant, in two parts.</li>
          <li>Each part uses a <strong>slightly different version</strong> of the assistant and starts with a short practice.</li>
          <li>After each part you will answer a few questions about how it felt.</li>
          <li>Work as you normally would. Accept, change or ignore the suggestions. <strong>We are testing the interface, not you.</strong></li>
          <li>It takes about 15 minutes. There is no time limit on any task.</li>
        </ul>
        <div className="sl-form-actions">
          <button type="button" className="sl-btn sl-btn--primary sl-btn--lg" onClick={advance}>
            Start the practice
          </button>
        </div>
      </main>
    );
  } else if (current.type === 'between') {
    body = (
      <main className="sl-page sl-narrow" id="main">
        <p className="sl-eyebrow">Part 1 complete</p>
        <h1 className="sl-page-title">Halfway there</h1>
        <p className="sl-lead">
          Next are three similar tasks with a <strong>different version of the assistant</strong>. It starts with a short practice
          so you can see what is different.
        </p>
        <div className="sl-form-actions">
          <button type="button" className="sl-btn sl-btn--primary sl-btn--lg" onClick={advance}>
            Start Part 2 practice
          </button>
        </div>
      </main>
    );
  } else if (current.type === 'practice' || current.type === 'task') {
    body = (
      <main id="main" className="sl-main-task">
        <TaskScreen
          key={`${step}-${task.id}`}
          task={task}
          version={block.version}
          badge={badgeFor(task, session.task3Badge)}
          mode={current.type === 'practice' ? 'practice' : 'study'}
          heading={current.type === 'practice' ? `${partLabel} · Practice (not scored)` : `${partLabel} · Task ${current.slot} of 3`}
          log={log}
          onSubmit={onTaskSubmit}
        />
      </main>
    );
  } else if (current.type === 'tlx') {
    body = (
      <main id="main">
        <TlxForm key={step} partLabel={partLabel} onSubmit={onTlx} />
      </main>
    );
  } else {
    body = <Debrief session={sessionRef.current} onNotes={updateNotes} onFinish={onExit} />;
  }

  return (
    <div className="sl-app-frame">
      <TopBar context={context} progress={current.type === 'debrief' ? null : dots} right={current.type === 'debrief' ? null : facilitatorBtn} />
      {body}

      <Dialog
        open={menu}
        title="Facilitator"
        onClose={() => setMenu(false)}
        actions={
          <>
            <button type="button" className="sl-btn sl-btn--danger" onClick={() => { setMenu(false); setConfirmEnd(true); }}>
              End session early
            </button>
            <button type="button" className="sl-btn sl-btn--primary" onClick={() => setMenu(false)} data-autofocus="">
              Back to session
            </button>
          </>
        }
      >
        <dl className="sl-plan">
          <div>
            <dt>Participant</dt>
            <dd>{session.participant}</dd>
          </div>
          <div>
            <dt>Order</dt>
            <dd>
              {session.order[0]} then {session.order[1]}
            </dd>
          </div>
          <div>
            <dt>Task 3 badge in B</dt>
            <dd>{session.task3Badge === 'low' ? 'Low (honest)' : 'High (misleading)'}</dd>
          </div>
          <div>
            <dt>Now on</dt>
            <dd>{block ? `Interface ${block.version} · ${context}` : context}</dd>
          </div>
        </dl>
        <p className="sl-note">Progress is saved after every task, so refreshing the page will not lose finished tasks.</p>
      </Dialog>

      <Dialog
        open={confirmEnd}
        title="End this session early?"
        onClose={() => setConfirmEnd(false)}
        actions={
          <>
            <button type="button" className="sl-btn sl-btn--quiet" onClick={() => setConfirmEnd(false)} data-autofocus="">
              Keep going
            </button>
            <button type="button" className="sl-btn sl-btn--danger" onClick={endEarly}>
              End and save
            </button>
          </>
        }
      >
        <p>Finished tasks are saved and marked as incomplete. They are left out of the results charts unless you include incomplete sessions.</p>
      </Dialog>
    </div>
  );
}
