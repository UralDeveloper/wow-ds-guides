import { esc } from '../util.js';
import * as V from '../view.js';
import { I } from './icons.js';

export function renderSidebar(s) {
  const r = V.raid(s);
  const total = V.totalBosses(s);
  const progress = V.hasProgress(r);
  const viewer = s.mode === 'viewer' ? 'disabled' : '';

  const opt = (x) => `
    <button class="dd-opt ${x.i === s.raidIdx ? 'on' : ''}" data-act="raid" data-arg="${x.i}" role="option">
      <span style="flex:1 1 auto;min-width:0">${esc(x.name)}${x.nameEn ? `<span class="dd-en">${esc(x.nameEn)}</span>` : ''}</span>
      ${x.current ? '<span class="tag cur">сезон</span>' : ''}${x.ptr ? '<span class="tag ptr">PTR</span>' : ''}
      <span class="mono muted" style="font-size:11px">${V.hasProgress(x) ? `${x.killed}/${x.bosses.length + x.locked.length}` : x.bosses.length}</span>
    </button>`;
  const all = s.content.raids.map((x, i) => ({ ...x, i }));
  const groups = s.content.expansions
    .map((e) => ({ name: e.name, list: all.filter((x) => x.expansion === e.name) }))
    .filter((g) => g.list.length);

  const eyebrow = [r.expansion, r.season].filter(Boolean).join(' · ');

  return `
    <div class="dd-host" data-dropdown>
      <button class="raidcard ${s.raidOpen ? 'open' : ''}" data-act="raid-toggle" aria-expanded="${s.raidOpen}" ${viewer}>
        <span style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <span class="eyebrow">${esc(eyebrow)}</span>
          <span class="chev">${I.chev}</span>
        </span>
        <span class="raid-name">${esc(r.name)}</span>
        ${r.nameEn ? `<span class="raid-en">${esc(r.nameEn)}</span>` : ''}
        ${progress ? `
          <span style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-3);margin-bottom:6px">
            <span>Прогресс гильдии</span><span class="mono">${r.killed} / ${total}</span>
          </span>
          <span class="progress"><span style="width:${Math.round((r.killed / total) * 100)}%"></span></span>` : `
          <span class="chips">
            ${r.current ? '<span class="tag cur">текущий сезон</span>' : ''}${r.ptr ? '<span class="tag ptr">PTR</span>' : ''}
            <span class="tag">${V.nBosses(r.bosses.length)}</span>
          </span>`}
      </button>
      ${s.raidOpen ? `
        <div class="dropdown dd-scroll" role="listbox" aria-label="Рейды">
          ${groups.map((g) => `<div class="dd-group">${esc(g.name)}</div>${g.list.map(opt).join('')}`).join('')}
        </div>` : ''}
    </div>

    <nav class="bosses" aria-label="Боссы">
      ${r.bosses.map((b, i) => {
        const st = V.bossStatus(r, i);
        const sub = st.sub || (b.layers.length ? V.nMaps(b.layers.length) : 'без карты');
        return `
          <button class="boss ${i === s.bossIdx ? 'on' : ''}" data-act="boss" data-arg="${i}" ${viewer}>
            <span class="num">${i + 1}</span>
            <span style="flex:1 1 auto;min-width:0">
              <span class="boss-name">${esc(b.name)}</span>
              <span class="boss-sub">${esc(sub)}</span>
            </span>
            ${st.killed ? `<span style="color:var(--heal)" role="img" aria-label="Убит">${I.check}</span>` : ''}
          </button>`;
      }).join('')}
      ${(r.locked || []).map((name, i) => `
        <div class="locked">
          <span class="num">${r.bosses.length + i + 1}</span>
          <span style="flex:1 1 auto">${esc(name)}</span>
          ${I.lock}
        </div>`).join('')}
    </nav>`;
}
