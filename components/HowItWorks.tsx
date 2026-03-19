import { Fragment } from "react";

const STEPS = [
  {
    num: "01",
    title: "Запрос",
    desc: "Пишете нам в Telegram, какой сервис нужно оплатить.",
  },
  {
    num: "02",
    title: "Оплата",
    desc: "Переводите сумму в рублях по нашему курсу.",
  },
  {
    num: "03",
    title: "Готово",
    desc: "Мы заходим и оплачиваем или даем данные карты.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="md:col-span-7 bg-zinc-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 bento-card relative overflow-hidden"
    >
      <h3 className="font-header text-xl sm:text-2xl font-black uppercase mb-6 sm:mb-8 italic">
        Траектория Полета
      </h3>
      <div className="flex flex-col md:flex-row md:flex-nowrap items-stretch md:items-center gap-2 md:gap-6 relative">
        {STEPS.map((step, i) => (
          <Fragment key={step.num}>
            <div
              className="flex items-start md:items-center gap-4 animate-step-in"
              style={{ animationDelay: `${i * 140}ms` }}
            >
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div
                  className="w-8 h-8 rounded-full border border-soviet-red flex items-center justify-center text-soviet-red font-header text-xs animate-num-pulse shrink-0"
                  style={{ animationDelay: `${i * 140}ms` }}
                >
                  {step.num}
                </div>
                <div className="font-header text-xs uppercase tracking-tighter">
                  {step.title}
                </div>
                <p className="text-xs text-soviet-cream/50 max-w-none md:max-w-[130px]">
                  {step.desc}
                </p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="hidden md:flex text-soviet-cream/20 text-2xl animate-arrow-sweep shrink-0 px-1">
                  →
                </div>
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex md:hidden justify-center py-1 text-soviet-cream/25 text-lg animate-arrow-sweep">
                ↓
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </section>
  );
}
