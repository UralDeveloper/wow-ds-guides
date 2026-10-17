export const COLORS = { amber: '#F2B84B', ice: '#6FD3E3', red: '#FF6B5E', white: '#F2EEE4' };
export const COLOR_NAMES = { amber: 'Золотой', ice: 'Ледяной', red: 'Красный', white: 'Белый' };
export const ROLES = {
  tank: { letter: 'Т', name: 'Танки' },
  heal: { letter: 'Х', name: 'Хилы' },
  dd: { letter: 'Д', name: 'ДД' },
  stack: { letter: '★', name: 'Сбор' },
};
export const ROLE_NAMES = { all: 'Все', tank: 'Танк', heal: 'Хил', dd: 'ДД' };
export const SEV_CLS = { 'крит': 'crit', 'важно': 'warn', 'инфо': 'info' };
export const DIFFS = ['Обычный', 'Героический', 'Эпохальный'];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

// Координаты доски — 1000×600 «единиц», в разметке — проценты
export const X = (v) => (v / 10).toFixed(2) + '%';
export const Y = (v) => (v / 6).toFixed(2) + '%';

// Плавная кривая через точки (Catmull-Rom → кубические Безье)
export function smooth(pts) {
  if (!pts || pts.length < 2) return '';
  const f = (p) => p.x.toFixed(1) + ' ' + p.y.toFixed(1);
  let d = 'M' + f(pts[0]);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ' C' + f({ x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }) +
      ' ' + f({ x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }) + ' ' + f(p2);
  }
  return d;
}

export const polyline = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');

export function ago(t) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return m + ' мин назад';
  const h = Math.round(m / 60);
  return h < 24 ? h + ' ч назад' : Math.round(h / 24) + ' дн назад';
}
