const OTZOVIK_URL =
  "https://otzovik.com/reviews/raketapay_ru-servis_oplati_zarubezhnih_servisov_i_podpisok/";

type Review = {
  author: string;
  rating: number; // 1..5
  date: string;
  text: string;
};

const REVIEWS: Review[] = [
  {
    author: "Alekscrupto",
    rating: 5,
    date: "2026",
    text: "Столкнулся с проблемой оплаты подписок на ИИ‑сервисы и нашёл ребят. Стиль - ретрофутуризм, коммуникация удобная, скорость - реально 10–15 минут до результата. По сервисам - ощущение, что могут оплатить почти всё. Общее впечатление крайне хорошее, отзывчивые и помогающие. Из рекомендаций - добавить ещё каналы связи (например, ВК).",
  },
];

function Stars({ rating }: { rating: number }) {
  const safe = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`Оценка: ${safe} из 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={i < safe ? "text-amber-300" : "text-soviet-cream/20"}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function Reviews() {
  return (
    <section
      id="reviews"
      className="md:col-span-12 bg-zinc-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 bento-card border border-soviet-cream/10 relative overflow-hidden"
    >
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-tech-cyan/10 blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-soviet-red/10 blur-[80px] pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-header text-[clamp(1.25rem,5vw,2rem)] font-black uppercase italic mb-2">
            Отзывы
          </h3>
          <p className="text-soviet-cream/75 text-[15px] sm:text-base leading-relaxed max-w-3xl">
            Реальные впечатления клиентов. Источник -{" "}
            <a
              href={OTZOVIK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 decoration-white/20 hover:decoration-soviet-red transition-colors"
            >
              Otzovik
            </a>
            .
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 shrink-0">
          <a
            href={OTZOVIK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center min-h-[44px] px-5 bg-soviet-red text-white font-header text-[11px] sm:text-xs uppercase tracking-widest hover:bg-red-700 transition-colors"
          >
            Читать на Otzovik
          </a>
          <a
            href={OTZOVIK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center min-h-[44px] px-5 border border-soviet-cream/20 text-soviet-cream font-header text-[11px] sm:text-xs uppercase tracking-widest hover:bg-white/5 transition-colors"
          >
            Оставить отзыв
          </a>
        </div>
      </div>

      <div className="relative z-10 mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {REVIEWS.map((r, idx) => (
          <article
            key={`${idx}-${r.author}-${r.date}`}
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-4 sm:p-5 md:col-span-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-header uppercase tracking-wider text-sm sm:text-base truncate">
                  {r.author}
                </div>
                <div className="text-[11px] uppercase tracking-widest text-soviet-cream/45 mt-1">
                  {r.date}
                </div>
              </div>
              <Stars rating={r.rating} />
            </div>
            <p className="mt-3 text-soviet-cream/80 text-sm leading-relaxed">
              “{r.text}”
            </p>
            <div className="mt-4">
              <a
                href={OTZOVIK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] uppercase tracking-widest text-tech-cyan/90 hover:text-tech-cyan transition-colors"
              >
                Открыть источник →
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

