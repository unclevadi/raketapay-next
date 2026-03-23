"use client";

import { useEffect, useId, useState } from "react";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";

const DEFAULT_TELEGRAM_URL = "https://t.me/raketa_pay";
const DEFAULT_MAX_URL = process.env.NEXT_PUBLIC_MAX_URL ?? "";

function openTelegram(url: string) {
  if (url.startsWith("tg://")) {
    const domainMatch = url.match(/[?&]domain=([^&]+)/);
    const textMatch = url.match(/[?&]text=([^&]+)/);
    const domain = domainMatch ? decodeURIComponent(domainMatch[1]) : "raketa_pay";
    const text = textMatch ? decodeURIComponent(textMatch[1]) : "";
    const webUrl = `https://t.me/${encodeURIComponent(domain)}?text=${encodeURIComponent(text)}`;

    window.location.href = url;
    window.setTimeout(() => {
      if (!document.hidden) {
        window.open(webUrl, "_blank", "noopener,noreferrer");
      }
    }, 700);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

type Props = {
  children: React.ReactNode;
  className?: string;
  telegramUrl?: string;
  maxUrl?: string;
  title?: string;
  onTriggerClick?: () => void;
  modalPosition?: "center" | "below-header";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

export function MessengerChoiceTrigger({
  children,
  className = "",
  telegramUrl = DEFAULT_TELEGRAM_URL,
  maxUrl = DEFAULT_MAX_URL,
  title = "Выберите мессенджер",
  onTriggerClick,
  modalPosition = "center",
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const modalTitleId = useId();
  const open = controlledOpen ?? internalOpen;

  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [open]);

  return (
    <>
      {!hideTrigger && (
        <button
          type="button"
          className={className}
          onClick={() => {
            onTriggerClick?.();
            setOpen(true);
          }}
        >
          {children}
        </button>
      )}

      {open && (
        <div
          className={`fixed inset-0 z-[1300] bg-black/70 flex justify-center px-4 ${
            modalPosition === "below-header"
              ? "items-start pt-20 sm:pt-24"
              : "items-center"
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-3xl border border-soviet-cream/10 bg-zinc-900 p-5 sm:p-6 relative">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Закрыть"
              className="absolute top-3 right-3 w-9 h-9 rounded-full text-soviet-cream/60 hover:text-soviet-cream hover:bg-white/5 transition-colors"
            >
              ✕
            </button>

            <h3
              id={modalTitleId}
              className="font-header text-lg sm:text-xl uppercase tracking-wide mb-4 pr-10"
            >
              {title}
            </h3>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  openTelegram(telegramUrl);
                  setOpen(false);
                }}
                className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] bg-soviet-red text-white font-header text-sm uppercase tracking-widest hover:bg-red-700 transition-colors"
              >
                <img
                  src="/icons/telegram-logo.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 object-contain"
                />
                Telegram
              </button>

              {maxUrl ? (
                <a
                  href={maxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] border border-tech-cyan/40 text-tech-cyan font-header text-sm uppercase tracking-widest hover:bg-tech-cyan/10 transition-colors"
                >
                  <img
                    src="/icons/max-logo.svg"
                    alt=""
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 object-contain"
                  />
                  MAX
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Добавьте NEXT_PUBLIC_MAX_URL в .env.local"
                  className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] border border-tech-cyan/20 text-tech-cyan/50 font-header text-sm uppercase tracking-widest cursor-not-allowed"
                >
                  <img
                    src="/icons/max-logo.svg"
                    alt=""
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 object-contain opacity-60"
                  />
                  MAX
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

