import TopBar from './TopBar.jsx';
import { TASK_SETS } from '../data/tasks.js';

export default function About({ onBack }) {
  return (
    <>
      <TopBar
        context="How this prototype works"
        right={
          <button type="button" className="sl-btn sl-btn--quiet sl-btn--sm" onClick={onBack}>
            Home
          </button>
        }
      />
      <main className="sl-page sl-prose" id="main">
        <p className="sl-eyebrow">For the instructor and classmates</p>
        <h1 className="sl-page-title">How this prototype works</h1>

        <h2>Question</h2>
        <p>
          Do a confidence badge and a “defer suggestion” control change how people check AI code suggestions, and how mentally demanding
          does the task feel?
        </p>

        <h2>The two interfaces</h2>
        <ul>
          <li>
            <strong>A, standard:</strong> grey inline suggestion. Tab accepts, Esc dismisses.
          </li>
          <li>
            <strong>B, confidence + defer:</strong> the same, plus a confidence badge (bars, word and colour), a one-line reason, and
            Defer (Ctrl D), which moves the suggestion to a list to insert or discard later.
          </li>
        </ul>
        <p>
          <strong>Simulation:</strong> there is no AI model. Every suggestion and confidence level was written by the team in advance,
          so every participant sees exactly the same thing. Participants are told this in the debrief.
        </p>

        <h2>Study design</h2>
        <ul>
          <li>Within-subjects: every participant uses both interfaces, three tasks each, with a short practice first.</li>
          <li>
            Counterbalanced: odd participant numbers do A then B, even do B then A. Part 1 always uses task set 1 and Part 2 task set 2.
          </li>
          <li>
            Task 3 in each set is a <strong>failure case</strong>: the suggestion looks fine but is wrong. In Interface B its badge is
            Low (honest) for P1–P2, P5–P6… and High (misleading) for P3–P4, P7–P8…
          </li>
        </ul>
        <table className="sl-table sl-table--compact">
          <thead>
            <tr>
              <th scope="col">Task</th>
              <th scope="col">Set 1</th>
              <th scope="col">Set 2</th>
              <th scope="col">AI suggestion</th>
              <th scope="col">Badge in B</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map((i) => (
              <tr key={i}>
                <th scope="row">{i + 1}</th>
                <td>{TASK_SETS[1][i].title}</td>
                <td>{TASK_SETS[2][i].title}</td>
                <td>{['Correct', 'Misses some rules', 'Wrong on edge cases'][i]}</td>
                <td>{['High', 'Medium', 'Low or High'][i]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>Measures (three comparison criteria)</h2>
        <ol>
          <li>
            <strong>Mental effort:</strong> NASA-TLX after each interface (official six questions, 0–100 in steps of 5; Raw TLX =
            average of the six, Hart 2006).
          </li>
          <li>
            <strong>Error catching:</strong> whether the final code for Task 3 passes all checks, including hidden edge cases.
          </li>
          <li>
            <strong>User control:</strong> 1–5 agreement with “I felt in control of which code ended up in my program”, plus logged
            accept, dismiss, defer and edit actions.
          </li>
        </ol>

        <h2>Accessibility (WCAG 2.2 AA)</h2>
        <ul>
          <li>Confidence is never colour alone: it is shown as a bar count, a word and a colour.</li>
          <li>Everything works from the keyboard. Esc then Tab leaves the code editor.</li>
          <li>Screen readers announce new suggestions, their confidence and the available keys through a live region.</li>
          <li>Text contrast is at least 4.5:1, including the grey suggestion text. Focus is always visible.</li>
          <li>Motion is reduced when the system asks for it.</li>
        </ul>

        <h2>Data and privacy</h2>
        <p>
          No server. Data stays in the browser that ran the session and can be exported as CSV or JSON. Participants are identified by
          number only.
        </p>

        <h2>Limitations</h2>
        <ul>
          <li>Small, non-random sample. Results are an illustration, not validated findings.</li>
          <li>Confidence is simulated. Real model confidence is often poorly calibrated.</li>
          <li>No eye-tracking; checking behaviour is inferred from actions and interviews.</li>
          <li>Short, artificial tasks; real codebases are larger and more familiar to developers.</li>
          <li>NASA-TLX is self-reported.</li>
        </ul>
      </main>
    </>
  );
}
