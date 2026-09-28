import { useEffect, useRef, useState } from "react";

/**
 * Mede quantas colunas o grid está renderizando de verdade (via `grid-template-columns`
 * computado), em vez de assumir os breakpoints do Tailwind — assim a paginação sempre
 * consegue fechar linhas completas, em qualquer resolução ou largura de janela.
 */
export function useGridColumns<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function measure() {
      if (!el) return;
      const count = getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length;
      if (count > 0) setColumns(count);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, columns };
}
