// language: JavaScript, file: js/api.js
async function fetchServers() {
  await new Promise(r => setTimeout(r, 400));
  return SERVERS_FIXTURE.map(s => ({ ...s }));
}
