// language: JavaScript, file: js/ui.js
const UI = {
  escapeHtml(str) {
    return String(str)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  },
  debounce(fn, ms) {
    let t = null;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  },
  showToast(msg, isErr = false) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.toggle("err", isErr);
    el.classList.add("show");
    clearTimeout(UI._toastTimer);
    UI._toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
  },
  async copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return true; } catch {}
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.top = "-9999px"; ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select(); ta.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  },
  renderChipRow(elId, options, selectedSet, kind) {
    const el = document.getElementById(elId);
    if (!options.length) { el.innerHTML = ""; return; }
    el.innerHTML = options.map(opt => `
      <button class="chip ${selectedSet.has(opt) ? "active" : ""}"
              data-kind="${kind}" data-value="${UI.escapeHtml(opt)}">
        ${UI.escapeHtml(opt)}
      </button>
    `).join("");
  },
  renderSkeleton() {
    return Array.from({ length: 3 }).map(() => `
      <div class="skeleton">
        <div class="sk-line w40"></div>
        <div class="sk-line w70"></div>
        <div class="sk-line w90"></div>
        <div class="sk-line h44"></div>
      </div>
    `).join("");
  },
  renderServerCard(s) {
    return `
      <article class="server ${s.online ? "" : "offline"}">
        <div class="server-head">
          <span class="server-name">${UI.escapeHtml(s.name)}</span>
          <span class="status">
            <span class="dot ${s.online ? "online" : ""}"></span>
            ${s.online ? "онлайн" : "оффлайн"}
          </span>
        </div>
        <div class="meta">
          <span>Игроки: <b>${s.online ? s.players : 0}/${s.maxPlayers}</b></span>
          <span>Режим: <b>${UI.escapeHtml(s.mode)}</b></span>
          <span>Карта: <b>${UI.escapeHtml(s.map)}</b></span>
        </div>
        <div class="addr">${UI.escapeHtml(s.host)}:${s.port}</div>
        <button class="btn" data-host="${UI.escapeHtml(s.host)}" data-port="${s.port}"
                ${s.online ? "" : "disabled style='opacity:.5'"}>
          <svg viewBox="0 0 24 24"><path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/></svg>
          Присоединиться
        </button>
      </article>
    `;
  }
};
