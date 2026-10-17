import { DurableObject } from 'cloudflare:workers';

// Один Worker на всё:
//   /ws?room=…  — комнаты синхронизации (WebSocket, Durable Object на комнату)
//   всё остальное — статика фронта из папки front/ (binding ASSETS)
//
// Комната = один запуск Activity (instanceId). Сервер не хранит доску:
// пересылает сообщения всем участникам комнаты, кроме отправителя.
// WebSocket Hibernation API: пустые комнаты засыпают и не тратят лимит.

const MAX_MESSAGE = 256 * 1024;

export class Room extends DurableObject {
  async fetch() {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    if (typeof message !== 'string' || message.length > MAX_MESSAGE) return;

    // Запоминаем, кто подключён к сокету, чтобы при обрыве разослать «bye»
    if (!ws.deserializeAttachment()) {
      try {
        const m = JSON.parse(message);
        if (m && m.from && m.user) ws.serializeAttachment({ from: m.from, user: m.user });
      } catch (e) { /* не JSON — пропускаем */ }
    }

    for (const peer of this.ctx.getWebSockets()) {
      if (peer === ws) continue;
      try { peer.send(message); } catch (e) { /* сокет уже закрыт */ }
    }
  }

  async webSocketClose(ws, code, reason) {
    this.sendBye(ws);
    try { ws.close(code, reason); } catch (e) { /* ignore */ }
  }

  async webSocketError(ws) {
    this.sendBye(ws);
  }

  sendBye(ws) {
    const who = ws.deserializeAttachment();
    if (!who) return;
    const bye = JSON.stringify({ t: 'bye', p: {}, from: who.from, user: who.user, ts: Date.now() });
    for (const peer of this.ctx.getWebSockets()) {
      if (peer === ws) continue;
      try { peer.send(bye); } catch (e) { /* ignore */ }
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/ws' || url.pathname.startsWith('/ws/')) {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('WoW rooms: OK', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
      }
      const room = (url.searchParams.get('room') || '').slice(0, 128);
      if (!room) return new Response('Параметр room обязателен', { status: 400 });
      const stub = env.ROOMS.get(env.ROOMS.idFromName(room));
      return stub.fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
};
