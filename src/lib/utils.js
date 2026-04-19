import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Format number as currency string */
export function formatCurrency(amount, symbol = "$") {
  if (amount == null || isNaN(amount)) return `${symbol}0.00`;
  return `${symbol}${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Convert a frequency to a monthly multiplier */
export function freqMultiplier(freq) {
  if (freq === "weekly") return 4.33;
  if (freq === "biweekly") return 2.165;
  return 1;
}

/** Convert a frequency to a weekly divisor (monthly / 4.33) */
export function toWeekly(amount, freq) {
  if (freq === "weekly") return amount;
  if (freq === "biweekly") return amount / 2;
  return amount / 4.33;
}

export function freqLabel(freq) {
  if (freq === "weekly") return "weekly";
  if (freq === "biweekly") return "bi-weekly";
  return "monthly";
}

/** Get Monday of week containing date */
export function getWeekStart(date = new Date(), offsetWeeks = 0) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day); // Monday = 0 offset
  d.setDate(d.getDate() + diff - offsetWeeks * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekEnd(weekStart) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function formatDateRange(weekStart) {
  const end = getWeekEnd(weekStart);
  const opts = { month: "short", day: "numeric" };
  return `${weekStart.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}

/** Avatar helpers */
const AVATAR_COLORS = [
  { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-300" },
  { bg: "bg-stone-100 dark:bg-stone-800/50", text: "text-stone-700 dark:text-stone-300" },
  { bg: "bg-zinc-100 dark:bg-zinc-800/50",   text: "text-zinc-700 dark:text-zinc-300" },
  { bg: "bg-neutral-100 dark:bg-neutral-800/50", text: "text-neutral-700 dark:text-neutral-300" },
];
export function getAvatarColor(index) { return AVATAR_COLORS[index % AVATAR_COLORS.length]; }
export function getInitials(name = "") {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

/** Category config */
export const CATEGORY_CONFIG = {
  hair:       { label: "Hair",       className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  nails:      { label: "Nails",      className: "bg-pink-500/15 text-pink-500 border-pink-500/30" },
  aesthetics: { label: "Aesthetics", className: "bg-violet-500/15 text-violet-500 border-violet-500/30" },
  other:      { label: "Other",      className: "bg-muted text-muted-foreground border-border" },
};

export function categoryBadge(cat) {
  return CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
}