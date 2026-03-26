const WORKING_HOURS = "Пн-Пт 09:00-24:00, Сб-Вс 09:00-21:00 (МСК)";

import { PreferredChannelPoll } from "@/components/PreferredChannelPoll";
import { PromoCard } from "@/components/PromoCard";

export function Benefits() {
  return (
    <>
      <section
        id="benefits"
        className="md:col-span-4 bg-zinc-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 bento-card flex flex-col justify-between border-l-4 border-l-soviet-red"
      >
        <div>
          <div className="text-tech-cyan mb-4">
            <svg
              className="h-10 w-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0h.5a2.5 2.5 0 002.5-2.5V3.935M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="font-header text-[clamp(1.2rem,2.4vw,1.65rem)] font-bold uppercase mb-2">
            Глобальный охват
          </h3>
          <p className="text-soviet-cream/70 text-[15px] sm:text-base leading-relaxed">
            Любая точка планеты, любой зарубежный сервис. Наши границы там, где
            мы захотим.
          </p>
        </div>
        <div className="mt-8 text-[13px] sm:text-sm font-mono text-tech-cyan/50 tracking-widest">
          LOCATION: ORBITAL_WIDE
        </div>
      </section>

      <section className="md:col-span-4 bg-zinc-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 bento-card flex flex-col justify-between overflow-hidden relative">
        <div className="absolute -right-4 -top-4 opacity-10">
          <div className="w-40 h-40 rounded-full bg-tech-cyan/20" />
        </div>
        <div>
          <div className="text-tech-cyan mb-4">
            <svg
              className="h-10 w-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h3 className="font-header text-[clamp(1.2rem,2.4vw,1.65rem)] font-bold uppercase mb-2">
            Скорость Света
          </h3>
          <p className="text-soviet-cream/70 text-[15px] sm:text-base leading-relaxed">
            Оплата в течение 15 минут. Быстрее, чем первая ступень отделяется от
            носителя.
          </p>
        </div>
        <div className="mt-8 text-[13px] sm:text-sm font-mono text-tech-cyan/50 tracking-widest">
          LATENCY: &lt;15 MIN
        </div>
      </section>

      <section className="md:col-span-4 bg-zinc-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 bento-card flex flex-col justify-between overflow-hidden relative border border-emerald-300/15">
        <div className="absolute -right-10 -bottom-10 opacity-10">
          <div className="w-48 h-48 rounded-full bg-emerald-400/30 blur-[2px]" />
        </div>
        <div>
          <div className="text-emerald-300 mb-4">
            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-header text-[clamp(1.2rem,2.4vw,1.65rem)] font-bold uppercase mb-2">
            Режим работы
          </h3>
          <p className="text-soviet-cream/70 text-[15px] sm:text-base leading-relaxed">
            {WORKING_HOURS}
          </p>
        </div>
        <div className="mt-8 text-[13px] sm:text-sm font-mono text-emerald-200/70 tracking-widest">
          MSK (UTC+3)
        </div>
      </section>

      <PromoCard />

      <PreferredChannelPoll />
    </>
  );
}
