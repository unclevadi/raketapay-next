const PRICE_EXAMPLES = [
  { service: "ChatGPT Plus", total: "от 2 690 ₽" },
  { service: "YouTube Premium", total: "от 1 490 ₽" },
  { service: "Spotify Premium", total: "от 1 390 ₽" },
  { service: "Netflix", total: "от 1 990 ₽" },
  { service: "Alipay пополнение", total: "по запросу" },
  { service: "Международный перевод", total: "по маршруту" },
];

const MARQUEE_ITEMS = [
  "ChatGPT Plus: от 2 690 ₽",
  "YouTube Premium: от 1 490 ₽",
  "Spotify Premium: от 1 390 ₽",
  "Netflix: от 1 990 ₽",
  "Apple One: от 2 190 ₽",
  "Disney+: от 1 590 ₽",
  "Notion: от 1 490 ₽",
  "Figma: от 1 890 ₽",
  "Adobe CC: от 3 490 ₽",
  "Zoom: от 1 790 ₽",
  "Slack: от 2 290 ₽",
  "GitLab: от 2 190 ₽",
  "Shopify: от 2 990 ₽",
  "Alipay: по запросу",
  "Переводы: итог после проверки маршрута",
];

export function PriceExamples() {
  return (
    <section className="md:col-span-12 bg-zinc-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 bento-card border border-soviet-cream/10">
      <h3 className="font-header text-[clamp(1.25rem,5vw,2rem)] font-black uppercase italic mb-2">
        Примеры итоговой стоимости
      </h3>
      <p className="text-soviet-cream/75 text-[15px] sm:text-base leading-relaxed mb-5">
        Показываем ориентиры в формате “сервис → итог”. Точная сумма зависит от
        направления и условий, финал согласовываем перед оплатой.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5">
        {PRICE_EXAMPLES.map((item) => (
          <div
            key={item.service}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <p className="text-soviet-cream/70 text-[13px] sm:text-sm leading-relaxed">{item.service}</p>
            <p className="font-header text-base sm:text-lg mt-1">{item.total}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-soviet-red/25 bg-soviet-red/10">
        <div className="price-marquee py-2.5 text-[13px] sm:text-sm text-soviet-cream/85">
          <div className="price-marquee-track">
            {MARQUEE_ITEMS.map((item, idx) => (
              <span key={`a-${idx}`} className="mx-5 whitespace-nowrap">
                {item}
              </span>
            ))}
            {MARQUEE_ITEMS.map((item, idx) => (
              <span key={`b-${idx}`} className="mx-5 whitespace-nowrap">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
