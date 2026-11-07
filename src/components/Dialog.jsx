import { useEffect, useId, useRef } from 'react';

// Accessible modal built on the native <dialog> element:
// focus moves into the dialog, Esc closes it, focus returns afterwards.
export default function Dialog({ open, title, children, actions, onClose, wide = false }) {
  const ref = useRef(null);
  const returnTo = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      returnTo.current = document.activeElement;
      d.showModal();
      const target = d.querySelector('[data-autofocus]');
      if (target) target.focus();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return undefined;
    const handleClose = () => {
      const el = returnTo.current;
      if (el && typeof el.focus === 'function' && document.contains(el)) el.focus();
    };
    d.addEventListener('close', handleClose);
    return () => d.removeEventListener('close', handleClose);
  }, []);

  return (
    <dialog
      ref={ref}
      className={`sl-dialog${wide ? ' sl-dialog--wide' : ''}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (onClose) onClose();
      }}
    >
      <h2 id={titleId} className="sl-dialog-title">
        {title}
      </h2>
      <div className="sl-dialog-body">{children}</div>
      {actions && <div className="sl-dialog-actions">{actions}</div>}
    </dialog>
  );
}
