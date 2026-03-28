import type { ReactNode } from "react";

type Props = {
  title: string;
  hint?: string;
  children?: ReactNode;
};

export function CrmEmptyState({ title, hint, children }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-zinc-900/20 px-6 py-12 text-center">
      <p className="font-header text-sm uppercase tracking-wide text-soviet-cream/70">{title}</p>
      {hint ? <p className="mx-auto mt-2 max-w-md text-sm text-soviet-cream/45">{hint}</p> : null}
      {children ? <div className="mt-6 flex justify-center">{children}</div> : null}
    </div>
  );
}
