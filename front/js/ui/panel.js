import { esc, ROLE_NAMES, SEV_CLS } from '../util.js';
import * as V from '../view.js';
import { I } from './icons.js';

export function renderPanel(s) {
  const b = V.boss(s);
  const t = V.tactics(s);
  const g = V.guide(s);

  const r = V.raid(s);
  const tags = t ? t.tags : [r.season, r.ptr ? 'PTR' : '', b.layers.length ? V.nMaps(b.layers.length) : ''].filter(Boolean);
  const head = `
    <div class="boss-card rise">
      <div class="eyebrow">${esc(r.name)} · босс ${s.bossIdx + 1} из ${V.totalBosses(s)}</div>
      <h1>${esc(b.name)}</h1>
      ${t ? `<p>${esc(t.summary)}</p>` : ''}
      <div class="chips">${tags.map((x) => `<span class="chip all">${esc(x)}</span>`).join('')}</div>
    </div>
    <div class="tabs" role="tablist" aria-label="Раздел">
      <button class="seg ${s.panel === 'tactics' ? 'on' : ''}" data-act="panel" data-arg="tactics" role="tab" aria-selected="${s.panel === 'tactics'}">Тактика</button>
      <button class="seg ${s.panel === 'guide' ? 'on' : ''}" data-act="panel" data-arg="guide" role="tab" aria-selected="${s.panel === 'guide'}">Гайд <span class="cnt">${g ? g.videos.length + g.sections.length : 0}</span></button>
    </div>`;

  const body = s.panel === 'guide'
    ? (g ? guideView(s, b, g) : emptyGuide(s))
    : (t ? tacticsView(s, t) : emptyTactics(b));
  return head + body + actions();
}

function emptyTactics(b) {
  return `
    <div class="empty-card rise">
      <div class="empty-title">Тактика пока не написана</div>
      <p>Разметьте бой на карте: группы по ролям, маршруты, войдзоны и подписи. Сохраните как план и поделитесь с гильдией.</p>
      ${b.trash.length ? `
        <div class="eyebrow" style="margin:12px 0 6px">Существа в бою</div>
        <div class="chips">${b.trash.map((x) => `<span class="chip all">${esc(x)}</span>`).join('')}</div>` : ''}
    </div>`;
}

function emptyGuide(s) {
  return `
    <div class="empty-card rise">
      <div class="empty-title">Гайд пока не добавлен</div>
      <p>Сюда попадут видео и текстовый разбор боя из справочника.</p>
      ${s.mode === 'rl' ? '<button class="rk" data-act="add-video" style="margin-top:10px">+ Видео</button>' : ''}
    </div>`;
}

function tacticsView(s, t) {
  const count = (r) => (r === 'all' ? t.mechs.length : t.mechs.filter((m) => m.role === r || m.role === 'all').length);
  const list = t.mechs.filter((m) => s.role === 'all' || m.role === s.role || m.role === 'all');
  return `
    <div class="rtabs" role="tablist" aria-label="Роль">
      ${['all', 'tank', 'heal', 'dd'].map((r) => `
        <button class="tab ${s.role === r ? 'on' : ''}" data-act="role" data-arg="${r}" role="tab">${ROLE_NAMES[r]} <span class="cnt">${count(r)}</span></button>`).join('')}
    </div>
    <div class="mechs">
      ${list.map((m, i) => `
        <article class="mech" style="animation-delay:${i * 70}ms">
          <div class="mech-head"><span class="mech-name">${esc(m.name)}</span><span class="sev ${SEV_CLS[m.sev] || 'info'}">${esc(m.sev)}</span></div>
          <p>${esc(m.text)}</p>
          <div class="mech-foot"><span class="chip ${m.role}">${ROLE_NAMES[m.role]}</span><span class="mono muted" style="font-size:11px">${esc(m.timer)}</span></div>
        </article>`).join('')}
    </div>`;
}

function guideView(s, b, g) {
  const title = (v) => v.title.replace('{boss}', b.name);
  return `
    <div class="guide">
      ${g.videos.map((v, i) => `
        <button class="vcard" style="animation-delay:${i * 80}ms" data-act="video" data-arg="${i}" aria-label="Смотреть видео: ${esc(title(v))}">
          <span class="vthumb">
            <svg viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <rect width="320" height="150" fill="#0D121B"></rect>
              <circle cx="160" cy="75" r="62" fill="#121925" stroke="#2A3448" stroke-width="1.5"></circle>
              <circle cx="160" cy="75" r="46" fill="none" stroke="#3A4A63" stroke-dasharray="2 8"></circle>
              <circle cx="160" cy="75" r="9" fill="#FF6B5E" opacity=".8"></circle>
              <path d="${esc(v.path)}" fill="none" stroke="#E8B04B" stroke-width="2.5" stroke-dasharray="6 6" stroke-linecap="round"></path>
            </svg>
            <span class="vplay">${I.playBig}</span>
            <span class="vdur">${esc(v.dur)}</span>
            <span class="vkind">${esc(v.kind)}</span>
          </span>
          <span class="vinfo"><span class="vtitle">${esc(title(v))}</span><span class="vmeta">${esc(v.meta)}</span></span>
        </button>`).join('')}
      <div class="gsecs">
        ${g.sections.map((sec, i) => {
          const open = s.openSec === i;
          return `
            <div class="gsec ${open ? 'open' : ''}">
              <button class="ghead" data-act="section" data-arg="${i}" aria-expanded="${open}">
                <span class="gnum">${i + 1}</span><span style="flex:1 1 auto">${esc(sec.h)}</span><span class="chev">${I.chev}</span>
              </button>
              ${open ? `<div class="gbody"><p>${esc(sec.p)}</p>${sec.tips.map((tip) => `<div class="gtip">${esc(tip)}</div>`).join('')}</div>` : ''}
            </div>`;
        }).join('')}
      </div>
      <div class="guide-foot">
        <span>Автор: ${esc(g.author)} · обновлено ${esc(g.updated)}</span>
        ${s.mode === 'rl' ? '<button class="rk" data-act="add-video">+ Видео</button>' : ''}
      </div>
    </div>`;
}

function actions() {
  return `
    <div class="actions">
      <button class="btn primary" style="flex:1 1 180px" data-act="send-plan">${I.send}Отправить план в чат</button>
      <button class="btn" style="flex:1 1 120px" data-act="plan-save">${I.bookmark}Сохранить</button>
    </div>`;
}
