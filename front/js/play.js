import { get, set } from './store.js';
import { broadcastView } from './session.js';
import { phases } from './view.js';

// «Проиграть план»: проход по всем фазам с плавным переездом меток
const STEP = 2600;
let timers = [];

export function stop() {
  timers.forEach(clearTimeout);
  timers = [];
  if (get().playing) { set({ playing: false }); broadcastView(); }
}

export function play() {
  stop();
  const count = phases(get()).length;
  set({ playing: true, phase: 0 });
  broadcastView();
  for (let i = 1; i < count; i++) {
    timers.push(setTimeout(() => { set({ phase: i }); broadcastView(); }, STEP * i));
  }
  timers.push(setTimeout(() => { timers = []; set({ playing: false }); broadcastView(); }, STEP * count));
}

export const toggle = () => (get().playing ? stop() : play());
