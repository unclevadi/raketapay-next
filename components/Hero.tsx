import Image from "next/image";
import { MessengerChoiceTrigger } from "@/components/MessengerChoiceTrigger";

// Используем картинку с космонавткой как подложку для героя.
// Сохрани файл в папку public/images под именем "hero-cosmonaut.png".
// Тогда путь ниже работать будет сразу.
const HERO_IMAGE = "/images/hero-cosmonaut.png";

export function Hero() {
  return (
    <section
      id="hero"
      className="md:col-span-8 md:row-span-2 relative overflow-hidden bg-zinc-900 rounded-2xl sm:rounded-3xl bento-card group min-h-[min(68vh,560px)] sm:min-h-[min(78vh,620px)] md:min-h-[min(85vh,660px)] flex items-end"
    >
      <div className="absolute inset-0 z-0">
        {/* Полупрозрачный фильтр по всей высоте, без светлого верха */}
        <div className="absolute inset-0 bg-black/70 z-10" />
        <div className="absolute inset-0 bg-zinc-800">
          <Image
            src={HERO_IMAGE}
            alt="Космос и технологии - RaketaPay"
            fill
            className="object-cover object-center opacity-70 group-hover:scale-105 transition-transform duration-700"
            sizes="(max-width: 768px) 100vw, 66vw"
            priority
          />
        </div>
      </div>
      <div className="relative z-10 p-4 sm:p-8 w-full">
        <h1 className="font-header text-[clamp(1.8rem,8.2vw,4.35rem)] sm:text-[clamp(2.25rem,4vw,4.8rem)] md:text-[clamp(2.6rem,3.2vw,5rem)] leading-tight font-black uppercase italic mb-3 sm:mb-4 headline-outline">
          Оплачиваем всё.
          <br />
          <span className="text-soviet-red headline-outline">Без ограничений.</span>
        </h1>
        <p className="text-soviet-cream/75 text-[15px] md:text-base leading-relaxed max-w-xl mb-4 sm:mb-6">
          Подписки, сервисы, аренда, путешествия - мощь космических технологий на
          службе вашего комфорта.
        </p>
        <div className="flex flex-col min-[400px]:flex-row flex-wrap gap-3 sm:gap-4">
          <MessengerChoiceTrigger
            className="inline-flex justify-center bg-soviet-red text-white px-6 sm:px-8 py-3.5 sm:py-4 font-header text-sm sm:text-sm uppercase tracking-[0.08em] sm:tracking-widest hover:bg-red-700 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(190,30,45,0.4)] min-h-[48px] items-center"
          >
            Получить консультацию
          </MessengerChoiceTrigger>
        </div>
      </div>
    </section>
  );
}
