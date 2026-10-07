// localStorage can be missing or blocked (private windows, strict settings),
// so every read and write is wrapped. The app still works without it.
// In Phase 5 adoptions move to the database; this is only for the demo.

export function load(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable — keep going with in-memory state.
  }
}
