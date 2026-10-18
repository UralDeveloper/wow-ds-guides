# WoW DS Guides

Discord Activity «WoW справочник»: брифинг рейда с совместной рисовалкой.

| Папка | Что это |
|---|---|
| `front/` | Фронт Activity: HTML/CSS/JS без сборки |
| `worker/` | Cloudflare Worker: раздаёт `front/` и держит комнаты синхронизации на `/ws` |
| `wrangler.toml` | Конфиг Worker (в корне, чтобы Cloudflare собирал всё из репозитория) |

Всё работает на бесплатном тарифе Cloudflare Workers.

## Деплой на Cloudflare (один раз)

1. Cloudflare → Workers & Pages → Create → **Connect GitHub**.
2. Выбрать репозиторий `wow-ds-guides`. Root directory оставить пустым (корень репозитория).
3. Команду сборки не указывать, команда деплоя по умолчанию: `npx wrangler deploy`.
4. Готово: каждый пуш в `main` обновляет сайт и комнаты.

Адрес: `https://wow-rooms.<поддомен>.workers.dev`

- `/` — фронт
- `/ws` — без WebSocket показывает `WoW rooms: OK`

Вручную с компьютера: `npx wrangler login`, затем `npx wrangler deploy` в корне репозитория.

## Контент и карты

- `data-src/raid-config.json` — дополнения, рейды, боссы и слои карт с калибровкой ярдов.
- `front/maps/` — фоны арен в webp, превью в `thumbs/`, манифест `index.json`.
- `front/data/content.json` собирается скриптом, руками не правится:

```bash
python3 tools/build_content.py
```

У босса из конфига карта ставится автоматически, слои переключаются на карте, по калибровке
показывается линейка и радиус войдзон в ярдах. Тактики и гайды пока есть только у демо-рейда.

## Демо до подключения Discord

Откройте адрес Worker на двух устройствах с одинаковым `?room=`, например
`https://wow-rooms.<поддомен>.workers.dev/?room=test`. Первый станет РЛ, второй — зрителем.
Рисование, пинги, фазы и «Проиграть» синхронизируются через Cloudflare.

## Локальная разработка

```bash
cd front && python3 -m http.server 8080      # только фронт, синхронизация вкладок через BroadcastChannel
npx wrangler dev                              # фронт + настоящие комнаты на http://localhost:8787
```

## Подключение к Discord

Developer Portal → приложение → Activities → URL Mappings:

| Prefix | Target |
|---|---|
| `/` | `wow-rooms.<поддомен>.workers.dev` |
| `/wp` | домен WordPress |

Фронт сам определяет, что запущен в Discord, и ходит через `/.proxy`.
Подробности фронта — `front/README.md`.
