import Link from "next/link";
import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { MessengerChoiceTrigger } from "@/components/MessengerChoiceTrigger";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
const base = siteUrl.replace(/\/$/, "");
const businessUrl = `${base}/business`;

const PHONE_LABEL = "+7 (999) 123-45-67";
const PHONE_HREF = "tel:+79991234567";
const EMAIL = "support@raketapay.ru";
const WORKING_HOURS = "Пн-Пт 09:00-24:00, Сб-Вс 09:00-21:00 (МСК)";
const AVG_RESPONSE = "Отвечаем обычно за 5-10 минут в рабочее время";

const HERO_POINTS = [
  "Проверяем маршрут и риски до старта, без оплаты на первом шаге.",
  "Сопровождаем платеж от заявки до зачисления получателю.",
  "Работаем по договору и передаем документы для бухгалтерии.",
];

const TRUST_POINTS = [
  {
    icon: "doc",
    title: "Фиксируем условия заранее",
    text: "До запуска согласуем маршрут, срок и условия по сделке.",
  },
  {
    icon: "manager",
    title: "Персональный менеджер",
    text: "Один контакт сопровождает весь процесс без переадресаций.",
  },
  {
    icon: "shield",
    title: "Документы по сделке",
    text: "Передаем подтверждения и закрывающие документы после проведения.",
  },
  {
    icon: "chat",
    title: "Понятная коммуникация",
    text: "Объясняем шаги простым языком и держим в курсе статуса.",
  },
];

const CASES = [
  {
    country: "Китай",
    amount: "¥380,000",
    term: "48 часов",
    tags: ["Инвойс", "Китай", "Поставщик"],
    result: "Оплачен инвойс фабрики, подтверждение от получателя получено.",
  },
  {
    country: "Турция",
    amount: "$62,000",
    term: "24 часа",
    tags: ["Поставщик", "Оплата товара"],
    result: "Платеж за товар проведен, закрывающие документы переданы клиенту.",
  },
  {
    country: "Германия",
    amount: "€44,500",
    term: "36 часов",
    tags: ["SaaS", "Инвойс", "B2B"],
    result: "Оплачен SaaS-контракт для юрлица, маршрут согласован заранее.",
  },
  {
    country: "Сложный сценарий: Китай + ЕС",
    amount: "$128,000",
    term: "72 часа",
    tags: ["Сложный кейс", "Маршрут", "ВЭД"],
    result:
      "Комбинированный платеж с несколькими контрагентами: сначала согласовали маршрут и документы, затем провели оплату без возвратов.",
  },
];

const FLOW = [
  "Консультация: страна, валюта, сумма, тип платежа.",
  "Проверка маршрута и согласование условий.",
  "Проведение платежа и контроль статуса.",
  "Подтверждение зачисления и документы.",
];

const FAQ = [
  {
    q: "С чего начать, если кейс сложный?",
    a: "Напишите в Telegram или позвоните. Мы запросим минимум данных, проверим маршрут и предложим рабочий план без обязательств на первом шаге.",
  },
  {
    q: "Какие сроки проведения платежа?",
    a: "Обычно 24-72 часа. Точный срок зависит от направления, валюты и банка получателя. До запуска даем ориентир по вашему кейсу.",
  },
  {
    q: "Какие платежи вы берете в работу?",
    a: "Инвойсы поставщикам, расчеты с Китаем, корпоративные SaaS и другие международные B2B-платежи.",
  },
  {
    q: "Есть ли документы для бухгалтерии?",
    a: "Да, работаем по договору и передаем подтверждающие документы по операции.",
  },
];

function TrustIcon({ kind }: { kind: string }) {
  if (kind === "doc") {
    return (
      <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6M9 17h6" />
      </svg>
    );
  }
  if (kind === "manager") {
    return (
      <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    );
  }
  if (kind === "shield") {
    return (
      <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3l7 3v6c0 4.3-2.9 7.5-7 9-4.1-1.5-7-4.7-7-9V6l7-3z" />
        <path d="M9.5 12.5l1.7 1.7 3.4-3.6" />
      </svg>
    );
  }
  return (
    <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 9h8M8 13h5" />
    </svg>
  );
}

export const metadata: Metadata = {
  title: "Международные платежи для бизнеса | Raketa Pay",
  description:
    "Raketa Pay Business: международные B2B-платежи с консультацией, согласованием маршрута и сопровождением до зачисления.",
  alternates: {
    canonical: "/business",
  },
  keywords: [
    "международные платежи для бизнеса",
    "оплата инвойсов",
    "платежи в Китай для юрлиц",
    "b2b платежи за рубеж",
    "платежный агент для бизнеса",
    "оплата поставщикам за границу",
    "Raketa Pay Business",
  ],
  openGraph: {
    type: "website",
    locale: "ru_RU",
    title: "Международные платежи для бизнеса | Raketa Pay",
    description:
      "B2B-платежи за рубеж: консультация, проверка маршрута, сопровождение до зачисления и документы по сделке.",
    url: businessUrl,
    siteName: "Raketa Pay",
  },
  twitter: {
    card: "summary",
    title: "Raketa Pay Business",
    description:
      "Международные платежи для юрлиц: инвойсы, поставщики, сопровождение сделки.",
  },
};

export default function BusinessPage() {
  const businessJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: "Международные платежи для бизнеса",
        serviceType: "B2B international payments",
        provider: {
          "@type": "Organization",
          name: "Raketa Pay",
          url: base,
        },
        areaServed: "Worldwide",
        availableChannel: {
          "@type": "ServiceChannel",
          serviceUrl: businessUrl,
        },
        description:
          "Международные B2B-платежи: консультация, проверка маршрута, проведение платежа и документы по сделке.",
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }}
      />
      <main className="pt-20 sm:pt-24 pb-16 sm:pb-20 px-3 sm:px-4 md:px-8 max-w-7xl mx-auto safe-area-pb noise-bg">
        <section className="rounded-2xl sm:rounded-3xl border border-soviet-cream/10 bg-zinc-900 p-4 sm:p-8 md:p-12 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-soviet-red/20 blur-[90px]" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-tech-cyan/20 blur-[90px]" />
          <div className="relative z-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-soviet-cream/60 hover:text-soviet-cream transition-colors"
            >
              <span aria-hidden>←</span> На главную
            </Link>

            <h1 className="mt-4 font-header text-[clamp(1.5rem,7.2vw,3.6rem)] font-black uppercase italic leading-tight headline-outline break-words sm:break-normal">
              Международные платежи
              <br />
              <span className="text-soviet-red">для юрлиц без хаоса</span>
            </h1>

            <p className="mt-4 text-soviet-cream/75 max-w-3xl text-sm sm:text-base leading-relaxed">
              Если платежи за рубеж тормозятся или не проходят, начните с
              консультации: мы проверим ваш кейс, предложим рабочий маршрут и
              проведем сделку до результата.
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {HERO_POINTS.map((point) => (
                <div
                  key={point}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs sm:text-sm text-soviet-cream/85"
                >
                  {point}
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <MessengerChoiceTrigger
                className="inline-flex items-center justify-center w-full sm:w-auto min-h-[48px] bg-soviet-red text-white font-header text-[11px] sm:text-sm px-5 sm:px-6 py-3 uppercase tracking-[0.12em] sm:tracking-widest hover:bg-red-700 transition-colors"
              >
                Получить консультацию
              </MessengerChoiceTrigger>
              <a
                href={PHONE_HREF}
                className="inline-flex items-center justify-center w-full sm:w-auto min-h-[48px] border border-soviet-cream/30 text-soviet-cream font-header text-[11px] sm:text-sm px-5 sm:px-6 py-3 uppercase tracking-[0.08em] sm:tracking-widest hover:bg-white/5 transition-colors"
              >
                Позвонить: {PHONE_LABEL}
              </a>
            </div>

            <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3.5 py-3">
              <div className="mb-1 inline-flex items-center gap-2 text-[10px] sm:text-[11px] uppercase tracking-widest text-emerald-200/90">
                <span className="relative inline-flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300/70 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
                </span>
                Онлайн-поддержка
              </div>
              <p className="text-soviet-cream/85 text-xs sm:text-sm leading-relaxed">
                {WORKING_HOURS}
              </p>
              <p className="text-soviet-cream/70 text-xs sm:text-sm leading-relaxed mt-1">
                {AVG_RESPONSE}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl sm:rounded-3xl border border-soviet-cream/10 bg-zinc-900 p-4 sm:p-6">
          <p className="text-[11px] uppercase tracking-widest text-soviet-cream/50 mb-2">
            Быстрая навигация
          </p>
          <div className="flex flex-wrap gap-2">
            <a href="#trust" className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs uppercase tracking-wider hover:bg-white/10 transition-colors">
              Безопасность
            </a>
            <a href="#cases" className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs uppercase tracking-wider hover:bg-white/10 transition-colors">
              Кейсы
            </a>
            <a href="#flow" className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs uppercase tracking-wider hover:bg-white/10 transition-colors">
              Процесс
            </a>
            <a href="#faq" className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs uppercase tracking-wider hover:bg-white/10 transition-colors">
              FAQ
            </a>
          </div>
        </section>

        <section id="trust" className="mt-4 rounded-2xl sm:rounded-3xl border border-soviet-cream/10 bg-zinc-900 p-4 sm:p-8">
          <h2 className="font-header text-xl sm:text-3xl font-black uppercase italic mb-4">
            Почему это безопасно
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {TRUST_POINTS.map((item, idx) => (
              <div
                key={item.title}
                className="animate-step-in rounded-2xl border border-soviet-cream/10 bg-gradient-to-br from-white/10 to-white/5 p-4 sm:p-5"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-tech-cyan/30 bg-tech-cyan/10 text-tech-cyan">
                  <TrustIcon kind={item.icon} />
                </div>
                <h3 className="font-header uppercase tracking-wider text-base sm:text-lg mb-2">
                  {item.title}
                </h3>
                <p className="text-soviet-cream/75 text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="cases" className="mt-4 rounded-2xl sm:rounded-3xl border border-soviet-cream/10 bg-zinc-900 p-4 sm:p-8">
          <h2 className="font-header text-xl sm:text-3xl font-black uppercase italic mb-4">
            Кейсы
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {CASES.map((item, idx) => (
              <div
                key={item.country}
                className="animate-step-in rounded-2xl border border-soviet-red/20 bg-gradient-to-b from-zinc-800/70 to-zinc-900 p-4 sm:p-5 shadow-[0_12px_30px_-18px_rgba(190,30,45,0.55)]"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <h3 className="font-header uppercase tracking-wider text-base sm:text-lg mb-2">
                  {item.country}
                </h3>
                <div className="mb-3">
                  <div className="font-header text-[1.55rem] sm:text-3xl tracking-tight text-soviet-cream break-all sm:break-normal">
                    {item.amount}
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.15em] text-soviet-red/85">
                    Срок: {item.term}
                  </div>
                </div>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 rounded-full border border-white/10 bg-black/20 text-[10px] uppercase tracking-wider text-soviet-cream/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-soviet-cream/75 text-sm leading-relaxed">
                  {item.result}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl sm:rounded-3xl border border-soviet-cream/10 bg-zinc-900 p-4 sm:p-8">
          <h2 className="font-header text-xl sm:text-3xl font-black uppercase italic mb-1">
            Отзывы
          </h2>
          <p className="text-soviet-cream/60 text-sm mb-4">
            Рейтинг на независимых площадках - 5*
          </p>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
            <p className="text-soviet-cream/80 text-sm leading-relaxed">
              «Работаем с командой Raketa Pay на регулярной основе. Нравится, что
              есть понятный процесс, прогноз по срокам и сопровождение до
              финального зачисления».
            </p>
            <p className="mt-3 text-[11px] uppercase tracking-widest text-soviet-cream/50">
              Финансовый менеджер, импорт-компания
            </p>
          </div>
        </section>

        <section id="flow" className="mt-4 rounded-2xl sm:rounded-3xl border border-soviet-cream/10 bg-zinc-900 p-4 sm:p-8">
          <h2 className="font-header text-xl sm:text-3xl font-black uppercase italic mb-4">
            Как проходит платеж
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {FLOW.map((step, idx) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="w-8 h-8 rounded-full bg-soviet-red/20 border border-soviet-red/40 flex items-center justify-center font-header text-soviet-red text-sm mb-3">
                  {idx + 1}
                </div>
                <p className="text-soviet-cream/80 text-sm leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="mt-4 rounded-2xl sm:rounded-3xl border border-soviet-cream/10 bg-zinc-900 p-4 sm:p-8">
          <h2 className="font-header text-xl sm:text-3xl font-black uppercase italic mb-4">
            FAQ для юрлиц
          </h2>
          <div className="space-y-3">
            {FAQ.map((item, idx) => (
              <details
                key={item.q}
                className="animate-step-in rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 group"
                style={{ animationDelay: `${idx * 70}ms` }}
              >
                <summary className="list-none cursor-pointer flex items-center justify-between gap-3">
                  <h3 className="font-header uppercase tracking-wide text-sm sm:text-base">
                    {item.q}
                  </h3>
                  <span className="text-soviet-cream/60 group-open:rotate-45 transition-transform text-xl leading-none">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-soviet-cream/70 text-sm leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={PHONE_HREF}
                className="inline-flex items-center justify-center min-h-[48px] border border-soviet-cream/30 text-soviet-cream font-header text-xs sm:text-sm px-6 py-3 uppercase tracking-widest hover:bg-white/5 transition-colors"
              >
                Позвонить
              </a>
              <MessengerChoiceTrigger
                className="inline-flex items-center justify-center min-h-[48px] bg-soviet-red text-white font-header text-xs sm:text-sm px-6 py-3 uppercase tracking-widest hover:bg-red-700 transition-colors"
              >
                Написать
              </MessengerChoiceTrigger>
            </div>
            <p className="mt-3 text-soviet-cream/50 text-xs">
              E-mail для заявок:{" "}
              <a
                href={`mailto:${EMAIL}`}
                className="hover:text-soviet-red transition-colors"
              >
                {EMAIL}
              </a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

