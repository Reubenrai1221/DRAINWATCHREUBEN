import { useMemo } from 'react';
import { HOTSPOTS, REPORT_YEARS, hotspotCount } from '../data/sampleData';
import Icon from './Icon';

export default function DrainsPanel({ year, onYearChange, onFocus, onReport }) {
  const ranked = useMemo(
    () =>
      HOTSPOTS.map((h) => ({ ...h, count: hotspotCount(h, year) }))
        .filter((h) => h.count > 0)
        .sort((a, b) => b.count - a.count),
    [year],
  );
  const total = ranked.reduce((sum, h) => sum + h.count, 0);

  return (
    <>
      <div className="panel-intro">
        <h2>Clogged drain hotspots</h2>
        <p>Where New Yorkers reported clogged catch basins to 311. Bigger circles mean more reports.</p>
      </div>

      <fieldset className="chips">
        <legend>Year</legend>
        {[...REPORT_YEARS, 'all'].map((y) => (
          <label key={y}>
            <input type="radio" name="year" value={y} checked={year === y} onChange={() => onYearChange(y)} />
            <span>{y === 'all' ? 'All years' : y}</span>
          </label>
        ))}
      </fieldset>

      <div className="card">
        <p className="big-stat">
          <span className="big-number">{total.toLocaleString()}</span> reports
          <span className="tag tag-sample">Sample data</span>
        </p>
        <h3>Top hotspots</h3>
        <ol className="rank-list">
          {ranked.slice(0, 6).map((h) => (
            <li key={h.id}>
              <button type="button" className="rank-btn" onClick={() => onFocus(h.position, 15)}>
                <span className="rank-name">{h.label}</span>
                <span className="rank-count">
                  {h.count} <span className="sr-only">reports</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className="hint">Tap a hotspot to zoom the map to it.</p>
      </div>

      <button type="button" className="btn btn-secondary btn-block" onClick={onReport}>
        <Icon name="megaphone" size={18} /> See a clogged drain? Report it
      </button>
    </>
  );
}
