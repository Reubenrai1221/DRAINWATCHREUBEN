import { useEffect, useState } from 'react';
import L from 'leaflet';
import { CircleMarker, GeoJSON, MapContainer, Marker, Pane, Polygon, Tooltip, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import { NYC_BOUNDS, NYC_FIT_BOUNDS } from '../config/map';
import NYC_BOROUGHS from '../data/nycBoroughs.json';
import { HOTSPOTS, getFloodZones, hotspotCount } from '../data/sampleData';
import { DepthSwatch } from './FloodPatterns';
import BasemapLayer from './BasemapLayer';
import LabelLayer from './LabelLayer';

// Leaflet's default marker images don't survive bundling, so we draw our own
// markers with HTML/SVG.
const drainIcon = L.divIcon({
  className: 'map-pin map-pin-drain',
  html: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 7v10M12 7v10M16 7v10"/></svg>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});
const draftIcon = L.divIcon({
  className: 'map-pin map-pin-draft',
  html: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 7v10M12 7v10M16 7v10"/></svg>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});
const homeIcon = L.divIcon({
  className: 'map-pin map-pin-home',
  html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12Z"/><circle cx="12" cy="10" r="2.6"/></svg>',
  iconSize: [36, 36],
  iconAnchor: [18, 34],
});

// The whole basemap is built into the app: borough land shapes (from
// scripts/simplify_boroughs.py) on blue water, parks and streets drawn on top
// by BasemapLayer, and street names by LabelLayer. No outside map service or
// API key is needed.
const BOROUGH_LABELS = [
  { name: 'Manhattan', position: [40.785, -73.968] },
  { name: 'Bronx', position: [40.848, -73.875] },
  { name: 'Queens', position: [40.712, -73.82] },
  { name: 'Brooklyn', position: [40.645, -73.945] },
  { name: 'Staten Island', position: [40.58, -74.15] },
].map((b) => ({
  ...b,
  icon: L.divIcon({ className: 'borough-label', html: b.name, iconSize: [120, 20], iconAnchor: [60, 10] }),
}));

const LAND_STYLE = { color: '#a9b8c9', weight: 1, fillColor: '#f2efe9', fillOpacity: 1 };

// Borough names only when zoomed out; up close they'd sit on top of streets.
function BoroughLabels() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  if (zoom > 12) return null;
  return BOROUGH_LABELS.map((b) => (
    <Marker key={b.name} position={b.position} icon={b.icon} interactive={false} keyboard={false} />
  ));
}

// Slightly see-through so streets still show under flood zones.
const NUISANCE_STYLE = { color: '#1f6fae', weight: 1, fillColor: 'url(#dw-nuisance)', fillOpacity: 0.7 };
const DEEP_STYLE = { color: '#0a2a66', weight: 1.5, fillColor: 'url(#dw-deep)', fillOpacity: 0.8 };

// Moves the map when the app asks it to (e.g. after an address search).
function FlyTo({ focus }) {
  const map = useMap();
  useEffect(() => {
    if (focus?.bounds) map.flyToBounds(focus.bounds, { duration: 0.8 });
    else if (focus) map.flyTo(focus.center, focus.zoom, { duration: 0.8 });
  }, [focus, map]);
  return null;
}

function MapEvents({ onReady, onClick }) {
  const map = useMapEvents({ click: (e) => onClick([e.latlng.lat, e.latlng.lng]) });
  useEffect(() => onReady(map), [map, onReady]);
  return null;
}

export default function MapView({ tab, scenarioId, year, lookup, drains, draftPin, pinMode, focus, onMapClick, onReady }) {
  const showFlood = tab === 'flood' || tab === 'block';
  const zones = showFlood ? getFloodZones(scenarioId) : null;

  return (
    <div className={`map-wrap${pinMode ? ' is-pinning' : ''}`}>
      <MapContainer
        bounds={NYC_FIT_BOUNDS}
        minZoom={9}
        maxZoom={19}
        maxBounds={NYC_BOUNDS}
        maxBoundsViscosity={0.8}
        zoomControl={false}
        className="map"
        aria-label="Map of New York City"
      >
        {/* Layers stack: land (250) → parks + streets (255) → borough names (260) → flood zones (400) → street names (450) → pins */}
        <Pane name="boroughs" style={{ zIndex: 250 }}>
          <GeoJSON data={NYC_BOROUGHS} style={LAND_STYLE} interactive={false} />
        </Pane>
        <BasemapLayer />
        <LabelLayer />
        <Pane name="borough-labels" style={{ zIndex: 260 }}>
          <BoroughLabels />
        </Pane>
        <ZoomControl position="topright" />
        <FlyTo focus={focus} />
        <MapEvents onReady={onReady} onClick={onMapClick} />

        {zones && (
          <>
            {/* key forces a redraw when the scenario changes */}
            <Polygon key={`n-${scenarioId}`} positions={zones.nuisance.map((r) => [r])} pathOptions={NUISANCE_STYLE} interactive={false} />
            <Polygon key={`d-${scenarioId}`} positions={zones.deep.map((r) => [r])} pathOptions={DEEP_STYLE} interactive={false} />
          </>
        )}

        {tab === 'drains' &&
          HOTSPOTS.map((h) => {
            const count = hotspotCount(h, year);
            if (!count) return null;
            return (
              <CircleMarker
                key={h.id}
                center={h.position}
                radius={4 + Math.sqrt(count) * (year === 'all' ? 2 : 3.2)}
                pathOptions={{ color: '#9a3412', weight: 1.5, fillColor: '#f97316', fillOpacity: 0.45 }}
              >
                <Tooltip>
                  {h.label}: {count} report{count === 1 ? '' : 's'}
                </Tooltip>
              </CircleMarker>
            );
          })}

        {tab === 'block' && lookup && (
          <Marker position={lookup.position} icon={homeIcon} title={lookup.label} alt={lookup.label} />
        )}

        {tab === 'adopt' &&
          drains.map((d) => (
            <Marker key={d.id} position={d.position} icon={drainIcon} title={d.name} alt={d.name}>
              <Tooltip direction="top" offset={[0, -14]}>
                {d.name}
              </Tooltip>
            </Marker>
          ))}
        {tab === 'adopt' && draftPin && <Marker position={draftPin} icon={draftIcon} title="New drain" alt="New drain" />}
      </MapContainer>

      <span className="sample-badge">Sample flood data · not real</span>
      <MapLegend tab={tab} />
    </div>
  );
}

function MapLegend({ tab }) {
  if (tab === 'flood' || tab === 'block') {
    return (
      <div className="map-legend" aria-hidden="true">
        <span>
          <DepthSwatch depth="nuisance" size={14} /> 4 in–1 ft
        </span>
        <span>
          <DepthSwatch depth="deep" size={14} /> 1 ft+
        </span>
      </div>
    );
  }
  if (tab === 'drains') {
    return (
      <div className="map-legend" aria-hidden="true">
        <span>
          <span className="legend-dot small" /> few
        </span>
        <span>
          <span className="legend-dot large" /> many 311 reports
        </span>
      </div>
    );
  }
  return null;
}
