// ⚠️ SAMPLE DATA ONLY ⚠️
//
// Everything in this file is made up so the interface can be built and tested
// before we connect real data. None of it describes real flooding, real 311
// reports, or real sensors. Each function here will later be replaced by a
// call to the real data source (see README → "Data sources").

import { SCENARIOS } from '../config/scenarios';
import { CURRENT_YEAR } from '../config/map';
import { distanceMeters, metersToDegrees, pointInPolygon } from '../lib/geo';
import { hashString, seededRandom } from '../lib/random';

// Rough points on land around the five boroughs, used to place sample shapes.
const ANCHORS = [
  [40.711, -73.766],
  [40.745, -73.905],
  [40.761, -73.87],
  [40.758, -73.83],
  [40.64, -73.9],
  [40.675, -73.99],
  [40.687, -73.942],
  [40.809, -73.923],
  [40.85, -73.835],
  [40.573, -74.095],
  [40.81, -73.95],
  [40.726, -73.862],
  [40.695, -73.918],
  [40.658, -73.839],
];

// ---------------------------------------------------------------------------
// Flood zones (later: NYC Stormwater Flood Maps)
// ---------------------------------------------------------------------------

// Bigger storms → bigger flooded areas.
const SCENARIO_SCALE = {
  'limited-current': 0.55,
  'moderate-current': 0.75,
  'moderate-future': 0.92,
  'extreme-future': 1.3,
};

// Which anchors flood, how big, and from which scenario upward.
const FLOOD_SITES = [
  { anchor: 0, radius: 1700, firstScenario: 0 },
  { anchor: 1, radius: 1240, firstScenario: 1 },
  { anchor: 2, radius: 1520, firstScenario: 0 },
  { anchor: 4, radius: 1800, firstScenario: 0 },
  { anchor: 5, radius: 1160, firstScenario: 1 },
  { anchor: 7, radius: 1300, firstScenario: 2 },
  { anchor: 9, radius: 1600, firstScenario: 1 },
  { anchor: 11, radius: 1200, firstScenario: 3 },
  { anchor: 13, radius: 1640, firstScenario: 2 },
];

// A wobbly, natural-looking closed shape around a center point.
function blob([lat, lng], radius, seed) {
  const rand = seededRandom(seed);
  const phases = [rand(), rand(), rand()].map((p) => p * Math.PI * 2);
  const { dLat, dLng } = metersToDegrees(radius, lat);
  const ring = [];
  for (let i = 0; i < 36; i++) {
    const t = (i / 36) * Math.PI * 2;
    const r = 1 + 0.2 * Math.sin(2 * t + phases[0]) + 0.12 * Math.sin(3 * t + phases[1]) + 0.07 * Math.sin(5 * t + phases[2]);
    ring.push([lat + Math.sin(t) * dLat * r, lng + Math.cos(t) * dLng * r * 1.3]);
  }
  return ring;
}

const zoneCache = new Map();

// Returns { nuisance: [rings], deep: [rings] } for one scenario.
export function getFloodZones(scenarioId) {
  if (zoneCache.has(scenarioId)) return zoneCache.get(scenarioId);
  const index = SCENARIOS.findIndex((s) => s.id === scenarioId);
  const scale = SCENARIO_SCALE[scenarioId] ?? 1;
  const zones = { nuisance: [], deep: [] };
  FLOOD_SITES.forEach((site, i) => {
    if (index < site.firstScenario) return;
    const center = ANCHORS[site.anchor];
    zones.nuisance.push(blob(center, site.radius * scale, i + 1));
    zones.deep.push(blob(center, site.radius * scale * 0.5, i + 1));
  });
  zoneCache.set(scenarioId, zones);
  return zones;
}

// 'deep' | 'nuisance' | 'none' for a point in one scenario.
export function floodDepthAt(point, scenarioId) {
  const zones = getFloodZones(scenarioId);
  if (zones.deep.some((ring) => pointInPolygon(point, ring))) return 'deep';
  if (zones.nuisance.some((ring) => pointInPolygon(point, ring))) return 'nuisance';
  return 'none';
}

// ---------------------------------------------------------------------------
// 311 clogged catch basin reports (later: 311 Service Requests, Socrata API)
// ---------------------------------------------------------------------------

export const REPORT_YEARS = [CURRENT_YEAR - 3, CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR];

const STREETS = ['Oak Ave', 'Linden Blvd', 'Elm St', 'Park Pl', 'Harbor Rd', 'Maple Ave', 'Union St', 'Grove St', 'Bay Pkwy', 'Hill Dr'];

export const HOTSPOTS = (() => {
  const rand = seededRandom(311);
  const spots = [];
  for (let i = 0; i < 70; i++) {
    const [lat, lng] = ANCHORS[Math.floor(rand() * ANCHORS.length)];
    const { dLat, dLng } = metersToDegrees(1400, lat);
    const counts = {};
    const intensity = rand() ** 2;
    REPORT_YEARS.forEach((y) => {
      counts[y] = Math.round(intensity * 28 * (0.4 + rand()));
    });
    spots.push({
      id: `h${i}`,
      position: [lat + (rand() - 0.5) * 2 * dLat, lng + (rand() - 0.5) * 2 * dLng],
      label: `${Math.floor(rand() * 180) + 1} ${STREETS[Math.floor(rand() * STREETS.length)]}`,
      counts,
    });
  }
  return spots;
})();

export function hotspotCount(spot, year) {
  if (year === 'all') return Object.values(spot.counts).reduce((a, b) => a + b, 0);
  return spot.counts[year] ?? 0;
}

// ---------------------------------------------------------------------------
// Block risk card (combines the three sources above + FloodNet)
// ---------------------------------------------------------------------------

export function getBlockRisk(point) {
  const byScenario = SCENARIOS.map((scenario) => ({
    scenario,
    depth: floodDepthAt(point, scenario.id),
  }));

  const nearby = HOTSPOTS.filter((h) => distanceMeters(point, h.position) < 600);
  const reportsThisYear = nearby.reduce((sum, h) => sum + hotspotCount(h, CURRENT_YEAR), 0);

  // FloodNet sensors (later: FloodNet / NYC Open Data)
  const rand = seededRandom(hashString(point.map((n) => n.toFixed(3)).join(',')));
  const sensorsNearby = Math.floor(rand() * 3);
  const sensorEvents = sensorsNearby === 0 ? 0 : Math.floor(rand() * 9);

  return { byScenario, reportsThisYear, sensorsNearby, sensorEvents };
}

// ---------------------------------------------------------------------------
// Leaderboard (later: database query over check-ins)
// ---------------------------------------------------------------------------

export const SAMPLE_TEAMS = {
  block: [
    { name: 'Oak Ave Block Association', points: 42 },
    { name: 'Linden Blvd Neighbors', points: 35 },
    { name: 'Park Pl Tenants Group', points: 27 },
    { name: 'Harbor Rd Block Club', points: 19 },
    { name: 'Grove St Neighbors', points: 11 },
  ],
  school: [
    { name: 'Sample High School Green Team', points: 51 },
    { name: 'Sample Middle School Eco Club', points: 33 },
    { name: 'Sample Academy Service Club', points: 24 },
    { name: 'Sample Prep Environmental Club', points: 15 },
  ],
};
