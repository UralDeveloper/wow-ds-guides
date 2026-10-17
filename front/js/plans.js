import { get, set } from './store.js';
import * as api from './api.js';
import { emptyBoard } from './board.js';
import { planKey } from './view.js';
import { toast } from './toast.js';
import { broadcastBoard } from './session.js';
import { stop as stopPlay } from './play.js';

// Личные, гильдейские и официальный планы на каждого босса

export async function refresh() {
  const s = get();
  const key = planKey(s);
  try {
    const res = await api.listPlans(key, s.user);
    if (planKey(get()) === key) set({ plans: res });
  } catch (e) {
    toast('Не удалось загрузить планы');
  }
}

const transient = { cur: null, draft: null, hover: null, zdraft: null, textDraft: null, drag: null };

/** Загрузить план на доску (null — официальная тактика) */
export function load(plan) {
  stopPlay();
  const board = plan ? structuredClone(plan.board) : emptyBoard();
  set({ board: { ...emptyBoard(), ...board }, activePlan: plan ? plan.id : 'off', planOpen: false, ...transient });
  broadcastBoard();
}

export function findPlan(id) {
  const { mine, guild } = get().plans;
  const m = mine.find((p) => p.id === id);
  if (m) return { plan: m, kind: 'mine' };
  const g = guild.find((p) => p.id === id);
  if (g) return { plan: g, kind: 'guild' };
  return null;
}

export async function create(name) {
  const s = get();
  const mineCount = s.plans.mine.length;
  const title = (name || '').trim().slice(0, 40) || 'Мой план ' + (mineCount + 1);
  const plan = await api.createPlan(s.user, { key: planKey(s), name: title, board: structuredClone(s.board) });
  set({ activePlan: plan.id, newName: '', planOpen: false });
  await refresh();
  toast('План «' + plan.name + '» сохранён');
}

export async function save() {
  const s = get();
  const found = findPlan(s.activePlan);
  if (found && found.kind === 'mine') {
    await api.updatePlan(s.user, found.plan.id, { board: structuredClone(s.board) });
    await refresh();
    toast('Изменения сохранены');
  } else {
    await create(found ? found.plan.name + ' (моя копия)' : '');
  }
}

export async function remove(id) {
  const s = get();
  await api.deletePlan(s.user, id);
  if (s.activePlan === id) load(null);
  await refresh();
  toast('План удалён');
}

export async function share() {
  const s = get();
  const found = findPlan(s.activePlan);
  if (!found || found.kind !== 'mine') { toast('Сначала сохраните план как свой'); return; }
  await api.sharePlan(s.user, found.plan);
  await refresh();
  toast('План «' + found.plan.name + '» опубликован в гильдии');
}
