import { CONFIG } from './config.js';

// Транспорт синхронизации. mock — BroadcastChannel между вкладками одного браузера,
// live — WebSocket-сервер с комнатами (room = instanceId Activity).
// Формат сообщения одинаковый: { t, p, from, user, ts }

let channel = null;
let ws = null;
let me = null;
let room = '';
let handler = () => {};
let statusCb = () => {};
const queue = [];
let boardTimer = null;
let pendingBoard = null;
let retry = 1000;

export function connect(r, user, onMessage, onStatus) {
  room = r;
  me = user;
  handler = onMessage;
  statusCb = onStatus || (() => {});

  if (CONFIG.mode === 'mock') {
    if (typeof BroadcastChannel === 'undefined') { statusCb('offline'); return; }
    channel = new BroadcastChannel('wow-activity:' + room);
    channel.onmessage = (e) => receive(e.data);
    statusCb('mock');
  } else {
    openSocket();
  }
  window.addEventListener('beforeunload', () => send('bye', {}));
}

function openSocket() {
  statusCb('connecting');
  ws = new WebSocket(CONFIG.wsUrl + '?room=' + encodeURIComponent(room));
  ws.onopen = () => {
    retry = 1000;
    statusCb('online');
    queue.splice(0).forEach((m) => ws.send(m));
    send('hello', {});
  };
  ws.onmessage = (e) => {
    let msg;
    try { msg = JSON.parse(e.data); } catch (err) { return; }
    receive(msg);
  };
  ws.onclose = () => {
    statusCb('offline');
    setTimeout(openSocket, retry);
    retry = Math.min(retry * 2, 15000);
  };
}

function receive(msg) {
  if (!msg || !me || msg.from === me.id) return;
  handler(msg);
}

export function send(t, p) {
  if (!me) return;
  const msg = { t, p, from: me.id, user: me, ts: Date.now() };
  if (channel) {
    channel.postMessage(msg);
  } else if (ws) {
    const str = JSON.stringify(msg);
    if (ws.readyState === 1) ws.send(str); else queue.push(str);
  }
}

/** Доска отправляется не чаще раза в 50 мс (при перетаскивании) */
export function sendBoard(key, board) {
  pendingBoard = { key, board };
  if (boardTimer) return;
  boardTimer = setTimeout(() => {
    boardTimer = null;
    send('board', pendingBoard);
  }, 50);
}
