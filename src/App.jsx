import { useEffect, useRef, useState } from 'react';
import { DEFAULT_SCENARIO_ID } from './config/scenarios';
import { CURRENT_YEAR, DEFAULT_ZOOM, NYC_CENTER } from './config/map';
import { load, save } from './lib/storage';
import Header from './components/Header';
import StormBanner from './components/StormBanner';
import TabNav from './components/TabNav';
import MapView from './components/MapView';
import FloodPanel from './components/FloodPanel';
import BlockPanel from './components/BlockPanel';
import DrainsPanel from './components/DrainsPanel';
import AdoptPanel from './components/AdoptPanel';
import ReportDialog from './components/ReportDialog';
import { FloodPatternDefs } from './components/FloodPatterns';

// Photos only live in memory for this demo (they'd be too big for
// localStorage). Phase 5 uploads them to Supabase Storage instead.
function withoutPhotos(drains) {
  return drains.map((d) => ({ ...d, checkIns: d.checkIns.map((c) => ({ ...c, photoUrl: null })) }));
}

export default function App() {
  const [tab, setTab] = useState('flood');
  const [scenarioId, setScenarioId] = useState(DEFAULT_SCENARIO_ID);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [stormDemo, setStormDemo] = useState(false);
  const [lookup, setLookup] = useState(null);
  const [focus, setFocus] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [map, setMap] = useState(null);

  // Adopt-a-drain state (demo: saved in this browser only)
  const [user, setUser] = useState(() => load('dw-user', null));
  const [drains, setDrains] = useState(() => load('dw-drains', []));
  const [pinMode, setPinMode] = useState(false);
  const [draftPin, setDraftPin] = useState(null);

  useEffect(() => save('dw-user', user), [user]);
  useEffect(() => save('dw-drains', withoutPhotos(drains)), [drains]);

  const panelRef = useRef(null);
  function changeTab(next) {
    setTab(next);
    setPinMode(false);
    panelRef.current?.scrollTo({ top: 0 });
    // Hotspots are spread citywide, so zoom out to show all of them.
    if (next === 'drains') focusMap(NYC_CENTER, DEFAULT_ZOOM);
  }

  function focusMap(center, zoom = 16) {
    setFocus({ center, zoom });
  }

  function handleLookup(result) {
    setLookup(result);
    focusMap(result.position, 16);
  }

  function handleMapClick(position) {
    if (pinMode) {
      setDraftPin(position);
      setPinMode(false);
    }
  }

  function startPinAt(position) {
    changeTab('adopt');
    if (position) {
      setDraftPin(position);
      focusMap(position, 17);
    } else {
      setPinMode(true);
    }
  }

  function adopt(name) {
    setDrains((prev) => [
      { id: crypto.randomUUID(), name, position: draftPin, adoptedAt: Date.now(), checkIns: [] },
      ...prev,
    ]);
    setDraftPin(null);
  }

  function addCheckIn(drainId, { photoUrl, note }) {
    const checkIn = { id: crypto.randomUUID(), at: Date.now(), photoUrl, note, hidden: false };
    setDrains((prev) => prev.map((d) => (d.id === drainId ? { ...d, checkIns: [checkIn, ...d.checkIns] } : d)));
  }

  // "Report photo" hides it right away. Later this flags it for a moderator.
  function toggleHidden(drainId, checkInId) {
    setDrains((prev) =>
      prev.map((d) =>
        d.id === drainId
          ? { ...d, checkIns: d.checkIns.map((c) => (c.id === checkInId ? { ...c, hidden: !c.hidden } : c)) }
          : d,
      ),
    );
  }

  const openReport = () => setReportOpen(true);

  return (
    <div className="app">
      <FloodPatternDefs />
      <Header stormDemo={stormDemo} onToggleStorm={() => setStormDemo((v) => !v)} />
      {stormDemo && <StormBanner onDismiss={() => setStormDemo(false)} />}

      <div className="layout">
        <TabNav tab={tab} onChange={changeTab} onReport={openReport} />

        <main id="panel" className="panel" ref={panelRef} tabIndex={-1}>
          {tab === 'flood' && (
            <FloodPanel scenarioId={scenarioId} onScenarioChange={setScenarioId} onGoToBlock={() => changeTab('block')} />
          )}
          {tab === 'block' && (
            <BlockPanel
              lookup={lookup}
              onLookup={handleLookup}
              scenarioId={scenarioId}
              onAdoptHere={startPinAt}
              onReport={openReport}
            />
          )}
          {tab === 'drains' && <DrainsPanel year={year} onYearChange={setYear} onFocus={focusMap} onReport={openReport} />}
          {tab === 'adopt' && (
            <AdoptPanel
              user={user}
              onSignIn={setUser}
              onSignOut={() => setUser(null)}
              drains={drains}
              pinMode={pinMode}
              draftPin={draftPin}
              onStartPin={() => setPinMode(true)}
              onCancelPin={() => {
                setPinMode(false);
                setDraftPin(null);
              }}
              onPinAtCenter={() => {
                const c = map.getCenter();
                setDraftPin([c.lat, c.lng]);
                setPinMode(false);
              }}
              onAdopt={adopt}
              onRemoveDrain={(id) => setDrains((prev) => prev.filter((d) => d.id !== id))}
              onCheckIn={addCheckIn}
              onToggleHidden={toggleHidden}
              onFocus={focusMap}
              stormActive={stormDemo}
            />
          )}
        </main>

        <MapView
          tab={tab}
          scenarioId={scenarioId}
          year={year}
          lookup={lookup}
          drains={drains}
          draftPin={draftPin}
          pinMode={pinMode}
          focus={focus}
          onMapClick={handleMapClick}
          onReady={setMap}
        />
      </div>

      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}
