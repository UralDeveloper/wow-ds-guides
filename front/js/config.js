// mode: mock — тестовые пользователи и контент из data/content.json,
//       live — Discord SDK + WordPress (параметр ?mode=live).
// sync: broadcast — синхронизация вкладок одного браузера (локальная разработка),
//       ws — комнаты на Cloudflare (по умолчанию на любом опубликованном адресе).
const params = new URLSearchParams(location.search);
const host = location.hostname;
const isLocal = location.protocol === 'file:' || host === 'localhost' || host === '127.0.0.1';
const inDiscord = host.endsWith('.discordsays.com');

// Внутри Discord все запросы идут через прокси /.proxy (URL Mappings в Developer Portal)
const prefix = inDiscord ? '/.proxy' : '';

export const CONFIG = {
  mode: params.get('mode') === 'live' || inDiscord ? 'live' : 'mock',
  sync: params.get('sync') || (isLocal ? 'broadcast' : 'ws'),

  wsUrl: (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + prefix + '/ws',

  // WordPress: в Discord — через маппинг /wp, вне Discord — прямой адрес сайта
  wpBase: inDiscord ? prefix + '/wp/wp-json/wow/v1' : 'https://YOUR-WP-SITE/wp-json/wow/v1',
  tokenEndpoint: inDiscord ? prefix + '/wp/wp-json/wow/v1/token' : 'https://YOUR-WP-SITE/wp-json/wow/v1/token',

  discordClientId: 'YOUR_DISCORD_CLIENT_ID',

  mockContentUrl: 'data/content.json',
  mockUser: params.get('user'),
  // Комната для демо вне Discord: ?room=raid1 — все, кто открыл ссылку с тем же room, в одной комнате
  mockRoom: params.get('room') || 'demo',
};
