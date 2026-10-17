import { esc } from '../util.js';
import * as V from '../view.js';

export function renderTimeline(s) {
  const ph = V.phase(s);
  return `
    <div class="card" aria-label="Таймлайн способностей">
      <div class="tl-head">
        <span style="font-weight:500;color:#D3D8E1">Таймлайн · ${esc(ph.name)}</span>
        <span class="mono muted" style="font-size:11px">повтор каждые 90 с</span>
      </div>
      <div class="tl-track">
        ${ph.casts.map((c) => `<span class="tick ${c.kind}" style="left:${c.t}%"></span>`).join('')}
        <span class="playhead" aria-hidden="true"></span>
      </div>
      <div class="tl-labels">
        ${ph.casts.map((c) => `<span style="left:${c.t}%">${esc(c.l)}</span>`).join('')}
      </div>
    </div>`;
}
