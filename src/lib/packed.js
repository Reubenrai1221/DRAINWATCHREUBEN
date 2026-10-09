// Shared helpers for the map data packed by scripts/build_roads.py and
// scripts/build_parks.py.

// Longitude/latitude → "Web Mercator" position from 0 to 1, the same flat
// projection Leaflet (and Google Maps) uses. Multiply by 256 × 2^zoom to get
// the pixel position at that zoom.
export function mercatorX(lng) {
  return (lng + 180) / 360;
}
export function mercatorY(lat) {
  const r = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2;
}

// Reads the variable-length "zigzag" integers written by varint() in the
// Python scripts (small numbers take 1 byte, bigger ones 2–3).
export function intReader(base64) {
  const text = atob(base64);
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
  let pos = 0;
  return function read() {
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
}

// Reads one line/ring: a point count, then each point as a difference from
// the previous one. Pushes Mercator x, y pairs onto `coords` and returns the
// line's bounding box.
export function readPoints(read, coords, { scale, origin }) {
  const n = read();
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
  return [minX, minY, maxX, maxY];
}

// A grid of square cells (each the size of a zoom-14 map tile). Each cell
// remembers which features pass through it, so finding what's on screen means
// looking at a few cells instead of checking every feature in the city.
const CELLS = 2 ** 14;

export class GridIndex {
  constructor(count) {
    this.cells = new Map();
    this.bbox = new Float64Array(count * 4);
    this.seen = new Uint32Array(count);
    this.stamp = 0;
  }

  add(id, [x0, y0, x1, y1]) {
    this.bbox.set([x0, y0, x1, y1], id * 4);
    for (let cx = Math.floor(x0 * CELLS); cx <= Math.floor(x1 * CELLS); cx++) {
      for (let cy = Math.floor(y0 * CELLS); cy <= Math.floor(y1 * CELLS); cy++) {
        const key = cx * CELLS + cy;
        let list = this.cells.get(key);
        if (!list) this.cells.set(key, (list = []));
        list.push(id);
      }
    }
  }

  // Ids of features whose bounding box overlaps [x0, y0, x1, y1].
  query(x0, y0, x1, y1) {
    const found = [];
    const { bbox, seen } = this;
    this.stamp++;
    for (let cx = Math.floor(x0 * CELLS); cx <= Math.floor(x1 * CELLS); cx++) {
      for (let cy = Math.floor(y0 * CELLS); cy <= Math.floor(y1 * CELLS); cy++) {
        const list = this.cells.get(cx * CELLS + cy);
        if (!list) continue;
        for (const id of list) {
          if (seen[id] === this.stamp) continue; // already found via another cell
          seen[id] = this.stamp;
          const b = id * 4;
          if (bbox[b] <= x1 && bbox[b + 2] >= x0 && bbox[b + 1] <= y1 && bbox[b + 3] >= y0) found.push(id);
        }
      }
    }
    return found;
  }
}
