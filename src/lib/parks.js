// Unpacks the park shapes (built by scripts/build_parks.py).

import { PARK_DATA, PARK_META } from '../data/nycParks';
import { GridIndex, intReader, readPoints } from './packed';

// Smallest zoom each park size shows at: big parks (Central Park, Prospect
// Park) are visible across the whole city, pocket parks only up close.
export const PARK_MIN_ZOOM = [9, 12, 14];

let parks = null;

export function getParks() {
  if (parks) return parks;
  const read = intReader(PARK_DATA);
  const count = PARK_META.parks;
  const size = new Uint8Array(count); // 0 large, 1 medium, 2 small
  const ringStart = []; // first ring of each park
  const pointStart = []; // first point of each ring
  const coords = [];
  const index = new GridIndex(count);
  for (let p = 0; p < count; p++) {
    size[p] = read();
    const rings = read();
    ringStart.push(pointStart.length);
    let box = null;
    for (let r = 0; r < rings; r++) {
      pointStart.push(coords.length / 2);
      const b = readPoints(read, coords, PARK_META);
      box = box ? [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])] : b;
    }
    index.add(p, box);
  }
  ringStart.push(pointStart.length);
  pointStart.push(coords.length / 2);
  parks = {
    count,
    size,
    ringStart: Uint32Array.from(ringStart),
    pointStart: Uint32Array.from(pointStart),
    coords: Float64Array.from(coords),
    index,
  };
  return parks;
}
