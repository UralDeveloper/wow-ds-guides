import { get, set } from './store.js';
import { send } from './sync.js';
import { planKey } from './view.js';
import { toast } from './toast.js';
import { addPing } from './pings.js';

// Совместный просмотр: РЛ транслирует вид (рейд/босс/фаза/показ) и доску,
// зрители повторяют за ним. Пинги может ставить любой участник.

export function broadcastView() {
  const s = get();
  if (s.mode !== 'rl') return;
  send('view', { raidIdx: s.raidIdx, bossIdx: s.bossIdx, phase: s.phase, diff: s.diff, playing: s.playing });
}

export function broadcastBoard() {
  const s = get();
  send('board', { key: planKey(s), board: s.board });
}

export function announce() {
  const s = get();
  send('hello', { mode: s.mode });
}

export function handleMessage(msg) {
  const s = get();
  const u = msg.user;

  switch (msg.t) {
    case 'hello':
    case 'here': {
      set({ peers: { ...s.peers, [u.id]: { ...u, mode: msg.p.mode } } });
      // Пришли в канал, где РЛ уже ведёт показ — становимся зрителем
      if (msg.t === 'here' && msg.p.mode === 'rl' && s.mode === 'rl' && Date.now() - s.joinedAt < 2500) {
        set({ mode: 'viewer', tool: 'ping' });
        send('mode', { mode: 'viewer' });
        toast(u.name + ' ведёт показ — вы в режиме зрителя');
      }
      if (msg.t === 'hello') {
        send('here', { mode: s.mode });
        if (s.mode === 'rl') { broadcastView(); broadcastBoard(); }
      }
      break;
    }
    case 'mode': {
      set({ peers: { ...s.peers, [u.id]: { ...u, mode: msg.p.mode } } });
      break;
    }
    case 'bye': {
      const peers = { ...s.peers };
      delete peers[u.id];
      set({ peers });
      break;
    }
    case 'view': {
      if (s.mode !== 'viewer') break;
      const v = msg.p;
      const bossChanged = v.raidIdx !== s.raidIdx || v.bossIdx !== s.bossIdx;
      set({
        raidIdx: v.raidIdx, bossIdx: v.bossIdx, phase: v.phase, diff: v.diff, playing: v.playing,
        ...(bossChanged ? { role: 'all', activePlan: 'off', plans: { mine: [], guild: [] } } : {}),
      });
      break;
    }
    case 'board': {
      if (msg.p.key !== planKey(s)) break;
      set({ board: msg.p.board, drag: null });
      break;
    }
    case 'ping': {
      addPing(msg.p);
      break;
    }
    case 'control:ask': {
      if (s.mode === 'rl') toast(u.name + ' просит управление');
      break;
    }
    default:
      break;
  }
}
