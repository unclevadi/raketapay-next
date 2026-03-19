"use client";

import { useEffect, useState } from "react";

// Подписки и софт - реальные тарифы (в долларах)
const SUBSCRIPTION_SERVICES: { name: string; prices: string[] }[] = [
  { name: "Netflix Premium", prices: ["15.49", "19.99", "22.99"] },
  { name: "ChatGPT Plus", prices: ["20.00"] },
  { name: "Spotify Family", prices: ["15.99", "16.99"] },
  { name: "YouTube Premium", prices: ["13.99", "22.99"] },
  { name: "Apple One", prices: ["16.95", "22.95", "32.95"] },
  { name: "Notion Team", prices: ["10.00", "18.00"] },
  { name: "Figma Organization", prices: ["12.00", "45.00"] },
  { name: "Adobe Creative Cloud", prices: ["54.99", "82.99"] },
  { name: "Zoom Pro", prices: ["14.99", "19.99"] },
  { name: "Slack Business+", prices: ["12.50", "22.50"] },
  { name: "Discord Nitro", prices: ["9.99", "12.99"] },
  { name: "Roblox Premium", prices: ["4.99", "9.99", "19.99"] },
  { name: "PlayStation Plus", prices: ["9.99", "17.99", "59.99"] },
  { name: "Steam Wallet", prices: ["4.99", "9.99", "19.99", "49.99"] },
  { name: "Midjourney", prices: ["10.00", "30.00", "60.00", "96.00"] },
  { name: "Digital Ocean", prices: ["4.00", "6.00", "12.00", "24.00", "48.00"] },
  { name: "Amazon Prime", prices: ["14.99", "8.99"] },
  { name: "Google One", prices: ["1.99", "2.99", "9.99"] },
  { name: "Dropbox Plus", prices: ["9.99", "16.99"] },
  { name: "Canva Pro", prices: ["12.99", "14.99"] },
  { name: "iHerb", prices: ["25.00", "48.00", "72.00"] },
];

// Брони и перелёты - суммы рандомные (каждый заказ разный)
const TRAVEL_SERVICES = [
  "Booking.com",
  "Airbnb",
  "Emirates",
  "Turkish Airlines",
];

const TRAVEL_PRICES = [
  "89", "120", "145", "199", "250", "320", "380", "450", "520",
  "640", "720", "840", "990", "1150", "1280", "1500",
];

// [OK] - оплата принята, [DONE] - заказ выполнен (доступ передан)
const STATUSES = ["[OK]", "[DONE]"];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildEntry(): { status: string; text: string } {
  const status = randomItem(STATUSES);
  const useTravel = Math.random() < 0.35; // ~35% - брони/авиа, остальное - подписки

  let text: string;
  if (useTravel) {
    const service = randomItem(TRAVEL_SERVICES);
    const price = randomItem(TRAVEL_PRICES);
    text = `Payment: ${service} - $${price}`;
  } else {
    const service = randomItem(SUBSCRIPTION_SERVICES);
    const price = randomItem(service.prices);
    text = `Payment: ${service.name} - $${price}`;
  }

  return { status, text };
}

/** Фиксированные строки для SSR и первого кадра гидратации (без Math.random). */
const HYDRATION_SAFE_LOGS: { status: string; text: string }[] = [
  { status: "[OK]", text: "Payment: ChatGPT Plus - $20.00" },
  { status: "[DONE]", text: "Payment: Netflix Premium - $15.49" },
  { status: "[OK]", text: "Payment: Spotify Family - $16.99" },
  { status: "[DONE]", text: "Payment: Booking.com - $199" },
  { status: "[OK]", text: "Payment: Steam Wallet - $49.99" },
  { status: "[DONE]", text: "Payment: Emirates - $450" },
  { status: "[OK]", text: "Payment: Adobe Creative Cloud - $54.99" },
];

export function ActivityFeed() {
  const [logs, setLogs] = useState(HYDRATION_SAFE_LOGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLogs(Array.from({ length: 7 }, () => buildEntry()));
    const id = setInterval(() => {
      setLogs((prev) => [buildEntry(), ...prev].slice(0, 8));
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="md:col-span-4 bg-zinc-950 rounded-2xl sm:rounded-3xl p-4 sm:p-6 bento-card font-mono text-[9px] sm:text-[10px] border border-white/5 min-h-[200px] h-[min(16rem,42vh)] sm:h-64 overflow-hidden">
      <div className="mb-3">
        <div className="flex justify-between border-b border-white/10 pb-2">
          <span className="text-soviet-cream/40">SYSTEM_LOG_REALTIME</span>
          <span className="text-soviet-red">LIVE</span>
        </div>
        <p className="text-soviet-cream/30 text-[9px] mt-1.5">
          [OK] оплата принята · [DONE] заказ выполнен
        </p>
      </div>
      <div className="space-y-2 text-soviet-cream/60">
        {logs.map((log, i) => (
          <div
            key={`${i}-${log.status}-${log.text}`}
            className={`flex gap-2 items-baseline ${mounted && i === 0 ? "animate-feed-in" : ""}`}
          >
            <span className="text-tech-cyan shrink-0">{log.status}</span>
            <span className="truncate">{log.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
