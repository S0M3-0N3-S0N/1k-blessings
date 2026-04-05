import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import RenterCard from "../components/renters/RenterCard";
import QuickAddRenter from "../components/renters/QuickAddRenter";
import EditRenterDialog from "../components/renters/EditRenterDialog";
import ChargesLedger from "../components/charges/ChargesLedger";

import { Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Renters() {
  const [renters, setRenters] = useState([]);
  const [charges, setCharges] = useState([]);
  const currency = '$';
  const [loading, setLoading] = useState(true);
  const [editRenter, setEditRenter] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [r, c] = await Promise.all([
      base44.entities.Renter.list(),
      base44.entities.Charge.list(),
    ]);
    setRenters(r);
    setCharges(c);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await base44.entities.Renter.delete(deleteId);
    // Also delete associated charges
    const relatedCharges = charges.filter(c => c.renter_id === deleteId);
    for (const c of relatedCharges) {
      await base44.entities.Charge.delete(c.id);
    }
    setDeleteId(null);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Renters</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage stations and chair renters</p>
        </div>

      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {renters.map((r, i) => (
          <div key={r.id} onClick={() => setEditRenter(r)} className="cursor-pointer">
            <RenterCard renter={r} index={i} currency={currency} onDelete={(id) => { setDeleteId(id); }} />
          </div>
        ))}
        <QuickAddRenter onAdded={loadData} />
      </div>

      <ChargesLedger charges={charges} renters={renters} currency={currency} onRefresh={loadData} />

      <EditRenterDialog
        renter={editRenter}
        open={!!editRenter}
        onClose={() => setEditRenter(null)}
        onUpdated={loadData}
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