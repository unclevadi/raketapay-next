"use client";

import { useEffect, useState } from "react";
import { getServiceDetail, hasServiceDetail } from "@/lib/service-details";

function getTelegramOpenUrls(orderUrl: string) {
  // Формат из lib/service-details: tg://resolve?domain=...&text=...
  const domainMatch = orderUrl.match(/[?&]domain=([^&]+)/);
  const textMatch = orderUrl.match(/[?&]text=([^&]+)/);
  const domain = domainMatch ? decodeURIComponent(domainMatch[1]) : "raketa_pay";
  const text = textMatch ? decodeURIComponent(textMatch[1]) : "";

  return {
    appUrl: `tg://resolve?domain=${encodeURIComponent(domain)}&text=${encodeURIComponent(text)}`,
    webUrl: `https://t.me/${encodeURIComponent(domain)}?text=${encodeURIComponent(text)}`,
  };
}
type ServiceIcon =
  | {
      name: string;
      // SVG-иконки берём из simpleicons через cdn.simpleicons.org
      iconUrl: string;
      type?: "remote";
      iconBgClass?: string;
    }
  | {
      name: string;
      type: "fallback";
      initials: string;
      bgClass: string;
    };

const SERVICES: ServiceIcon[] = [
  // Главное - чтобы корректно работали бренды, которые ты перечислил
  // Для ChatGPT, Adobe, Slack, Amazon используем локальные иконки из public/icons
  { name: "ChatGPT", iconUrl: "/icons/chatgpt.png", type: "remote" },
  { name: "Netflix", iconUrl: "https://cdn.simpleicons.org/netflix" },
  { name: "Spotify", iconUrl: "https://cdn.simpleicons.org/spotify" },
  { name: "YouTube", iconUrl: "https://cdn.simpleicons.org/youtube" },
  { name: "Apple", iconUrl: "https://cdn.simpleicons.org/apple" },
  { name: "Notion", iconUrl: "https://cdn.simpleicons.org/notion" },
  { name: "Figma", iconUrl: "https://cdn.simpleicons.org/figma" },
  {
    name: "Adobe",
    iconUrl: "/icons/adobe.png",
    type: "remote",
    // Красный фон, чтобы белая буква A была видна
    iconBgClass: "bg-red-600 rounded-md",
  },
  { name: "Zoom", iconUrl: "https://cdn.simpleicons.org/zoom" },
  { name: "Slack", iconUrl: "/icons/slack.png", type: "remote" },
  { name: "Booking.com", iconUrl: "https://cdn.simpleicons.org/booking.com" },
  { name: "Airbnb", iconUrl: "https://cdn.simpleicons.org/airbnb" },
  { name: "Emirates", iconUrl: "https://cdn.simpleicons.org/emirates" },
  {
    name: "Turkish Airlines",
    iconUrl: "https://cdn.simpleicons.org/turkishairlines",
  },
  {
    name: "Discord",
    iconUrl: "https://cdn.simpleicons.org/discord",
  },
  { name: "Roblox", iconUrl: "https://cdn.simpleicons.org/roblox" },
  {
    name: "PlayStation",
    iconUrl: "https://cdn.simpleicons.org/playstation",
  },
  { name: "Steam", iconUrl: "https://cdn.simpleicons.org/steam" },
  { name: "Tinder", iconUrl: "https://cdn.simpleicons.org/tinder" },
  { name: "OnlyFans", iconUrl: "https://cdn.simpleicons.org/onlyfans" },
  { name: "Badoo", iconUrl: "https://cdn.simpleicons.org/badoo" },
  { name: "Patreon", iconUrl: "https://cdn.simpleicons.org/patreon" },
];

const CATEGORIES = [
  { id: "subs", label: "Подписки & Софт", color: "bg-soviet-red" },
  { id: "travel", label: "Путешествия & Жилье", color: "bg-tech-cyan" },
  { id: "market", label: "Маркетплейсы & Игры", color: "bg-soviet-cream" },
];

const CDN_ICON = (slug: string) => `https://cdn.simpleicons.org/${slug}`;

type CategoryItem = { name: string; iconUrl: string };

const CATEGORY_SERVICES: Record<string, CategoryItem[]> = {
  subs: [
    { name: "ChatGPT", iconUrl: "/icons/chatgpt.png" },
    { name: "Netflix", iconUrl: CDN_ICON("netflix") },
    { name: "Spotify", iconUrl: CDN_ICON("spotify") },
    { name: "YouTube Premium", iconUrl: "" },
    { name: "Apple One", iconUrl: CDN_ICON("apple") },
    { name: "Disney+", iconUrl: "" },
    { name: "Notion", iconUrl: CDN_ICON("notion") },
    { name: "Figma", iconUrl: CDN_ICON("figma") },
    { name: "Adobe Creative Cloud", iconUrl: "/icons/adobe.png" },
    { name: "Zoom", iconUrl: CDN_ICON("zoom") },
    { name: "Slack", iconUrl: "/icons/slack.png" },
    { name: "Discord Nitro", iconUrl: CDN_ICON("discord") },
    { name: "Google One", iconUrl: CDN_ICON("google") },
    { name: "Dropbox", iconUrl: CDN_ICON("dropbox") },
    { name: "Canva Pro", iconUrl: "" },
    { name: "Miro", iconUrl: CDN_ICON("miro") },
    { name: "Trello", iconUrl: CDN_ICON("trello") },
    { name: "NordVPN", iconUrl: CDN_ICON("nordvpn") },
    { name: "ExpressVPN", iconUrl: CDN_ICON("expressvpn") },
    { name: "Amazon Prime", iconUrl: "/icons/amazon.png" },
    { name: "SoundCloud", iconUrl: CDN_ICON("soundcloud") },
    { name: "Patreon", iconUrl: CDN_ICON("patreon") },
    { name: "Tinder", iconUrl: CDN_ICON("tinder") },
    { name: "OnlyFans", iconUrl: CDN_ICON("onlyfans") },
    { name: "Badoo", iconUrl: CDN_ICON("badoo") },
    { name: "GitHub", iconUrl: CDN_ICON("github") },
    { name: "Deezer", iconUrl: CDN_ICON("deezer") },
    { name: "Tidal", iconUrl: CDN_ICON("tidal") },
  ],
  travel: [
    { name: "Booking.com", iconUrl: CDN_ICON("bookingdotcom") },
    { name: "Airbnb", iconUrl: CDN_ICON("airbnb") },
    { name: "Expedia", iconUrl: CDN_ICON("expedia") },
    { name: "Hotels.com", iconUrl: CDN_ICON("hotelsdotcom") },
    { name: "Emirates", iconUrl: CDN_ICON("emirates") },
    { name: "Turkish Airlines", iconUrl: CDN_ICON("turkishairlines") },
    { name: "Lufthansa", iconUrl: CDN_ICON("lufthansa") },
    { name: "Air France", iconUrl: CDN_ICON("airfrance") },
    { name: "British Airways", iconUrl: CDN_ICON("britishairways") },
    { name: "Ryanair", iconUrl: CDN_ICON("ryanair") },
    { name: "Klook", iconUrl: CDN_ICON("klook") },
    { name: "Trip.com", iconUrl: CDN_ICON("tripdotcom") },
  ],
  market: [
    { name: "Steam", iconUrl: CDN_ICON("steam") },
    { name: "Epic Games", iconUrl: CDN_ICON("epicgames") },
    { name: "PlayStation", iconUrl: CDN_ICON("playstation") },
    { name: "GOG", iconUrl: CDN_ICON("gogdotcom") },
    { name: "Ubisoft", iconUrl: CDN_ICON("ubisoft") },
    { name: "EA", iconUrl: CDN_ICON("ea") },
    { name: "Roblox", iconUrl: CDN_ICON("roblox") },
    { name: "Amazon", iconUrl: "/icons/amazon.png" },
    { name: "eBay", iconUrl: CDN_ICON("ebay") },
    { name: "AliExpress", iconUrl: CDN_ICON("aliexpress") },
    { name: "Etsy", iconUrl: CDN_ICON("etsy") },
    { name: "G2A", iconUrl: CDN_ICON("g2a") },
    { name: "Humble Bundle", iconUrl: CDN_ICON("humblebundle") },
  ],
};

export function Services() {
  const [activeService, setActiveService] = useState<string | null>(null);
  const [categoryModal, setCategoryModal] = useState<string | null>(null);
  const [iconErrors, setIconErrors] = useState<Record<string, boolean>>({});
  const [iconLoaded, setIconLoaded] = useState<Record<string, boolean>>({});

  const activeDetails =
    activeService != null ? getServiceDetail(activeService) : null;

  // Чтобы модалка не "ехала" вместе со скроллом страницы на мобиле.
  useEffect(() => {
    const open = activeService != null || categoryModal != null;
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";
    return () => {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = prevOverflow;
    };
  }, [activeService, categoryModal]);

  return (
    <section
      id="services"
      className="md:col-span-12 bg-zinc-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 bento-card relative overflow-hidden"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative z-10">
        <div className="md:col-span-1">
          <h2 className="font-header text-2xl sm:text-3xl font-black uppercase italic mb-3 sm:mb-4">
            Вселенная
            <br />
            Сервисов
          </h2>
          <p className="text-soviet-cream/60 text-sm mb-4">
            Подписки, софт, путешествия, маркетплейсы и игры - оплачиваем что
            угодно.
          </p>
          <p className="text-soviet-cream/50 text-xs leading-relaxed mb-8">
            Raketa Pay - сервис оплаты зарубежных подписок и сервисов из России.
            В 2026 году оформить подписку на ChatGPT, стриминг, софт и путешествия
            проще всего через нас: без лишних шагов и с понятной поддержкой в
            Telegram.
          </p>
          <div className="space-y-4">
            {CATEGORIES.map(({ id, label, color }) => (
              <button
                key={id}
                type="button"
                onClick={() => setCategoryModal(id)}
                className="w-full flex items-center gap-4 group text-left hover:opacity-90 transition-opacity"
              >
                <div
                  className={`w-2 h-2 ${color} group-hover:w-4 transition-all shrink-0`}
                />
                <span className="font-header text-[10px] tracking-widest uppercase">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="md:col-span-2 min-w-0">
          <div className="flex flex-wrap gap-2.5 sm:gap-4 items-center">
            {SERVICES.map((service) => {
              const isFallback = service.type === "fallback";
              // Карточки из lib/service-details (не локальный SERVICE_DETAILS)
              const clickable = hasServiceDetail(service.name);
              return (
                <div
                  key={service.name}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[44px] bg-white/5 border border-white/10 rounded-full hover:bg-white/10 active:bg-white/15 transition-colors touch-manipulation ${
                    clickable ? "cursor-pointer" : "cursor-default"
                  }`}
                  onClick={
                    clickable ? () => setActiveService(service.name) : undefined
                  }
                >
                  {isFallback ? (
                    <div
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-header uppercase text-soviet-cream ${service.bgClass}`}
                    >
                      {service.initials}
                    </div>
                  ) : (
                    <div
                      className={`h-6 w-6 flex items-center justify-center overflow-hidden ${
                        service.iconBgClass ?? ""
                      }`}
                    >
                      <img
                        src={service.iconUrl}
                        alt={service.name}
                        className="h-5 w-5 object-contain"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <span className="text-soviet-cream/80 text-xs sm:text-sm font-medium truncate max-w-[200px] min-[400px]:max-w-none">
                    {service.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-soviet-red/20 rounded-full blur-[100px] glow-effect" />

      {activeDetails && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 px-4 safe-area-pb overflow-hidden">
          <div className="max-w-lg w-full bg-zinc-900 border border-soviet-cream/10 rounded-3xl p-5 sm:p-6 md:p-8 shadow-2xl relative max-h-[92dvh] overflow-y-auto overscroll-contain">
            <button
              type="button"
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full text-soviet-cream/50 hover:text-soviet-cream hover:bg-white/5 transition-colors"
              onClick={() => setActiveService(null)}
              aria-label="Закрыть"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <h3 className="font-header text-lg sm:text-xl md:text-2xl font-black uppercase mb-3 pr-10">
              {activeDetails.title}
            </h3>
            <p className="text-soviet-cream/70 text-sm mb-6 leading-relaxed">
              {activeDetails.description}
            </p>
            {activeDetails.orderUrl && (
              <button
                type="button"
                onClick={() => {
                  const { appUrl, webUrl } = getTelegramOpenUrls(activeDetails.orderUrl!);

                  // 1) Пытаемся открыть приложение Telegram с текстом.
                  window.location.href = appUrl;

                  // 2) Если приложение не открылось, fallback в web-ссылку.
                  window.setTimeout(() => {
                    if (!document.hidden) {
                      window.open(webUrl, "_blank", "noopener,noreferrer");
                    }
                  }, 700);
                }}
                className="inline-flex items-center justify-center w-full sm:w-auto min-h-[48px] bg-soviet-red text-white font-header text-sm px-6 py-3 uppercase tracking-widest hover:bg-red-700 active:scale-[0.99] transition-colors touch-manipulation"
              >
                Оформить
              </button>
            )}
          </div>
        </div>
      )}

      {categoryModal && CATEGORY_SERVICES[categoryModal] && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 px-2 py-6 sm:px-4 sm:py-8 safe-area-pt safe-area-pb overflow-hidden">
          <div
            className={`max-w-4xl w-[96vw] sm:w-full bg-zinc-900 border rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl relative overflow-hidden max-h-[95dvh] flex flex-col ${
              categoryModal === "subs"
                ? "border-soviet-red/40"
                : categoryModal === "travel"
                  ? "border-tech-cyan/40"
                  : "border-soviet-cream/30"
            }`}
          >
            <div
              className={`absolute left-0 top-0 bottom-0 w-1 ${
                categoryModal === "subs"
                  ? "bg-soviet-red"
                  : categoryModal === "travel"
                    ? "bg-tech-cyan"
                    : "bg-soviet-cream"
              }`}
            />
            <button
              type="button"
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full text-soviet-cream/50 hover:text-soviet-cream hover:bg-white/5 transition-colors"
              onClick={() => setCategoryModal(null)}
              aria-label="Закрыть"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <h3 className="font-header text-lg sm:text-xl md:text-2xl font-black uppercase mb-2 pr-10 pl-4 shrink-0">
              {CATEGORIES.find((c) => c.id === categoryModal)?.label}
            </h3>
            <p className="text-soviet-cream/50 text-[11px] sm:text-xs mb-4 sm:mb-6 pl-4 shrink-0 leading-relaxed">
              Оплачиваем эти и другие сервисы в этой категории. Нажмите на сервис - откроется описание и кнопка «Оформить» в Telegram. Подберём тариф по запросу.
            </p>
            <div className="pl-1.5 sm:pl-4 pr-1.5 flex flex-wrap gap-x-2 gap-y-2 sm:gap-x-3 sm:gap-y-2.5 flex-1 min-h-0 overflow-y-auto overscroll-contain pb-4">
              {CATEGORY_SERVICES[categoryModal].map((item) => {
                const hasDetail = hasServiceDetail(item.name);
                const firstLetter = item.name.trim().slice(0, 1).toUpperCase();
                return (
                  <button
                    key={item.name}
                    type="button"
                    disabled={!hasDetail}
                    onClick={() => {
                      if (!hasDetail) return;
                      setCategoryModal(null);
                      setActiveService(item.name);
                    }}
                    className={`flex items-center gap-1 px-2 sm:px-3 py-2 min-h-[40px] rounded-full bg-white/5 border border-white/10 text-soviet-cream/80 text-[10.5px] sm:text-sm font-medium transition-colors text-left touch-manipulation ${
                      hasDetail
                        ? "hover:bg-white/10 hover:border-white/20 active:bg-white/15 cursor-pointer"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="relative h-5 w-5 shrink-0">
                      {/* Пока картинка не загрузилась — показываем бейдж, чтобы модалка не выглядела “битой”. */}
                      {!iconLoaded[item.name] || iconErrors[item.name] ? (
                        <div className="h-5 w-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-header text-soviet-cream/80 shrink-0">
                          {firstLetter}
                        </div>
                      ) : null}

                      {item.iconUrl ? (
                        <img
                          src={item.iconUrl}
                          alt=""
                          className={`absolute left-0 top-0 h-5 w-5 object-contain shrink-0 transition-opacity ${
                            iconLoaded[item.name] && !iconErrors[item.name]
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                          loading="lazy"
                          onLoad={() => {
                            setIconLoaded((prev) => ({
                              ...prev,
                              [item.name]: true,
                            }));
                          }}
                          onError={() => {
                            setIconErrors((prev) => ({
                              ...prev,
                              [item.name]: true,
                            }));
                          }}
                        />
                      ) : null}
                    </div>
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
