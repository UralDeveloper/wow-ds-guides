import { esc } from '../util.js';
import * as V from '../view.js';
import { I } from './icons.js';

export function renderSidebar(s) {
  const r = V.raid(s);
  const total = V.totalBosses(s);
  const pct = Math.round((r.killed / total) * 100);
  const raids = s.content.raids.map((x, i) => ({ ...x, i })).filter((x) => x.kind === 'raid');
  const dungeons = s.content.raids.map((x, i) => ({ ...x, i })).filter((x) => x.kind === 'dungeon');
  const opt = (x) => `
    <button class="dd-opt ${x.i === s.raidIdx ? 'on' : ''}" data-act="raid" data-arg="${x.i}" role="option">
      <span style="flex:1 1 auto;min-width:0">${esc(x.name)}</span>
      <span class="mono muted" style="font-size:11px">${x.killed}/${x.bosses.length + x.locked.length}</span>
    </button>`;

  return `
    <div class="dd-host" data-dropdown>
      <button class="raidcard ${s.raidOpen ? 'open' : ''}" data-act="raid-toggle" aria-expanded="${s.raidOpen}" ${s.mode === 'viewer' ? 'disabled' : ''}>
        <span style="display:flex;justify-content:space-between;align-items:center">
          <span class="eyebrow">${r.kind === 'raid' ? 'Рейд' : 'Подземелье M+'}</span>
          <span class="chev">${I.chev}</span>
        </span>
        <span class="raid-name">${esc(r.name)}</span>
        <span style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-3);margin-bottom:6px">
          <span>Прогресс гильдии</span><span class="mono">${r.killed} / ${total}</span>
        </span>
        <span class="progress"><span style="width:${pct}%"></span></span>
      </button>
      ${s.raidOpen ? `
        <div class="dropdown" role="listbox" aria-label="Рейды и подземелья">
          <div class="dd-group">Рейды</div>
          ${raids.map(opt).join('')}
          <div class="dd-group">Подземелья M+</div>
          ${dungeons.map(opt).join('')}
        </div>` : ''}
    </div>

    <nav class="bosses" aria-label="Боссы">
      ${r.bosses.map((b, i) => {
        const st = V.bossStatus(r, i);
        return `
          <button class="boss ${i === s.bossIdx ? 'on' : ''}" data-act="boss" data-arg="${i}" ${s.mode === 'viewer' ? 'disabled' : ''}>
            <span class="num">${i + 1}</span>
            <span style="flex:1 1 auto;min-width:0">
              <span class="boss-name">${esc(b.name)}</span>
              <span class="boss-sub">${st.sub}</span>
            </span>
            ${st.killed ? `<span style="color:var(--heal)" role="img" aria-label="Убит">${I.check}</span>` : ''}
          </button>`;
      }).join('')}
      ${r.locked.map((name, i) => `
        <div class="locked">
          <span class="num">${r.bosses.length + i + 1}</span>
          <span style="flex:1 1 auto">${esc(name)}</span>
          ${I.lock}
        </div>`).join('')}
    </nav>`;
}
