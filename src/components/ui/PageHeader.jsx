export default function PageHeader({ label, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        {label && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">{label}</p>
        )}
        <h1 className="font-serif text-3xl font-light tracking-wide text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}