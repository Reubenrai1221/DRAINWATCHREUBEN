// Map settings. The street map is built into the app (see BasemapLayer.jsx),
// so there is no outside basemap service or API key.

// The map opens fitted to the five boroughs, on any screen size.
export const NYC_FIT_BOUNDS = [
  [40.496, -74.256],
  [40.916, -73.7],
];

// The map can't be dragged far away from the five boroughs.
export const NYC_BOUNDS = [
  [40.45, -74.35], // southwest corner
  [40.97, -73.6], // northeast corner
];

export function isInNYC([lat, lng]) {
  return lat > NYC_BOUNDS[0][0] && lat < NYC_BOUNDS[1][0] && lng > NYC_BOUNDS[0][1] && lng < NYC_BOUNDS[1][1];
}

// NYC Planning's address search (see src/lib/geosearch.js).
export const GEOSEARCH_BASE = 'https://geosearch.planninglabs.nyc/v2';


export const CURRENT_YEAR = new Date().getFullYear();
