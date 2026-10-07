# DrainWatch NYC

DrainWatch shows New Yorkers how their block floods and lets neighbors adopt and clear storm drains before storms hit.

> **Status: Phase 0, the interface prototype.** Every screen and button works, but the app runs on **made-up sample data**. Nothing on the map is real flooding, real 311 reports, or real sensors. The map says "Sample data · not real" so nobody gets confused.

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
| **My block** | Type any address or tap "Use my location" to get a risk card: flood depth in the current storm, a "when does this block flood?" table for every storm, nearby 311 clogged-drain reports, and FloodNet sensor events. |
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
  lib/
    photo.js             photo size limit, resizing, and location-data removal
    geo.js               distance and "is this point inside this shape" math
    random.js            seeded random numbers so sample data is the same on every reload
    storage.js           safe browser storage for the demo
  components/            one file per piece of the screen (map, slider, panels, dialog…)
```

## Key decisions, in plain language

- **React + Vite.** React splits the screen into reusable pieces (components). Vite is the tool that runs and builds it, and it's very fast. Both are free and widely used.
- **Leaflet for the map, not MapLibre (for now).** Leaflet is simpler to learn and works fine with sample shapes. When the real flood maps arrive we may switch to MapLibre, because it draws *vector tiles* (pre-cut map pieces) on the graphics card, and that's the best way to keep huge flood files fast. Every map detail lives in `MapView.jsx`, so a swap would touch one file.
- **CARTO light basemap.** Free, no key needed. Its pale gray background makes the blue flood areas stand out. Its terms require the attribution line on the map to stay visible.
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
- [ ] NYC GeoSearch endpoint and response format
- [ ] api.weather.gov alerts-by-point endpoint and required User-Agent format

Until a link is verified, its button shows "Link coming soon" instead of guessing.

## Data sources (planned)

| Feature | Source | Replaces in `sampleData.js` |
|---|---|---|
| Flood zones per storm | NYC Stormwater Flood Maps (NYC Open Data / ArcGIS) | `getFloodZones`, `floodDepthAt` |
| Clogged-drain hotspots | 311 Service Requests (Socrata API) | `HOTSPOTS`, `REPORT_YEARS` |
| Sensor flood events | FloodNet (NYC Open Data + their GitHub) | the FloodNet part of `getBlockRisk` |
| Address search | NYC GeoSearch (Planning Labs) | `sampleGeocode` |
| Storm mode | National Weather Service, api.weather.gov | the "Storm demo" switch |
| Accounts, adoptions, photos, leaderboard | Supabase (free tier) | `SAMPLE_TEAMS`, browser storage |

**Keeping the flood map fast.** The flood map files are very large, so the plan is to download them once, simplify the shapes (fewer points, which looks the same at street zoom), and either cut them into vector tiles (PMTiles, one static file that can be hosted free) or ask the ArcGIS service for only the area on screen. We'll test both when we get there.

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
