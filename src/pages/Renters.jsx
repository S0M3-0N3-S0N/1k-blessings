import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, freqMultiplier, freqLabel, getInitials, getAvatarColor, cn } from "@/lib/utils";
import { Loader2, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import PullToRefresh from "../components/PullToRefresh";
import RenterCard from "../components/renters/RenterCard";
import QuickAddRenter from "../components/renters/QuickAddRenter";
import EditRenterDialog from "../components/renters/EditRenterDialog";
import ChargesLedger from "../components/charges/ChargesLedger";

const currency = "$";

function getWeekStart(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() - offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Tab: Renters ────────────────────────────────────────────────────────────
function RentersTab({ renters, charges, onRefresh }) {
  const [editRenter, setEditRenter] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    await base44.entities.Renter.delete(deleteId);
    const related = charges.filter(c => c.renter_id === deleteId);
    for (const c of related) await base44.entities.Charge.delete(c.id);
    setDeleteId(null);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {renters.map((r, i) => (
          <div key={r.id} onClick={() => setEditRenter(r)} className="cursor-pointer">
            <RenterCard renter={r} index={i} currency={currency} onDelete={(id) => setDeleteId(id)} />
          </div>
        ))}
        <QuickAddRenter onAdded={onRefresh} />
      </div>

      <ChargesLedger charges={charges} renters={renters} currency={currency} onRefresh={onRefresh} />

      <EditRenterDialog
        renter={editRenter}
        open={!!editRenter}
        onClose={() => setEditRenter(null)}
        onUpdated={onRefresh}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Renter</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this renter and all their associated charges. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Tab: Master Ledger ───────────────────────────────────────────────────────
function LedgerTab({ renters, timeEntries, charges, serviceEntries }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = getWeekStart(weekOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const activeRenters = renters.filter(r => r.status === "active");

  const rows = activeRenters.map((r, i) => {
    const entries = timeEntries.filter(t => t.renter_id === r.id && t.clock_in && new Date(t.clock_in) >= weekStart && new Date(t.clock_in) < weekEnd);
    const hours = entries.reduce((s, t) => s + (t.total_hours || 0), 0);
    const gross = hours * (r.hourly_wage || 0);
    const weeklyRent = (r.rent_amount || 0) * freqMultiplier(r.frequency) / 4.33;
    const renterCharges = charges.filter(c => c.renter_id === r.id).reduce((s, c) => s + (c.amount || 0) * freqMultiplier(c.frequency) / 4.33, 0);
    const serviceEarnings = serviceEntries
      .filter(se => se.renter_id === r.id && se.service_date >= weekStart.toISOString().split('T')[0] && se.service_date < weekEnd.toISOString().split('T')[0])
      .reduce((s, se) => s + (se.renter_earnings || 0), 0);
    const totalDeductions = weeklyRent + renterCharges;
    const net = gross + serviceEarnings - totalDeductions;
    const avatar = getAvatarColor(i);
    return { renter: r, hours, gross, weeklyRent, renterCharges, serviceEarnings, totalDeductions, net, avatar };
  });

  const totals = rows.reduce((acc, r) => ({
    hours: acc.hours + r.hours,
    gross: acc.gross + r.gross,
    deductions: acc.deductions + r.totalDeductions,
    net: acc.net + r.net,
  }), { hours: 0, gross: 0, deductions: 0, net: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-muted-foreground">
          Week of {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
        <Select value={String(weekOffset)} onValueChange={v => setWeekOffset(Number(v))}>
          <SelectTrigger className="h-9 text-xs w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">This Week</SelectItem>
            <SelectItem value="1">Last Week</SelectItem>
            <SelectItem value="2">2 Weeks Ago</SelectItem>
            <SelectItem value="3">3 Weeks Ago</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Renter</th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Hours</th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Wage</th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Gross Pay</th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Rent</th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Charges</th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Services</th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Net Pay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-muted-foreground text-sm">No active renters.</td></tr>
            )}
            {rows.map(({ renter, hours, gross, weeklyRent, renterCharges, serviceEarnings, net, avatar }) => (
              <tr key={renter.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold", avatar.bg, avatar.text)}>
                      {getInitials(renter.name)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{renter.name}</p>
                      <p className="text-[11px] text-muted-foreground">{renter.role}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-right font-mono">{hours.toFixed(1)}h</td>
                <td className="px-3 py-3 text-right font-mono text-muted-foreground">{formatCurrency(renter.hourly_wage || 0, currency)}/hr</td>
                <td className="px-3 py-3 text-right font-mono font-medium">{formatCurrency(gross, currency)}</td>
                <td className="px-3 py-3 text-right font-mono text-muted-foreground hidden md:table-cell">-{formatCurrency(weeklyRent, currency)}</td>
                <td className="px-3 py-3 text-right font-mono text-muted-foreground hidden md:table-cell">-{formatCurrency(renterCharges, currency)}</td>
                <td className="px-3 py-3 text-right font-mono text-emerald-600 hidden md:table-cell">+{formatCurrency(serviceEarnings, currency)}</td>
                <td className="px-3 py-3 text-right">
                  <span className={cn("font-mono font-bold text-sm", net >= 0 ? "text-emerald-600" : "text-red-500")}>
                    {net >= 0 ? "+" : ""}{formatCurrency(net, currency)}
                  </span>
                  <p className="text-[10px] text-muted-foreground">{net >= 0 ? "net pay" : "balance due"}</p>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/50 border-t border-border">
              <td className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Totals</td>
              <td className="px-3 py-3 text-right font-mono font-bold">{totals.hours.toFixed(1)}h</td>
              <td className="px-3 py-3"></td>
              <td className="px-3 py-3 text-right font-mono font-bold">{formatCurrency(totals.gross, currency)}</td>
              <td className="px-3 py-3 text-right font-mono font-bold hidden md:table-cell text-red-500">-{formatCurrency(totals.deductions, currency)}</td>
              <td className="px-3 py-3 hidden md:table-cell"></td>
              <td className="px-3 py-3 hidden md:table-cell"></td>
              <td className={cn("px-3 py-3 text-right font-mono font-bold text-base", totals.net >= 0 ? "text-emerald-600" : "text-red-500")}>
                {formatCurrency(totals.net, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: User Management ─────────────────────────────────────────────────────
function UserMgmtTab({ renters, onRefresh }) {
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});

  const startEdit = (r) => {
    setEditing(r.id);
    setEditForm({ hourly_wage: r.hourly_wage || 0, user_email: r.user_email || "", status: r.status || "active" });
  };

  const saveEdit = async (id) => {
    await base44.entities.Renter.update(id, {
      hourly_wage: parseFloat(editForm.hourly_wage) || 0,
      user_email: editForm.user_email,
      status: editForm.status,
    });
    toast.success("Renter updated");
    setEditing(null);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Renter</th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Linked Email</th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Hourly Wage</th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Status</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {renters.map((r, i) => {
              const avatar = getAvatarColor(i);
              const isEditing = editing === r.id;
              return (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold", avatar.bg, avatar.text)}>
                        {getInitials(r.name)}
                      </div>
                      <div>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground">{r.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell">
                    {isEditing ? (
                      <Input value={editForm.user_email} onChange={e => setEditForm({ ...editForm, user_email: e.target.value })} className="h-7 text-xs w-48" placeholder="email@example.com" />
                    ) : (
                      <span className={cn("text-xs", r.user_email ? "text-foreground" : "text-muted-foreground italic")}>{r.user_email || "Not linked"}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {isEditing ? (
                      <Input type="number" value={editForm.hourly_wage} onChange={e => setEditForm({ ...editForm, hourly_wage: e.target.value })} className="h-7 text-xs w-20 font-mono ml-auto" min="0" step="0.5" />
                    ) : (
                      <span className="font-mono text-sm font-medium">{formatCurrency(r.hourly_wage || 0, currency)}/hr</span>
                    )}
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell text-right">
                    {isEditing ? (
                      <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                        <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border", r.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200")}>
                        {r.status}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {isEditing ? (
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={() => saveEdit(r.id)}><Check className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditing(null)}><X className="w-3.5 h-3.5" /></Button>
                      </div>
                    ) : (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground ml-auto flex" onClick={() => startEdit(r)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {renters.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground text-sm">No renters found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700">
        <strong>Tip:</strong> Link a renter's email to their app user account so they can log in and see their private dashboard. Their hourly wage is used to calculate payroll.
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = ["Renters", "Payroll Ledger", "User Management"];

export default function Renters() {
  const [activeTab, setActiveTab] = useState("Renters");
  const [renters, setRenters] = useState([]);
  const [charges, setCharges] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [serviceEntries, setServiceEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [r, c, t, s] = await Promise.all([
      base44.entities.Renter.list(),
      base44.entities.Charge.list(),
      base44.entities.TimeEntry.list(),
      base44.entities.ServiceEntry.list(),
    ]);
    setRenters(r);
    setCharges(c);
    setTimeEntries(t);
    setServiceEntries(s);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Renters & Payroll</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage renters, payroll, and user accounts</p>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === tab ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Renters" && <RentersTab renters={renters} charges={charges} onRefresh={loadData} />}
        {activeTab === "Payroll Ledger" && <LedgerTab renters={renters} timeEntries={timeEntries} charges={charges} serviceEntries={serviceEntries} />}
        {activeTab === "User Management" && <UserMgmtTab renters={renters} onRefresh={loadData} />}
      </div>
    </PullToRefresh>
  );
}