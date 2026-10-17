import { get, set } from './store.js';
import { uid } from './util.js';

export function toast(text) {
  const id = uid();
  set({ toast: { id, text } });
  setTimeout(() => {
    const t = get().toast;
    if (t && t.id === id) set({ toast: null });
  }, 2800);
}
