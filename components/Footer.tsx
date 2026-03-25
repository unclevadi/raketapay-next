import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-soviet-cream/10 pt-10 sm:pt-12 pb-8 px-4 sm:px-6 safe-area-pb">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8 text-center md:text-left">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-6 h-6 bg-soviet-cream/20 rounded-sm flex items-center justify-center rotate-45">
            <span className="text-soviet-cream font-black -rotate-45 text-xs font-header">
              R
            </span>
          </div>
          <span className="font-header font-black text-lg tracking-tighter uppercase italic opacity-50">
            RaketaPay
          </span>
        </Link>
        <div className="text-[11px] sm:text-[10px] font-header tracking-widest uppercase opacity-40 flex flex-wrap justify-center gap-6 sm:gap-8">
          <Link href="/terms" className="hover:text-soviet-red transition-colors">
            Пользовательское соглашение
          </Link>
          <Link href="/privacy" className="hover:text-soviet-red transition-colors">
            Политика конфиденциальности
          </Link>
          <Link
            href="/return-policy"
            className="hover:text-soviet-red transition-colors"
          >
            Политика возврата
          </Link>
          <span>© 2026 Все права защищены</span>
        </div>
      </div>
    </footer>
  );
}
