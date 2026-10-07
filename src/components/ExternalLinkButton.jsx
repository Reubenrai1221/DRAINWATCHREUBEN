import Icon from './Icon';

// A link that opens an official city page in a new tab. If the URL hasn't
// been verified yet (null in config/links.js), it shows a disabled button
// with an explanation instead.
export default function ExternalLinkButton({ href, children, variant = 'primary' }) {
  if (!href) {
    return (
      <div className="pending-link">
        <button type="button" className={`btn btn-${variant}`} disabled>
          {children}
          <Icon name="external" size={16} />
        </button>
        <p className="hint">Link coming soon — we're verifying the official page first.</p>
      </div>
    );
  }
  return (
    <a className={`btn btn-${variant}`} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <Icon name="external" size={16} />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
