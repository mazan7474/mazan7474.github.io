// language: JavaScript, file: js/app.js
const state = {
  servers: [], loading: true, error: null,
  query: "", modes: new Set(), maps: new Set(),
  sort: "online", loadedAt: 0
};

function collectOptions(list) {
  const modes = new Set(), maps = new Set();
  for (const s of list) { if (s.mode) modes.add(s.mode); if (s.map) maps.add(s.map); }
  for (const m of state.modes) modes.add(m);
  for (const m of state.maps)  maps.add(m);
  return { modes: [...modes].sort(), maps: [...maps].sort() };
}

function applyFilters() {
  const q = state.query.trim().toLowerCase();
  let list = state.servers.slice();
  if (q) {
    list = list.filter(s =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.host && s.host.toLowerCase().includes(q)) ||
      (s.mode && s.mode.toLowerCase().includes(q)) ||
      (s.map  && s.map.toLowerCase().includes(q))
    );
  }
  if (state.modes.size) list = list.filter(s => state.modes.has(s.mode));
  if (state.maps.size)  list = list.filter(s => state.maps.has(s.map));
  switch (state.sort) {
    case "players":
      list.sort((a,b) => (b.online?b.players:0)-(a.online?a.players:0) || a.name.localeCompare(b.name,"ru")); break;
    case "name":
      list.sort((a,b) => a.name.localeCompare(b.name,"ru")); break;
    default:
      list.sort((a,b) => (Number(b.online)-Number(a.online)) ||
                         ((b.online?b.players:0)-(a.online?a.players:0)) ||
                         a.name.localeCompare(b.name,"ru"));
  }
  return list;
}

function renderControls() {
  const inp = document.getElementById("search");
  const wrap = document.getElementById("searchWrap");
  inp.value = state.query;
  wrap.classList.toggle("has-value", state.query.length > 0);
  const { modes, maps } = collectOptions(state.servers);
  UI.renderChipRow("modeChips", modes, state.modes, "mode");
  UI.renderChipRow("mapChips",  maps,  state.maps,  "map");
  document.querySelectorAll("#sortRow .seg").forEach(b => {
    b.classList.toggle("active", b.dataset.sort === state.sort);
  });
}

function renderList() {
  const root = document.getElementById("list");
  if (state.loading && !state.servers.length) { root.innerHTML = UI.renderSkeleton(); return; }
  if (state.error && !state.servers.length) {
    root.innerHTML = `<div class="empty">Не удалось загрузить список.<br>${UI.escapeHtml(state.error)}<br><button class="btn-reset" onclick="location.reload()">Обновить</button></div>`;
    return;
  }
  const filtered = applyFilters();
  if (!filtered.length) {
    const hasFilters = state.query || state.modes.size || state.maps.size;
    root.innerHTML = `<div class="empty">${hasFilters ? "Ничего не подходит под фильтры." : "Пока нет активных миров.<br>Загляни позже."}${hasFilters ? `<br><button class="btn-reset" id="resetFilters">Сбросить фильтры</button>` : ""}</div>`;
    const reset = document.getElementById("resetFilters");
    if (reset) reset.addEventListener("click", () => {
      state.query = ""; state.modes.clear(); state.maps.clear(); state.sort = "online";
      persistFilters(); renderControls(); renderList();
    });
    return;
  }
  root.innerHTML = filtered.map(UI.renderServerCard).join("");
  root.querySelectorAll(".btn[data-host]").forEach(btn => {
    if (btn.disabled) return;
    btn.addEventListener("click", async () => {
      const addr = `${btn.dataset.host}:${btn.dataset.port}`;
      const ok = await UI.copyText(addr);
      if (ok) {
        btn.classList.add("copied");
        const orig = btn.innerHTML;
        btn.textContent = "Скопировано ✓";
        UI.showToast(`Скопировано: ${addr}`);
        setTimeout(() => { btn.classList.remove("copied"); btn.innerHTML = orig; }, 1800);
      } else {
        UI.showToast("Не удалось скопировать. Вручную: " + addr, true);
      }
    });
  });
}

function persistFilters() {
  Cache.saveFilters({ query: state.query, modes: [...state.modes], maps: [...state.maps], sort: state.sort });
}

async function refresh() {
  state.loading = true; state.error = null;
  renderList();
  try {
    const list = await fetchServers();
    state.servers = list; state.loadedAt = Date.now(); state.loading = false;
    Cache.saveServers(list);
    renderControls(); renderList();
  } catch (e) {
    state.loading = false; state.error = String(e.message || e); renderList();
  }
}

function bindEvents() {
  const inp  = document.getElementById("search");
  const wrap = document.getElementById("searchWrap");
  const onInput = UI.debounce(() => {
    state.query = inp.value;
    wrap.classList.toggle("has-value", state.query.length > 0);
    persistFilters(); renderList();
  }, 120);
  inp.addEventListener("input", onInput);
  document.getElementById("searchClear").addEventListener("click", () => {
    inp.value = ""; state.query = ""; wrap.classList.remove("has-value");
    persistFilters(); renderList(); inp.focus();
  });
  for (const [elId, kind] of [["modeChips","mode"],["mapChips","map"]]) {
    document.getElementById(elId).addEventListener("click", (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      const val = b.dataset.value;
      const set = kind === "mode" ? state.modes : state.maps;
      if (set.has(val)) set.delete(val); else set.add(val);
      persistFilters(); renderControls(); renderList();
    });
  }
  document.getElementById("sortRow").addEventListener("click", (e) => {
    const b = e.target.closest(".seg"); if (!b) return;
    state.sort = b.dataset.sort; persistFilters(); renderControls(); renderList();
  });
  const offbar = document.getElementById("offline");
  const syncOffline = () => offbar.classList.toggle("show", !navigator.onLine);
  window.addEventListener("online",  () => { syncOffline(); refresh(); });
  window.addEventListener("offline", syncOffline);
  syncOffline();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (Date.now() - state.loadedAt > CONFIG.CACHE_MAX_AGE_MS) refresh();
  });
}

function boot() {
  const saved = Cache.loadFilters();
  if (saved) {
    state.query = saved.query; state.modes = new Set(saved.modes);
    state.maps = new Set(saved.maps); state.sort = saved.sort;
  }
  bindEvents();
  const cached = Cache.loadServers();
  if (cached) {
    state.servers = cached.list; state.loadedAt = cached.ts; state.loading = false;
    renderControls(); renderList();
    if (Date.now() - cached.ts > CONFIG.CACHE_MAX_AGE_MS) refresh();
  } else {
    renderControls(); refresh();
  }
}

boot();
