export function SortPill({
  active,
  Icon,
  onClick,
  children,
}: {
  active: boolean;
  Icon: React.FC<{ className?: string }>;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-all duration-200 ${
        active
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
          : "bg-secondary/50 border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      <Icon className="w-3 h-3" />
      {children}
    </button>
  );
}
