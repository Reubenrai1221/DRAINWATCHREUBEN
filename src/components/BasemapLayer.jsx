import { useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { ROAD_CLASSES, getRoads } from '../lib/roads';
import { PARK_MIN_ZOOM, getParks } from '../lib/parks';

// Our own base map. Leaflet asks for 256×256 "tiles" as you pan and zoom;
// we draw each one on a <canvas> from the parks and streets built into the
// app: parks first, then streets on top. No outside map service, no API key,
// works offline. Street names are drawn separately by LabelLayer.

// How each kind of road looks. `width` is in pixels at zoom 16 and scales
// with zoom; `minZoom` hides small streets when zoomed out (like Google Maps).
const STYLE = {
  residential: { minZoom: 14, width: 5, fill: '#ffffff', casing: '#d9d3c4' },
  unclassified: { minZoom: 14, width: 5, fill: '#ffffff', casing: '#d9d3c4' },
  living_street: { minZoom: 15, width: 4, fill: '#ffffff', casing: '#d9d3c4' },
  tertiary: { minZoom: 13, width: 7, fill: '#ffffff', casing: '#cbc2ad' },
  secondary: { minZoom: 12, width: 8, fill: '#ffffff', casing: '#c4b99e' },
  primary: { minZoom: 11, width: 9, fill: '#fff2bf', casing: '#dcc06a' },
  trunk: { minZoom: 10, width: 10, fill: '#fde3a0', casing: '#d8a845' },
  motorway: { minZoom: 9, width: 11, fill: '#fbd07a', casing: '#cf9530' },
};
const BRIDGE_CASING = '#5b6472';
const PARK_FILL = '#c6e5bd';
const PARK_EDGE = '#a9d39d';

function lineWidth(cls, zoom) {
  return Math.max(0.7, STYLE[cls].width * 2 ** ((zoom - 16) * 0.8));
}

const StreetGrid = L.GridLayer.extend({
  createTile(coords) {
    const dpr = window.devicePixelRatio || 1;
    const size = this.getTileSize();
    const canvas = document.createElement('canvas');
    canvas.width = size.x * dpr;
    canvas.height = size.y * dpr;
    drawTile(canvas.getContext('2d'), coords, size.x, dpr);
    return canvas;
  },
});

function drawTile(ctx, { x, y, z }, tileSize, dpr) {
  const worldSize = tileSize * 2 ** z;
  const ox = x * tileSize;
  const oy = y * tileSize;
  // Look a little past the tile edge so wide roads aren't cut off at seams.
  const pad = 16 / worldSize;
  const box = [ox / worldSize - pad, oy / worldSize - pad, (ox + tileSize) / worldSize + pad, (oy + tileSize) / worldSize + pad];
  ctx.scale(dpr, dpr);
  drawParks(ctx, box, z, worldSize, ox, oy);
  drawRoads(ctx, box, z, worldSize, ox, oy);
}

function drawParks(ctx, box, z, worldSize, ox, oy) {
  const parks = getParks();
  const ids = parks.index.query(...box).filter((p) => z >= PARK_MIN_ZOOM[parks.size[p]]);
  if (!ids.length) return;
  ctx.beginPath();
  for (const p of ids) {
    for (let r = parks.ringStart[p]; r < parks.ringStart[p + 1]; r++) {
      for (let i = parks.pointStart[r]; i < parks.pointStart[r + 1]; i++) {
        const px = parks.coords[i * 2] * worldSize - ox;
        const py = parks.coords[i * 2 + 1] * worldSize - oy;
        if (i === parks.pointStart[r]) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }
  }
  ctx.fillStyle = PARK_FILL;
  ctx.fill('evenodd'); // "evenodd" leaves holes (lakes, buildings) unfilled
  if (z >= 14) {
    ctx.strokeStyle = PARK_EDGE;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawRoads(ctx, box, z, worldSize, ox, oy) {
  const db = getRoads();
  const visible = db.index.query(...box).filter((r) => z >= STYLE[ROAD_CLASSES[db.kind[r]]].minZoom);
  if (!visible.length) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const trace = (r) => {
    let lastX = 0;
    let lastY = 0;
    for (let i = db.start[r]; i < db.start[r + 1]; i++) {
      const px = db.coords[i * 2] * worldSize - ox;
      const py = db.coords[i * 2 + 1] * worldSize - oy;
      if (i === db.start[r]) ctx.moveTo(px, py);
      // Skip points less than half a pixel apart; they can't be seen.
      else if (Math.abs(px - lastX) + Math.abs(py - lastY) > 0.5 || i === db.start[r + 1] - 1) ctx.lineTo(px, py);
      else continue;
      lastX = px;
      lastY = py;
    }
  };

  // Draw one group of roads: outline ("casing") first, then the fill on top.
  const pass = (list, cls, casingColor, extra) => {
    if (!list.length) return;
    const width = lineWidth(cls, z);
    const showCasing = z >= 13;
    if (showCasing) {
      ctx.beginPath();
      list.forEach(trace);
      ctx.strokeStyle = casingColor;
      ctx.lineWidth = width + extra;
      ctx.stroke();
    }
    ctx.beginPath();
    list.forEach(trace);
    ctx.strokeStyle = STYLE[cls].fill;
    ctx.lineWidth = width;
    ctx.stroke();
  };

  // Small streets first, highways on top, then bridges above everything so
  // they read as crossing over the water and roads below.
  for (const bridges of [0, 1]) {
    ROAD_CLASSES.forEach((cls, k) => {
      const list = visible.filter((r) => db.kind[r] === k && db.bridge[r] === bridges);
      // Zoomed out, bridges look like any other road (many elevated highways
      // are tagged as bridges, and dark outlines would clutter the city view).
      if (bridges && z >= 13) pass(list, cls, BRIDGE_CASING, z >= 14 ? 3 : 2);
      else pass(list, cls, STYLE[cls].casing, z >= 15 ? 2 : 1.2);
    });
  }
}

// Required credit for the street data (OpenStreetMap's ODbL license).
export const STREET_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://overturemaps.org">Overture</a>';

export default function BasemapLayer() {
  const map = useMap();
  useEffect(() => {
    // Own layer: above the borough land shapes, below flood zones and pins.
    if (!map.getPane('streets')) map.createPane('streets').style.zIndex = 255;
    const layer = new StreetGrid({ pane: 'streets', attribution: STREET_ATTRIBUTION, maxZoom: 19, minZoom: 9 });
    layer.addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    return () => layer.remove();
  }, [map]);
  return null;
}
