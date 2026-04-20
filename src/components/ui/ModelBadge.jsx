import { cn } from "@/lib/utils";

export default function ModelBadge({ model, className }) {
  const styles = {
    rent: "border border-primary/60 text-primary bg-transparent",
    commission: "bg-primary text-white border border-primary",
    hourly: "bg-foreground text-background border border-foreground",
  };
  const labels = { rent: "Rent", commission: "Commission", hourly: "Hourly" };

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
      styles[model] || styles.rent,
      className
    )}>
      {labels[model] || model}
    </span>
  );
}