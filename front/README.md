# WoW справочник — Discord Activity (фронт)

Брифинг рейда с совместной рисовалкой: тактика по ролям, гайд, карта с маршрутами,
группами, войдзонами и подписями, личные и гильдейские планы, режим РЛ / зритель.

Чистый HTML/CSS/JS на ES-модулях, без сборки и фреймворков.

## Запуск (демо-режим)

```bash
cd wow-activity
python3 -m http.server 8080
```

Откройте <http://localhost:8080>. Из `file://` не запустится: модули и `fetch` требуют сервер.

**Проверка синхронизации:** откройте вторую вкладку того же адреса. Вторая вкладка
зайдёт другим тестовым пользователем и автоматически станет зрителем. Рисунки,
пинги, смена босса, фазы и «Проиграть» у РЛ сразу видны во второй вкладке.

Пользователя можно задать явно: `?user=u1` … `?user=u4`.

## Режимы

| | mock (вне Discord) | live (в Discord или `?mode=live`) |
|---|---|---|
| Пользователь | тестовый (`auth.js`) | Discord Embedded App SDK |
| Контент | `data/content.json` | WordPress `GET /wow/v1/content` |
| Планы | `localStorage` браузера | WordPress REST `/wow/v1/plans` |

Синхронизация выбирается отдельно (`config.js`):
- на `localhost` — `BroadcastChannel` между вкладками;
- на опубликованном адресе — WebSocket-комнаты Worker (`/ws`), комната задаётся `?room=`, в Discord — `instanceId`.

Код интерфейса от режима не зависит.

## Структура

```
index.html
css/
  tokens.css        цвета, шрифты, радиусы
  app.css           все стили
data/
  content.json      демо-контент: рейды, боссы, фазы, тактики, гайды
js/
  main.js           запуск, разметка, отрисовка, действия кнопок
  config.js         режим и адреса
  store.js          состояние (set / subscribe, отрисовка раз в кадр)
  auth.js           пользователь: mock или Discord SDK
  api.js            контент и планы: JSON+localStorage или WordPress REST
  sync.js           BroadcastChannel или WebSocket
  session.js        совместный просмотр: РЛ транслирует вид и доску
  board.js          доска (всё нарисованное), отмена, очистка, сброс
  tools.js          инструменты карты: кисть, маршрут, группы, метки, войдзоны, подписи, пинги, перетаскивание
  plans.js          личные / гильдейские / официальный план
  play.js           «Проиграть план» по фазам
  view.js           селекторы данных
  ui/               отрисовка блоков: header, sidebar, plansbar, toolbar, map, timeline, panel, icons
```

## Модель данных

**Доска** (`board`) — то, что сохраняется в плане и уходит участникам. Координаты в
единицах 1000×600 независимо от размера экрана.

```js
{
  strokes: [{ c, pts: [{x,y}] }],                  // кисть
  routes:  [{ id, c, pts, arrow: 'end'|'both'|'none', mid }],
  groups:  [{ id, phase, kind, x, y, label }],      // игроки по ролям
  pins:    [{ id, x, y, c, n }],
  vz:      [{ id, x, y, r }],                       // войдзоны
  labels:  [{ id, phase, x, y, text, c }],
  moved:   { 'фаза:индекс': {x,y} },                // сдвинутые стартовые метки
  history: [{ k: 'stroke'|'route'|'group'|'pin'|'vz'|'label', n? }]  // для «Отменить»
}
```

**Сообщения синхронизации:** `{ t, p, from, user, ts }`

| t | p | Кто шлёт |
|---|---|---|
| `hello` / `here` | `{ mode }` | все, при входе / в ответ |
| `mode` | `{ mode }` | при смене режима |
| `view` | `{ raidIdx, bossIdx, phase, diff, playing }` | РЛ |
| `board` | `{ key, board }` | тот, кто рисует (не чаще 20 раз/с) |
| `ping` | `{ id, x, y, c, name }` | все |
| `control:ask` | `{}` | зритель |
| `bye` | `{}` | при закрытии |

WebSocket-серверу достаточно пересылать сообщение всем в комнате, кроме отправителя.

## Подключение к Discord (режим live)

1. Developer Portal → приложение → включить Activities.
2. URL Mappings: `/` → адрес Worker (фронт и `/ws` там же), `/wp` → WordPress.
3. В `js/config.js` указать `discordClientId` и адрес WordPress.
4. Положить ESM-сборку `@discord/embedded-app-sdk` в `vendor/discord-sdk.js`.
5. Шрифты скачать в `/fonts` и подключить локально: внешние CDN в Activity блокируются.
6. Эндпоинт `/wp-json/wow/v1/token` в плагине WordPress: принимает `{ code }`, меняет его на
   `access_token` через `https://discord.com/api/oauth2/token` с client secret, возвращает `{ access_token }`.

## Что дальше

- Плагин WordPress с эндпоинтами `content`, `plans`, `token`.
- Экраны: ошибка соединения внутри интерфейса, «нет прав», пустой гайд.
- Режим M+ для подземелий (маршрут пулов вместо фаз).
- Мобильная раскладка рисовалки под тач.
- Своя схема карты для каждого босса из WordPress вместо общей.
