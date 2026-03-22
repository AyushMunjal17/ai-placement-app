const DEFAULT_TTL_MS = 60_000;
const DEFAULT_MAX_SIZE = 5_000;

const state = {
  maxSize: DEFAULT_MAX_SIZE,
  ttlMs: DEFAULT_TTL_MS,
  map: new Map(), // key -> { value, expiresAt }
};

function getCachedProblemMeta(problemId) {
  const key = String(problemId);
  const entry = state.map.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    state.map.delete(key);
    return null;
  }

  state.map.delete(key);
  state.map.set(key, entry);
  return entry.value;
}

function setCachedProblemMeta(problemId, value) {
  const key = String(problemId);
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

module.exports = {
  getCachedProblemMeta,
  setCachedProblemMeta,
};
