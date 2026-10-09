import { useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { ROAD_CLASSES, getStreetLabels } from '../lib/roads';

// Street names, drawn on one canvas that covers the visible map. It's redrawn
// each time the map stops moving, so names never get cut off at tile edges.
// Names only appear once you're zoomed in, bigger roads first:
//   highways and main roads from zoom 14, other through streets from 15,
//   side streets from 16.
const MIN_ZOOM = {
  motorway: 14,
  trunk: 14,
  primary: 14,
  secondary: 15,
  tertiary: 15,
  residential: 16,
  unclassified: 16,
  living_street: 17,
};
const RANK = Object.fromEntries(ROAD_CLASSES.map((c, i) => [c, i])); // higher = more important
const SAME_NAME_GAP = 260; // px; don't repeat a name closer than this
const MAX_BEND = (20 * Math.PI) / 180; // names sit on stretches that bend less than 20°

const StreetLabels = L.Layer.extend({
  onAdd(map) {
    this._canvas = L.DomUtil.create('canvas', 'street-labels');
    this.getPane().appendChild(this._canvas);
    this._redraw = () => this._draw();
    this._hide = () => {
      this._canvas.style.visibility = 'hidden';
    };
    map.on('moveend zoomend resize', this._redraw);
    map.on('zoomstart', this._hide);
    this._draw();
  },

  onRemove(map) {
    map.off('moveend zoomend resize', this._redraw);
    map.off('zoomstart', this._hide);
    this._canvas.remove();
  },

  _draw() {
    const map = this._map;
    const canvas = this._canvas;
    const size = map.getSize();
    const dpr = window.devicePixelRatio || 1;
    // Pin the canvas to the map's current top-left corner so it pans with the map.
    L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
    canvas.width = size.x * dpr;
    canvas.height = size.y * dpr;
    canvas.style.width = `${size.x}px`;
    canvas.style.height = `${size.y}px`;
    canvas.style.visibility = 'visible';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const zoom = Math.round(map.getZoom());
    if (zoom < 14) return;

    const db = getStreetLabels();
    const world = 256 * 2 ** zoom;
    const view = map.getPixelBounds();
    const ox = view.min.x;
    const oy = view.min.y;
    const ids = db.index
      .query(ox / world, oy / world, view.max.x / world, view.max.y / world)
      .filter((i) => zoom >= MIN_ZOOM[ROAD_CLASSES[db.kind[i]]])
      .sort((a, b) => db.kind[b] - db.kind[a]); // most important roads claim space first

    const placed = []; // circles covering each placed label, for overlap checks
    const byName = new Map(); // name -> centers already used
    const fontSize = zoom >= 17 ? 13 : 12;

    for (const id of ids) {
      const name = db.names[db.name[id]];
      const major = db.kind[id] >= RANK.primary;
      ctx.font = `${major ? 700 : 600} ${fontSize}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
      const width = ctx.measureText(name).width;
      const needed = width + 16;

      // Screen positions of this street's points.
      const pts = [];
      for (let i = db.start[id]; i < db.start[id + 1]; i++) {
        pts.push([db.coords[i * 2] * world - ox, db.coords[i * 2 + 1] * world - oy]);
      }

      // Split the street into straight-enough stretches, keep the part of
      // each stretch that's on screen, and try spots along it.
      for (const [a, b] of straightRuns(pts)) {
        const clipped = clipToView(a, b, size.x, size.y, 12);
        if (!clipped) continue;
        const [[ax, ay], [bx, by]] = clipped;
        const length = Math.hypot(bx - ax, by - ay);
        if (length < needed) continue;

        // Keep text upright: never draw it upside down.
        let angle = Math.atan2(by - ay, bx - ax);
        if (angle > Math.PI / 2) angle -= Math.PI;
        if (angle < -Math.PI / 2) angle += Math.PI;

        // First try the middle of the visible stretch, then further along
        // long streets (each spot at least SAME_NAME_GAP apart).
        const spots = [length / 2];
        for (let d = length / 2 + SAME_NAME_GAP; d <= length - needed / 2; d += SAME_NAME_GAP) spots.push(d, length - d);
        for (const d of spots) {
          const cx = ax + ((bx - ax) * d) / length;
          const cy = ay + ((by - ay) * d) / length;
          if (!tryPlace(name, cx, cy, angle, width)) continue;
          drawLabel(ctx, name, cx, cy, angle, major);
        }
      }
    }

    // Approximate a label as a row of circles; skip it if any circle overlaps
    // an existing label, or if the same name is already close by.
    function tryPlace(name, cx, cy, angle, width) {
      const seen = byName.get(name) ?? [];
      if (seen.some(([sx, sy]) => Math.hypot(sx - cx, sy - cy) < SAME_NAME_GAP)) return false;
      const r = fontSize * 0.75;
      const circles = [];
      for (let d = -width / 2; d <= width / 2; d += r) circles.push([cx + Math.cos(angle) * d, cy + Math.sin(angle) * d]);
      if (circles.some(([px, py]) => placed.some(([qx, qy]) => Math.hypot(px - qx, py - qy) < r * 2))) return false;
      placed.push(...circles);
      seen.push([cx, cy]);
      byName.set(name, seen);
      return true;
    }
  },
});

function drawLabel(ctx, name, cx, cy, angle, major) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'; // white "halo" so text reads over any background
  ctx.lineWidth = 3.5;
  ctx.strokeText(name, 0, 0);
  ctx.fillStyle = major ? '#3b3325' : '#4a5260';
  ctx.fillText(name, 0, 0);
  ctx.restore();
}

// Pairs of [start, end] points where the line bends less than MAX_BEND.
function straightRuns(pts) {
  const runs = [];
  let s = 0;
  for (let i = 2; i < pts.length; i++) {
    const runDir = Math.atan2(pts[i - 1][1] - pts[s][1], pts[i - 1][0] - pts[s][0]);
    const segDir = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]);
    const bend = Math.abs(((segDir - runDir + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    if (bend > MAX_BEND) {
      runs.push([pts[s], pts[i - 1]]);
      s = i - 1;
    }
  }
  if (pts.length > 1) runs.push([pts[s], pts[pts.length - 1]]);
  return runs;
}

// The part of segment a→b inside the screen (minus a margin), or null.
// (Liang–Barsky line clipping.)
function clipToView([ax, ay], [bx, by], w, h, margin) {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dy = by - ay;
  const edges = [
    [-dx, ax - margin],
    [dx, w - margin - ax],
    [-dy, ay - margin],
    [dy, h - margin - ay],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return null;
    } else {
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
    }
  }
  if (t0 >= t1) return null;
  return [
    [ax + dx * t0, ay + dy * t0],
    [ax + dx * t1, ay + dy * t1],
  ];
}

export default function LabelLayer() {
  const map = useMap();
  useEffect(() => {
    // Above flood zones (400) so names stay readable, below pins (600).
    if (!map.getPane('street-labels')) {
      const pane = map.createPane('street-labels');
      pane.style.zIndex = 450;
      pane.style.pointerEvents = 'none';
    }
    const layer = new StreetLabels({ pane: 'street-labels' });
    layer.addTo(map);
    return () => layer.remove();
  }, [map]);
  return null;
}
