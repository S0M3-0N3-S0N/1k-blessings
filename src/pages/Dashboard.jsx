import { useState, useEffect, useCallback } from "react";
import PullToRefresh from "../components/PullToRefresh";
import { base44 } from "@/api/base44Client";
import { calcMonthlyRent } from "@/lib/utils";
import KpiCards from "../components/dashboard/KpiCards";
import RevenueChart from "../components/dashboard/RevenueChart";
import BreakdownCard from "../components/dashboard/BreakdownCard";
import PaymentSchedule from "../components/payments/PaymentSchedule";
import NotesCard from "../components/notes/NotesCard";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const [renters, setRenters] = useState([]);
  const [charges, setCharges] = useState([]);
  const [payments, setPayments] = useState([]);
  const [services, setServices] = useState([]);
  const currency = '$';
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [r, c, p, s] = await Promise.all([
      base44.entities.Renter.list(),
      base44.entities.Charge.list(),
      base44.entities.Payment.list(),
      base44.entities.ServiceEntry.list("-service_date", 300),
    ]);
    setRenters(r); setCharges(c); setPayments(p); setServices(s);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const activeRenters = renters.filter(r => r.status === 'active');

  const paidRenterIds = new Set(payments.filter(p => p.status === "paid" && p.period?.startsWith(currentMonthStr)).map(p => p.renter_id));
  const totalMonthly = activeRenters.reduce((s, r) => s + calcMonthlyRent(r, currentMonthStr), 0);
  const collectedMonthly = activeRenters.filter(r => paidRenterIds.has(r.id)).reduce((s, r) => s + calcMonthlyRent(r, currentMonthStr), 0);
  const totalWeekly = activeRenters.filter(r => r.frequency === 'weekly').reduce((s, r) => s + (r.rent_amount || 0), 0);

  const stats = {
    monthly: totalMonthly,
    weekly: totalWeekly,
    renters: activeRenters.length,
    collect: collectedMonthly,
  };

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Overview of your salon rentals</p>
          </div>
        </div>

        <KpiCards stats={stats} currency={currency} />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <RevenueChart renters={activeRenters} charges={charges} payments={payments} services={services} currency={currency} />
          </div>
          <div className="lg:col-span-2">
            <BreakdownCard renters={activeRenters} charges={charges} currency={currency} />
          </div>
        </div>

        <PaymentSchedule renters={renters} payments={payments} currency={currency} />

        <NotesCard />
      </div>
    </PullToRefresh>
  );
}