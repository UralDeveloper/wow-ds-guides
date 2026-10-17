// Минимальное хранилище состояния: set() обновляет сразу, перерисовка — один раз за кадр.
let state = {};
const subs = new Set();
let queued = false;

export const get = () => state;

export function init(initial) {
  state = initial;
}

export function set(patch, opts = {}) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...p };
  if (!opts.silent) schedule();
}

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    subs.forEach((fn) => fn(state));
  });
}

export function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
