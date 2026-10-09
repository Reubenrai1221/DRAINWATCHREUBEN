// NYC GeoSearch: NYC Planning's free address search. No API key needed.
//
// Verified against NYC Planning's own documentation source
// (github.com/NYCPlanning/labs-geosearch-docs, src/pages/docs.js):
//   GET {base}/autocomplete?text=...   suggestions while typing
//   GET {base}/search?text=...&size=1  best match for a full address
// Optional focus.point.lat / focus.point.lon boost results near a point.
// Responses are GeoJSON. Each feature has properties.label (ready to show)
// and geometry.coordinates in [longitude, latitude] order.

import { GEOSEARCH_BASE } from '../config/map';

export class GeoSearchUnavailable extends Error {}

function toResult(feature) {
  const [lng, lat] = feature.geometry.coordinates;
  const p = feature.properties ?? {};
  return {
    id: p.id ?? p.gid ?? `${lat},${lng}`,
    label: p.label ?? p.name,
    borough: p.borough ?? null,
    position: [lat, lng],
  };
}

async function request(path, params, signal) {
  const url = `${GEOSEARCH_BASE}/${path}?${new URLSearchParams(params)}`;
  let response;
  try {
    response = await fetch(url, { signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new GeoSearchUnavailable('Could not reach NYC GeoSearch');
  }
  if (!response.ok) throw new GeoSearchUnavailable(`NYC GeoSearch returned ${response.status}`);
  const data = await response.json();
  return (data.features ?? []).filter((f) => f.geometry?.coordinates).map(toResult);
}

export function autocomplete(text, signal) {
  return request('autocomplete', { text }, signal);
}

export async function searchAddress(text, signal) {
  const results = await request('search', { text, size: '1' }, signal);
  return results[0] ?? null;
}
