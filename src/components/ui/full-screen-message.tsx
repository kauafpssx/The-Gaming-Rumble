/** Centered full-viewport status screen (loading spinner or error + retry). */
export function FullScreenMessage({
  spinner,
  message,
  action,
}: {
  spinner?: boolean;
  message: React.ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center animate-fade-in-up">
        {spinner && (
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin-slow mx-auto mb-4" />
        )}
        <p className={spinner ? "text-sm text-muted-foreground" : "text-destructive font-medium mb-4"}>
          {message}
        </p>
        {action && (
          <button
            onClick={action.onClick}
            className="px-4 py-2 rounded-lg bg-secondary text-sm hover:bg-secondary/80 transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
