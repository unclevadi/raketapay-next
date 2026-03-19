"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const TELEGRAM_URL = "https://t.me/raketapay";

const NAV_LINKS = [
  { href: "#benefits", label: "Преимущества" },
  { href: "#services", label: "Сервисы" },
  { href: "#how-it-works", label: "Процесс" },
  { href: "#rocket-ticket", label: "Билет на ракету" },
] as const;

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [rocketModalOpen, setRocketModalOpen] = useState(false);

  useEffect(() => {
    const open = menuOpen || rocketModalOpen;
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen, rocketModalOpen]);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-soviet-black/80 backdrop-blur-md border-b border-soviet-cream/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 min-h-16 sm:min-h-20 safe-area-pt flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-3 min-w-0"
            onClick={() => setMenuOpen(false)}
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-soviet-red rounded-sm flex items-center justify-center rotate-45 shrink-0">
              <span className="leading-[1.05] text-white font-black -rotate-45 text-[1.05rem] sm:text-xl font-header">
                R
              </span>
            </div>
            <span className="leading-[1.1] font-header font-black text-[0.95rem] min-[400px]:text-[1.05rem] sm:text-2xl tracking-tighter uppercase italic whitespace-nowrap">
              RaketaPay
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 font-header text-xs uppercase tracking-widest">
            {NAV_LINKS.map(({ href, label }) =>
              href === "#rocket-ticket" ? (
                <button
                  key={href}
                  type="button"
                  onClick={() => setRocketModalOpen(true)}
                  className="hover:text-soviet-red transition-colors"
                >
                  {label}
                </button>
              ) : (
                <Link
                  key={href}
                  href={href}
                  className="hover:text-soviet-red transition-colors"
                >
                  {label}
                </Link>
              )
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-soviet-red hover:bg-red-700 text-white font-header text-[10px] sm:text-xs px-3 sm:px-6 py-2.5 sm:py-3 rounded-none uppercase tracking-widest transition-all whitespace-nowrap"
            >
              <span className="hidden min-[400px]:inline">Связаться</span>
              <span className="inline min-[400px]:hidden">TG</span>
            </Link>

            <button
              type="button"
              className="md:hidden w-11 h-11 flex flex-col items-center justify-center gap-1.5 rounded-lg border border-soviet-cream/15 text-soviet-cream hover:bg-white/5 transition-colors"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span
                className={`block w-5 h-0.5 bg-current origin-center transition-transform ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`}
              />
              <span
                className={`block w-5 h-0.5 bg-current transition-opacity ${menuOpen ? "opacity-0" : ""}`}
              />
              <span
                className={`block w-5 h-0.5 bg-current origin-center transition-transform ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`}
              />
            </button>
          </div>
        </div>
      </nav>

      <div
        id="mobile-nav"
        className={`fixed inset-0 z-40 md:hidden transition-[visibility,opacity] duration-200 ${
          menuOpen ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"
        }`}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          aria-label="Закрыть меню"
          onClick={() => setMenuOpen(false)}
        />
        <div
          className={`absolute top-16 sm:top-20 left-0 right-0 safe-area-pt border-b border-soviet-cream/10 bg-soviet-black/95 shadow-2xl transition-transform duration-200 ${
            menuOpen ? "translate-y-0" : "-translate-y-2"
          }`}
        >
          <nav className="px-4 py-6 flex flex-col gap-1 font-header text-sm uppercase tracking-widest">
            {NAV_LINKS.map(({ href, label }) => (
              href === "#rocket-ticket" ? (
                <button
                  key={href}
                  type="button"
                  className="text-left py-4 px-3 rounded-lg hover:bg-white/5 hover:text-soviet-red transition-colors border-b border-white/5 last:border-0"
                  onClick={() => {
                    setMenuOpen(false);
                    setRocketModalOpen(true);
                  }}
                >
                  {label}
                </button>
              ) : (
                <Link
                  key={href}
                  href={href}
                  className="py-4 px-3 rounded-lg hover:bg-white/5 hover:text-soviet-red transition-colors border-b border-white/5 last:border-0"
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </Link>
              )
            ))}
            <Link
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 py-4 text-center bg-soviet-red text-white rounded-lg hover:bg-red-700 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Telegram
            </Link>
          </nav>
        </div>
      </div>

      {rocketModalOpen && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 px-4 safe-area-pb overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rocket-modal-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setRocketModalOpen(false);
          }}
        >
          <div className="max-w-2xl w-full bg-zinc-900 border border-soviet-cream/10 rounded-3xl p-5 sm:p-6 md:p-8 shadow-2xl relative max-h-[92dvh] overflow-y-auto overscroll-contain">
            <button
              type="button"
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full text-soviet-cream/50 hover:text-soviet-cream hover:bg-white/5 transition-colors"
              onClick={() => setRocketModalOpen(false)}
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

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-tech-cyan text-xs uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-tech-cyan" />
              Раздел в разработке
            </div>

            <h3
              id="rocket-modal-title"
              className="mt-4 font-header text-2xl sm:text-3xl font-black uppercase italic headline-outline pr-10"
            >
              Билет на ракету
            </h3>

            <p className="mt-4 text-soviet-cream/70 text-sm sm:text-base leading-relaxed">
              Мы разрабатываем личный кабинет для полной автоматизации сервиса:
              управление заявками, статусами оплат, уведомлениями и историей
              операций в одном месте. Скоро откроем доступ и сообщим о запуске.
            </p>

            <div className="mt-7">
              <button
                type="button"
                onClick={() => setRocketModalOpen(false)}
                className="inline-flex items-center justify-center w-full min-h-[48px] px-6 sm:px-8 py-3.5 sm:py-4 font-header text-xs sm:text-sm uppercase tracking-widest border border-soviet-cream/30 text-soviet-cream hover:bg-white/5 hover:text-white active:scale-[0.99] transition-colors touch-manipulation rounded-none"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
