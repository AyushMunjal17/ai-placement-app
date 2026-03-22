const DEFAULT_TTL_MS = 60_000;
const DEFAULT_MAX_SIZE = 10_000;

// Simple in-memory TTL + LRU-ish cache.
// Map preserves insertion order; we refresh order on get.
const state = {
  maxSize: DEFAULT_MAX_SIZE,
  ttlMs: DEFAULT_TTL_MS,
  map: new Map(), // key -> { value, expiresAt }
};

function configureUserCache({ ttlMs, maxSize } = {}) {
  if (Number.isFinite(ttlMs) && ttlMs > 0) {
    state.ttlMs = ttlMs;
  }
  if (Number.isFinite(maxSize) && maxSize > 0) {
    state.maxSize = maxSize;
  }
}

function getCachedUser(userId) {
  const key = String(userId);
  const entry = state.map.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    state.map.delete(key);
    return null;
  }

  // Refresh LRU order.
  state.map.delete(key);
  state.map.set(key, entry);
  return entry.value;
}

function setCachedUser(userId, value) {
  const key = String(userId);
  const entry = { value, expiresAt: Date.now() + state.ttlMs };

  if (state.map.has(key)) {
    state.map.delete(key);
  }
  state.map.set(key, entry);

  while (state.map.size > state.maxSize) {
    const oldestKey = state.map.keys().next().value;
    state.map.delete(oldestKey);
  }
}

function clearUserCache() {
  state.map.clear();
}

module.exports = {
  configureUserCache,
  getCachedUser,
  setCachedUser,
  clearUserCache,
};
