import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount, symbol = "$") {
  if (amount == null || isNaN(amount)) return `${symbol}0.00`;
  return `${symbol}${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function freqMultiplier(freq) {
  if (freq === "weekly") return 52 / 12;    // ≈ 4.3333...
  if (freq === "biweekly") return 26 / 12;  // ≈ 2.1666...
  return 1; // monthly
}

export function toWeekly(amount, freq) {
  if (freq === "weekly") return amount;
  if (freq === "biweekly") return amount / 2;
  return amount / (52 / 12); // monthly to weekly
}

export function freqLabel(freq) {
  if (freq === "weekly") return "weekly";
  if (freq === "biweekly") return "bi-weekly";
  return "monthly";
}

export function getWeekStart(date = new Date(), offsetWeeks = 0) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
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

export function getInitials(name = "") {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-300" },
  { bg: "bg-stone-100 dark:bg-stone-800/50", text: "text-stone-700 dark:text-stone-300" },
  { bg: "bg-zinc-100 dark:bg-zinc-800/50", text: "text-zinc-700 dark:text-zinc-300" },
  { bg: "bg-neutral-100 dark:bg-neutral-800/50", text: "text-neutral-700 dark:text-neutral-300" },
];
export function getAvatarColor(index) { return AVATAR_COLORS[index % AVATAR_COLORS.length]; }

export const CATEGORY_CONFIG = {
  hair:       { label: "Hair",       className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  nails:      { label: "Nails",      className: "bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30" },
  aesthetics: { label: "Aesthetics", className: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30" },
  waxing:     { label: "Waxing",     className: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  lashes:     { label: "Lashes",     className: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" },
  massage:    { label: "Massage",    className: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30" },
  makeup:     { label: "Makeup",     className: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30" },
  brows:      { label: "Brows",      className: "bg-stone-500/15 text-stone-600 dark:text-stone-400 border-stone-500/30" },
  other:      { label: "Other",      className: "bg-muted text-muted-foreground border-border" },
};
export function categoryBadge(cat) { return CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other; }

export const PAYMENT_METHOD_LABELS = {
  cash: "Cash", card: "Card", zelle: "Zelle", cashapp: "CashApp", venmo: "Venmo", other: "Other"
};

export function computeEarnings(amount, renter) {
  if (!renter) return { renter_earnings: amount, owner_earnings: 0, renter_pct: 100 };
  if (renter.payment_model === "commission") {
    const ownerPct = renter.commission_owner || 40;
    const renterPct = 100 - ownerPct;
    return {
      renter_pct: renterPct,
      renter_earnings: parseFloat(((amount * renterPct) / 100).toFixed(2)),
      owner_earnings: parseFloat(((amount * ownerPct) / 100).toFixed(2)),
    };
  }
  return { renter_pct: 100, renter_earnings: amount, owner_earnings: 0 };
}

// Returns weekly base salary for a commission stylist
export function getWeeklyBaseSalary(renter) {
  if (!renter || renter.payment_model !== "commission") return 0;
  const base = renter.base_salary || 0;
  if (!base) return 0;
  if (renter.base_salary_frequency === "monthly") return base / (52 / 12);
  return base; // weekly
}

// Check if a date is before the renter's start date (no backdated debt)
export function isBeforeStartDate(periodStr, renter) {
  if (!renter?.start_date) return false;
  return periodStr < renter.start_date.slice(0, 7);
}

export function getMonthsInRange(count = 12) {
  const months = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export function isPaymentOverdue(payment, renter) {
  // No payment record at all — check if the current month has passed its due threshold
  if (!payment) {
    // Consider overdue if we're past the 10th of the month (enough time to have paid)
    const now = new Date();
    if (now.getDate() > 10) return true;
    return false;
  }
  if (payment.status === 'paid') return false;
  // If a due_date exists, use it
  if (payment.due_date) return new Date(payment.due_date) < new Date();
  // Fallback: if no due_date, use 7 days after the period start date
  if (payment.period) {
    const due = new Date(payment.period);
    due.setDate(due.getDate() + 7);
    return due < new Date();
  }
  return false;
}

// Returns the correct monthly rent total for a renter based on actual weeks in the given month
export function calcMonthlyRent(renter, monthStr) {
  const [yr, mo] = monthStr.split("-").map(Number);
  // Count Mondays in the month to determine number of weeks
  let weeks = 0;
  const d = new Date(yr, mo - 1, 1);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  while (d.getMonth() === mo - 1) { weeks++; d.setDate(d.getDate() + 7); }

  const amt = renter.rent_amount || 0;
  if (renter.frequency === "weekly") return amt * weeks;
  if (renter.frequency === "biweekly") return amt * Math.ceil(weeks / 2);
  return amt; // monthly
}

export function getDueDate(periodStart, frequency) {
  const d = new Date(periodStart);
  if (frequency === 'weekly') d.setDate(d.getDate() + 7);
  else if (frequency === 'biweekly') d.setDate(d.getDate() + 14);
  else d.setDate(d.getDate() + 30);
  return d.toISOString();
}