const shortTime = () => new Date().toISOString().slice(11, 19);

const fmtMeta = (meta) => {
  if (!meta || Object.keys(meta).length === 0) return "";
  return ` ${Object.entries(meta)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ")}`;
};

const out = (tag, msg, meta = {}) => {
  console.log(`[${shortTime()}] ${tag} ${msg}${fmtMeta(meta)}`);
};

const inf = (msg, meta) => out("INF", msg, meta);
const wrn = (msg, meta) => out("WRN", msg, meta);
const req = (method, url, status) => out("REQ", `${method} ${url}`, { st: status });
const err = (msg, error, meta = {}) => {
  const details = error?.message ? { e: error.message, ...meta } : meta;
  out("ERR", msg, details);
};

module.exports = { inf, wrn, req, err };
