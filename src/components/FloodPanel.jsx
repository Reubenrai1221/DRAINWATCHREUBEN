import RainSlider from './RainSlider';
import { DepthSwatch } from './FloodPatterns';
import { DEPTH_INFO } from '../config/flood';
import Icon from './Icon';

export default function FloodPanel({ scenarioId, onScenarioChange, onGoToBlock }) {
  return (
    <>
      <div className="panel-intro">
        <h2>How much rain floods NYC?</h2>
        <p>Drag the slider to see where streets flood in different storms.</p>
      </div>

      <div className="card">
        <RainSlider scenarioId={scenarioId} onChange={onScenarioChange} />
        <p className="callout callout-info">
          <Icon name="warning" size={18} />
          <span>
            These are <strong>modeled scenarios</strong> from the city, not a live simulation or a forecast.
          </span>
        </p>
      </div>

      <div className="card">
        <h3>Map key</h3>
        <ul className="legend-list">
          {['nuisance', 'deep'].map((d) => (
            <li key={d}>
              <DepthSwatch depth={d} size={24} />
              <span>
                <strong>{DEPTH_INFO[d].label}</strong> — {DEPTH_INFO[d].detail}
                <span className="legend-pattern">{d === 'deep' ? ' (dark stripes)' : ' (light dots)'}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <button type="button" className="btn btn-primary btn-block" onClick={onGoToBlock}>
        <Icon name="search" size={18} /> Check my block
      </button>
    </>
  );
}
