import { esc, COLORS, COLOR_NAMES, ROLES } from '../util.js';
import { I } from './icons.js';

const TOOLS = [
  ['pointer', 'Указатель — перетаскивать метки, точки, подписи'],
  ['brush', 'Кисть — рисовать от руки'],
  ['route', 'Маршрут — точки кликами'],
  ['roles', 'Группа — расставить танков, хилов, ДД'],
  ['mark', 'Метка — пронумерованная точка'],
  ['text', 'Подпись — текст на карте'],
  ['ping', 'Пинг — вспышка, которую видят все'],
  ['zone', 'Войдзона — зажать и потянуть'],
];
const ARROWS = [['end', '→', 'В конце'], ['both', '↔', 'С двух сторон'], ['none', '—', 'Без стрелки']];

export function renderToolbar(s) {
  const phases = s.content.phases;
  const isRL = s.mode === 'rl';

  const tools = `
    <div class="tbar" role="toolbar" aria-label="Инструменты рисования">
      ${TOOLS.map(([t, title]) => `
        <button class="tool ${s.tool === t ? 'on' : ''}" data-act="tool" data-arg="${t}" aria-label="${title}" title="${title}" aria-pressed="${s.tool === t}">${I[t]}</button>
        ${t === 'route' && s.draft ? '<button class="tool wide done" data-act="route-done">Готово</button>' : ''}`).join('')}
      <span class="sep"></span>
      ${Object.keys(COLORS).map((c) => `
        <button class="sw ${s.color === c ? 'on' : ''}" data-act="color" data-arg="${c}" aria-label="${COLOR_NAMES[c]}" title="${COLOR_NAMES[c]}"><span class="dot" style="background:${COLORS[c]}"></span></button>`).join('')}
      <span class="sep"></span>
      <button class="tool" data-act="undo" aria-label="Отменить" title="Отменить">${I.undo}</button>
      <button class="tool" data-act="clear" aria-label="Очистить рисунки" title="Очистить рисунки">${I.trash}</button>
      <button class="tool wide" data-act="reset" title="Сбросить всё: рисунки, группы и расстановку меток">${I.reset}Сбросить</button>
    </div>`;

  const viewer = `
    <div class="viewer-bar rise">
      <span style="color:var(--text-3);display:inline-flex">${I.eye}</span>
      <span>Вы смотрите план РЛ. Клик по карте — пинг для всех</span>
      <button class="rk" data-act="ask-control">Попросить управление</button>
    </div>`;

  const phaseBar = `
    <div class="tbar" role="group" aria-label="Фаза боя">
      ${phases.map((f, i) => `<button class="ph ${i === s.phase ? 'on' : ''}" data-act="phase" data-arg="${i}" ${isRL ? '' : 'disabled'}>${esc(f.name)}</button>`).join('')}
      ${isRL ? `<span class="sep"></span>
        <button class="ph play" data-act="play">${s.playing ? I.stop + 'Стоп' : I.play + 'Проиграть'}</button>` : ''}
    </div>`;

  const roles = isRL && s.tool === 'roles' ? `
    <div class="subpanel">
      <span class="muted" style="font-size:12px">Роль</span>
      ${Object.entries(ROLES).map(([k, r]) => `
        <button class="rk ${s.roleKind === k ? 'on' : ''}" data-act="role-kind" data-arg="${k}"><span class="rkdot ${k}">${r.letter}</span>${r.name}</button>`).join('')}
      <span class="sep"></span>
      <span class="muted" style="font-size:12px">Сколько</span>
      <button class="tool" style="width:36px;height:36px;font-size:18px" data-act="role-count" data-arg="-1" aria-label="Меньше">−</button>
      <span class="counter">${s.roleCount}</span>
      <button class="tool" style="width:36px;height:36px;font-size:18px" data-act="role-count" data-arg="1" aria-label="Больше">+</button>
      <span class="hint">Клик по карте — поставить группу. Двигать — «Указателем»</span>
    </div>` : '';

  const arrows = isRL && s.tool === 'route' ? `
    <div class="subpanel">
      <span class="muted" style="font-size:12px">Стрелка</span>
      ${ARROWS.map(([m, sym, name]) => `
        <button class="rk ${s.arrowMode === m ? 'on' : ''}" data-act="arrow" data-arg="${m}"><span class="mono" style="font-size:14px">${sym}</span>${name}</button>`).join('')}
      <span class="sep"></span>
      <button class="rk ${s.arrowMid ? 'on' : ''}" data-act="arrow-mid"><span class="mono" style="font-size:14px">›</span>Стрелки по пути</button>
      <span class="hint">${s.draft ? 'Применится к текущему маршруту' : s.board.routes.length ? 'Меняет последний маршрут' : 'Для новых маршрутов'}</span>
    </div>` : '';

  return `
    <div class="tbar-wrap">
      <div class="tbar-row">${isRL ? tools : viewer}${phaseBar}</div>
      ${roles}${arrows}
    </div>`;
}
