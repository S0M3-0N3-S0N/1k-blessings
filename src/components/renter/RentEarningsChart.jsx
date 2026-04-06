import { formatCurrency } from "@/lib/utils";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";

export default function RentEarningsChart({ grossPay, weeklyRent, currency }) {
  const progress = weeklyRent > 0 ? Math.min((grossPay / weeklyRent) * 100, 100) : 0;
  const covered = grossPay >= weeklyRent;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold mb-4">Rent Coverage Progress</h3>
      <div className="flex items-center gap-6">
        <div className="relative w-28 h-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" data={[{ value: progress, fill: covered ? "#10b981" : "#f59e0b" }]} startAngle={90} endAngle={-270}>
              <RadialBar dataKey="value" background={{ fill: "#f1f5f9" }} cornerRadius={10} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold font-mono">{Math.round(progress)}%</span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">covered</span>
          </div>
        </div>
        <div className="space-y-3 flex-1">
          <div>
            <p className="text-xs text-muted-foreground">Earned this week</p>
            <p className="text-base font-mono font-bold text-emerald-600">{formatCurrency(grossPay, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Weekly rent target</p>
            <p className="text-base font-mono font-bold">{formatCurrency(weeklyRent, currency)}</p>
          </div>
          {covered ? (
            <p className="text-xs font-semibold text-emerald-600">✓ Rent covered! You're in profit.</p>
          ) : (
            <p className="text-xs font-semibold text-amber-600">Need {formatCurrency(weeklyRent - grossPay, currency)} more to cover rent.</p>
          )}
        </div>
      </div>
    </div>
  );
}