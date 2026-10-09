import { useMemo } from 'react';
import { getBlockRisk } from '../data/sampleData';
import AddressSearch from './AddressSearch';
import { DEPTH_INFO } from '../config/flood';
import { CURRENT_YEAR } from '../config/map';
import { getScenario } from '../config/scenarios';
import { DepthSwatch } from './FloodPatterns';
import Icon from './Icon';

export default function BlockPanel({ lookup, onLookup, scenarioId, onAdoptHere, onReport }) {
  return (
    <>
      <div className="panel-intro">
        <h2>Check your block</h2>
        <p>Search any NYC address to get its flood risk card.</p>
      </div>

      <AddressSearch initialValue={lookup?.label ?? ''} onSelect={onLookup} />

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
        <span className="tag tag-sample">Sample risk data</span>
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
