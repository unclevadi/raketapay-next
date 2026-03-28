import type { ReactNode } from "react";
import { CrmAccessProvider } from "./CrmAccessProvider";
import { CrmHeader } from "./CrmHeader";

export default function CrmLayout({ children }: { children: ReactNode }) {
  return (
    <CrmAccessProvider>
      <div className="flex min-h-dvh flex-col bg-zinc-950 text-soviet-cream antialiased md:flex-row">
        <CrmHeader />
        <div className="min-w-0 flex-1 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900/50">
          {children}
        </div>
      </div>
    </CrmAccessProvider>
  );
}
