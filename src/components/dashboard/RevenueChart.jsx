import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency, calcMonthlyRent, freqMultiplier } from "@/lib/utils";

export default function RevenueChart({ renters, charges, payments, services, currency }) {
  const now = new Date();

  // Build last 6 months of real data
  const data = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const name = d.toLocaleDateString('en-US', { month: 'short' });

    // Rent: sum calcMonthlyRent for renters who paid this month
    const paidRenterIds = new Set((payments || []).filter(p => p.status === "paid" && p.period?.startsWith(monthStr)).map(p => p.renter_id));
    const rent = renters.filter(r => r.status === "active" && paidRenterIds.has(r.id)).reduce((s, r) => s + calcMonthlyRent(r, monthStr), 0);

    // Commission: sum owner_earnings from services this month
    const commission = (services || []).filter(s => s.service_date?.startsWith(monthStr)).reduce((s, e) => s + (e.owner_earnings || 0), 0);

    data.push({ name, rent, commission });
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
        {payload.map((p, i) =>
        <p key={i} className="text-sm font-mono" style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value, currency)}
          </p>
        )}
      </div>);

  };

  return (
    <div className="bg-card p-5 opacity-100 rounded-xl border border-border sm:p-6 animate-fade-in">
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
              axisLine={false} />
            
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${currency}${v}`} />
            
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="rent" name="Rent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="commission" name="Commission" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>);

}