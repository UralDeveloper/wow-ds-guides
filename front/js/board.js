import { get, set } from './store.js';
import { sendBoard } from './sync.js';
import { planKey } from './view.js';

// Доска — всё, что пользователь нарисовал поверх схемы. Сохраняется в планах и синхронизируется.
export const emptyBoard = () => ({
  strokes: [], pins: [], routes: [], vz: [], groups: [], labels: [], moved: {}, history: [],
  bg: null, // id фона из maps/index.json; null — встроенная схема
});

/** Выбрать фон карты (null — схема). Сохраняется в плане и уходит участникам */
export function setBackground(id) {
  commit((b) => { b.bg = id || null; });
}

const LIST = { stroke: 'strokes', pin: 'pins', route: 'routes', vz: 'vz', label: 'labels' };

/** Изменить доску: fn получает копию, результат сохраняется и уходит участникам */
export function commit(fn) {
  const s = get();
  const b = structuredClone(s.board);
  fn(b, s);
  set({ board: b });
  sendBoard(planKey(s), b);
}

export function undo() {
  commit((b) => {
    const h = b.history.pop();
    if (!h) return;
    if (h.k === 'group') b.groups.splice(b.groups.length - h.n, h.n);
    else if (LIST[h.k]) b[LIST[h.k]].pop();
  });
}

/** Стереть рисунки, оставить расстановку групп и сдвинутые метки */
export function clearDrawings() {
  commit((b) => {
    b.strokes = []; b.pins = []; b.routes = []; b.vz = []; b.labels = [];
    b.history = b.history.filter((h) => h.k === 'group');
  });
}

export function resetBoard() {
  // Фон — это выбор карты, а не рисунок: сброс его не трогает
  commit((b) => Object.assign(b, emptyBoard(), { bg: b.bg }));
}
