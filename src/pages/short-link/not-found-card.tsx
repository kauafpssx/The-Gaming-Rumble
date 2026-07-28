import icon from "@/assets/icon.png";

export function NotFoundCard() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="animate-fade-in-up bg-card border border-border rounded-2xl p-8 md:p-12 max-w-md w-full text-center shadow-2xl">
        <img src={icon} alt="Gaming Rumble" className="w-16 h-16 mx-auto mb-6 rounded-2xl" />
        <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-destructive/10 flex items-center justify-center">
          <svg className="w-7 h-7 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Jogo não encontrado</h1>
        <p className="text-muted-foreground mb-8">Não encontramos nenhum jogo com este ID ou slug.</p>
        <button onClick={() => window.history.back()} className="px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors">← Voltar</button>
      </div>
    </div>
  );
}
