import { get, set } from './store.js';

export function addPing(p) {
  set({ pings: get().pings.concat([p]) });
  setTimeout(() => set({ pings: get().pings.filter((g) => g.id !== p.id) }), 2300);
}
