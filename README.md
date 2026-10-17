# WoW DS Guides

Discord Activity «WoW справочник»: брифинг рейда с совместной рисовалкой.

| Папка | Что это | Где работает |
|---|---|---|
| `front/` | Фронт Activity (HTML/CSS/JS без сборки) | GitHub Pages |
| `worker/` | Комнаты синхронизации (WebSocket, Durable Objects) | Cloudflare Workers, бесплатный тариф |
| `wordpress-plugin/` | Контент, планы, обмен токена Discord | WordPress (в работе) |

## Фронт

Локально: `cd front && python3 -m http.server 8080`, открыть две вкладки `http://localhost:8080`.
Подробности — `front/README.md`.

Деплой: при пуше в `main` workflow `.github/workflows/pages.yml` публикует `front/` на GitHub Pages.
Один раз включить: Settings → Pages → Source: **GitHub Actions**.

## Worker

Деплой из Cloudflare: Workers & Pages → Create → Connect GitHub → этот репозиторий,
Root directory: `worker`. Либо вручную: `cd worker && npx wrangler deploy`.
Подробности — `worker/README.md`.
