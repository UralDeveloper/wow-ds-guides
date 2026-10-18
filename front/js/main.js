import { init, get, set, subscribe } from './store.js';
import { authenticate } from './auth.js';
import * as api from './api.js';
import * as sync from './sync.js';
import * as plans from './plans.js';
import * as play from './play.js';
import { emptyBoard, undo, clearDrawings, resetBoard, setBackground } from './board.js';
import { handleMessage, broadcastView, broadcastBoard, announce } from './session.js';
import { selectTool, finishRoute, setArrow, commitText } from './tools.js';
import { toast } from './toast.js';
import { planKey } from './view.js';
import { esc, clamp } from './util.js';

import { renderHeader } from './ui/header.js';
import { renderSidebar } from './ui/sidebar.js';
import { renderPlansBar } from './ui/plansbar.js';
import { renderToolbar } from './ui/toolbar.js';
import { renderTimeline } from './ui/timeline.js';
import { renderPanel } from './ui/panel.js';
import { mountMap, updateMap } from './ui/map.js';
import { I } from './ui/icons.js';

const app = document.getElementById('app');

/* ---------- Запуск ---------- */

async function boot() {
  try {
    const [auth, content, maps] = await Promise.all([
      authenticate(),
      api.loadContent(),
      fetch('maps/index.json').then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]);
    api.setToken(auth.accessToken);

    init({
      user: auth.user, room: auth.room, guildId: auth.guildId,
      content, maps, bgOpen: false, bgQuery: '',
      conn: 'connecting', peers: {}, joinedAt: Date.now(),
      mode: 'rl',
      raidIdx: 0, bossIdx: 0, diff: 2, phase: 0, role: 'all',
      panel: 'tactics', openSec: 0, raidOpen: false,
      tool: 'pointer', color: 'amber', roleKind: 'tank', roleCount: 1, arrowMode: 'end', arrowMid: true,
      board: emptyBoard(),
      cur: null, draft: null, hover: null, zdraft: null, textDraft: null, drag: null,
      pings: [], playing: false, toast: null,
      plans: { mine: [], guild: [] }, activePlan: 'off', planOpen: false, newName: '',
    });

    layout();
    subscribe(render);
    render(get());

    sync.connect(auth.room, auth.user, handleMessage, (conn) => set({ conn }));
    announce();
  } catch (err) {
    console.error(err);
    app.innerHTML = `
      <div class="boot error">
        <div class="boot-logo" aria-hidden="true"></div>
        <div class="boot-text">Не удалось запустить справочник</div>
        <div class="muted" style="font-size:12px;max-width:420px;text-align:center">${esc(err.message)}</div>
        <button class="rk" onclick="location.reload()">Попробовать снова</button>
      </div>`;
  }
}

/* ---------- Разметка и отрисовка ---------- */

const slots = {};
const last = {};

function layout() {
  app.innerHTML = `
    <header class="hdr" data-slot="header"></header>
    <div class="body">
      <aside class="sidebar" data-slot="sidebar"></aside>
      <main class="main">
        <div data-slot="plans"></div>
        <div data-slot="toolbar"></div>
        <div data-map></div>
        <section data-slot="timeline"></section>
      </main>
      <aside class="panel" data-slot="panel" aria-label="Тактика босса"></aside>
    </div>
    <div data-slot="toast"></div>`;
  app.querySelectorAll('[data-slot]').forEach((el) => { slots[el.dataset.slot] = el; });
  mountMap(app.querySelector('[data-map]'));
}

const RENDERERS = {
  header: renderHeader,
  sidebar: renderSidebar,
  plans: renderPlansBar,
  toolbar: renderToolbar,
  timeline: renderTimeline,
  panel: renderPanel,
  toast: (s) => (s.toast ? `<div class="toast" role="status"><span style="color:#1D7A45;display:inline-flex">${I.check}</span>${esc(s.toast.text)}</div>` : ''),
};

let lastKey = null;

function render(s) {
  for (const [name, fn] of Object.entries(RENDERERS)) {
    const html = fn(s);
    if (last[name] === html) continue;
    last[name] = html;
    const el = slots[name];
    // сохраняем фокус в поле ввода при перерисовке
    const focused = el.contains(document.activeElement) ? document.activeElement.dataset.input : null;
    el.innerHTML = html;
    if (focused) {
      const input = el.querySelector(`[data-input="${focused}"]`);
      if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
    }
  }
  updateMap(s);

  // Смена босса — подгружаем его планы
  const key = planKey(s);
  if (key !== lastKey) {
    lastKey = key;
    if (s.mode === 'rl') plans.refresh();
  }
}

/* ---------- Действия ---------- */

function chooseBoss(patch) {
  play.stop();
  finishRoute();
  commitText();
  set({ ...patch, role: 'all', phase: 0, raidOpen: false, planOpen: false, plans: { mine: [], guild: [] } });
  plans.load(null);
  broadcastView();
}

const ACTIONS = {
  diff: (a) => { set({ diff: +a }); broadcastView(); },
  mode: (a) => {
    const s = get();
    if (s.mode === a) return;
    finishRoute(); commitText(); play.stop();
    set({ mode: a, tool: a === 'viewer' ? 'ping' : 'pointer', drag: null, raidOpen: false, planOpen: false });
    sync.send('mode', { mode: a });
    if (a === 'rl') { broadcastView(); broadcastBoard(); plans.refresh(); }
  },
  'raid-toggle': () => set({ raidOpen: !get().raidOpen, planOpen: false }),
  raid: (a) => chooseBoss({ raidIdx: +a, bossIdx: 0 }),
  boss: (a) => chooseBoss({ bossIdx: +a }),

  'plans-toggle': () => set({ planOpen: !get().planOpen, raidOpen: false }),
  plan: (id) => { const f = plans.findPlan(id); if (f) plans.load(f.plan); },
  'plan-official': () => plans.load(null),
  'plan-del': (id) => plans.remove(id),
  'plan-create': () => { finishRoute(); commitText(); plans.create(get().newName); },
  'plan-save': () => { finishRoute(); commitText(); plans.save(); },
  'plan-share': () => plans.share(),

  tool: (a) => selectTool(a),
  'bg-toggle': () => set({ bgOpen: !get().bgOpen }),
  bg: (a) => { setBackground(a || null); set({ bgOpen: false }); },
  layer: (a) => setBackground(a),
  color: (a) => set({ color: a }),
  undo: () => {
    const s = get();
    if (s.draft) { set({ draft: s.draft.pts.length > 1 ? { pts: s.draft.pts.slice(0, -1) } : null }); return; }
    undo();
  },
  clear: () => clearDrawings(),
  reset: () => { resetBoard(); toast('Расстановка сброшена'); },
  'route-done': () => finishRoute(),
  'role-kind': (a) => set({ roleKind: a }),
  'role-count': (a) => set({ roleCount: clamp(get().roleCount + Number(a), 1, 10) }),
  arrow: (a) => setArrow({ arrow: a }),
  'arrow-mid': () => setArrow({ mid: !get().arrowMid }),
  phase: (a) => { play.stop(); set({ phase: +a }); broadcastView(); },
  play: () => { finishRoute(); commitText(); play.toggle(); },

  role: (a) => set({ role: a }),
  panel: (a) => set({ panel: a }),
  section: (a) => set({ openSec: get().openSec === +a ? -1 : +a }),
  video: () => toast('Видео откроется во встроенном плеере'),
  'add-video': () => toast('Вставьте ссылку на YouTube или Twitch'),
  'send-plan': () => toast('План отправлен в канал рейда'),
  'ask-control': () => { sync.send('control:ask', {}); toast('Запрос на управление отправлен РЛ'); },
};

app.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (btn && !btn.disabled && ACTIONS[btn.dataset.act]) ACTIONS[btn.dataset.act](btn.dataset.arg);
  // клик вне выпадающих списков закрывает их
  if (!e.target.closest('[data-dropdown]')) {
    const s = get();
    if (s.raidOpen || s.planOpen) set({ raidOpen: false, planOpen: false });
  }
  // галерея фонов закрывается кликом по карте
  if (e.target.closest('.overlay') && get().bgOpen) set({ bgOpen: false });
});

app.addEventListener('input', (e) => {
  const key = e.target.dataset && e.target.dataset.input;
  if (key) set({ [key]: e.target.value }, { silent: key !== 'bgQuery' });
});

app.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.input === 'newName') {
    e.preventDefault();
    ACTIONS['plan-create']();
  }
  if (e.key === 'Escape') {
    const s = get();
    if (s.raidOpen || s.planOpen || s.bgOpen) set({ raidOpen: false, planOpen: false, bgOpen: false });
  }
});

boot();
