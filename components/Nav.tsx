"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessengerChoiceTrigger } from "@/components/MessengerChoiceTrigger";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";

const NAV_LINKS = [
  { href: "#benefits", label: "Преимущества" },
  { href: "#services", label: "Сервисы" },
  { href: "#how-it-works", label: "Процесс" },
  { href: "#reviews", label: "Отзывы" },
  { href: "/business", label: "Для бизнеса" },
] as const;

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMessengerOpen, setMobileMessengerOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [menuOpen]);

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
            <div className="min-w-0">
              <span className="block leading-[1.1] font-header font-black text-[0.95rem] min-[400px]:text-[1.05rem] sm:text-2xl tracking-tighter uppercase italic whitespace-nowrap">
                RaketaPay
              </span>
              <span className="hidden sm:block text-[9px] xl:text-[10px] uppercase tracking-[0.18em] text-soviet-cream/50 whitespace-nowrap">
                Международные платежи и сервисы
              </span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-6 xl:gap-8 font-header text-[11px] xl:text-xs uppercase tracking-widest">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="whitespace-nowrap hover:text-soviet-red transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <MessengerChoiceTrigger
              className="bg-soviet-red hover:bg-red-700 text-white font-header text-[11px] sm:text-xs px-3 sm:px-5 lg:px-6 py-2.5 sm:py-3 rounded-none uppercase tracking-[0.08em] sm:tracking-widest transition-all whitespace-nowrap max-w-[52vw] sm:max-w-none truncate"
              modalPosition="below-header"
            >
              <span className="inline sm:hidden">Связаться</span>
              <span className="hidden sm:inline lg:hidden">Консультация</span>
              <span className="hidden lg:inline">Получить консультацию</span>
            </MessengerChoiceTrigger>

            <button
              type="button"
              className="lg:hidden w-11 h-11 flex flex-col items-center justify-center gap-1.5 rounded-lg border border-soviet-cream/15 text-soviet-cream hover:bg-white/5 transition-colors"
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
        className={`fixed inset-0 z-40 lg:hidden transition-[visibility,opacity] duration-200 ${
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
              <Link
                key={href}
                href={href}
                className="py-4 px-3 rounded-lg hover:bg-white/5 hover:text-soviet-red transition-colors border-b border-white/5 last:border-0"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
            <button
              type="button"
              className="mt-4 py-4 text-center bg-soviet-red text-white rounded-lg hover:bg-red-700 transition-colors"
              onClick={() => {
                setMenuOpen(false);
                setMobileMessengerOpen(true);
              }}
            >
              Telegram
            </button>
          </nav>
        </div>
      </div>
      <MessengerChoiceTrigger
        hideTrigger
        open={mobileMessengerOpen}
        onOpenChange={setMobileMessengerOpen}
      >
        Telegram
      </MessengerChoiceTrigger>
    </>
  );
}
