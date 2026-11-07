# Second Look: Tool Talk demo prototype

CS3014 Applied HCI, Tool Talk. A small study tool that compares:

- **Interface A, standard:** Copilot-style grey inline suggestions. Tab accepts, Esc dismisses.
- **Interface B, confidence + defer:** the same, plus a confidence badge (bars, word and colour), a one-line reason, and **Defer** (Ctrl D), which parks a suggestion in a "Deferred" list to insert or discard later.

It measures **workload** (NASA-TLX), **error catching** (whether a wrong AI suggestion gets fixed), and **feeling of control**.

> There is no real AI. Every suggestion and confidence level is written in `src/data/tasks.js`. This is disclosed to participants in the debrief, and in demo mode on screen.

## Run it locally

You need Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173).

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. On vercel.com choose **Add New → Project** and import the repository.
3. Vercel detects Vite automatically (build command `npm run build`, output folder `dist`). Click **Deploy**.

## Running a session (about 15 minutes per person)

1. Home → **Run a study session**. Enter the participant number (1, 2, 3…). The order and Task 3 badge are assigned automatically:

   | Participant | Order | Task 3 badge in B |
   |---|---|---|
   | P1 | A then B | Low (honest) |
   | P2 | B then A | Low (honest) |
   | P3 | A then B | High (misleading) |
   | P4 | B then A | High (misleading) |
   | P5, P6… | repeats | repeats |

2. Read the script on screen, tick both boxes, and hand over.
3. The participant does a practice task plus three tasks per interface, and a NASA-TLX questionnaire after each part.
4. On the debrief screen, ask the four interview questions and type notes.
5. **Testing on someone else's device?** Click **Download session file** on the debrief screen, then use **Results → Import session files** on the team laptop.

Progress is saved after every task. If the page is refreshed, the home page offers to resume.

## Results

Home → **Results** shows:

- the A vs B workload chart, with each NASA-TLX scale plus Raw TLX
- a table of who caught the Task 3 bug, by condition
- a row per participant

Export as Summary CSV, Tasks CSV, Event log CSV, or a JSON backup. Results are an **illustration** (small N, no statistics).

## Demo mode (for the video)

Home → **Demo mode**. Pick the interface, the task, and the Task 3 badge (Low or High). Turn on **Show hidden checks** to explain the bug. After **Submit**, a table shows every check passing or failing. Nothing is saved.

Suggested recording: Task 3 (average) in A → accepted bug fails; in B with Low → caught; in B with High → missed.

## Tasks

| # | Set 1 | Set 2 | AI suggestion | Badge in B |
|---|---|---|---|---|
| 1 | formatDate | formatTime | correct | High |
| 2 | isValidEmail | isValidPhone | misses some rules | Medium |
| 3 | average (empty list crashes) | maxValue (fails on all-negative lists) | wrong on edge cases | Low or High |

Each task has visible **examples** (which the AI code passes) and **hidden checks** (edge cases) that are run on submit.

## Project structure

```
src/data/tasks.js            all tasks, suggestions, badges, checks
src/editor/suggestion.js     ghost-text suggestions, accept/dismiss/defer (CodeMirror 6)
src/components/TaskScreen.jsx  one task: brief, editor, Deferred tray, submit
src/components/TlxForm.jsx   NASA-TLX + two agreement statements
src/components/SessionFlow.jsx  session steps, logging, saving
src/components/Results.jsx   charts, tables, import/export
src/lib/runner.worker.js     runs participant code safely, with a 2-second timeout
```
