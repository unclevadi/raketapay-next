import { MessengerChoiceTrigger } from "@/components/MessengerChoiceTrigger";

export function CTA() {
  return (
    <section className="md:col-span-12 bg-soviet-red rounded-2xl sm:rounded-3xl px-4 py-9 sm:p-12 md:p-20 bento-card text-center relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 w-40 h-1 bg-white" />
        <div className="absolute bottom-10 right-10 w-40 h-1 bg-white" />
      </div>
      <h2 className="font-header text-[clamp(1.6rem,8vw,4.5rem)] sm:text-4xl md:text-7xl font-black uppercase italic mb-5 sm:mb-8 relative z-10 leading-tight">
        Готов к взлету?
      </h2>
      <MessengerChoiceTrigger
        className="inline-flex flex-col min-[400px]:flex-row items-center justify-center gap-2.5 sm:gap-6 bg-white text-soviet-red px-5 sm:px-10 py-4 sm:py-6 font-header text-[15px] sm:text-lg uppercase tracking-[0.08em] sm:tracking-widest active:scale-[0.98] sm:hover:scale-105 transition-all shadow-xl group-hover:shadow-white/20 relative z-10 w-full max-w-md sm:max-w-none sm:w-auto min-h-[52px]"
      >
        <span className="text-center">Выбрать канал связи</span>
        <span className="text-[10px] sm:text-xs tracking-[0.18em] opacity-80 -mt-1 sm:mt-0 sm:-ml-2">
          Telegram
        </span>
        <svg
          className="h-5 w-5 sm:h-6 sm:w-6 transform sm:group-hover:translate-x-2 transition-transform shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          />
        </svg>
      </MessengerChoiceTrigger>
      <p className="mt-5 sm:mt-8 font-header text-[10px] sm:text-[11px] tracking-[0.16em] sm:tracking-[0.38em] uppercase opacity-75 relative z-10 px-2 leading-relaxed">
        Ваш надежный терминал в мире без границ
      </p>
    </section>
  );
}
