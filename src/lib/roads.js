// Decodes the packed street data (built by scripts/build_roads.py) and finds
// which streets fall inside a map tile, so the map can draw them quickly.

import { ROAD_DATA, ROAD_META } from '../data/nycRoads';

// Streets are indexed in square cells the size of a zoom-14 map tile.
const INDEX_ZOOM = 14;
const CELLS = 2 ** INDEX_ZOOM;

let roads = null;

// Longitude/latitude → "Web Mercator" position from 0 to 1, the same
// flat projection Leaflet (and Google Maps) uses. Converting once up front
// means drawing a tile is just multiplication.
function mercatorX(lng) {
  return (lng + 180) / 360;
}
function mercatorY(lat) {
  const r = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2;
}

function decode() {
  const text = atob(ROAD_DATA);
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);

  let pos = 0;
  // Variable-length "zigzag" integers, the reverse of varint() in the script.
  const read = () => {
    let value = 0;
    let shift = 1;
    let byte;
    do {
      byte = bytes[pos++];
      value += (byte & 0x7f) * shift;
      shift *= 128;
    } while (byte & 0x80);
    return value % 2 ? -(value + 1) / 2 : value / 2;
  };

  const { roads: count, scale, origin } = ROAD_META;
  const kind = new Uint8Array(count); // class index
  const bridge = new Uint8Array(count);
  const start = new Uint32Array(count + 1); // where each road's points begin
  const bbox = new Float64Array(count * 4);
  const coords = [];

  for (let r = 0; r < count; r++) {
    const head = read();
    kind[r] = head >> 1;
    bridge[r] = head & 1;
    const n = read();
    start[r] = coords.length / 2;
    let x = 0;
    let y = 0;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      x += read();
      y += read();
      const mx = mercatorX(origin[0] + x / scale);
      const my = mercatorY(origin[1] + y / scale);
      coords.push(mx, my);
      if (mx < minX) minX = mx;
      if (mx > maxX) maxX = mx;
      if (my < minY) minY = my;
      if (my > maxY) maxY = my;
    }
    bbox.set([minX, minY, maxX, maxY], r * 4);
  }
  start[count] = coords.length / 2;

  // Spatial index: cell → list of roads that pass through it.
  const index = new Map();
  for (let r = 0; r < count; r++) {
    const [x0, y0, x1, y1] = bbox.subarray(r * 4, r * 4 + 4);
    for (let cx = Math.floor(x0 * CELLS); cx <= Math.floor(x1 * CELLS); cx++) {
      for (let cy = Math.floor(y0 * CELLS); cy <= Math.floor(y1 * CELLS); cy++) {
        const key = cx * CELLS + cy;
        if (!index.has(key)) index.set(key, []);
        index.get(key).push(r);
      }
    }
  }

  return { count, kind, bridge, start, bbox, coords: Float64Array.from(coords), index, seen: new Uint32Array(count), stamp: 0 };
}

export function getRoads() {
  if (!roads) roads = decode();
  return roads;
}

export const ROAD_CLASSES = ROAD_META.classes;

// All roads whose bounding box overlaps [x0, y0, x1, y1] (Mercator 0–1 units).
export function roadsInBox(x0, y0, x1, y1) {
  const db = getRoads();
  const found = [];
  db.stamp++;
  for (let cx = Math.floor(x0 * CELLS); cx <= Math.floor(x1 * CELLS); cx++) {
    for (let cy = Math.floor(y0 * CELLS); cy <= Math.floor(y1 * CELLS); cy++) {
      const list = db.index.get(cx * CELLS + cy);
      if (!list) continue;
      for (const r of list) {
        if (db.seen[r] === db.stamp) continue; // already added from another cell
        db.seen[r] = db.stamp;
        const b = r * 4;
        if (db.bbox[b] <= x1 && db.bbox[b + 2] >= x0 && db.bbox[b + 1] <= y1 && db.bbox[b + 3] >= y0) found.push(r);
      }
    }
  }
  return found;
}
