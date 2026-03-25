"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    __jivoUserInitiatedOpen?: boolean;
    ym?: (counterId: number, method: string, ...args: any[]) => void;
    jivo_api?: {
      open: (params?: { start?: "call" | "menu" | "chat" }) => { result: "ok" | "fail" };
      close?: () => { result: "ok" | "fail" };
    };
    jivo_onLoadCallback?: () => void;
    jivo_onOpen?: () => void;
  }
}

const WIDGET_SRC = "//code.jivo.ru/widget/cNVyP30Bfn";
const YM_ID = 108240458;

function isMobileViewport() {
  // Tailwind sm breakpoint is 640px.
  return typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;
}

export function JivoResponsive() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [loadOnMobile, setLoadOnMobile] = useState(false);
  const injectedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const update = () => setIsMobile(isMobileViewport());
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, [mounted]);

  const mobile = mounted && isMobile;

  // Mobile-only: set Widget API hooks before script loads.
  useEffect(() => {
    if (!mobile) return;

    window.__jivoUserInitiatedOpen = false;

    window.jivo_onLoadCallback = function () {
      // Ensure it starts minimized (icon only).
      try {
        window.jivo_api?.close?.();
      } catch {}
    };

    window.jivo_onOpen = function () {
      // If widget tries to auto-open (triggers/AI invitation), immediately minimize it.
      // Allow open only when user tapped our icon.
      if (window.__jivoUserInitiatedOpen) return;
      try {
        window.jivo_api?.close?.();
      } catch {}
    };
  }, [mobile]);

  const ensureWidgetLoaded = useCallback(() => {
    if (!mobile) return;
    if (window.jivo_api?.open) return;
    if (injectedRef.current) return;
    injectedRef.current = true;
    setLoadOnMobile(true);
  }, [mobile]);

  const openChat = useCallback(() => {
    if (!mobile) return;
    window.__jivoUserInitiatedOpen = true;
    try {
      window.ym?.(YM_ID, "reachGoal", "jivo_mobile_icon_click");
    } catch {}
    ensureWidgetLoaded();

    const started = Date.now();
    const timeoutMs = 6000;
    const tick = () => {
      if (window.jivo_api?.open) {
        window.jivo_api.open({ start: "chat" });
        return;
      }
      if (Date.now() - started > timeoutMs) return;
      window.setTimeout(tick, 120);
    };
    tick();
  }, [ensureWidgetLoaded, mobile]);

  return (
    <>
      {/* Desktop: keep current behavior (load immediately) */}
      {!mobile && mounted ? (
        <Script id="jivochat-widget" strategy="afterInteractive" src={WIDGET_SRC} />
      ) : null}

      {/* Mobile: install hooks early, then load only after tap */}
      {mobile ? (
        <Script id="jivochat-mobile-hooks" strategy="afterInteractive">
          {`
            window.__jivoUserInitiatedOpen = window.__jivoUserInitiatedOpen || false;
            window.jivo_onLoadCallback = function () {
              try { window.jivo_api && typeof window.jivo_api.close === "function" && window.jivo_api.close(); } catch (e) {}
            };
            window.jivo_onOpen = function () {
              try {
                if (!window.__jivoUserInitiatedOpen) {
                  window.jivo_api && typeof window.jivo_api.close === "function" && window.jivo_api.close();
                }
              } catch (e) {}
            };
          `}
        </Script>
      ) : null}

      {/* Mobile: load only after tap */}
      {mobile && loadOnMobile ? (
        <Script id="jivochat-widget-mobile" strategy="afterInteractive" src={WIDGET_SRC} />
      ) : null}

      {/* Mobile launcher icon */}
      {mobile ? (
        <button
          type="button"
          aria-label="Открыть чат"
          onClick={openChat}
          className="fixed right-4 bottom-4 safe-area-pb z-[1200] h-14 w-14 rounded-full bg-soviet-red text-white shadow-[0_14px_36px_-14px_rgba(190,30,45,0.9)] active:scale-[0.98] transition-transform flex items-center justify-center"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3C7.03 3 3 6.58 3 11c0 2.04.9 3.91 2.39 5.34L5 21l4.02-1.63c.92.26 1.92.4 2.98.4 4.97 0 9-3.58 9-8s-4.03-8-9-8z"
              fill="currentColor"
              opacity="0.95"
            />
            <path
              d="M8.2 11.2c0-.55.45-1 1-1h5.6c.55 0 1 .45 1 1s-.45 1-1 1H9.2c-.55 0-1-.45-1-1z"
              fill="#0A0A0A"
              opacity="0.35"
            />
          </svg>
        </button>
      ) : null}
    </>
  );
}

