export function CrmDashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-8" aria-hidden>
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-white/[0.06]" />
        ))}
      </div>
      <div className="h-56 rounded-xl bg-white/[0.06]" />
    </div>
  );
}

export function CrmTableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse p-4" aria-hidden>
      <div className="mb-3 flex gap-2 border-b border-white/10 pb-3">
        {Array.from({ length: cols }).map((_, j) => (
          <div key={j} className="h-3 flex-1 rounded bg-white/10" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-2">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="h-4 flex-1 rounded bg-white/[0.07]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CrmPageHeaderSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      <div className="h-8 w-48 rounded-md bg-white/10" />
      <div className="h-4 max-w-md rounded bg-white/[0.06]" />
    </div>
  );
}
