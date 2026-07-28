export function LoadingPanel() {
  return (
    <div className="text-center">
      <div className="w-10 h-10 mx-auto mb-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin-slow" />
      <p className="text-lg font-medium">Buscando informações...</p>
      <p className="text-sm text-muted-foreground mt-1">Localizando jogo no dataset</p>
    </div>
  );
}

export function OpenedPanel() {
  return (
    <div className="text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ backgroundColor: "hsl(var(--success) / 0.15)" }}>
        <svg className="w-6 h-6 animate-check-pop" style={{ color: "hsl(var(--success))" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <p className="text-base font-medium text-foreground">App aberto!</p>
      <p className="text-xs text-muted-foreground mt-1">Esta aba será fechada automaticamente em instantes...</p>
    </div>
  );
}

export function FallbackPanel({
  onOpenProtocol,
  onCopyMagnet,
  copied,
}: {
  onOpenProtocol: () => void;
  onCopyMagnet: () => void;
  copied: boolean;
}) {
  return (
    <div className="space-y-3">
      <button
        onClick={onOpenProtocol}
        className="w-full px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:brightness-110 active:scale-[0.98] transition-all"
      >
        Abrir no App
      </button>
      <button
        onClick={onCopyMagnet}
        className="w-full px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        {copied ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Copiado!
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
            Copiar Magnet
          </>
        )}
      </button>
    </div>
  );
}
