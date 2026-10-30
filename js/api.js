// language: JavaScript, file: js/api.js
// Только сетевое. Один публичный метод — fetchServers().

async function fetchServers() {
  // Когда появится бэкенд — раскомментировать блок ниже и удалить фикстуру.
  // if (CONFIG.API_URL) {
  //   const r = await fetch(CONFIG.API_URL, { cache: "no-store" });
  //   if (!r.ok) throw new Error("HTTP " + r.status);
  //   return await r.json();
  // }

  await new Promise(r => setTimeout(r, 400));   // имитация сети
  return SERVERS_FIXTURE.map(s => ({ ...s }));  // копия, чтобы кэш не мутировал фикстуру
}
