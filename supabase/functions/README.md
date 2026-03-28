# Supabase Edge Functions (опционально)

Уведомления о заявках и смене этапа B2B реализованы в Next.js:

- `POST /api/crm/notify/lead-created` — вызывается из CRM после создания заявки.
- `POST /api/crm/notify/b2b-stage` — после смены этапа на карточке B2B.
- `POST /api/crm/notify/b2b-created` — после создания новой B2B-сделки.
- `POST /api/crm/webhooks/database` — для **Supabase Database Webhooks** (заголовок `x-crm-webhook-secret` = `CRM_WEBHOOK_SECRET`).

Отдельная Edge Function не обязательна: в Dashboard укажите URL деплоя Next, например `https://ваш-домен/api/crm/webhooks/database`, метод POST, тело по умолчанию от Supabase.

Переменные окружения (Vercel / сервер):

- `CRM_TELEGRAM_BOT_TOKEN`, `CRM_TELEGRAM_CHAT_ID` — Telegram.
- `RESEND_API_KEY`, `CRM_NOTIFY_EMAIL_FROM` — письмо назначенному менеджеру (Resend).
- `CRM_WEBHOOK_SECRET` — проверка вебхука.
- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` — для notify-роутов и ZIP (уже используются).
