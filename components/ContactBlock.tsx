import { MessengerChoiceTrigger } from "@/components/MessengerChoiceTrigger";

const PHONE_LABEL = "+7 (999) 123-45-67";
const PHONE_HREF = "tel:+79991234567";
const EMAIL = "info@raketapay.ru";
const WORKING_HOURS = "Пн-Пт 09:00-24:00, Сб-Вс 09:00-21:00 (МСК)";

export function ContactBlock() {
  return (
    <section className="mt-3 sm:mt-4 rounded-2xl sm:rounded-3xl border border-soviet-cream/10 bg-zinc-900 p-5 sm:p-8">
      <h2 className="font-header text-xl sm:text-3xl font-black uppercase italic">
        Контакты
      </h2>
      <p className="mt-2 text-soviet-cream/70 text-sm sm:text-base max-w-3xl">
        Нужна оплата сервиса, подписки или международный перевод? Выберите удобный
        канал - Telegram, либо позвоните.
      </p>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <a
          href={PHONE_HREF}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm hover:bg-white/10 transition-colors"
        >
          <span className="block text-soviet-cream/50 text-[11px] uppercase tracking-widest">
            Телефон
          </span>
          <span className="font-header text-soviet-cream">{PHONE_LABEL}</span>
        </a>
        <a
          href={`mailto:${EMAIL}`}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm hover:bg-white/10 transition-colors"
        >
          <span className="block text-soviet-cream/50 text-[11px] uppercase tracking-widest">
            E-mail
          </span>
          <span className="font-header text-soviet-cream">{EMAIL}</span>
        </a>
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
          <span className="block text-soviet-cream/50 text-[11px] uppercase tracking-widest">
            Режим работы
          </span>
          <span className="text-soviet-cream/90">{WORKING_HOURS}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <MessengerChoiceTrigger
          className="inline-flex items-center justify-center min-h-[48px] bg-soviet-red text-white font-header text-xs sm:text-sm px-6 py-3 uppercase tracking-widest hover:bg-red-700 transition-colors"
        >
          Получить консультацию
        </MessengerChoiceTrigger>
        <a
          href={PHONE_HREF}
          className="inline-flex items-center justify-center min-h-[48px] border border-soviet-cream/25 text-soviet-cream font-header text-xs sm:text-sm px-6 py-3 uppercase tracking-widest hover:bg-white/5 transition-colors"
        >
          Заказать обратный звонок
        </a>
      </div>
    </section>
  );
}
