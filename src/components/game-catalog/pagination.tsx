import { forwardRef, useMemo } from "react";

export const Pagination = forwardRef<HTMLDivElement, {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}>(function Pagination({ page, totalPages, onChange }, ref) {
  const pageNumbers = useMemo(() => {
    const delta = 2;
    const start = Math.max(1, Math.min(page - delta, totalPages - delta * 2));
    const end = Math.min(totalPages, start + delta * 2);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div ref={ref} className="flex flex-wrap items-center justify-center gap-2 mt-10">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-3 py-2 rounded-lg bg-card border border-border text-sm disabled:opacity-30 hover:bg-secondary transition-colors"
      >
        ← Anterior
      </button>

      {pageNumbers[0] > 1 && (
        <>
          <button
            onClick={() => onChange(1)}
            className="w-9 h-9 rounded-lg text-sm bg-card border border-border hover:bg-secondary transition-colors"
          >
            1
          </button>
          {pageNumbers[0] > 2 && (
            <span className="text-muted-foreground text-sm px-1">…</span>
          )}
        </>
      )}

      {pageNumbers.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
            p === page
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border hover:bg-secondary"
          }`}
        >
          {p}
        </button>
      ))}

      {pageNumbers[pageNumbers.length - 1] < totalPages && (
        <>
          {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
            <span className="text-muted-foreground text-sm px-1">…</span>
          )}
          <button
            onClick={() => onChange(totalPages)}
            className="w-9 h-9 rounded-lg text-sm bg-card border border-border hover:bg-secondary transition-colors"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-3 py-2 rounded-lg bg-card border border-border text-sm disabled:opacity-30 hover:bg-secondary transition-colors"
      >
        Próximo →
      </button>
    </div>
  );
});
