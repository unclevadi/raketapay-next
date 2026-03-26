"use client";

declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: any[]) => void;
  }
}

const YM_ID = 108240458;
const PROMO_CODE = "РАКЕТА";

export function PromoCard() {
  return (
    <section className="md:col-span-4 bg-zinc-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 bento-card flex flex-col justify-between overflow-hidden relative border border-tech-cyan/20">
      <div className="absolute -left-10 -bottom-10 opacity-10">
        <div className="w-48 h-48 rounded-full bg-tech-cyan/30 blur-[2px]" />
      </div>
      <div>
        <div className="text-tech-cyan mb-4">
          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-3.314 0-6 1.79-6 4v3a1 1 0 001 1h10a1 1 0 001-1v-3c0-2.21-2.686-4-6-4z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 8V6a2 2 0 114 0v2" />
          </svg>
        </div>
        <h3 className="font-header text-[clamp(1.2rem,2.4vw,1.65rem)] font-bold uppercase mb-2">
          Акция
        </h3>
        <p className="text-soviet-cream/70 text-[15px] sm:text-base leading-relaxed">
          Скажите промокод оператору - получите бонус к комиссии.
        </p>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-soviet-cream/50">Промокод</div>
            <div className="font-header text-lg tracking-wider text-soviet-cream truncate">{PROMO_CODE}</div>
          </div>
          <button
            type="button"
            className="shrink-0 inline-flex items-center justify-center h-10 px-4 rounded-lg bg-tech-cyan/20 text-tech-cyan border border-tech-cyan/30 hover:bg-tech-cyan/25 transition-colors font-header text-[10px] uppercase tracking-widest"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(PROMO_CODE);
              } catch {}
              try {
                window.ym?.(YM_ID, "reachGoal", "promo_code_copy", { code: PROMO_CODE });
              } catch {}
            }}
          >
            Копировать
          </button>
        </div>
      </div>
      <div className="mt-8 text-[13px] sm:text-sm font-mono text-tech-cyan/50 tracking-widest">
        КОД: {PROMO_CODE}
      </div>
    </section>
  );
}

