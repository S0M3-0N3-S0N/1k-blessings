import { cn } from "@/lib/utils";

export default function ModelBadge({ model, className }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
      model === "commission"
        ? "bg-primary text-white border-primary"
        : "bg-transparent text-primary border-primary",
      className
    )}>
      {model === "commission" ? "Commission" : "Rent"}
    </span>
  );
}