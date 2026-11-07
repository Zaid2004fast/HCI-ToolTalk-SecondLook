import { CONFIDENCE_LABEL } from '../data/tasks.js';

const BARS = { high: 3, medium: 2, low: 1 };

// Confidence shown three ways: bar count (shape), word, and colour.
export default function Badge({ level, compact = false }) {
  if (!level) return null;
  return (
    <span className={`sl-badge sl-badge--${level}${compact ? ' sl-badge--compact' : ''}`}>
      <span className="sl-bars" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <i key={i} className={i <= BARS[level] ? 'on' : undefined} />
        ))}
      </span>
      <span>{CONFIDENCE_LABEL[level]} confidence</span>
    </span>
  );
}
