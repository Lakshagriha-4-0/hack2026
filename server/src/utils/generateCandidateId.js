const generateCandidateId = (seed = '') => {
  const normalized = String(seed).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const suffix = (normalized.slice(-8) || Math.random().toString(36).slice(2, 10)).toUpperCase();
  return `CAND-${suffix}`;
};

module.exports = generateCandidateId;
