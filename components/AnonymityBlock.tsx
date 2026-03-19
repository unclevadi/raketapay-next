import Image from "next/image";

const ANON_IMAGE = "/images/anonymity-bg.png";

export function AnonymityBlock() {
  return (
    <section className="md:col-span-8 bg-zinc-900 rounded-2xl sm:rounded-3xl bento-card relative overflow-hidden group min-h-[220px] sm:min-h-[200px]">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black/70 z-10" />
        <Image
          src={ANON_IMAGE}
          alt="Конфиденциальность"
          fill
          className="object-cover object-[50%_28%] group-hover:scale-105 transition-transform duration-700"
          sizes="(max-width: 768px) 100vw, 66vw"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-soviet-black/90 via-soviet-black/50 to-transparent z-20" />
      <div className="relative z-30 p-5 sm:p-8 h-full min-h-[220px] sm:min-h-[180px] flex flex-col justify-end">
        <h3 className="font-header text-xl sm:text-2xl font-black uppercase mb-2 headline-outline">
          Полная Анонимность
        </h3>
        <p className="text-soviet-cream/70 max-w-md text-sm sm:text-base">
          Ваши данные - это только ваше дело. Мы не задаем лишних вопросов, мы
          просто выполняем задачу.
        </p>
      </div>
    </section>
  );
}
