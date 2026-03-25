# RaketaPay - Next.js

Лендинг на Next.js (App Router), Tailwind, с SEO и удобной кастомизацией.

## Запуск

```bash
cd raketapay-next
npm install
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000).

## Сборка и деплой

```bash
npm run build
npm start
```

Или задеплой на [Vercel](https://vercel.com) (подключи репозиторий - деплой по push).

## Кастомизация

- **Цвета и шрифты** - `tailwind.config.ts` (цвета `soviet-*`, `tech-cyan`, `fontFamily`).
- **Главная картинка (Hero)** - в `components/Hero.tsx` поменяй константу `HERO_IMAGE` (URL или путь к файлу в `public/`).
- **Блок «Анонимность»** - картинка в `components/AnonymityBlock.tsx`, константа `ANON_IMAGE`.
- **Сервисы (теги)** - массив `TAGS` в `components/Services.tsx`.
- **Шаги «Траектория полёта»** - массив `STEPS` в `components/HowItWorks.tsx`.
- **Лог активности** - массивы `INITIAL_LOGS` и `ROTATING_LOGS` в `components/ActivityFeed.tsx`.
- **SEO** - в `app/layout.tsx` в объекте `metadata` и `openGraph` укажи свой `url` и `images`.

Картинки: можно класть файлы в `public/images/` и подставлять пути вида `/images/hero.jpg`.

## Структура

```
raketapay-next/
├── app/
│   ├── layout.tsx   # шрифты, metadata, общий layout
│   ├── page.tsx     # главная страница (сетка секций)
│   └── globals.css  # Tailwind + анимации (glow, bento-card, feed-in)
├── components/
│   ├── Nav.tsx
│   ├── Hero.tsx
│   ├── Benefits.tsx
│   ├── Services.tsx
│   ├── HowItWorks.tsx
│   ├── Conditions.tsx
│   ├── ActivityFeed.tsx  # клиентский компонент, живой лог
│   ├── AnonymityBlock.tsx
│   ├── CTA.tsx
│   └── Footer.tsx
├── public/          # статика, favicon, og-image.jpg
├── tailwind.config.ts
└── next.config.ts
```

Анимации (bento-card hover, glow, появление строк в логе) сохранены и настраиваются в `app/globals.css`.
