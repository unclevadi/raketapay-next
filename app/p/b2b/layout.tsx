import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Статус сделки",
  robots: { index: false, follow: false },
};

export default function PB2bLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-svh bg-zinc-950 text-zinc-100 antialiased">{children}</div>;
}
