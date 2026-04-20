import { cn } from "@/lib/utils";

export default function GoldButton({ children, className, size = "default", disabled, onClick, type = "button" }) {
  const sizes = {
    sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
    default: "h-9 px-4 text-sm rounded-lg gap-2",
    lg: "h-11 px-6 text-base rounded-xl gap-2",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-all btn-gold whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none shrink-0",
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  );
}