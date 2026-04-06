import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, getInitials, getAvatarColor, cn } from "@/lib/utils";
import { Loader2, Edit2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function UserManagement() {
  const [renters, setRenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const currency = "$";

  useEffect(() => {
    base44.entities.Renter.list().then(r => { setRenters(r); setLoading(false); });
  }, []);

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
    base44.entities.Renter.list().then(setRenters);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Link renters to user accounts and set their wages</p>
      </div>

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
              <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground text-sm">No renters found. Add renters first.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700">
        <strong>Tip:</strong> Link a renter's email to their app user account so they can log in and see their private dashboard. Their hourly wage is used to calculate their payroll.
      </div>
    </div>
  );
}