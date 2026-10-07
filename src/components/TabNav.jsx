import Icon from './Icon';

export const TABS = [
  { id: 'flood', label: 'Flood map', icon: 'map' },
  { id: 'block', label: 'My block', icon: 'home' },
  { id: 'drains', label: 'Hotspots', icon: 'drop' },
  { id: 'adopt', label: 'Adopt', icon: 'hand' },
];

export default function TabNav({ tab, onChange, onReport }) {
  return (
    <nav className="tabs" aria-label="Sections">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className="tab"
          aria-current={tab === t.id ? 'page' : undefined}
          onClick={() => onChange(t.id)}
        >
          <Icon name={t.icon} size={22} />
          <span>{t.label}</span>
        </button>
      ))}
      <button type="button" className="tab tab-report" onClick={onReport}>
        <Icon name="megaphone" size={22} />
        <span>Report</span>
      </button>
    </nav>
  );
}
