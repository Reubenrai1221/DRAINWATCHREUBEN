import { useMemo, useState } from 'react';
import { getBlockRisk, sampleGeocode } from '../data/sampleData';
import { DEPTH_INFO } from '../config/flood';
import { CURRENT_YEAR } from '../config/map';
import { getScenario } from '../config/scenarios';
import { DepthSwatch } from './FloodPatterns';
import Icon from './Icon';

export default function BlockPanel({ lookup, onLookup, scenarioId, onAdoptHere, onReport }) {
  const [query, setQuery] = useState(lookup?.label ?? '');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!query.trim()) {
      setError('Type an address first, like "123 Main St, Queens".');
      return;
    }
    setError('');
    setStatus('loading');
    try {
      onLookup(await sampleGeocode(query));
    } catch {
      setError("We couldn't find that address. Check the spelling and try again.");
    } finally {
      setStatus('idle');
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Your browser can't share your location. Type an address instead.");
      return;
    }
    setError('');
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus('idle');
        setQuery('');
        onLookup({ label: 'Your current location', position: [pos.coords.latitude, pos.coords.longitude] });
      },
      () => {
        setStatus('idle');
        setError("We couldn't get your location. Type an address instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <>
      <div className="panel-intro">
        <h2>Check your block</h2>
        <p>Get a flood risk card for any NYC address.</p>
      </div>

      <form className="search-form" onSubmit={handleSubmit} role="search">
        <label htmlFor="address">Address</label>
        <div className="search-row">
          <input
            id="address"
            type="text"
            inputMode="search"
            autoComplete="street-address"
            placeholder="e.g. 123 Main St, Queens"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-describedby={error ? 'address-error' : undefined}
            aria-invalid={error ? true : undefined}
          />
          <button type="submit" className="btn btn-primary" disabled={status === 'loading'}>
            <Icon name="search" size={18} />
            <span>{status === 'loading' ? 'Searching…' : 'Search'}</span>
          </button>
        </div>
        <button type="button" className="btn btn-link" onClick={useMyLocation} disabled={status === 'locating'}>
          <Icon name="locate" size={18} />
          {status === 'locating' ? 'Finding you…' : 'Use my location'}
        </button>
        {error && (
          <p id="address-error" className="error" role="alert">
            {error}
          </p>
        )}
      </form>

      {lookup ? (
        <RiskCard lookup={lookup} scenarioId={scenarioId} onAdoptHere={onAdoptHere} onReport={onReport} />
      ) : (
        <p className="empty-state">Search for an address to see its risk card.</p>
      )}
    </>
  );
}

function RiskCard({ lookup, scenarioId, onAdoptHere, onReport }) {
  const risk = useMemo(() => getBlockRisk(lookup.position), [lookup]);
  const current = risk.byScenario.find((r) => r.scenario.id === scenarioId);
  const scenario = getScenario(scenarioId);
  const floodsAtAll = risk.byScenario.some((r) => r.depth !== 'none');

  return (
    <article className="card risk-card" aria-labelledby="risk-title" aria-live="polite">
      <header className="risk-head">
        <h3 id="risk-title">{lookup.label}</h3>
        <span className="tag tag-sample">Sample data</span>
      </header>

      <div className={`risk-headline depth-${current.depth}`}>
        <DepthSwatch depth={current.depth} size={36} />
        <div>
          <p className="risk-depth">{DEPTH_INFO[current.depth].label}</p>
          <p className="risk-detail">
            {DEPTH_INFO[current.depth].detail} in a {scenario.inPerHr} in/hr storm ({scenario.seaLabel})
          </p>
        </div>
      </div>

      <table className="scenario-table">
        <caption>When does this block flood?</caption>
        <thead>
          <tr>
            <th scope="col">Storm</th>
            <th scope="col">Flooding</th>
          </tr>
        </thead>
        <tbody>
          {risk.byScenario.map(({ scenario: s, depth }) => (
            <tr key={s.id} className={s.id === scenarioId ? 'is-current' : undefined}>
              <th scope="row">
                {s.inPerHr} in/hr
                <span className="cell-sub">{s.seaLabel}</span>
              </th>
              <td>
                <span className="depth-cell">
                  <DepthSwatch depth={depth} />
                  {DEPTH_INFO[depth].label.replace(' flooding', '').replace('No modeled', 'None')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="stats">
        <div>
          <dt>Clogged-drain 311 reports nearby, {CURRENT_YEAR}</dt>
          <dd>{risk.reportsThisYear}</dd>
        </div>
        <div>
          <dt>FloodNet sensor flood events within ½ mile</dt>
          <dd>{risk.sensorsNearby === 0 ? 'No sensors nearby' : `${risk.sensorEvents} from ${risk.sensorsNearby} sensor${risk.sensorsNearby > 1 ? 's' : ''}`}</dd>
        </div>
      </dl>

      {floodsAtAll && (
        <p className="callout callout-warn">
          <Icon name="home" size={18} />
          <span>
            <strong>Live in a basement here?</strong> Keep important papers up high and plan how you'd get out
            if water comes in.
          </span>
        </p>
      )}

      <div className="button-row">
        <button type="button" className="btn btn-primary" onClick={() => onAdoptHere(lookup.position)}>
          <Icon name="hand" size={18} /> Adopt a drain here
        </button>
        <button type="button" className="btn btn-secondary" onClick={onReport}>
          <Icon name="megaphone" size={18} /> Report a clog
        </button>
      </div>
    </article>
  );
}
