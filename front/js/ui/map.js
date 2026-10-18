import { get, set } from '../store.js';
import * as V from '../view.js';
import { esc, X, Y, COLORS, smooth, polyline } from '../util.js';
import { onDown, onMove, onUp, onLeave, commitText, cancelText } from '../tools.js';

// Схема арены (условная, своя). В рабочей версии — картинка из WordPress по боссу.
const ARENA = `
<svg class="layer" viewBox="0 0 1000 600" preserveAspectRatio="none" role="img" aria-label="Схема арены: круглая платформа, северная платформа, водоёмы по краям">
  <defs><pattern id="gdots" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#1B2433"></circle></pattern></defs>
  <rect width="1000" height="600" fill="#0D121B"></rect>
  <rect width="1000" height="600" fill="url(#gdots)"></rect>
  <ellipse cx="130" cy="110" rx="120" ry="64" fill="#0F2C42" opacity=".7"></ellipse>
  <ellipse cx="150" cy="118" rx="70" ry="34" fill="#13405E" opacity=".45" class="glowc"></ellipse>
  <ellipse cx="880" cy="500" rx="130" ry="70" fill="#0F2C42" opacity=".7"></ellipse>
  <ellipse cx="860" cy="510" rx="80" ry="36" fill="#13405E" opacity=".45" class="glowc"></ellipse>
  <line x1="690" y1="215" x2="745" y2="172" stroke="#161E2B" stroke-width="34" stroke-linecap="round"></line>
  <line x1="690" y1="215" x2="745" y2="172" stroke="#273246" stroke-width="2" stroke-dasharray="6 8"></line>
  <circle cx="770" cy="150" r="62" fill="#141B27" stroke="#2A3448" stroke-width="2"></circle>
  <circle cx="770" cy="150" r="46" fill="none" stroke="#2A3448" stroke-dasharray="3 9"></circle>
  <circle cx="500" cy="300" r="252" fill="#121925" stroke="#2A3448" stroke-width="2"></circle>
  <g class="spin"><circle cx="500" cy="300" r="228" fill="none" stroke="#3A4A63" stroke-width="3" stroke-dasharray="2 16"></circle></g>
  <g class="spinr"><circle cx="500" cy="300" r="238" fill="none" stroke="#2C3850" stroke-width="1.5" stroke-dasharray="40 22"></circle></g>
  <circle cx="500" cy="300" r="190" fill="none" stroke="#1F2938" stroke-width="1.5"></circle>
  <circle cx="500" cy="300" r="120" fill="none" stroke="#1C2534" stroke-width="1.5"></circle>
  <g stroke="#1A2230" stroke-width="1.5">
    <line x1="500" y1="110" x2="500" y2="240"></line><line x1="500" y1="360" x2="500" y2="490"></line>
    <line x1="310" y1="300" x2="440" y2="300"></line><line x1="560" y1="300" x2="690" y2="300"></line>
    <line x1="366" y1="166" x2="458" y2="258"></line><line x1="542" y1="342" x2="634" y2="434"></line>
    <line x1="634" y1="166" x2="542" y2="258"></line><line x1="458" y1="342" x2="366" y2="434"></line>
  </g>
  <g fill="#1F2838" stroke="#3A4A63" stroke-width="1.5">
    <rect x="486" y="36" width="28" height="28" rx="6"></rect><rect x="486" y="536" width="28" height="28" rx="6"></rect>
    <rect x="236" y="286" width="28" height="28" rx="6"></rect><rect x="736" y="286" width="28" height="28" rx="6"></rect>
  </g>
  <circle cx="500" cy="300" r="52" fill="#FF6B5E" opacity=".25" class="glowc"></circle>
  <circle cx="500" cy="300" r="30" fill="#2A1716" stroke="#FF6B5E" stroke-width="2"></circle>
  <path d="M500 284 L512 300 L500 316 L488 300 Z" fill="#FF6B5E"></path>
  <text x="500" y="24" text-anchor="middle" fill="#55627A" font-size="13" font-family="Onest, sans-serif">С</text>
  <text x="770" y="236" text-anchor="middle" fill="#55627A" font-size="12" font-family="Onest, sans-serif">Северная платформа</text>
</svg>`;

const SVG_OPEN = '<svg class="layer" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">';
const LAYERS = ['preset', 'zones', 'marks', 'strokes', 'routes', 'points', 'fx', 'hint'];

let root = null;
let overlay = null;
let inputLayer = null;
let bgLayer = null;
let bgShown = undefined;

// Фон карты: картинка под всеми слоями. Близкие к 5:3 пропорции заполняют карту, остальные вписываются целиком.
function updateBackground(s) {
  const id = s.board.bg || null;
  if (id === bgShown) return;
  bgShown = id;
  const m = id ? s.maps.find((x) => x.id === id) : null;
  root.classList.toggle('has-bg', !!m);
  if (!m) { bgLayer.innerHTML = ''; return; }
  const ratio = m.w / m.h;
  const fit = ratio > 1.45 && ratio < 1.95 ? 'cover' : 'contain';
  bgLayer.innerHTML = `<img src="maps/${esc(m.id)}.webp" alt="${esc(m.name)}" style="object-fit:${fit}"><div class="map-dim"></div>`;
}
const els = {};
const cache = {};

export function mountMap(container) {
  container.innerHTML = `
    <div class="map" id="map">
      <div class="arena">${ARENA}</div>
      <div class="layer map-bg" data-bg></div>
      ${LAYERS.map((l) => `<div class="layer" data-layer="${l}"></div>`).join('')}
      <div class="legend">
        <span class="chip tank">Т — танк</span><span class="chip heal">Х — хил</span>
        <span class="chip dd">Д — ДД</span><span class="chip all" style="color:var(--stack-ink)">★ сбор</span>
      </div>
      <div class="overlay" aria-label="Карта для рисования"></div>
      <div class="layer" data-layer="input"></div>
    </div>`;
  root = container.querySelector('.map');
  overlay = root.querySelector('.overlay');
  inputLayer = root.querySelector('[data-layer="input"]');
  bgLayer = root.querySelector('[data-bg]');
  LAYERS.forEach((l) => { els[l] = root.querySelector(`[data-layer="${l}"]`); });

  overlay.addEventListener('pointerdown', (e) => onDown(e, overlay));
  overlay.addEventListener('pointermove', (e) => onMove(e, overlay));
  overlay.addEventListener('pointerup', () => onUp());
  overlay.addEventListener('pointercancel', () => onUp());
  overlay.addEventListener('pointerleave', () => onLeave());
}

function put(name, html) {
  if (cache[name] === html) return;
  cache[name] = html;
  els[name].innerHTML = html;
}

export function updateMap(s) {
  if (!root) return;
  root.classList.toggle('playing', s.playing);
  updateBackground(s);
  overlay.style.cursor = s.mode === 'viewer' || s.tool === 'ping' ? 'pointer'
    : s.tool === 'pointer' ? (s.drag ? 'grabbing' : 'grab') : 'crosshair';

  const ph = V.phase(s);
  const b = s.board;
  const drag = s.drag || {};

  // Готовый маршрут из справочника
  put('preset', `${SVG_OPEN}
    <defs><marker id="arr" viewBox="0 0 10 10" refX="3" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="var(--acc)"></path></marker></defs>
    <path d="${ph.route}" fill="none" stroke="var(--acc)" stroke-width="12" stroke-linecap="round" opacity=".14"></path>
    <path d="${ph.route}" fill="none" class="dash" stroke="var(--acc)" stroke-width="3.5" stroke-linecap="round" marker-end="url(#arr)"></path>
  </svg>`);

  // Опасные зоны и войдзоны
  const zones = ph.zones.map((z) => `<div class="zone" style="left:${X(z.x)};top:${Y(z.y)};width:${X(z.r * 2)};aspect-ratio:1/1"></div>`);
  const vz = b.vz.map((v, i) => `<div class="vz ${drag.t === 'vz' && drag.i === i ? 'drag' : ''}" style="left:${X(v.x)};top:${Y(v.y)};width:${X(v.r * 2)};aspect-ratio:1/1">${v.r >= 30 ? 'Войд' : ''}</div>`);
  if (s.zdraft) vz.push(`<div class="vz draft" style="left:${X(s.zdraft.x)};top:${Y(s.zdraft.y)};width:${X(s.zdraft.r * 2)};aspect-ratio:1/1"></div>`);
  put('zones', zones.join('') + vz.join(''));

  // Игроки: стартовые метки и поставленные группы
  const marks = V.presetMarks(s).map((m) =>
    `<div class="mk ${m.kind} ${drag.t === 'mark' && drag.i === m.i ? 'drag' : ''}" style="left:${X(m.x)};top:${Y(m.y)}"><span class="ripple"></span>${esc(m.label)}</div>`);
  const groups = b.groups.map((g, i) => (g.phase !== s.phase ? '' :
    `<div class="mk pop ${g.kind} ${drag.t === 'group' && drag.i === i ? 'drag' : ''}" style="left:${X(g.x)};top:${Y(g.y)}">${esc(g.label)}</div>`));
  put('marks', marks.join('') + groups.join(''));

  // Рисунки кистью
  const strokes = Object.keys(COLORS).map((c) => {
    const list = b.strokes.filter((st) => st.c === c);
    if (s.cur && s.cur.c === c) list.push(s.cur);
    const d = list.map((st) => polyline(st.pts)).join(' ');
    return d ? `<path d="${d}" fill="none" stroke="${COLORS[c]}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>` : '';
  }).join('');
  put('strokes', `${SVG_OPEN}${strokes}</svg>`);

  // Маршруты со стрелками
  const routes = b.routes.map((r, i) => {
    const c = COLORS[r.c] || COLORS.amber;
    const a = r.arrow || 'end';
    const id = 'r' + i;
    const d = smooth(r.pts);
    return `
      <defs>
        <marker id="${id}a" viewBox="0 0 10 10" refX="3" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${c}"></path></marker>
        <marker id="${id}m" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M2 1 L8 5 L2 9" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path></marker>
      </defs>
      <path d="${d}" fill="none" stroke="${c}" stroke-width="12" stroke-linecap="round" opacity=".16"></path>
      <path d="${d}" fill="none" class="dash" stroke="${c}" stroke-width="3.5" stroke-linecap="round"
        marker-start="${a === 'both' ? `url(#${id}a)` : 'none'}" marker-mid="${r.mid ? `url(#${id}m)` : 'none'}" marker-end="${a === 'none' ? 'none' : `url(#${id}a)`}"></path>`;
  }).join('');
  let draft = '';
  if (s.draft) {
    const pts = s.draft.pts.concat(s.hover ? [s.hover] : []);
    if (pts.length > 1) draft = `<path d="${smooth(pts)}" fill="none" stroke="${COLORS[s.color]}" stroke-width="3" stroke-dasharray="4 8" stroke-linecap="round" opacity=".85"></path>`;
  }
  put('routes', `${SVG_OPEN}${routes}${draft}</svg>`);

  // Точки маршрутов, пины, подписи. Точку не рисуем там, где стоит стрелка.
  const pts = [];
  b.routes.forEach((r, i) => {
    const a = r.arrow || 'end';
    r.pts.forEach((p, j) => {
      const last = j === r.pts.length - 1;
      if ((last && a !== 'none') || (j === 0 && a === 'both')) return;
      const dr = drag.t === 'wp' && drag.i === i && drag.j === j;
      pts.push(`<div class="wp ${j === 0 ? 'start' : ''} ${dr ? 'drag' : ''}" style="left:${X(p.x)};top:${Y(p.y)};background:${COLORS[r.c]}"></div>`);
    });
  });
  if (s.draft) s.draft.pts.forEach((p, j) => pts.push(`<div class="wp ${j === 0 ? 'start' : ''}" style="left:${X(p.x)};top:${Y(p.y)};background:${COLORS[s.color]}"></div>`));
  b.pins.forEach((p, i) => pts.push(`<div class="pin ${drag.t === 'pin' && drag.i === i ? 'drag' : ''}" style="left:${X(p.x)};top:${Y(p.y)};background:${COLORS[p.c]}"><span>${p.n}</span></div>`));
  b.labels.forEach((l, i) => {
    if (l.phase !== s.phase) return;
    pts.push(`<div class="lbl ${drag.t === 'label' && drag.i === i ? 'drag' : ''}" style="left:${X(l.x)};top:${Y(l.y)};color:${COLORS[l.c] || l.c}">${esc(l.text)}</div>`);
  });
  put('points', pts.join(''));

  // Эффекты: пинги и показ плана
  const fx = s.pings.map((g) => `
    <div class="ping" style="left:${X(g.x)};top:${Y(g.y)};color:${g.c}">
      <span class="pr"></span><span class="pr d2"></span><span class="pd"></span>
      <span class="pn" style="background:${g.c}">${esc(g.name)}</span>
    </div>`).join('');
  const playing = s.playing ? `
    ${SVG_OPEN}
      <circle r="9" fill="#F2EEE4" opacity=".9"><animateMotion dur="2.6s" repeatCount="indefinite" path="${ph.route}"></animateMotion></circle>
      <circle r="18" fill="none" stroke="#F2EEE4" stroke-width="2" opacity=".4"><animateMotion dur="2.6s" repeatCount="indefinite" path="${ph.route}"></animateMotion></circle>
    </svg>
    <div class="playbar"></div>` : '';
  put('fx', fx + playing);

  put('hint', hintText(s) ? `<div class="map-hint"><div>${hintText(s)}</div></div>` : '');

  updateTextInput(s);
}

function hintText(s) {
  if (s.playing || s.textDraft) return '';
  if (s.mode === 'viewer') return 'Клик по карте — пинг, его увидят все в голосовом канале';
  switch (s.tool) {
    case 'route': return s.draft ? 'Ставьте следующие точки. Клик по последней точке или «Готово» — завершить' : 'Кликните по карте, чтобы начать маршрут';
    case 'zone': return 'Зажмите и потяните — радиус войдзоны. Клик — зона стандартного размера';
    case 'text': return 'Кликните по карте и введите подпись. Enter — сохранить, Esc — отмена';
    case 'ping': return 'Клик — пинг, его увидят все в канале';
    default: return '';
  }
}

// Поле ввода подписи создаётся один раз на черновик, чтобы не терять фокус
let inputFor = null;
function updateTextInput(s) {
  const td = s.textDraft;
  if (!td) {
    if (inputFor) { inputLayer.innerHTML = ''; inputFor = null; }
    return;
  }
  const key = td.x + ':' + td.y;
  if (inputFor === key) return;
  inputFor = key;
  inputLayer.innerHTML = `<input class="tin" type="text" maxlength="40" placeholder="Например: стак после обвала" aria-label="Текст подписи" style="left:${X(td.x)};top:${Y(td.y)}">`;
  const input = inputLayer.querySelector('input');
  input.addEventListener('input', () => {
    const cur = get().textDraft;
    if (cur) set({ textDraft: { ...cur, val: input.value } }, { silent: true });
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitText(); }
    else if (e.key === 'Escape') { cancelText(); }
  });
  input.addEventListener('blur', () => commitText());
  setTimeout(() => input.focus(), 0);
}
