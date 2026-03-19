export function Conditions() {
  return (
    <section className="md:col-span-5 grid grid-cols-2 gap-2 sm:gap-4 min-w-0">
      <div className="bg-soviet-red rounded-2xl sm:rounded-3xl p-4 sm:p-6 bento-card flex flex-col justify-center items-center text-center min-h-[120px] sm:min-h-0">
        <span className="font-header text-3xl sm:text-4xl font-black mb-1 italic">15%</span>
        <span className="font-header text-[8px] uppercase tracking-widest opacity-80">
          Комиссия
        </span>
      </div>
      <div className="bg-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 bento-card flex flex-col justify-center items-center text-center border border-soviet-cream/10 min-h-[120px] sm:min-h-0">
        <span className="font-header text-3xl sm:text-4xl font-black mb-1 italic">24/7</span>
        <span className="font-header text-[8px] uppercase tracking-widest opacity-80">
          Поддержка
        </span>
      </div>
    </section>
  );
}
