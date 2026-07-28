export function Chip({
  icon,
  children,
  highlight,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <span
      className={`shrink-0 inline-flex items-center leading-none whitespace-nowrap gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
        highlight
          ? "bg-primary/10 border-primary/30 text-primary font-medium"
          : "bg-secondary/50 border-border text-muted-foreground"
      }`}
    >
      {icon}
      {children}
    </span>
  );
}
