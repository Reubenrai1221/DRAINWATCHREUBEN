import { useEffect, useRef, useState } from 'react';
import { GeoSearchUnavailable, autocomplete, searchAddress } from '../lib/geosearch';
import { isInNYC } from '../config/map';
import Icon from './Icon';

const MIN_CHARS = 3;
const DEBOUNCE_MS = 250;

const UNAVAILABLE_MESSAGE =
  "We couldn't reach NYC's address search. Check your internet connection and try again. (The claude.ai preview page blocks it; open the downloaded file instead.)";

// Address box with live NYC suggestions. It follows the ARIA "combobox"
// pattern: arrow keys move through suggestions, Enter picks one, Escape
// closes the list, and screen readers announce the highlighted option.
export default function AddressSearch({ initialValue = '', onSelect }) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState('idle'); // idle | searching | locating
  const [error, setError] = useState('');
  const skipNextFetch = useRef(Boolean(initialValue)); // don't re-suggest a saved address

  // Fetch suggestions shortly after the user stops typing.
  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return undefined;
    }
    const text = query.trim();
    if (text.length < MIN_CHARS) {
      setSuggestions([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const results = await autocomplete(text, controller.signal);
        setSuggestions(results.slice(0, 6));
        setActive(-1);
        setOpen(true);
        setError('');
      } catch (err) {
        if (err.name === 'AbortError') return;
        setSuggestions([]);
        if (err instanceof GeoSearchUnavailable) setError(UNAVAILABLE_MESSAGE);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function choose(result) {
    skipNextFetch.current = true;
    setQuery(result.label);
    setSuggestions([]);
    setOpen(false);
    setError('');
    onSelect(result);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (open && active >= 0) {
      choose(suggestions[active]);
      return;
    }
    const text = query.trim();
    if (!text) {
      setError('Type an NYC address first, like "120 Broadway, Manhattan".');
      return;
    }
    setStatus('searching');
    setError('');
    try {
      const result = await searchAddress(text);
      if (result) choose(result);
      else setError('No NYC address matched. Try adding the borough, like "Queens" or "Brooklyn".');
    } catch (err) {
      setError(err instanceof GeoSearchUnavailable ? UNAVAILABLE_MESSAGE : 'Something went wrong. Please try again.');
    } finally {
      setStatus('idle');
    }
  }

  function handleKeyDown(e) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Your browser can't share your location. Type an address instead.");
      return;
    }
    setError('');
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus('idle');
        const position = [pos.coords.latitude, pos.coords.longitude];
        if (!isInNYC(position)) {
          setError("You seem to be outside NYC. DrainWatch only covers the five boroughs, so type an NYC address instead.");
          return;
        }
        choose({ id: 'my-location', label: 'Your current location', position });
      },
      () => {
        setStatus('idle');
        setError("We couldn't get your location. Type an address instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const listOpen = open && suggestions.length > 0;

  return (
    <form className="search-form" onSubmit={handleSubmit} role="search">
      <label htmlFor="address">NYC address</label>
      <div className="search-row">
        <div className="combo">
          <input
            id="address"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={listOpen}
            aria-controls="address-options"
            aria-activedescendant={listOpen && active >= 0 ? `address-option-${active}` : undefined}
            autoComplete="off"
            placeholder="e.g. 120 Broadway, Manhattan"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onFocus={() => suggestions.length && setOpen(true)}
            aria-describedby={error ? 'address-error' : 'address-hint'}
            aria-invalid={error ? true : undefined}
          />
          {listOpen && (
            <ul id="address-options" role="listbox" className="suggestions" aria-label="Address suggestions">
              {suggestions.map((s, i) => (
                <li
                  key={s.id + i}
                  id={`address-option-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={i === active ? 'is-active' : undefined}
                  // mousedown fires before the input's blur closes the list
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(s);
                  }}
                >
                  <Icon name="pin" size={16} />
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="submit" className="btn btn-primary" disabled={status === 'searching'}>
          <Icon name="search" size={18} />
          <span>{status === 'searching' ? 'Searching…' : 'Search'}</span>
        </button>
      </div>
      <p id="address-hint" className="hint">
        Addresses come from NYC Planning's GeoSearch and cover all five boroughs.
      </p>
      <button type="button" className="btn btn-link" onClick={useMyLocation} disabled={status === 'locating'}>
        <Icon name="locate" size={18} />
        {status === 'locating' ? 'Finding you…' : 'Use my location'}
      </button>
      {error && (
        <p id="address-error" className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
