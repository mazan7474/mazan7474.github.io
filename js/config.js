// language: JavaScript, file: js/config.js
// Константы и источник данных. Единственное место, которое меняется
// при переезде со фикстур на реальный API.

const CONFIG = {
  // ключи localStorage — с версией, чтобы ломающиеся изменения не отравили кэш
  LS_SERVERS:    "wh.servers.v1",
  LS_SERVERS_TS: "wh.servers.ts.v1",
  LS_FILTERS:    "wh.filters.v1",

  // 60 сек — «свежий» кэш, показываем без фонового обновления
  CACHE_MAX_AGE_MS: 60 * 1000,
  // сутки — старше этого кэш считаем протухшим насовсем
  CACHE_STALE_MS:   24 * 60 * 60 * 1000,

  // TODO: заменить на '/api/servers' после подъёма бэкенда
  API_URL: null
};

// Заглушка данных. Форма записи = контракт с TShock-плагином.
// {id, name, host, port, online, players, maxPlayers, mode, map}
const SERVERS_FIXTURE = [
  { id:"1", name:"Crimson Halls", host:"127.0.0.1",  port:7777,
    online:true,  players:3, maxPlayers:8,  mode:"Expert",  map:"Small / Crimson" },
  { id:"2", name:"Древний дуб",    host:"10.0.0.42",  port:7777,
    online:false, players:0, maxPlayers:16, mode:"Classic", map:"Medium / Corruption" },
  { id:"3", name:"Sky Fortress",   host:"192.168.1.7", port:7777,
    online:true,  players:7, maxPlayers:8,  mode:"Master",  map:"Large / Hallow" },
  { id:"4", name:"Jungle Crawl",   host:"192.168.1.99", port:7777,
    online:true,  players:1, maxPlayers:4,  mode:"Expert",  map:"Small / Jungle" },
  { id:"5", name:"Stone Deep",     host:"10.0.0.200",  port:7777,
    online:false, players:0, maxPlayers:12, mode:"Classic", map:"Medium / Crimson" }
];
