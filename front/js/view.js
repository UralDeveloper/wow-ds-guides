// Селекторы: производные данные из состояния
export const raid = (s) => s.content.raids[s.raidIdx];
export const boss = (s) => raid(s).bosses[s.bossIdx];
export const totalBosses = (s) => raid(s).bosses.length + (raid(s).locked || []).length;
// У демо-боссов свои фазы с маршрутом и таймлайном, у остальных — общие фазы со стартовой расстановкой
export const phases = (s) => (boss(s).demo ? s.content.phases : s.content.genericPhases);
export const phase = (s) => phases(s)[Math.min(s.phase, phases(s).length - 1)];
export const tactics = (s) => (boss(s).tactics ? s.content.tactics[boss(s).tactics] : null);
export const guide = (s) => (boss(s).guide ? s.content.guides[boss(s).guide] : null);
// Ключ планов по id, а не по позиции в списке: порядок рейдов может меняться
export const planKey = (s) => raid(s).id + ':' + boss(s).id;
export const hasProgress = (r) => typeof r.killed === 'number';

/**
 * Фон карты, который сейчас показан:
 * явный выбор в плане (board.bg) → первый слой карты босса → встроенная схема (null).
 * board.bg === 'none' — пользователь сам выбрал схему.
 */
export function activeMap(s) {
  const bg = s.board.bg;
  if (bg === 'none') return null;
  const find = (id) => s.maps.find((m) => m.id === id) || null;
  if (bg) return find(bg);
  const layer = (boss(s).layers || [])[0];
  return layer ? find(layer.map) : null;
}

/** Близкие к 5:3 картинки заполняют карту, остальные вписываются целиком */
export function fitFor(m) {
  const r = m.w / m.h;
  return r > 1.45 && r < 1.95 ? 'cover' : 'contain';
}

/** Сколько единиц доски (1000×600) в одном ярде для фона с калибровкой, иначе null */
export function unitsPerYard(m) {
  if (!m || !m.cal || !m.ow) return null;
  const { p1, p2, yards } = m.cal;
  const pxPerYard = Math.hypot(p2.x - p1.x, p2.y - p1.y) / yards;
  const k = fitFor(m) === 'cover' ? Math.max(1000 / m.ow, 600 / m.oh) : Math.min(1000 / m.ow, 600 / m.oh);
  return pxPerYard * k || null;
}

/** Стартовые метки фазы с учётом сдвигов пользователя */
export function presetMarks(s) {
  return phase(s).marks.map((m, i) => {
    const o = s.board.moved[s.phase + ':' + i];
    return { ...m, i, x: o ? o.x : m.x, y: o ? o.y : m.y };
  });
}

export function bossStatus(r, i) {
  if (!hasProgress(r)) return { sub: '', killed: false };
  if (i < r.killed) return { sub: 'Убит', killed: true };
  if (i === r.killed) return { sub: 'Текущий прогресс', killed: false };
  return { sub: 'Не начат', killed: false };
}

const plural = (n, one, few, many) => {
  const a = n % 10, b = n % 100;
  return n + ' ' + (a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many);
};
export const nMaps = (n) => plural(n, 'карта', 'карты', 'карт');
export const nBosses = (n) => plural(n, 'босс', 'босса', 'боссов');
