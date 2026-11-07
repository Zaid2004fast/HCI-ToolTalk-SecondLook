// Slim header: product mark, where the user is, and an optional right-side control.
export default function TopBar({ context, progress, right }) {
  return (
    <header className="sl-topbar">
      <div className="sl-mark" aria-label="Second Look">
        <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="7" fill="currentColor" />
          <rect x="8" y="18" width="4" height="7" rx="1" fill="var(--paper)" />
          <rect x="14" y="13" width="4" height="12" rx="1" fill="var(--paper)" />
          <rect x="20" y="8" width="4" height="17" rx="1" fill="var(--paper)" opacity=".45" />
        </svg>
        <span>Second Look</span>
      </div>
      {context && <div className="sl-topbar-context">{context}</div>}
      {progress && (
        <ol className="sl-steps" aria-label="Progress">
          {progress.map((p, i) => (
            <li
              key={i}
              className={`sl-step${p.state ? ` is-${p.state}` : ''}`}
              aria-current={p.state === 'current' ? 'step' : undefined}
            >
              <span className="sl-visually-hidden">
                {p.label}
                {p.state === 'done' ? ' (done)' : p.state === 'current' ? ' (current)' : ''}
              </span>
            </li>
          ))}
        </ol>
      )}
      <div className="sl-topbar-right">{right}</div>
    </header>
  );
}
