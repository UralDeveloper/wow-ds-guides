import { get, set } from './store.js';
import { commit } from './board.js';
import { send } from './sync.js';
import { addPing } from './pings.js';
import { presetMarks } from './view.js';
import { COLORS, ROLES, clamp, uid, dist2 } from './util.js';

// Инструменты карты. Все координаты — в единицах доски 1000×600.

export function pointFrom(e, el) {
  const r = el.getBoundingClientRect();
  return {
    x: clamp(((e.clientX - r.left) / r.width) * 1000, 0, 1000),
    y: clamp(((e.clientY - r.top) / r.height) * 600, 0, 600),
  };
}

/** Что под курсором (для перетаскивания указателем) */
function hit(p) {
  const s = get();
  const b = s.board;
  const ph = s.phase;

  for (let i = b.labels.length - 1; i >= 0; i--) {
    const l = b.labels[i];
    if (l.phase !== ph) continue;
    if (Math.abs(l.x - p.x) < l.text.length * 5 + 15 && Math.abs(l.y - p.y) < 20) return { t: 'label', i };
  }
  for (let i = b.pins.length - 1; i >= 0; i--) if (dist2(b.pins[i], p) < 900) return { t: 'pin', i };
  for (let i = b.routes.length - 1; i >= 0; i--) {
    const pts = b.routes[i].pts;
    for (let j = pts.length - 1; j >= 0; j--) if (dist2(pts[j], p) < 700) return { t: 'wp', i, j };
  }
  for (let i = b.groups.length - 1; i >= 0; i--) {
    if (b.groups[i].phase === ph && dist2(b.groups[i], p) < 900) return { t: 'group', i };
  }
  const marks = presetMarks(s);
  for (let i = marks.length - 1; i >= 0; i--) if (dist2(marks[i], p) < 900) return { t: 'mark', i };
  for (let i = b.vz.length - 1; i >= 0; i--) {
    const v = b.vz[i];
    if (dist2(v, p) < v.r * v.r) return { t: 'vz', i, ox: v.x - p.x, oy: v.y - p.y };
  }
  return null;
}

function capture(e, el) {
  try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
}

export function ping(p) {
  const s = get();
  const g = {
    id: uid(), x: p.x, y: p.y, name: s.user.name,
    c: s.mode === 'viewer' ? '#6FD3E3' : COLORS[s.color],
  };
  addPing(g);
  send('ping', g);
}

export function onDown(e, el) {
  const s = get();
  if (e.button !== undefined && e.button !== 0) return;
  const p = pointFrom(e, el);

  if (s.mode === 'viewer' || s.tool === 'ping') { ping(p); return; }

  switch (s.tool) {
    case 'pointer': {
      const h = hit(p);
      if (h) { capture(e, el); set({ drag: h }); }
      break;
    }
    case 'brush':
      capture(e, el);
      set({ cur: { c: s.color, pts: [p] } });
      break;
    case 'route': {
      const d = s.draft;
      if (d && d.pts.length >= 2 && dist2(d.pts[d.pts.length - 1], p) < 700) { finishRoute(); break; }
      set({ draft: { pts: (d ? d.pts : []).concat([p]) }, hover: null });
      break;
    }
    case 'mark':
      commit((b) => {
        b.pins.push({ id: uid(), x: p.x, y: p.y, c: s.color, n: b.pins.length + 1 });
        b.history.push({ k: 'pin' });
      });
      break;
    case 'roles':
      placeGroup(p);
      break;
    case 'zone':
      capture(e, el);
      set({ zdraft: { x: p.x, y: p.y, r: 0 } });
      break;
    case 'text':
      commitText();
      // после blur предыдущего поля
      setTimeout(() => set({ textDraft: { x: p.x, y: p.y, val: '' } }), 0);
      break;
    default:
      break;
  }
}

export function onMove(e, el) {
  const s = get();
  const d = s.drag;

  if (d) {
    const q = pointFrom(e, el);
    const x = clamp(q.x, 20, 980);
    const y = clamp(q.y, 18, 582);
    commit((b, st) => {
      if (d.t === 'mark') b.moved[st.phase + ':' + d.i] = { x, y };
      else if (d.t === 'pin') Object.assign(b.pins[d.i], { x, y });
      else if (d.t === 'label') Object.assign(b.labels[d.i], { x, y });
      else if (d.t === 'group') Object.assign(b.groups[d.i], { x, y });
      else if (d.t === 'wp') b.routes[d.i].pts[d.j] = { x, y };
      else if (d.t === 'vz') Object.assign(b.vz[d.i], { x: q.x + d.ox, y: q.y + d.oy });
    });
    return;
  }

  if (s.cur) {
    const p = pointFrom(e, el);
    const last = s.cur.pts[s.cur.pts.length - 1];
    if (Math.abs(p.x - last.x) + Math.abs(p.y - last.y) < 5) return;
    set({ cur: { c: s.cur.c, pts: s.cur.pts.concat([p]) } });
    return;
  }

  if (s.zdraft) {
    const p = pointFrom(e, el);
    set({ zdraft: { ...s.zdraft, r: Math.min(220, Math.sqrt(dist2(p, s.zdraft))) } });
    return;
  }

  if (s.tool === 'route' && s.draft && s.mode === 'rl') set({ hover: pointFrom(e, el) });
}

export function onUp() {
  const s = get();
  if (s.drag) { set({ drag: null }); return; }

  if (s.cur) {
    const cur = s.cur;
    set({ cur: null });
    if (cur.pts.length > 1) {
      commit((b) => { b.strokes.push(cur); b.history.push({ k: 'stroke' }); });
    }
    return;
  }

  if (s.zdraft) {
    const z = s.zdraft;
    set({ zdraft: null });
    commit((b) => {
      b.vz.push({ id: uid(), x: z.x, y: z.y, r: z.r < 12 ? 40 : z.r });
      b.history.push({ k: 'vz' });
    });
  }
}

export function onLeave() {
  const s = get();
  if (s.hover) set({ hover: null });
  onUp();
}

/* ---------- Группы по ролям ---------- */

function placeGroup(p) {
  const s = get();
  const kind = s.roleKind;
  const n = s.roleCount;
  const presetCount = presetMarks(s).filter((m) => m.kind === kind).length;
  commit((b) => {
    const base = presetCount + b.groups.filter((g) => g.kind === kind && g.phase === s.phase).length;
    const rad = n > 1 ? 24 + 5 * n : 0;
    for (let k = 0; k < n; k++) {
      const ang = -Math.PI / 2 + (2 * Math.PI * k) / n;
      b.groups.push({
        id: uid(), phase: s.phase, kind,
        x: clamp(p.x + rad * Math.cos(ang), 20, 980),
        y: clamp(p.y + rad * Math.sin(ang), 18, 582),
        label: kind === 'stack' ? '★' : ROLES[kind].letter + (base + k + 1),
      });
    }
    b.history.push({ k: 'group', n });
  });
}

/* ---------- Маршруты ---------- */

export function finishRoute() {
  const s = get();
  const d = s.draft;
  if (!d) return;
  set({ draft: null, hover: null });
  if (d.pts.length < 2) return;
  commit((b) => {
    b.routes.push({ id: uid(), c: s.color, pts: d.pts, arrow: s.arrowMode, mid: s.arrowMid });
    b.history.push({ k: 'route' });
  });
}

/** Настройка стрелок: применяется к рисуемому маршруту или к последнему готовому */
export function setArrow(patch) {
  const s = get();
  set(patch.arrow ? { arrowMode: patch.arrow } : { arrowMid: patch.mid });
  if (!s.draft && s.board.routes.length) {
    commit((b) => Object.assign(b.routes[b.routes.length - 1], patch));
  }
}

/* ---------- Подписи ---------- */

let lastDraft = null;

export function commitText() {
  const s = get();
  const td = s.textDraft;
  if (!td || td === lastDraft) return;
  lastDraft = td;
  set({ textDraft: null });
  const text = (td.val || '').trim().slice(0, 40);
  if (!text) return;
  commit((b) => {
    b.labels.push({ id: uid(), phase: s.phase, x: td.x, y: td.y, text, c: s.color });
    b.history.push({ k: 'label' });
  });
}

export function cancelText() {
  lastDraft = get().textDraft;
  set({ textDraft: null });
}

/** Смена инструмента завершает незаконченные действия */
export function selectTool(tool) {
  finishRoute();
  commitText();
  set({ tool });
}
