// Rain scenarios for the slider.
//
// These are MODELED scenarios from DEP's Stormwater Flood Maps, not a live
// simulation. The rainfall numbers come from the project brief. The scenario
// names and which ones include future sea-level rise must be checked against
// the real dataset when we connect it (Phase 1 data step).

export const SLIDER_MIN = 1.5; // in/hr — left edge of the slider track
export const SLIDER_MAX = 4.0; // in/hr — right edge of the slider track

// Most NYC sewers are designed for roughly this much rain per hour.
export const SEWER_DESIGN_RANGE = [1.5, 1.75];

// Hurricane Ida (Sept 1, 2021) peak hourly rainfall in Central Park.
export const IDA_IN_PER_HR = 3.15;

export const SEA_LEVELS = {
  current: "Today's sea level",
  future: 'Future sea level rise',
};

// Each scenario = one rainfall intensity + one sea-level assumption.
// TODO(data): confirm these pairings against the Stormwater Flood Maps layers.
export const SCENARIOS = [
  {
    id: 'limited-current',
    inPerHr: 1.77,
    name: 'Limited storm',
    seaLevel: 'current',
    seaLabel: "today's sea level",
  },
  {
    id: 'moderate-current',
    inPerHr: 2.13,
    name: 'Moderate storm',
    seaLevel: 'current',
    seaLabel: "today's sea level",
  },
  {
    id: 'moderate-future',
    inPerHr: 2.13,
    name: 'Moderate storm',
    seaLevel: 'future',
    seaLabel: '2050s sea level rise',
  },
  {
    id: 'extreme-future',
    inPerHr: 3.66,
    name: 'Extreme storm',
    seaLevel: 'future',
    seaLabel: '2080s sea level rise',
  },
];

// The distinct rainfall stops the slider snaps to.
export const RAIN_STOPS = [...new Set(SCENARIOS.map((s) => s.inPerHr))].sort((a, b) => a - b);

export const DEFAULT_SCENARIO_ID = 'moderate-current';

export function getScenario(id) {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}

// Pick the scenario for a rainfall value, keeping the user's sea-level
// choice when that combination exists.
export function scenarioFor(inPerHr, preferredSeaLevel) {
  const matches = SCENARIOS.filter((s) => s.inPerHr === inPerHr);
  return matches.find((s) => s.seaLevel === preferredSeaLevel) ?? matches[0];
}

export function nearestStop(value) {
  return RAIN_STOPS.reduce((best, stop) =>
    Math.abs(stop - value) < Math.abs(best - value) ? stop : best,
  );
}
