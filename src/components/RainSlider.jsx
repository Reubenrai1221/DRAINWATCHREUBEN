import {
  IDA_IN_PER_HR,
  RAIN_STOPS,
  SCENARIOS,
  SEA_LEVELS,
  SEWER_DESIGN_RANGE,
  SLIDER_MAX,
  SLIDER_MIN,
  getScenario,
  nearestStop,
  scenarioFor,
} from '../config/scenarios';

// Where a rainfall value sits along the track, as a CSS length. The thumb is
// 28px wide and its center can't reach the very edges, so we inset by 14px.
function trackPosition(value) {
  const fraction = (value - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN);
  return `calc(14px + ${fraction} * (100% - 28px))`;
}

export default function RainSlider({ scenarioId, onChange }) {
  const scenario = getScenario(scenarioId);
  const stopIndex = RAIN_STOPS.indexOf(scenario.inPerHr);

  function goToRain(inPerHr) {
    onChange(scenarioFor(inPerHr, scenario.seaLevel).id);
  }

  // Dragging lands anywhere; we snap to the closest modeled scenario.
  function handleInput(e) {
    const snapped = nearestStop(Number(e.target.value));
    if (snapped !== scenario.inPerHr) goToRain(snapped);
  }

  // Arrow keys jump one scenario at a time instead of 0.01 in/hr.
  function handleKeyDown(e) {
    const moves = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
    let next = null;
    if (e.key in moves) next = stopIndex + moves[e.key];
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = RAIN_STOPS.length - 1;
    if (next === null) return;
    e.preventDefault();
    const clamped = Math.max(0, Math.min(RAIN_STOPS.length - 1, next));
    goToRain(RAIN_STOPS[clamped]);
  }

  const seaOptions = Object.entries(SEA_LEVELS).map(([key, label]) => ({
    key,
    label,
    available: SCENARIOS.some((s) => s.inPerHr === scenario.inPerHr && s.seaLevel === key),
  }));

  return (
    <div className="rain-slider">
      <div className="rain-readout" aria-hidden="true">
        <span className="rain-value">{scenario.inPerHr.toFixed(2)}</span>
        <span className="rain-unit">inches of rain per hour</span>
      </div>
      <p className="rain-name">
        {scenario.name} · {scenario.seaLabel}
      </p>

      <label htmlFor="rain-range" className="sr-only">
        Rainfall scenario
      </label>
      <div className="slider-track-wrap">
        <div
          className="sewer-band"
          style={{ left: trackPosition(SEWER_DESIGN_RANGE[0]), width: `calc((${SEWER_DESIGN_RANGE[1] - SEWER_DESIGN_RANGE[0]} / ${SLIDER_MAX - SLIDER_MIN}) * (100% - 28px))` }}
          aria-hidden="true"
        />
        <input
          id="rain-range"
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step="0.01"
          value={scenario.inPerHr}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          aria-valuetext={`${scenario.inPerHr} inches per hour, ${scenario.name}, ${scenario.seaLabel}`}
        />
        <div className="ida-marker" style={{ left: trackPosition(IDA_IN_PER_HR) }} aria-hidden="true">
          <span className="ida-line" />
          <span className="ida-label">Ida {IDA_IN_PER_HR}</span>
        </div>
      </div>

      <div className="stop-labels" aria-hidden="true">
        {RAIN_STOPS.map((stop) => (
          <button
            key={stop}
            type="button"
            tabIndex={-1}
            className={`stop-label${stop === scenario.inPerHr ? ' is-active' : ''}`}
            style={{ left: trackPosition(stop) }}
            onClick={() => goToRain(stop)}
          >
            {stop}
          </button>
        ))}
      </div>

      <fieldset className="segmented">
        <legend>Sea level</legend>
        {seaOptions.map((opt) => (
          <label key={opt.key} className={opt.available ? '' : 'is-disabled'}>
            <input
              type="radio"
              name="sea-level"
              value={opt.key}
              checked={scenario.seaLevel === opt.key}
              disabled={!opt.available}
              onChange={() => onChange(scenarioFor(scenario.inPerHr, opt.key).id)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </fieldset>
      {seaOptions.some((o) => !o.available) && (
        <p className="hint">DEP only modeled one sea level for {scenario.inPerHr} in/hr.</p>
      )}

      <dl className="scale-notes">
        <div>
          <dt>
            <span className="key key-sewer" aria-hidden="true" /> Shaded band
          </dt>
          <dd>
            Most NYC sewers are built for {SEWER_DESIGN_RANGE[0]}–{SEWER_DESIGN_RANGE[1]} in/hr.
          </dd>
        </div>
        <div>
          <dt>
            <span className="key key-ida" aria-hidden="true" /> Ida line
          </dt>
          <dd>Hurricane Ida (2021) dropped {IDA_IN_PER_HR} in/hr. No map exists for that exact storm.</dd>
        </div>
      </dl>
    </div>
  );
}
