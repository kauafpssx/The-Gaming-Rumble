import { useMemo } from "react";

interface CatalogPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function CatalogPagination({ page, totalPages, onPageChange }: CatalogPaginationProps) {
  const pageNumbers = useMemo(() => {
    const delta = 2;
    const start = Math.max(1, Math.min(page - delta, totalPages - delta * 2));
    const end = Math.min(totalPages, start + delta * 2);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-3 py-2 rounded-lg bg-card border border-border text-sm disabled:opacity-30 hover:bg-secondary transition-colors cursor-pointer disabled:cursor-default"
      >
        ← Anterior
      </button>

      {pageNumbers[0] > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className="w-9 h-9 rounded-lg text-sm bg-card border border-border hover:bg-secondary transition-colors cursor-pointer">
            1
          </button>
          {pageNumbers[0] > 2 && <span className="text-muted-foreground text-sm px-1">…</span>}
        </>
      )}

      {pageNumbers.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            p === page ? "bg-primary text-primary-foreground" : "bg-card border border-border hover:bg-secondary"
          }`}
        >
          {p}
        </button>
      ))}

      {pageNumbers[pageNumbers.length - 1] < totalPages && (
        <>
          {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="text-muted-foreground text-sm px-1">…</span>}
          <button onClick={() => onPageChange(totalPages)} className="w-9 h-9 rounded-lg text-sm bg-card border border-border hover:bg-secondary transition-colors cursor-pointer">
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-3 py-2 rounded-lg bg-card border border-border text-sm disabled:opacity-30 hover:bg-secondary transition-colors cursor-pointer disabled:cursor-default"
      >
        Próximo →
      </button>
    </div>
  );
}
