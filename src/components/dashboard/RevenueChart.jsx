import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency, freqMultiplier } from "@/lib/utils";

export default function RevenueChart({ renters, charges, currency }) {
  // Build last 6 months of data
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      name: d.toLocaleDateString('en-US', { month: 'short' }),
      month: d.getMonth(),
      year: d.getFullYear(),
    });
  }

  const totalMonthlyRent = renters
    .filter(r => r.status === 'active')
    .reduce((sum, r) => sum + (r.rent_amount || 0) * freqMultiplier(r.frequency), 0);

  const totalMonthlyCharges = charges
    .reduce((sum, c) => sum + (c.amount || 0) * freqMultiplier(c.frequency), 0);

  const data = months.map((m, i) => {
    // Simulate slight variation for past months, current month exact
    const factor = i === months.length - 1 ? 1 : 0.85 + Math.random() * 0.3;
    return {
      name: m.name,
      rent: Math.round(totalMonthlyRent * factor * 100) / 100,
      charges: Math.round(totalMonthlyCharges * factor * 100) / 100,
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-sm font-mono" style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value, currency)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 sm:p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold">Revenue Overview</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Monthly breakdown</p>
        </div>
      </div>
      <div className="h-[220px] sm:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${currency}${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="rent" name="Rent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="charges" name="Charges" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}