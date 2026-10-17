import { esc, DIFFS } from '../util.js';
import * as V from '../view.js';
import { I } from './icons.js';

const CONN = { mock: 'Демо-режим', online: 'Онлайн', offline: 'Нет связи', connecting: 'Подключение…' };

export function renderHeader(s) {
  const r = V.raid(s);
  const b = V.boss(s);
  const people = [s.user, ...Object.values(s.peers)];
  const shown = people.slice(0, 4);

  return `
    <div class="brand">
      ${I.logo}
      <div style="min-width:0">
        <div class="brand-title">WoW справочник</div>
        <div class="brand-sub">${esc(r.name)} · ${esc(b.name)} · ${DIFFS[s.diff]}</div>
      </div>
    </div>

    <div class="segs" role="group" aria-label="Сложность">
      ${DIFFS.map((d, i) => `<button class="seg ${i === s.diff ? 'on' : ''}" data-act="diff" data-arg="${i}" ${s.mode === 'viewer' ? 'disabled' : ''}>${d}</button>`).join('')}
    </div>

    <div class="hdr-right">
      <div class="avatars" title="${esc(people.map((p) => p.name).join(', '))}">
        ${shown.map((p, i) => `<span class="av av-${i % 4}">${esc(p.initials)}</span>`).join('')}
        <span class="av-count">${people.length === 1 ? 'Только вы' : 'В канале: ' + people.length}</span>
      </div>
      <div class="segs" role="group" aria-label="Режим">
        <button class="seg ${s.mode === 'rl' ? 'on' : ''}" data-act="mode" data-arg="rl">Я РЛ</button>
        <button class="seg ${s.mode === 'viewer' ? 'on' : ''}" data-act="mode" data-arg="viewer">Зритель</button>
      </div>
      <span class="live"><span class="live-dot"></span>${s.mode === 'rl' ? 'Вы ведёте показ' : 'РЛ ведёт показ'}</span>
      <span class="conn conn-${s.conn}">${CONN[s.conn] || ''}</span>
    </div>`;
}
