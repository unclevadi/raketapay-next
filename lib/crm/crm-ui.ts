/** Общие классы CRM: поля, таблицы, кнопки, карточки (единый ритм и фокус). */

export const crmLabel =
  "text-[10px] font-medium uppercase tracking-wider text-soviet-cream/45";

export const crmInput =
  "w-full rounded-lg border border-white/12 bg-zinc-950/80 px-3 py-2.5 text-sm text-soviet-cream/90 shadow-sm outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-soviet-cream/35 focus:border-sky-500/45 focus:ring-2 focus:ring-sky-500/20";

export const crmSelect = `${crmInput} cursor-pointer`;

export const crmTextarea = `${crmInput} min-h-[5rem] resize-y`;

export const crmSectionTitle =
  "font-header text-xs uppercase tracking-[0.2em] text-soviet-cream/50";

export const crmCard =
  "rounded-2xl border border-white/10 bg-zinc-900/35 p-5 shadow-sm transition-[border-color,background-color] duration-200 sm:p-6";

export const crmCardAccentSky =
  "rounded-2xl border border-sky-500/25 bg-sky-950/15 p-5 shadow-sm transition-[border-color,background-color] duration-200 sm:p-6";

export const crmTableWrap =
  "overflow-x-auto rounded-xl border border-white/10 bg-zinc-900/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

export const crmTable = "w-full min-w-0 border-collapse text-left text-[13px]";

export const crmThead =
  "sticky top-0 z-10 border-b border-white/10 bg-zinc-900 text-[10px] uppercase tracking-wide text-soviet-cream/50";

export const crmTh = "px-3 py-3 text-left font-header font-normal";

export const crmTrEven =
  "border-b border-white/[0.06] transition-colors duration-200 even:bg-white/[0.025] hover:bg-white/[0.05]";

export const crmTd = "px-3 py-3 align-middle";

export const crmBtnPrimary =
  "inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5 font-header text-[10px] uppercase tracking-widest text-white shadow-sm transition-all duration-200 hover:bg-sky-500 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45";

export const crmBtnSecondary =
  "inline-flex items-center justify-center rounded-lg border border-white/15 bg-transparent px-3 py-2 font-header text-[10px] uppercase tracking-widest text-soviet-cream/75 transition-all duration-200 hover:border-white/25 hover:bg-white/[0.05] disabled:opacity-35";

export const crmBtnDanger =
  "inline-flex items-center justify-center rounded-lg bg-soviet-red px-4 py-2.5 font-header text-[10px] uppercase tracking-widest text-white shadow-sm transition-all duration-200 hover:bg-red-700 active:scale-[0.99] disabled:opacity-45";

export const crmErrorBanner =
  "rounded-lg border border-red-500/35 bg-red-950/35 px-4 py-3 text-sm text-red-200/95";

export const crmStatCard =
  "block rounded-2xl border p-5 shadow-sm transition-[border-color,transform] duration-200 motion-safe:hover:border-opacity-60 motion-safe:hover:-translate-y-px";

export const crmOverviewLinkCard =
  "block h-full rounded-2xl border border-white/10 bg-zinc-900/50 p-5 shadow-sm transition-all duration-200 hover:border-white/18 hover:bg-zinc-900/70";
