import { CONFIG } from './config.js';

// Тестовые пользователи для режима mock. Каждая вкладка получает своего,
// чтобы синхронизацию можно было проверить в двух вкладках.
const MOCK_USERS = [
  { id: 'u1', name: 'Алекс', initials: 'АЛ' },
  { id: 'u2', name: 'Максим', initials: 'МК' },
  { id: 'u3', name: 'Таня', initials: 'ТР' },
  { id: 'u4', name: 'Света', initials: 'СВ' },
];

/**
 * Возвращает { user, room, guildId, accessToken }.
 * room — комната синхронизации: в Discord это instanceId запуска Activity.
 */
export async function authenticate() {
  if (CONFIG.mode === 'mock') return mockAuth();
  return discordAuth();
}

function mockAuth() {
  let user = MOCK_USERS.find((u) => u.id === CONFIG.mockUser);
  if (!user) {
    try {
      const saved = sessionStorage.getItem('wow-user');
      user = saved ? JSON.parse(saved) : null;
    } catch (e) { /* хранилище недоступно */ }
  }
  if (!user) {
    // Первая вкладка — Алекс, следующие — по кругу
    let n = 0;
    try { n = Number(localStorage.getItem('wow-user-counter') || 0); localStorage.setItem('wow-user-counter', String(n + 1)); } catch (e) { /* ignore */ }
    user = MOCK_USERS[n % MOCK_USERS.length];
  }
  try { sessionStorage.setItem('wow-user', JSON.stringify(user)); } catch (e) { /* ignore */ }
  return { user, room: CONFIG.mockRoom, guildId: 'mock-guild', accessToken: null };
}

/**
 * Авторизация через Discord Embedded App SDK.
 * SDK нужно положить в vendor/discord-sdk.js (собранный ESM-бандл @discord/embedded-app-sdk).
 * Сервер /api/token меняет code на access_token (client secret хранится только на сервере).
 */
async function discordAuth() {
  const { DiscordSDK } = await import('../vendor/discord-sdk.js');
  const sdk = new DiscordSDK(CONFIG.discordClientId);
  await sdk.ready();

  const { code } = await sdk.commands.authorize({
    client_id: CONFIG.discordClientId,
    response_type: 'code',
    state: '',
    prompt: 'none',
    scope: ['identify', 'guilds'],
  });

  const res = await fetch(CONFIG.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error('Не удалось получить токен Discord');
  const { access_token } = await res.json();

  const auth = await sdk.commands.authenticate({ access_token });
  const u = auth.user;
  const name = u.global_name || u.username;
  const user = { id: u.id, name, initials: initialsOf(name), avatar: u.avatar };

  return { user, room: sdk.instanceId, guildId: sdk.guildId, accessToken: access_token, sdk };
}

function initialsOf(name) {
  const parts = String(name).trim().split(/\s+/);
  const s = parts.length > 1 ? parts[0][0] + parts[1][0] : String(name).slice(0, 2);
  return s.toUpperCase();
}
