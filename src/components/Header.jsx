import Icon from './Icon';
import logoUrl from '../assets/logo.svg';

export default function Header({ stormDemo, onToggleStorm }) {
  return (
    <header className="header">
      <a href="#panel" className="skip-link">
        Skip to main content
      </a>
      <div className="brand">
        <img src={logoUrl} alt="" width="36" height="36" />
        <div>
          <h1>DrainWatch NYC</h1>
          <p className="tagline">See how your block floods. Clear drains together.</p>
        </div>
      </div>
      {/* Demo-only switch so we can show storm mode before live alerts exist. */}
      <button
        type="button"
        className={`storm-toggle${stormDemo ? ' is-on' : ''}`}
        aria-pressed={stormDemo}
        onClick={onToggleStorm}
      >
        <Icon name="warning" size={16} />
        <span>
          Storm demo<span className="storm-toggle-state">: {stormDemo ? 'on' : 'off'}</span>
        </span>
      </button>
    </header>
  );
}
