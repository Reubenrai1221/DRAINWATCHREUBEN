import { useEffect, useRef } from 'react';
import { LINKS } from '../config/links';
import ExternalLinkButton from './ExternalLinkButton';
import Icon from './Icon';

// Uses the built-in <dialog> element: it traps keyboard focus, closes on
// Escape, and is announced correctly by screen readers.
export default function ReportDialog({ open, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog" aria-labelledby="report-title" onClose={onClose}>
      <div className="dialog-head">
        <h2 id="report-title">Report a clogged drain</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>
      <p>
        DrainWatch doesn't take reports itself. We send you to NYC 311 so the city's Department of
        Environmental Protection gets your report directly.
      </p>
      <ul className="checklist">
        <li>Note the nearest address or intersection.</li>
        <li>Say what's blocking it: leaves, trash, ice, or standing water.</li>
        <li>Add a photo if 311 asks for one.</li>
      </ul>
      <p className="callout callout-danger">
        <Icon name="warning" size={18} />
        <span>
          If flooding is putting someone in danger, <strong>call 911</strong>.
        </span>
      </p>
      <div className="dialog-actions">
        <ExternalLinkButton href={LINKS.report311}>Open NYC 311</ExternalLinkButton>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </dialog>
  );
}
