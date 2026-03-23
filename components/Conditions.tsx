export function Conditions() {
  return (
    <section className="md:col-span-5 grid grid-cols-2 gap-2 sm:gap-4 min-w-0">
      <div className="bg-soviet-red rounded-2xl sm:rounded-3xl p-4 sm:p-6 bento-card flex flex-col justify-center items-center text-center min-h-[120px] sm:min-h-0">
        <span className="font-header text-[clamp(1rem,4.2vw,1.55rem)] sm:text-[1.55rem] md:text-[1.35rem] lg:text-3xl font-black mb-1 italic leading-[1.03]">
          Итоговая
          <br />
          стоимость
        </span>
        <span className="font-header text-[10px] sm:text-[11px] md:text-[10px] uppercase tracking-[0.08em] sm:tracking-[0.12em] opacity-90 leading-tight">
          Включая все расходы
        </span>
      </div>
      <div className="bg-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 bento-card flex flex-col justify-center items-center text-center border border-soviet-cream/10 min-h-[120px] sm:min-h-0">
        <span className="font-header text-3xl sm:text-4xl font-black mb-1 italic">24/7</span>
        <span className="font-header text-[10px] sm:text-xs uppercase tracking-widest opacity-80">
          Поддержка
        </span>
      </div>
    </section>
  );
}
