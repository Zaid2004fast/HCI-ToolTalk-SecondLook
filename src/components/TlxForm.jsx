import { useRef, useState } from 'react';
import { TLX_SCALES, LIKERT_ITEMS, LIKERT_LABELS } from '../lib/metrics.js';

const TICKS = Array.from({ length: 21 }, (_, i) => i * 5);

// NASA-TLX (official six questions, 0-100 in steps of 5, as on the paper form)
// plus two 5-point agreement statements.
export default function TlxForm({ partLabel, onSubmit }) {
  const [tlx, setTlx] = useState({});
  const [likert, setLikert] = useState({});
  const [errors, setErrors] = useState([]);
  const summaryRef = useRef(null);

  function submit(e) {
    e.preventDefault();
    const missing = [
      ...TLX_SCALES.filter((s) => typeof tlx[s.key] !== 'number').map((s) => ({ id: `tlx-${s.key}`, label: s.name })),
      ...LIKERT_ITEMS.filter((s) => typeof likert[s.key] !== 'number').map((s) => ({ id: `lk-${s.key}`, label: s.statement })),
    ];
    if (missing.length) {
      setErrors(missing);
      window.setTimeout(() => summaryRef.current?.focus(), 0);
      return;
    }
    onSubmit({ tlx, likert });
  }

  const isMissing = (id) => errors.some((er) => er.id === id);

  return (
    <form className="sl-page sl-form" onSubmit={submit} noValidate>
      <p className="sl-eyebrow">{partLabel} · Questionnaire</p>
      <h1 className="sl-page-title">How did that part feel?</h1>
      <p className="sl-lead">
        Think about <strong>all three tasks you just did</strong> with this version of the assistant. There are no right answers.
      </p>

      {errors.length > 0 && (
        <div className="sl-error-summary" role="alert" tabIndex={-1} ref={summaryRef}>
          <h2>Please answer {errors.length === 1 ? 'one more question' : `${errors.length} more questions`}</h2>
          <ul>
            {errors.map((er) => (
              <li key={er.id}>
                <a href={`#${er.id}`}>{er.label}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="sl-section-title">Workload (NASA-TLX)</h2>
      <p className="sl-hint">Select a point on each scale. Use the arrow keys to move along a scale.</p>

      {TLX_SCALES.map((s) => {
        const value = tlx[s.key];
        const id = `tlx-${s.key}`;
        return (
          <fieldset key={s.key} id={id} className={`sl-scale${isMissing(id) && typeof value !== 'number' ? ' has-error' : ''}`}>
            <legend>
              <span className="sl-scale-name">{s.name}</span>
              <span className="sl-scale-q">{s.question}</span>
            </legend>
            <div className="sl-scale-row">
              <div className="sl-ticks">
                {TICKS.map((v) => (
                  <label key={v} className={`sl-tick${v === 50 ? ' is-mid' : ''}${value === v ? ' is-on' : ''}`}>
                    <input
                      type="radio"
                      name={id}
                      value={v}
                      checked={value === v}
                      onChange={() => setTlx((t) => ({ ...t, [s.key]: v }))}
                    />
                    <span className="sl-visually-hidden">
                      {v} out of 100{v === 0 ? ` (${s.low})` : v === 100 ? ` (${s.high})` : ''}
                    </span>
                  </label>
                ))}
              </div>
              <span className="sl-scale-value" aria-hidden="true">
                {typeof value === 'number' ? value : '—'}
              </span>
            </div>
            <div className="sl-scale-ends" aria-hidden="true">
              <span>{s.low}</span>
              <span>{s.high}</span>
            </div>
          </fieldset>
        );
      })}

      <h2 className="sl-section-title">Two statements</h2>
      {LIKERT_ITEMS.map((item) => {
        const id = `lk-${item.key}`;
        return (
          <fieldset
            key={item.key}
            id={id}
            className={`sl-likert${isMissing(id) && typeof likert[item.key] !== 'number' ? ' has-error' : ''}`}
          >
            <legend>{item.statement}</legend>
            <div className="sl-likert-options">
              {LIKERT_LABELS.map((label, i) => (
                <label key={label} className={`sl-likert-opt${likert[item.key] === i + 1 ? ' is-on' : ''}`}>
                  <input
                    type="radio"
                    name={id}
                    value={i + 1}
                    checked={likert[item.key] === i + 1}
                    onChange={() => setLikert((l) => ({ ...l, [item.key]: i + 1 }))}
                  />
                  <span className="sl-likert-num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}

      <div className="sl-form-actions">
        <button type="submit" className="sl-btn sl-btn--primary sl-btn--lg">
          Continue
        </button>
      </div>
    </form>
  );
}
