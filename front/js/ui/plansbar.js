import { esc, ago } from '../util.js';
import * as V from '../view.js';
import { I } from './icons.js';
import { findPlan } from '../plans.js';

export function renderPlansBar(s) {
  if (s.mode === 'viewer') return '';
  const found = findPlan(s.activePlan);
  const cur = found
    ? found.kind === 'mine'
      ? { name: found.plan.name, kind: 'Мой план', av: s.user.initials, cls: 'mine' }
      : { name: found.plan.name, kind: 'План гильдии', av: found.plan.owner.initials, cls: 'guild' }
    : { name: 'Официальная тактика', kind: 'Справочник', av: '★', cls: 'official' };
  const isMine = found && found.kind === 'mine';
  const { mine, guild } = s.plans;

  return `
    <div class="plans">
      <div class="dd-host" data-dropdown>
        <button class="planbtn ${s.planOpen ? 'open' : ''}" data-act="plans-toggle" aria-expanded="${s.planOpen}" aria-label="Выбрать план">
          <span class="pav ${cur.cls}">${esc(cur.av)}</span>
          <span style="flex:1 1 auto;min-width:0">
            <span class="eyebrow" style="display:block">${cur.kind}</span>
            <span class="plan-name">${esc(cur.name)}</span>
          </span>
          <span class="chev">${I.chev}</span>
        </button>
        ${s.planOpen ? `
          <div class="dropdown">
            <div class="dd-group">Мои планы · ${esc(V.boss(s).name)}</div>
            ${mine.length ? '' : '<div class="empty-note">Своих планов пока нет. Нарисуйте тактику и сохраните её ниже.</div>'}
            ${mine.map((p) => `
              <div class="prow ${p.id === s.activePlan ? 'on' : ''}">
                <button class="pmain" data-act="plan" data-arg="${esc(p.id)}">
                  <span class="pav mine">${esc(s.user.initials)}</span>
                  <span style="flex:1 1 auto;min-width:0"><span class="ttl">${esc(p.name)}</span><span class="meta">Только у вас · ${ago(p.updated)}</span></span>
                </button>
                <button class="pdel" data-act="plan-del" data-arg="${esc(p.id)}" aria-label="Удалить план ${esc(p.name)}" title="Удалить">${I.trashSm}</button>
              </div>`).join('')}
            <div class="pnew">
              <input class="pinput" type="text" data-input="newName" value="${esc(s.newName)}" placeholder="Название нового плана" aria-label="Название нового плана" maxlength="40">
              <button class="rk" data-act="plan-create">+ Сохранить как новый</button>
            </div>
            <div class="dd-group">Гильдия</div>
            ${guild.length ? '' : '<div class="empty-note">Гильдия ещё не делилась планами на этого босса.</div>'}
            ${guild.map((p) => `
              <div class="prow ${p.id === s.activePlan ? 'on' : ''}">
                <button class="pmain" data-act="plan" data-arg="${esc(p.id)}">
                  <span class="pav guild">${esc(p.owner.initials)}</span>
                  <span style="flex:1 1 auto;min-width:0"><span class="ttl">${esc(p.name)}</span><span class="meta">Автор: ${esc(p.owner.name)} · ${ago(p.updated)}</span></span>
                </button>
              </div>`).join('')}
            <div class="dd-group">Справочник</div>
            <div class="prow ${found ? '' : 'on'}">
              <button class="pmain" data-act="plan-official">
                <span class="pav official">★</span>
                <span style="flex:1 1 auto;min-width:0"><span class="ttl">Официальная тактика</span><span class="meta">Базовая расстановка из гайда · только чтение</span></span>
              </button>
            </div>
          </div>` : ''}
      </div>
      <button class="rk" data-act="plan-save">${I.save}${isMine ? 'Сохранить' : 'Сохранить как свой'}</button>
      <button class="rk" data-act="plan-share">${I.share}Поделиться с гильдией</button>
      <span class="me-chip"><span class="av av-0">${esc(s.user.initials)}</span>Вы: ${esc(s.user.name)}</span>
    </div>`;
}
