const cache = new Map();

const get = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expireAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const set = (key, value, ttlMs = 30000) => {
  cache.set(key, { value, expireAt: Date.now() + ttlMs });
};

const clearByPrefix = (prefix) => {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
};

module.exports = { get, set, clearByPrefix };
