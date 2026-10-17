// Режим работы: mock — всё локально (заглушки, синхронизация вкладок через BroadcastChannel),
// live — WordPress REST + WebSocket + Discord SDK. Переключается параметром ?mode=live
const params = new URLSearchParams(location.search);

export const CONFIG = {
  mode: params.get('mode') === 'live' ? 'live' : 'mock',

  // Пути через прокси Discord (URL Mappings в Developer Portal):
  //   /wp  -> ваш WordPress,  /ws -> WebSocket-сервер,  /api -> сервер обмена токена
  wpBase: '/.proxy/wp/wp-json/wow/v1',
  wsUrl: (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/.proxy/ws',
  tokenEndpoint: '/.proxy/api/token',

  discordClientId: 'YOUR_DISCORD_CLIENT_ID',

  // Локальный контент для режима mock
  mockContentUrl: 'data/content.json',

  // Тестовый пользователь для mock: ?user=u2
  mockUser: params.get('user'),
};
