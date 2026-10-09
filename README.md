# DrainWatch NYC

DrainWatch shows New Yorkers how their block floods and lets neighbors adopt and clear storm drains before storms hit.

> **Status: Phase 0, the interface prototype.** Every screen and button works. The map of NYC and the **address search are real**. Everything else (flood zones, 311 reports, sensors, leaderboard) is still **made-up sample data**, and the map says "Sample flood data · not real" so nobody gets confused.

## Run it

You need [Node.js](https://nodejs.org) 20.19 or newer.

```bash
npm install      # first time only
npm run dev      # start the dev server, then open the URL it prints (usually http://localhost:5173)
```

To test on your phone, run `npm run dev -- --host` and open the "Network" URL on a phone connected to the same Wi-Fi.

Other commands:

```bash
npm run build    # make the production version in dist/
npm run preview  # serve the production build locally
```

No API keys are needed yet. Later phases will use a `.env.local` file (see `.env.example`), which git ignores so secrets never reach GitHub.

## What you can try

| Tab | What it does |
|---|---|
| **Flood map** | Drag the rain slider (or use the arrow keys). It snaps between the city's modeled storms: 1.77, 2.13, and 3.66 in/hr. The sea-level switch picks today's sea level or future sea-level rise, and the option the city didn't model is crossed out. A dashed red line marks Hurricane Ida (3.15 in/hr), and a striped band shows what most sewers are built for (1.5–1.75 in/hr). |
| **My block** | Type a real NYC address and pick from the live suggestions (arrow keys + Enter work too), or tap "Use my location". The map zooms to that address and shows a risk card: flood depth in the current storm, a "when does this block flood?" table for every storm, nearby 311 clogged-drain reports, and FloodNet sensor events. The address is real; the risk numbers are still samples. |
| **Hotspots** | Circles show where clogged catch basins were reported (bigger circle = more reports). Filter by year, then tap a hotspot in the list to zoom to it. |
| **Adopt** | Use a demo sign-in to join a block or school, pin a drain on the map (tap the map or "Use center of map"), check in as cleared with an optional photo, and watch your team climb the leaderboard. "Report photo" hides a photo the way moderation will. |
| **Report** | Explains what to tell 311 and links to the city's clogged catch basin page. |
| **Storm demo** (header) | Turns on the flood-warning banner with drain-safety and basement-safety tips. Check-in forms also warn you while it's on. |

## How the code is organized

```
src/
  main.jsx               starts React
  App.jsx                holds app-wide state (current tab, storm, drains…) and passes it down
  styles.css             all styling, mobile-first
  config/
    scenarios.js         rain scenarios for the slider, Ida, sewer capacity
    flood.js             words used for each flood depth
    links.js             official city URLs (empty until verified)
    map.js               basemap and starting view
  data/
    sampleData.js        ⚠️ ALL fake data lives here and gets replaced by real sources later
    nycBoroughs.json     simplified outlines of the five boroughs (real)
    nycRoads.js          every NYC street and bridge, packed small (real, generated)
  lib/
    geosearch.js         NYC address search (real)
    roads.js             unpacks the street data and finds the streets on screen
    photo.js             photo size limit, resizing, and location-data removal
    geo.js               distance and "is this point inside this shape" math
    random.js            seeded random numbers so sample data is the same on every reload
    storage.js           safe browser storage for the demo
  components/            one file per piece of the screen (map, slider, panels, dialog…)
scripts/
  simplify_boroughs.py   shrinks the borough outlines file (see "Keeping the map fast")
  build_roads.py         packs NYC's streets into src/data/nycRoads.js (see "Street map")
```

## Key decisions, in plain language

- **React + Vite.** React splits the screen into reusable pieces (components). Vite is the tool that runs and builds it, and it's very fast. Both are free and widely used.
- **Leaflet for the map, not MapLibre (for now).** Leaflet is simpler to learn and works fine with sample shapes. When the real flood maps arrive we may switch to MapLibre, because it draws *vector tiles* (pre-cut map pieces) on the graphics card, and that's the best way to keep huge flood files fast. Every map detail lives in `MapView.jsx`, so a swap would touch one file.
- **Our own street map, built into the app.** We first used CARTO's free street-map images, but CARTO started requiring an API key and sent an "API KEY REQUIRED" picture instead of streets. Most street-map services now need a key, and some networks block them. So DrainWatch draws its own map: the five boroughs as land on blue water, with every street and bridge drawn on top (see "Street map" below). It needs no key, no outside server and no internet, and it looks the same everywhere. The map also won't let you scroll away from the city.
- **NYC GeoSearch for addresses.** It's run by NYC City Planning, it's free, it needs no key, and it only knows NYC addresses (from the city's official Property Address Directory), so you can't accidentally land in New Jersey. Suggestions appear after 3 letters, and we wait a quarter second after you stop typing before asking, so we don't send a request on every keystroke.
- **Sample data in one file.** Every fake number comes from `data/sampleData.js`. When real data is ready, we swap those functions for real API calls and the rest of the app doesn't change.
- **The slider snaps.** The city only modeled a few storms, so the slider jumps to the closest one instead of pretending to show in-between values. That's honest: these are *modeled scenarios*, not a live simulation.
- **Not color alone.** Nuisance flooding is light blue **with dots**, deep flooding is dark blue **with stripes**, and every result is also written out in words. Colorblind users and screen-reader users get the same information.
- **Keyboard and screen readers.** Every control is a real button, link, or form field, so it works with Tab and Enter. The year filter and sea-level switch are styled radio buttons, and the slider moves one scenario per arrow key. There's a "Skip to main content" link, and the Report dialog uses the built-in `<dialog>` element, which handles focus and Escape for us.
- **Mobile-first.** On phones the map sits on top, the panel below it, and big tab buttons at the bottom within thumb reach. On wide screens the panel moves to the left. Buttons are at least 44px tall so they're easy to tap.
- **Photo safety.** Photos over 10 MB are rejected. Each photo is redrawn onto a blank canvas and saved as a new JPEG. The new file holds only pixels, so hidden **location data (GPS), phone model, and timestamps are removed**. Large photos are shrunk to 1600px. The demo keeps photos only in memory; real uploads come in Phase 5.
- **Work with the city, not against it.** The Adopt tab points people to DEP's own Adopt-a-Catch Basin program for the free kit, and the Report button sends people to 311 instead of collecting reports itself.

## Things still to verify (before real data)

The project brief says not to trust memory for IDs, field names, or URLs. These are deliberately **not** filled in yet:

- [ ] NYC 311 clogged catch basin page URL → `src/config/links.js`
- [ ] DEP Adopt-a-Catch Basin program URL → `src/config/links.js`
- [ ] Stormwater Flood Maps dataset IDs/layers, and which rain + sea-level combinations exist → `src/config/scenarios.js`
- [ ] 311 dataset ID plus the exact complaint type / descriptor for clogged catch basins (query distinct values first)
- [ ] FloodNet sensor and flood-event dataset IDs and fields
- [x] NYC GeoSearch endpoint and response format. Checked against NYC Planning's own docs source ([labs-geosearch-docs](https://github.com/NYCPlanning/labs-geosearch-docs), `src/pages/docs.js`): `https://geosearch.planninglabs.nyc/v2/autocomplete?text=…` and `/v2/search?text=…&size=1`, GeoJSON results with `properties.label` and `[longitude, latitude]` coordinates. Still to do: a live test from a normal browser, because the build environment blocks the site.
- [ ] api.weather.gov alerts-by-point endpoint and required User-Agent format

Until a link is verified, its button shows "Link coming soon" instead of guessing.

## Data sources (planned)

| Feature | Source | Replaces in `sampleData.js` |
|---|---|---|
| Flood zones per storm | NYC Stormwater Flood Maps (NYC Open Data / ArcGIS) | `getFloodZones`, `floodDepthAt` |
| Clogged-drain hotspots | 311 Service Requests (Socrata API) | `HOTSPOTS`, `REPORT_YEARS` |
| Sensor flood events | FloodNet (NYC Open Data + their GitHub) | the FloodNet part of `getBlockRisk` |
| Address search | NYC GeoSearch (Planning Labs) | ✅ connected (`src/lib/geosearch.js`) |
| Streets and bridges | [Overture Maps](https://overturemaps.org) road segments (release 2026-09-23.1, built from OpenStreetMap), packed by `scripts/build_roads.py` | ✅ built in |
| Borough outlines | `new-york-city-boroughs.geojson` from [Code for Germany's click_that_hood](https://github.com/codeforgermany/click_that_hood), simplified by `scripts/simplify_boroughs.py` | ✅ built in. Swap for NYC Open Data's official Borough Boundaries once we can download it |
| Storm mode | National Weather Service, api.weather.gov | the "Storm demo" switch |
| Accounts, adoptions, photos, leaderboard | Supabase (free tier) | `SAMPLE_TEAMS`, browser storage |

**Street map.** `scripts/build_roads.py` takes NYC's road data from Overture Maps (free and open, built from OpenStreetMap) and keeps only roads cars use inside the five boroughs. It drops tunnels, since they're underground, and marks bridges. Then it packs everything small: it simplifies each line, stores each point as the tiny difference from the previous one, and writes those numbers in as few bytes as possible. The result is 94,361 streets and 1,724 bridge pieces in 1.5 MB. In the app, `StreetLayer.jsx` draws the map the way Google Maps does: Leaflet asks for 256×256-pixel squares ("tiles") as you pan and zoom, and we paint each one on a canvas with only the streets inside it, which we find using a grid index (`src/lib/roads.js`). Highways show first, and side streets appear from zoom 14. Bridges get a dark outline when you're zoomed in, so they stand out over the water. The credit "© OpenStreetMap · Overture" in the map corner is required by the data's license (ODbL), so keep it visible.

To rebuild the street data from a newer release: download the NYC road segments as GeoParquet (for example with the `overturemaps` Python tool, bounding box `-74.26,40.49,-73.70,40.92`), then run `python3 scripts/build_roads.py nyc_roads.parquet src/data/nycBoroughs.json src/data/nycRoads.js` (needs `pip install pyarrow`).

**Keeping the map fast.** We already do this for the borough outlines: `scripts/simplify_boroughs.py` uses the Douglas-Peucker algorithm to remove points that don't change the shape you see. It cut the file from 68,677 points (2.6 MB) to 4,976 points (104 KB). The flood map files are much larger, so the plan is the same first step, then either cut them into vector tiles (PMTiles, one static file that can be hosted free) or ask the ArcGIS service for only the area on screen. We'll test both when we get there.

## Build phases

0. ✅ **Interface prototype** with sample data (this version)
1. Real flood layers and rain slider
2. Real address lookup and risk card
3. Real 311 hotspot map
4. Live storm mode from weather.gov
5. Adopt-a-drain with real accounts and photo storage (Supabase)
6. Real leaderboard
7. Polish, accessibility testing, deploy to Vercel

**Later (v2), not built yet:** routing around flooded streets, push notifications, multilingual alerts. The app already keeps all text inside components and all data access in one module, so these can be added without a rewrite.
