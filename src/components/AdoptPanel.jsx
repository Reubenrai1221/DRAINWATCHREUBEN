import { useEffect, useMemo, useRef, useState } from 'react';
import { LINKS } from '../config/links';
import { SAMPLE_TEAMS } from '../data/sampleData';
import { cleanPhoto } from '../lib/photo';
import ExternalLinkButton from './ExternalLinkButton';
import Icon from './Icon';

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

export default function AdoptPanel({
  user,
  onSignIn,
  onSignOut,
  drains,
  pinMode,
  draftPin,
  onStartPin,
  onCancelPin,
  onPinAtCenter,
  onAdopt,
  onRemoveDrain,
  onCheckIn,
  onToggleHidden,
  onFocus,
  stormActive,
}) {
  const checkIns = useMemo(
    () =>
      drains
        .flatMap((d) => d.checkIns.map((c) => ({ ...c, drainId: d.id, drainName: d.name })))
        .sort((a, b) => b.at - a.at),
    [drains],
  );

  return (
    <>
      <div className="panel-intro">
        <h2>Adopt a drain</h2>
        <p>Pick the storm drain on your corner, keep it clear before storms, and earn points for your block or school.</p>
      </div>

      <div className="card card-accent">
        <h3>Get a free cleanup kit</h3>
        <p>NYC DEP's Adopt-a-Catch Basin program gives volunteers free tools. Sign up there too. DrainWatch helps your block coordinate.</p>
        <ExternalLinkButton href={LINKS.depAdoptACatchBasin} variant="secondary">
          DEP Adopt-a-Catch Basin
        </ExternalLinkButton>
      </div>

      {!user ? (
        <SignInForm onSignIn={onSignIn} />
      ) : (
        <>
          <div className="signed-in">
            <p>
              Signed in as <strong>{user.name}</strong>
              <span className="cell-sub">{user.teamName}</span>
            </p>
            <button type="button" className="btn btn-link" onClick={onSignOut}>
              Sign out
            </button>
          </div>

          <PinSection
            pinMode={pinMode}
            draftPin={draftPin}
            onStartPin={onStartPin}
            onCancelPin={onCancelPin}
            onPinAtCenter={onPinAtCenter}
            onAdopt={onAdopt}
          />

          <section aria-labelledby="my-drains">
            <h3 id="my-drains" className="section-title">
              My drains <span className="count-pill">{drains.length}</span>
            </h3>
            {drains.length === 0 ? (
              <p className="empty-state">You haven't adopted a drain yet.</p>
            ) : (
              <ul className="drain-list">
                {drains.map((d) => (
                  <DrainCard
                    key={d.id}
                    drain={d}
                    onFocus={onFocus}
                    onRemove={onRemoveDrain}
                    onCheckIn={onCheckIn}
                    stormActive={stormActive}
                  />
                ))}
              </ul>
            )}
          </section>

          {checkIns.length > 0 && (
            <section aria-labelledby="recent-checkins">
              <h3 id="recent-checkins" className="section-title">
                Recent check-ins
              </h3>
              <ul className="feed">
                {checkIns.slice(0, 8).map((c) => (
                  <CheckInItem key={c.id} checkIn={c} onToggleHidden={onToggleHidden} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {/* key resets the Blocks/Schools toggle to match whoever signs in */}
      <Leaderboard key={user?.teamType ?? 'none'} user={user} myPoints={checkIns.length} />
    </>
  );
}

function SignInForm({ onSignIn }) {
  const [name, setName] = useState('');
  const [teamType, setTeamType] = useState('block');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !teamName.trim()) {
      setError('Please fill in your name and your block or school.');
      return;
    }
    onSignIn({ name: name.trim(), teamType, teamName: teamName.trim() });
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h3>Join your block or school</h3>
      <p className="hint">
        Demo sign-in. Real accounts come in Phase 5. For now your info stays in this browser only.
      </p>
      <label htmlFor="display-name">Display name</label>
      <input id="display-name" type="text" autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} />

      <fieldset className="segmented">
        <legend>I'm volunteering with my</legend>
        {[
          ['block', 'Block'],
          ['school', 'School'],
        ].map(([value, label]) => (
          <label key={value}>
            <input type="radio" name="team-type" value={value} checked={teamType === value} onChange={() => setTeamType(value)} />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>

      <label htmlFor="team-name">{teamType === 'block' ? 'Block association or street' : 'School or club'}</label>
      <input
        id="team-name"
        type="text"
        list="team-options"
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
      />
      <datalist id="team-options">
        {SAMPLE_TEAMS[teamType].map((t) => (
          <option key={t.name} value={t.name} />
        ))}
      </datalist>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-block">
        Continue
      </button>
    </form>
  );
}

function PinSection({ pinMode, draftPin, onStartPin, onCancelPin, onPinAtCenter, onAdopt }) {
  const [name, setName] = useState('');

  if (draftPin) {
    return (
      <form
        className="card form"
        onSubmit={(e) => {
          e.preventDefault();
          onAdopt(name.trim() || 'My corner drain');
          setName('');
        }}
      >
        <h3>Name this drain</h3>
        <p className="hint">Something neighbors will recognize, like "NE corner of Oak & 5th".</p>
        <label htmlFor="drain-name" className="sr-only">
          Drain name
        </label>
        <input id="drain-name" type="text" placeholder="My corner drain" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <div className="button-row">
          <button type="submit" className="btn btn-primary">
            <Icon name="check" size={18} /> Adopt this drain
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancelPin}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  if (pinMode) {
    return (
      <div className="card card-pinning" role="status">
        <h3>
          <Icon name="pin" size={20} /> Tap the map where your drain is
        </h3>
        <p className="hint">Zoom in close so the pin lands on the right corner.</p>
        <div className="button-row">
          <button type="button" className="btn btn-secondary" onClick={onPinAtCenter}>
            Use center of map
          </button>
          <button type="button" className="btn btn-link" onClick={onCancelPin}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button type="button" className="btn btn-primary btn-block" onClick={onStartPin}>
      <Icon name="pin" size={18} /> Pin a drain to adopt
    </button>
  );
}

function DrainCard({ drain, onFocus, onRemove, onCheckIn, stormActive }) {
  const [checkingIn, setCheckingIn] = useState(false);
  const last = drain.checkIns[0];

  return (
    <li className="card drain-card">
      <div className="drain-head">
        <span className="drain-icon" aria-hidden="true">
          <Icon name="drop" size={18} />
        </span>
        <div>
          <h4>{drain.name}</h4>
          <p className="cell-sub">
            {last ? `Last cleared ${dateFmt.format(last.at)}` : 'Not cleared yet'} · {drain.checkIns.length} check-in
            {drain.checkIns.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {checkingIn ? (
        <CheckInForm
          stormActive={stormActive}
          onCancel={() => setCheckingIn(false)}
          onSubmit={(checkIn) => {
            onCheckIn(drain.id, checkIn);
            setCheckingIn(false);
          }}
        />
      ) : (
        <div className="button-row">
          <button type="button" className="btn btn-primary btn-small" onClick={() => setCheckingIn(true)}>
            <Icon name="check" size={16} /> Check in as cleared
          </button>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => onFocus(drain.position, 17)}>
            Show on map
          </button>
          <button
            type="button"
            className="btn btn-link btn-small"
            onClick={() => {
              if (window.confirm(`Stop adopting "${drain.name}"?`)) onRemove(drain.id);
            }}
          >
            Remove
          </button>
        </div>
      )}
    </li>
  );
}

function CheckInForm({ onSubmit, onCancel, stormActive }) {
  const [photo, setPhoto] = useState(null); // { url, size }
  const [note, setNote] = useState('');
  const [safe, setSafe] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Free the preview image if it's replaced or the form closes unsaved.
  const savedUrl = useRef(null);
  useEffect(() => () => photo && photo.url !== savedUrl.current && URL.revokeObjectURL(photo.url), [photo]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const blob = await cleanPhoto(file);
      setPhoto({ url: URL.createObjectURL(blob), size: blob.size });
    } catch (err) {
      setError(err.message);
      e.target.value = '';
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!safe) {
      setError('Please confirm you cleared the drain safely.');
      return;
    }
    savedUrl.current = photo?.url ?? null;
    onSubmit({ photoUrl: photo?.url ?? null, note: note.trim() });
  }

  return (
    <form className="checkin-form" onSubmit={handleSubmit}>
      {stormActive && (
        <p className="callout callout-warn">
          <Icon name="warning" size={18} />
          <span>A flood warning is active. Don't go out to clear drains during heavy rain or flooding.</span>
        </p>
      )}

      <label htmlFor="checkin-photo" className="file-label">
        <Icon name="camera" size={18} /> {photo ? 'Change photo' : 'Add a photo (optional)'}
      </label>
      <input id="checkin-photo" className="file-input" type="file" accept="image/*" onChange={handleFile} />
      <p className="hint">Max 10 MB. We remove location data from photos. Don't include people's faces.</p>
      {busy && <p className="hint">Processing photo…</p>}
      {photo && (
        <figure className="photo-preview">
          <img src={photo.url} alt="Preview of your cleared drain" />
          <figcaption>Location data removed · {(photo.size / 1024).toFixed(0)} KB</figcaption>
        </figure>
      )}

      <label htmlFor="checkin-note">Note (optional)</label>
      <input id="checkin-note" type="text" maxLength={140} placeholder="e.g. Cleared leaves and a bag" value={note} onChange={(e) => setNote(e.target.value)} />

      <label className="checkbox">
        <input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} />
        <span>I cleared this drain safely, from the curb, not in floodwater.</span>
      </label>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="button-row">
        <button type="submit" className="btn btn-primary btn-small" disabled={busy}>
          Save check-in
        </button>
        <button type="button" className="btn btn-link btn-small" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function CheckInItem({ checkIn, onToggleHidden }) {
  return (
    <li className="feed-item">
      {checkIn.photoUrl && !checkIn.hidden && <img src={checkIn.photoUrl} alt={`Cleared drain: ${checkIn.drainName}`} />}
      {checkIn.hidden && <div className="photo-hidden">Photo hidden while a moderator reviews it</div>}
      <div className="feed-body">
        <p>
          <strong>{checkIn.drainName}</strong> cleared {dateFmt.format(checkIn.at)}
        </p>
        {checkIn.note && <p className="cell-sub">"{checkIn.note}"</p>}
        {checkIn.photoUrl && (
          <button type="button" className="btn btn-link btn-small" onClick={() => onToggleHidden(checkIn.drainId, checkIn.id)}>
            <Icon name="flag" size={14} /> {checkIn.hidden ? 'Undo report' : 'Report photo'}
          </button>
        )}
      </div>
    </li>
  );
}

function Leaderboard({ user, myPoints }) {
  const [type, setType] = useState(user?.teamType ?? 'block');

  const rows = useMemo(() => {
    const teams = SAMPLE_TEAMS[type].map((t) => ({ ...t }));
    if (user && user.teamType === type) {
      const mine = teams.find((t) => t.name.toLowerCase() === user.teamName.toLowerCase());
      if (mine) {
        mine.points += myPoints;
        mine.isMine = true;
      } else {
        teams.push({ name: user.teamName, points: myPoints, isMine: true });
      }
    }
    return teams.sort((a, b) => b.points - a.points);
  }, [type, user, myPoints]);

  return (
    <section className="card" aria-labelledby="leaderboard-title">
      <h3 id="leaderboard-title">
        <Icon name="trophy" size={20} /> Leaderboard <span className="tag tag-sample">Sample data</span>
      </h3>
      <fieldset className="segmented">
        <legend className="sr-only">Show leaderboard for</legend>
        {[
          ['block', 'Blocks'],
          ['school', 'Schools'],
        ].map(([value, label]) => (
          <label key={value}>
            <input type="radio" name="board-type" value={value} checked={type === value} onChange={() => setType(value)} />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <ol className="leaderboard">
        {rows.map((t, i) => (
          <li key={t.name} className={t.isMine ? 'is-mine' : undefined}>
            <span className="lb-rank" aria-hidden="true">
              {i + 1}
            </span>
            <span className="lb-name">
              {t.name}
              {t.isMine && <span className="tag tag-mine">Your team</span>}
            </span>
            <span className="lb-points">
              {t.points} <span className="cell-sub">check-ins</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
