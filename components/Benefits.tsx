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
          <h3 className="font-header text-xl font-bold uppercase mb-2">
            Глобальный охват
          </h3>
          <p className="text-soviet-cream/60 text-sm">
            Любая точка планеты, любой зарубежный сервис. Наши границы там, где
            мы захотим.
          </p>
        </div>
        <div className="mt-8 text-xs font-mono text-tech-cyan/50 tracking-widest">
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
          <h3 className="font-header text-xl font-bold uppercase mb-2">
            Скорость Света
          </h3>
          <p className="text-soviet-cream/60 text-sm">
            Оплата в течение 15 минут. Быстрее, чем первая ступень отделяется от
            носителя.
          </p>
        </div>
        <div className="mt-8 text-xs font-mono text-tech-cyan/50 tracking-widest">
          LATENCY: &lt;15 MIN
        </div>
      </section>
    </>
  );
}
