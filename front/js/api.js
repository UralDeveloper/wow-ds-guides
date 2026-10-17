import { CONFIG } from './config.js';
import { uid } from './util.js';

// Единый интерфейс данных. В режиме mock — JSON-файл + localStorage,
// в режиме live — REST-эндпоинты плагина WordPress (см. README).

let token = null;
export function setToken(t) { token = t; }

async function wp(path, opts = {}) {
  const res = await fetch(CONFIG.wpBase + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error('API ' + res.status + ' ' + path);
  return res.status === 204 ? null : res.json();
}

/* ---------- Контент справочника ---------- */

export async function loadContent() {
  if (CONFIG.mode === 'live') return wp('/content');
  const res = await fetch(CONFIG.mockContentUrl);
  if (!res.ok) throw new Error('Не удалось загрузить ' + CONFIG.mockContentUrl);
  return res.json();
}

/* ---------- Планы ---------- */

const mineKey = (user) => 'wow-plans:' + user.id;
const GUILD_KEY = 'wow-plans:guild';

function readLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
}
function writeLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
}

function guildSeed() {
  return [{
    id: 'g-sample', key: '0:1', name: 'Прогресс-тактика гильдии', updated: Date.now() - 86400000,
    owner: { id: 'u2', name: 'Максим', initials: 'МК' },
    board: {
      strokes: [], pins: [], groups: [], moved: {},
      vz: [{ id: 'vz-s', x: 300, y: 190, r: 48 }],
      routes: [{ id: 'r-s', c: 'ice', pts: [{ x: 600, y: 430 }, { x: 740, y: 480 }, { x: 830, y: 410 }], arrow: 'end', mid: true }],
      labels: [{ id: 'l-s', phase: 0, x: 800, y: 396, text: 'Лужи сюда', c: 'ice' }],
      history: [{ k: 'vz' }, { k: 'route' }, { k: 'label' }],
    },
  }];
}

/** Планы для босса: { mine: [...], guild: [...] } */
export async function listPlans(key, user) {
  if (CONFIG.mode === 'live') return wp('/plans?boss=' + encodeURIComponent(key));
  let guild = readLS(GUILD_KEY, null);
  if (!guild) { guild = guildSeed(); writeLS(GUILD_KEY, guild); }
  return {
    mine: readLS(mineKey(user), []).filter((p) => p.key === key),
    guild: guild.filter((p) => p.key === key),
  };
}

export async function createPlan(user, { key, name, board }) {
  const plan = { id: uid(), key, name, board, updated: Date.now(), owner: user };
  if (CONFIG.mode === 'live') return wp('/plans', { method: 'POST', body: JSON.stringify(plan) });
  writeLS(mineKey(user), readLS(mineKey(user), []).concat([plan]));
  return plan;
}

export async function updatePlan(user, id, patch) {
  if (CONFIG.mode === 'live') return wp('/plans/' + id, { method: 'PUT', body: JSON.stringify(patch) });
  const list = readLS(mineKey(user), []).map((p) => (p.id === id ? { ...p, ...patch, updated: Date.now() } : p));
  writeLS(mineKey(user), list);
  return list.find((p) => p.id === id);
}

export async function deletePlan(user, id) {
  if (CONFIG.mode === 'live') return wp('/plans/' + id, { method: 'DELETE' });
  writeLS(mineKey(user), readLS(mineKey(user), []).filter((p) => p.id !== id));
  return null;
}

/** Опубликовать копию своего плана в гильдейскую библиотеку */
export async function sharePlan(user, plan) {
  if (CONFIG.mode === 'live') return wp('/plans/' + plan.id + '/share', { method: 'POST' });
  const guild = readLS(GUILD_KEY, guildSeed()).filter((p) => p.sourceId !== plan.id);
  const copy = { ...plan, id: uid(), sourceId: plan.id, owner: user, updated: Date.now() };
  writeLS(GUILD_KEY, guild.concat([copy]));
  return copy;
}
