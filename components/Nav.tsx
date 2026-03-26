"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";

const TELEGRAM_URL = "https://t.me/raketa_pay";

function openTelegramDirect() {
  // Prefer app deep link when available, fallback to web link.
  const appUrl = "tg://resolve?domain=raketa_pay";
  const webUrl = TELEGRAM_URL;

  const now = Date.now();
  const cooldownMs = 1200;
  const w = window as unknown as { __raketaNavTgUntil?: number; __raketaNavTgTimer?: number };
  if ((w.__raketaNavTgUntil ?? 0) > now) return;
  w.__raketaNavTgUntil = now + cooldownMs;

  if (w.__raketaNavTgTimer) {
    window.clearTimeout(w.__raketaNavTgTimer);
    w.__raketaNavTgTimer = undefined;
  }

  window.location.href = appUrl;
  w.__raketaNavTgTimer = window.setTimeout(() => {
    if (!document.hidden) window.open(webUrl, "_blank", "noopener,noreferrer");
  }, 700);
}

const NAV_LINKS = [
  { href: "#benefits", label: "Преимущества" },
  { href: "#services", label: "Сервисы" },
  { href: "#how-it-works", label: "Процесс" },
  { href: "#reviews", label: "Отзывы" },
  { href: "/business", label: "Для бизнеса" },
] as const;

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

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
            {/* Contacts row: show only on very wide screens to avoid layout shifting */}
            <div className="hidden min-[1400px]:flex items-center gap-2 mr-2">
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-soviet-cream/20 bg-white/5 text-soviet-cream/90 hover:bg-white/10 transition-colors"
                aria-label="Написать в Telegram"
                title="Telegram"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M21.9 4.6 19 19.1c-.2 1-.8 1.2-1.6.8l-4.5-3.3-2.2 2.1c-.2.2-.4.4-.8.4l.3-4.8 8.8-8c.4-.3-.1-.5-.6-.2l-10.8 6.8-4.6-1.4c-1-.3-1-1 .2-1.5L20 3.7c.9-.4 1.7.2 1.9.9Z"
                    fill="currentColor"
                    opacity="0.9"
                  />
                </svg>
              </a>
            </div>

            <button
              type="button"
              onClick={openTelegramDirect}
              className="bg-[#229ED9] hover:bg-[#1D8CC1] text-white h-11 w-11 sm:h-12 sm:w-12 rounded-full transition-colors inline-flex items-center justify-center shadow-[0_10px_24px_-14px_rgba(34,158,217,0.9)] active:scale-[0.98] touch-manipulation"
            >
              <span className="sr-only">Открыть Telegram</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M21.9 4.6 19 19.1c-.2 1-.8 1.2-1.6.8l-4.5-3.3-2.2 2.1c-.2.2-.4.4-.8.4l.3-4.8 8.8-8c.4-.3-.1-.5-.6-.2l-10.8 6.8-4.6-1.4c-1-.3-1-1 .2-1.5L20 3.7c.9-.4 1.7.2 1.9.9Z"
                  fill="currentColor"
                  opacity="0.95"
                />
              </svg>
            </button>

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
              className="mt-4 py-4 text-center bg-[#229ED9] text-white rounded-lg hover:bg-[#1D8CC1] transition-colors"
              onClick={() => {
                setMenuOpen(false);
                openTelegramDirect();
              }}
            >
              <span className="sr-only">Открыть Telegram</span>
              <span className="inline-flex items-center justify-center w-full">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M21.9 4.6 19 19.1c-.2 1-.8 1.2-1.6.8l-4.5-3.3-2.2 2.1c-.2.2-.4.4-.8.4l.3-4.8 8.8-8c.4-.3-.1-.5-.6-.2l-10.8 6.8-4.6-1.4c-1-.3-1-1 .2-1.5L20 3.7c.9-.4 1.7.2 1.9.9Z"
                    fill="currentColor"
                    opacity="0.95"
                  />
                </svg>
              </span>
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}
