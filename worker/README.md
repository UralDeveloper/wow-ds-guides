# wow-rooms — комнаты синхронизации (Cloudflare Worker + Durable Objects)

Пересылает сообщения Activity всем участникам комнаты, кроме отправителя.
Комната = `?room=<instanceId>`. Бесплатный тариф Workers, Durable Objects на SQLite.

## Деплой с компьютера

```bash
cd wow-activity-worker
npx wrangler login      # откроется браузер, подтвердить вход в Cloudflare
npx wrangler deploy
```

Адрес после деплоя: `https://wow-rooms.<ваш-поддомен>.workers.dev`
Проверка: открыть адрес в браузере, должно показать `WoW rooms: OK`.

## Деплой из GitHub (этот репозиторий)

Workers & Pages → Create → Connect GitHub → выбрать репозиторий,
Root directory: `worker` (папка с wrangler.toml). Дальше деплой при каждом пуше.

## Подключение к фронту

Discord Developer Portal → Activities → URL Mappings: `/ws` → `wow-rooms.<поддомен>.workers.dev`.
Фронт подключается к `wss://<домен-activity>/.proxy/ws?room=<instanceId>`.
