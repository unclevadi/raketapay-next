"use client";

type Stage = { id: string; label: string; sort_order: number };

type Props = {
  stages: Stage[];
  currentId: string;
  busy: boolean;
  onSelectStage: (stageId: string) => void;
};

export function DealStageRail({ stages, currentId, busy, onSelectStage }: Props) {
  const idx = stages.findIndex((s) => s.id === currentId);

  function go(delta: number) {
    const next = idx + delta;
    if (next < 0 || next >= stages.length) return;
    onSelectStage(stages[next].id);
  }

  return (
    <section className="rounded-2xl border border-violet-500/25 bg-violet-950/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-header text-[10px] uppercase tracking-[0.2em] text-violet-300/90">
          Сменить этап
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy || idx <= 0}
            onClick={() => go(-1)}
            className="rounded-lg border border-white/15 px-3 py-1.5 font-header text-[10px] uppercase tracking-widest text-soviet-cream/80 hover:bg-white/5 disabled:opacity-35"
          >
            ← Назад
          </button>
          <button
            type="button"
            disabled={busy || idx < 0 || idx >= stages.length - 1}
            onClick={() => go(1)}
            className="rounded-lg border border-white/15 px-3 py-1.5 font-header text-[10px] uppercase tracking-widest text-soviet-cream/80 hover:bg-white/5 disabled:opacity-35"
          >
            Вперёд →
          </button>
        </div>
      </div>
      {stages.length === 0 ? (
        <p className="mt-3 text-[13px] text-amber-200/80">
          Справочник этапов не загрузился (проверьте права B2B и таблицу{" "}
          <code className="text-tech-cyan/80">crm_b2b_pipeline_stages</code>). Без него статус на
          карточке не отобразится.
        </p>
      ) : null}
      <div className="mt-3 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-1.5">
          {stages.map((s, i) => {
            const active = s.id === currentId;
            const past = idx >= 0 && i < idx;
            return (
              <button
                key={s.id}
                type="button"
                disabled={busy}
                onClick={() => onSelectStage(s.id)}
                title={s.label}
                className={`max-w-[140px] shrink-0 rounded-lg border px-2.5 py-2 text-left text-[11px] leading-snug transition-colors disabled:opacity-40 ${
                  active
                    ? "border-violet-400/70 bg-violet-600/25 text-violet-100"
                    : past
                      ? "border-emerald-500/25 bg-emerald-950/20 text-emerald-200/75"
                      : "border-white/10 bg-zinc-950/60 text-soviet-cream/55 hover:border-white/20 hover:text-soviet-cream/80"
                }`}
              >
                <span className="block font-mono text-[9px] text-soviet-cream/35">{i + 1}</span>
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
