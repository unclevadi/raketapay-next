"use client";

import { useEffect, useMemo, useState } from "react";

declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: any[]) => void;
  }
}

const YM_ID = 108240458;

const OPTIONS = [
  { id: "site", label: "На сайте" },
  { id: "telegram", label: "Telegram" },
  { id: "vk", label: "VK" },
  { id: "viber", label: "Viber" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "imo", label: "imo" },
  { id: "other", label: "Другое" },
] as const;

export function PreferredChannelPoll() {
  const [picked, setPicked] = useState<(typeof OPTIONS)[number]["id"] | null>(null);
  const [otherText, setOtherText] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem("rp_poll_locked_until");
      if (!v) return;
      const n = Number(v);
      if (Number.isFinite(n) && n > Date.now()) setLockedUntil(n);
    } catch {}
  }, []);

  const isLocked = lockedUntil !== null && lockedUntil > Date.now();

  function getClientId() {
    try {
      const key = "rp_poll_client_id";
      const existing = window.localStorage.getItem(key);
      if (existing && existing.length >= 8) return existing;
      const id = crypto.randomUUID();
      window.localStorage.setItem(key, id);
      return id;
    } catch {
      return null;
    }
  }

  const pickedLabel = useMemo(() => {
    if (!picked) return null;
    return OPTIONS.find((o) => o.id === picked)?.label ?? null;
  }, [picked]);

  async function submit(next: (typeof OPTIONS)[number]["id"]) {
    if (isLocked) return;
    setPicked(next);
    setStatus("saving");
    setErrorText(null);
    try {
      window.ym?.(YM_ID, "reachGoal", "preferred_channel_pick", { channel: next });
    } catch {}

    const url = new URL(window.location.href);
    const payload = {
      channel: next,
      clientId: getClientId(),
      otherText: next === "other" ? otherText : null,
      pagePath: window.location.pathname,
      utmSource: url.searchParams.get("utm_source"),
      utmMedium: url.searchParams.get("utm_medium"),
      utmCampaign: url.searchParams.get("utm_campaign"),
    };

    try {
      const res = await fetch("/api/poll", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => null)) as null | { ok?: boolean; error?: string };
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "save_failed");
      }

      setStatus("saved");

      // Lock further clicks for 24h (client-side).
      const until = Date.now() + 24 * 60 * 60 * 1000;
      setLockedUntil(until);
      try {
        window.localStorage.setItem("rp_poll_locked_until", String(until));
      } catch {}
    } catch (e) {
      setStatus("error");
      setErrorText(e instanceof Error ? e.message : "Ошибка отправки");
    }
  }

  return (
    <section className="md:col-span-4 bg-zinc-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 bento-card flex flex-col justify-between overflow-hidden relative border border-white/10">
      <div className="absolute -right-8 -top-8 opacity-10">
        <div className="w-40 h-40 rounded-full bg-soviet-red/30" />
      </div>

      <div>
        <div className="text-soviet-red mb-4">
          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h6m-8 8 4-4h10a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>

        <p className="font-header text-[10px] sm:text-[11px] uppercase tracking-widest text-soviet-cream/50">
          Помогите нам стать лучше
        </p>
        <h3 className="mt-2 font-header text-[clamp(1.2rem,2.4vw,1.65rem)] font-bold uppercase mb-2">
          Какой канал связи удобнее всего?
        </h3>
        <p className="text-soviet-cream/70 text-[15px] sm:text-base leading-relaxed">
          Это займёт 1 секунду - мы используем ответы, чтобы развивать поддержку.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {OPTIONS.map((o) => {
            const active = picked === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  void submit(o.id);
                }}
                disabled={status === "saving" || isLocked}
                className={`px-3 py-2 rounded-full border text-xs sm:text-[13px] font-medium transition-colors touch-manipulation ${
                  active
                    ? "bg-soviet-red text-white border-soviet-red"
                    : "bg-white/5 text-soviet-cream/85 border-white/10 hover:bg-white/10"
                } ${status === "saving" ? "opacity-70 cursor-wait" : ""} ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {o.label}
              </button>
            );
          })}
        </div>

        {picked === "other" ? (
          <div className="mt-3">
            <input
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Например: Discord / Email / Phone"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-soviet-cream placeholder:text-soviet-cream/40 outline-none focus:border-soviet-red/60"
              maxLength={80}
            />
            <div className="mt-2 text-[12px] text-soviet-cream/50">
              После ввода нажмите “Другое” ещё раз, чтобы отправить.
            </div>
          </div>
        ) : null}

        {status === "saved" ? (
          <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            Спасибо! Мы учли ваш выбор.
          </div>
        ) : null}

        {status === "error" ? (
          <div className="mt-4 rounded-xl border border-soviet-red/30 bg-soviet-red/10 px-4 py-3 text-sm text-white">
            Не удалось отправить. Попробуйте ещё раз.
            {errorText ? <div className="mt-1 text-[12px] text-white/70">{errorText}</div> : null}
          </div>
        ) : null}
      </div>

      <div className="mt-8 text-[13px] sm:text-sm font-mono text-soviet-cream/40 tracking-widest">
        {status === "saved"
          ? isLocked
            ? "СПАСИБО"
            : "СОХРАНЕНО"
          : status === "error"
            ? "ОШИБКА"
            : pickedLabel
              ? `ВЫБРАНО: ${pickedLabel}`
              : "ВЫБЕРИТЕ ВАРИАНТ"}
      </div>
    </section>
  );
}

