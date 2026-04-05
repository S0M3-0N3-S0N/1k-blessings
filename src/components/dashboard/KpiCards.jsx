import { DollarSign, CalendarClock, Users, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const cards = [
  { key: "monthly", label: "Monthly Revenue", icon: DollarSign, color: "text-primary", bgColor: "bg-primary/10" },
  { key: "weekly", label: "Weekly Revenue", icon: CalendarClock, color: "text-emerald-600", bgColor: "bg-emerald-50" },
  { key: "renters", label: "Active Renters", icon: Users, color: "text-amber-600", bgColor: "bg-amber-50" },
  { key: "collect", label: "30-Day Collection", icon: TrendingUp, color: "text-violet-600", bgColor: "bg-violet-50" },
];

export default function KpiCards({ stats, currency }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = card.key === "renters"
          ? stats[card.key]
          : formatCurrency(stats[card.key], currency);
        const sub = card.key === "renters" ? "stations occupied" : card.key === "monthly" ? "all renters" : card.key === "weekly" ? "weekly renters" : "next 30 days";

        return (
          <div
            key={card.key}
            className="bg-card rounded-xl border border-border p-4 sm:p-5 animate-fade-in"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <p className={`text-xl sm:text-2xl font-semibold font-mono tracking-tight ${card.color}`}>
              {value}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
          </div>
        );
      })}
    </div>
  );
}