// language: JavaScript, file: js/cache.js
const Cache = {
  loadServers() {
    try {
      const raw = localStorage.getItem(CONFIG.LS_SERVERS);
      const ts  = Number(localStorage.getItem(CONFIG.LS_SERVERS_TS) || 0);
      if (!raw || !ts) return null;
      if (Date.now() - ts > CONFIG.CACHE_STALE_MS) return null;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return null;
      return { list, ts };
    } catch { return null; }
  },
  saveServers(list) {
    try {
      localStorage.setItem(CONFIG.LS_SERVERS, JSON.stringify(list));
      localStorage.setItem(CONFIG.LS_SERVERS_TS, String(Date.now()));
    } catch {}
  },
  loadFilters() {
    try {
      const raw = localStorage.getItem(CONFIG.LS_FILTERS);
      if (!raw) return null;
      const f = JSON.parse(raw);
      return {
        query: typeof f.query === "string" ? f.query : "",
        modes: Array.isArray(f.modes) ? f.modes : [],
        maps:  Array.isArray(f.maps)  ? f.maps  : [],
        sort:  ["online","players","name"].includes(f.sort) ? f.sort : "online"
      };
    } catch { return null; }
  },
  saveFilters({ query, modes, maps, sort }) {
    try {
      localStorage.setItem(CONFIG.LS_FILTERS, JSON.stringify({ query, modes, maps, sort }));
    } catch {}
  }
};
