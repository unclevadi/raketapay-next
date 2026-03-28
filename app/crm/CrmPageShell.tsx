import type { ReactNode } from "react";

const maxW: Record<string, string> = {
  narrow: "max-w-2xl",
  sm: "max-w-lg",
  md: "max-w-3xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
  wide: "max-w-[1400px]",
};

type Variant = keyof typeof maxW;

type Props = {
  title: string;
  /** Классы заголовка (по умолчанию sky) */
  titleClassName?: string;
  description?: ReactNode;
  /** Рядом с заголовком (бейдж, метка) */
  titleAddon?: ReactNode;
  /** Над шапкой страницы (например «назад») */
  prepend?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  /** Ширина контентной колонки */
  variant?: Variant;
};

const defaultTitleClass =
  "font-header text-2xl font-black uppercase italic tracking-tight text-sky-200/95 sm:text-[1.65rem]";

export function CrmPageShell({
  title,
  titleClassName,
  description,
  titleAddon,
  prepend,
  actions,
  children,
  variant = "lg",
}: Props) {
  return (
    <main
      className={`mx-auto w-full px-4 py-8 font-body sm:px-5 lg:px-8 lg:py-10 ${maxW[variant]}`}
    >
      {prepend ? <div className="mb-5">{prepend}</div> : null}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 gap-y-1">
            <h1 className={titleClassName ?? defaultTitleClass}>{title}</h1>
            {titleAddon}
          </div>
          {description ? (
            <div className="mt-2 max-w-3xl space-y-3 text-sm leading-relaxed text-soviet-cream/60">
              {description}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </header>
      {children != null ? <div className="mt-8">{children}</div> : null}
    </main>
  );
}
