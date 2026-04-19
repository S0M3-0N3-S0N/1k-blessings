import { cn } from "@/lib/utils";

export default function GoldButton({ children, className, size = "default", ...props }) {
  const sizes = {
    sm: "h-8 px-3 text-xs rounded-lg",
    default: "h-9 px-4 text-sm rounded-lg",
    lg: "h-10 px-6 text-sm rounded-lg",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all btn-gold whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none",
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}