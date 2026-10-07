// Small geometry helpers. Coordinates are [lat, lng] pairs, like Leaflet uses.

const METERS_PER_DEG_LAT = 111320;

export function metersToDegrees(meters, lat) {
  return {
    dLat: meters / METERS_PER_DEG_LAT,
    dLng: meters / (METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180)),
  };
}

// Approximate distance in meters (accurate enough at city scale).
export function distanceMeters([lat1, lng1], [lat2, lng2]) {
  const dy = (lat2 - lat1) * METERS_PER_DEG_LAT;
  const dx = (lng2 - lng1) * METERS_PER_DEG_LAT * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

// Ray-casting test: is the point inside the polygon ring?
export function pointInPolygon([lat, lng], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [latI, lngI] = ring[i];
    const [latJ, lngJ] = ring[j];
    const crosses = latI > lat !== latJ > lat && lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI;
    if (crosses) inside = !inside;
  }
  return inside;
}
