import { useState } from 'react';
import TopBar from './TopBar.jsx';
import Dialog from './Dialog.jsx';
import { isStorageAvailable, loadSessions } from '../lib/storage.js';

export default function Home({ progress, onStart, onResume, onDiscardProgress, onDemo, onResults, onAbout }) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const count = loadSessions().filter((s) => s.completed).length;

  const resumeWhere = progress ? describe(progress) : '';

  return (
    <>
      <TopBar right={<button type="button" className="sl-btn sl-btn--quiet sl-btn--sm" onClick={onAbout}>About</button>} />
      <main className="sl-home" id="main">
        <div className="sl-home-intro">
          <p className="sl-eyebrow">CS3014 Applied HCI · Tool Talk prototype</p>
          <h1 className="sl-display">
            Do confidence cues change how we <em>check</em> AI code?
          </h1>
          <p className="sl-lead">
            A small study tool comparing standard inline AI suggestions with suggestions that show a confidence badge and can be
            deferred. It measures workload (NASA-TLX), whether a wrong suggestion gets caught, and how in control people feel.
          </p>
          <div className="sl-compare" aria-label="The two interfaces">
            <div>
              <span className="sl-if sl-if--a">A</span>
              <p>
                <strong>Standard</strong>
                <br />
                Grey suggestion · Tab accept · Esc dismiss
              </p>
            </div>
            <div>
              <span className="sl-if sl-if--b">B</span>
              <p>
                <strong>Confidence + defer</strong>
                <br />
                Adds a confidence badge, a reason, and Defer
              </p>
            </div>
          </div>
          <p className="sl-small-screen">This tool needs a laptop or desktop with a keyboard.</p>
        </div>

        <div className="sl-home-actions">
          {!isStorageAvailable() && (
            <p className="sl-banner sl-banner--warn" role="alert">
              This browser is blocking storage, so sessions can’t be kept between pages. Download each session file at the end.
            </p>
          )}

          {progress && (
            <div className="sl-resume" role="region" aria-label="Unfinished session">
              <p>
                <strong>{progress.session.participant}</strong> has an unfinished session ({resumeWhere}).
              </p>
              <div>
                <button type="button" className="sl-btn sl-btn--primary sl-btn--sm" onClick={onResume}>
                  Resume
                </button>
                <button type="button" className="sl-btn sl-btn--quiet sl-btn--sm" onClick={() => setConfirmDiscard(true)}>
                  Discard
                </button>
              </div>
            </div>
          )}

          <p className="sl-start-hint">
            <strong>New here?</strong> Start with <strong>Demo mode</strong> to see how it works, then run a study session.
          </p>

          <nav aria-label="Main">
            <ul className="sl-menu">
              <li>
                <button type="button" onClick={onStart} disabled={Boolean(progress)} aria-describedby={progress ? 'start-blocked' : undefined}>
                  <span className="sl-menu-num">01</span>
                  <span className="sl-menu-text">
                    <strong>Run a study session</strong>
                    <span>About 15 minutes per person. Facilitator sets up, then hands over.</span>
                  </span>
                  <span className="sl-menu-arrow" aria-hidden="true">→</span>
                </button>
                {progress && (
                  <p id="start-blocked" className="sl-hint">
                    Resume or discard the unfinished session first.
                  </p>
                )}
              </li>
              <li>
                <button type="button" onClick={onDemo}>
                  <span className="sl-menu-num">02</span>
                  <span className="sl-menu-text">
                    <strong>Demo mode</strong>
                    <span>For presenting and recording. Pick any interface and task. Nothing is saved.</span>
                  </span>
                  <span className="sl-menu-arrow" aria-hidden="true">→</span>
                </button>
              </li>
              <li>
                <button type="button" onClick={onResults}>
                  <span className="sl-menu-num">03</span>
                  <span className="sl-menu-text">
                    <strong>Results</strong>
                    <span>
                      {count} complete session{count === 1 ? '' : 's'} on this device. Charts, import and CSV export.
                    </span>
                  </span>
                  <span className="sl-menu-arrow" aria-hidden="true">→</span>
                </button>
              </li>
              <li>
                <button type="button" onClick={onAbout}>
                  <span className="sl-menu-num">04</span>
                  <span className="sl-menu-text">
                    <strong>How this prototype works</strong>
                    <span>Study design, tasks, accessibility, limitations.</span>
                  </span>
                  <span className="sl-menu-arrow" aria-hidden="true">→</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </main>

      <Dialog
        open={confirmDiscard}
        title={`Discard ${progress?.session.participant}'s unfinished session?`}
        onClose={() => setConfirmDiscard(false)}
        actions={
          <>
            <button type="button" className="sl-btn sl-btn--quiet" onClick={() => setConfirmDiscard(false)} data-autofocus="">
              Keep it
            </button>
            <button
              type="button"
              className="sl-btn sl-btn--danger"
              onClick={() => {
                setConfirmDiscard(false);
                onDiscardProgress();
              }}
            >
              Discard
            </button>
          </>
        }
      >
        <p>Tasks finished in this session will not be saved.</p>
      </Dialog>
    </>
  );
}

function describe(progress) {
  const done = progress.session.blocks.reduce((a, b) => a + b.tasks.length, 0);
  return `${done} of 6 tasks done`;
}
