// Unpacks the street data (built by scripts/build_roads.py): road lines for
// drawing, plus longer joined-up lines used to place street names.

import { LABEL_DATA, ROAD_DATA, ROAD_META, STREET_NAMES } from '../data/nycRoads';
import { GridIndex, intReader, readPoints } from './packed';

export const ROAD_CLASSES = ROAD_META.classes;

let roads = null;
let labels = null;

export function getRoads() {
  if (roads) return roads;
  const read = intReader(ROAD_DATA);
  const count = ROAD_META.roads;
  const kind = new Uint8Array(count); // class index
  const bridge = new Uint8Array(count);
  const start = new Uint32Array(count + 1); // where each road's points begin
  const coords = [];
  const index = new GridIndex(count);
  for (let r = 0; r < count; r++) {
    const head = read();
    kind[r] = head >> 1;
    bridge[r] = head & 1;
    start[r] = coords.length / 2;
    index.add(r, readPoints(read, coords, ROAD_META));
  }
  start[count] = coords.length / 2;
  roads = { count, kind, bridge, start, coords: Float64Array.from(coords), index };
  return roads;
}

export function getStreetLabels() {
  if (labels) return labels;
  const read = intReader(LABEL_DATA);
  const count = ROAD_META.labels;
  const name = new Uint32Array(count);
  const kind = new Uint8Array(count);
  const start = new Uint32Array(count + 1);
  const coords = [];
  const index = new GridIndex(count);
  for (let i = 0; i < count; i++) {
    name[i] = read();
    kind[i] = read();
    start[i] = coords.length / 2;
    index.add(i, readPoints(read, coords, ROAD_META));
  }
  start[count] = coords.length / 2;
  labels = { count, name, kind, start, coords: Float64Array.from(coords), index, names: STREET_NAMES };
  return labels;
}
