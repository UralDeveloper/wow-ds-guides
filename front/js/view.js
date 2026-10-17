// Селекторы: производные данные из состояния
export const raid = (s) => s.content.raids[s.raidIdx];
export const boss = (s) => raid(s).bosses[s.bossIdx];
export const totalBosses = (s) => raid(s).bosses.length + raid(s).locked.length;
export const phases = (s) => s.content.phases;
export const phase = (s) => phases(s)[s.phase];
export const tactics = (s) => s.content.tactics[boss(s).tactics];
export const guide = (s) => s.content.guides[boss(s).guide];
export const planKey = (s) => s.raidIdx + ':' + s.bossIdx;

/** Стартовые метки фазы с учётом сдвигов пользователя */
export function presetMarks(s) {
  return phase(s).marks.map((m, i) => {
    const o = s.board.moved[s.phase + ':' + i];
    return { ...m, i, x: o ? o.x : m.x, y: o ? o.y : m.y };
  });
}

export function bossStatus(r, i) {
  if (i < r.killed) return { sub: 'Убит', killed: true };
  if (i === r.killed) return { sub: 'Текущий прогресс', killed: false };
  return { sub: 'Не начат', killed: false };
}
