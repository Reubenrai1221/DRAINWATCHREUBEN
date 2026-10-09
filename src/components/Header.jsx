import Icon from './Icon';
import Logo from './Logo';

export default function Header({ stormDemo, onToggleStorm }) {
  return (
    <header className="header">
      <a href="#panel" className="skip-link">
        Skip to main content
      </a>
      <div className="brand">
        <h1>
          <Logo />
          <span className="sr-only">DrainWatch NYC</span>
        </h1>
        <p className="tagline">See how your block floods. Clear drains together.</p>
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
