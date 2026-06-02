/**
 * Playbooks.tsx
 * Main playbooks page — list, create, edit, delete, and view stats.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BookOpen, Plus, Loader2, BarChart2 } from "lucide-react";
import { usePlaybooks, type Playbook, type PlaybookFormData, type PlaybookStats } from "@/hooks/usePlaybooks";
import PlaybookCard from "@/components/playbooks/PlaybookCard.tsx";
import PlaybookForm from "@/components/playbooks/PlaybookForm.tsx";
import PlaybookDetail from "@/components/playbooks/PlaybookDetail.tsx";

export default function Playbooks() {
  const {
    playbooks, isLoading,
    createPlaybook, updatePlaybook, deletePlaybook,
    getPlaybookStats,
  } = usePlaybooks();

  // Dialog state
  const [createOpen, setCreateOpen]     = useState(false);
  const [editOpen, setEditOpen]         = useState(false);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [detailOpen, setDetailOpen]     = useState(false);
  const [isSaving, setIsSaving]         = useState(false);

  // Working playbook
  const [selectedPlaybook, setSelectedPlaybook]   = useState<Playbook | null>(null);
  const [selectedStats, setSelectedStats]         = useState<PlaybookStats | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleCreate = async (form: PlaybookFormData) => {
    setIsSaving(true);
    const ok = await createPlaybook(form);
    setIsSaving(false);
    if (ok) setCreateOpen(false);
    return ok;
  };

  const handleEdit = async (form: PlaybookFormData) => {
    if (!selectedPlaybook) return false;
    setIsSaving(true);
    const ok = await updatePlaybook(selectedPlaybook.id, form);
    setIsSaving(false);
    if (ok) setEditOpen(false);
    return ok;
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPlaybook) return;
    await deletePlaybook(selectedPlaybook.id);
    setDeleteOpen(false);
    setSelectedPlaybook(null);
  };

  const handleCardClick = async (p: Playbook) => {
    setSelectedPlaybook(p);
    setSelectedStats(null);
    setDetailOpen(true);
    const stats = await getPlaybookStats(p.id);
    setSelectedStats(stats);
  };

  // ── Summary stats ────────────────────────────────────────────────────────

  const totalTrades  = playbooks.reduce((s, p) => s + (p.total_trades ?? 0), 0);
  const totalProfit  = playbooks.reduce((s, p) => s + (p.total_profit ?? 0), 0);
  const bestPlaybook = playbooks.length > 0
    ? playbooks.reduce((best, p) =>
        (p.total_profit ?? 0) > (best.total_profit ?? 0) ? p : best, playbooks[0])
    : null;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Playbooks</h1>
          <p className="text-sm text-muted-foreground">
            Define your trading setups and track which ones actually work
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-primary hover:bg-primary/90 gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          New Playbook
        </Button>
      </div>

      {/* Summary bar */}
      {playbooks.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-border/50 bg-muted/30 text-center">
            <p className="text-xs text-muted-foreground">Playbooks</p>
            <p className="text-2xl font-bold mt-0.5">{playbooks.length}</p>
          </div>
          <div className="p-3 rounded-lg border border-border/50 bg-muted/30 text-center">
            <p className="text-xs text-muted-foreground">Total Trades</p>
            <p className="text-2xl font-bold mt-0.5">{totalTrades}</p>
          </div>
          <div className={`p-3 rounded-lg border text-center ${
            totalProfit > 0
              ? "border-green-500/30 bg-green-500/5"
              : totalProfit < 0
              ? "border-red-500/30 bg-red-500/5"
              : "border-border/50 bg-muted/30"
          }`}>
            <p className="text-xs text-muted-foreground">Combined P&L</p>
            <p className={`text-2xl font-bold font-mono mt-0.5 ${
              totalProfit > 0 ? "text-green-600 dark:text-green-400"
              : totalProfit < 0 ? "text-red-600 dark:text-red-400"
              : "text-foreground"
            }`}>
              {totalProfit >= 0 ? "+" : ""}${Math.abs(totalProfit).toFixed(0)}
            </p>
          </div>
        </div>
      )}

      {/* Best playbook highlight */}
      {bestPlaybook && (bestPlaybook.total_trades ?? 0) > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
          <BarChart2 className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Best performing playbook</p>
            <p className="text-sm font-semibold truncate">
              {bestPlaybook.name}
              <span className="ml-2 text-green-600 dark:text-green-400 font-mono">
                +${(bestPlaybook.total_profit ?? 0).toFixed(2)}
              </span>
              <span className="ml-2 text-muted-foreground text-xs">
                {bestPlaybook.total_trades} trades
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && playbooks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No playbooks yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-6">
            Create your first playbook to start tracking which setups make you money.
            Tag trades to a playbook and see the stats build up automatically.
          </p>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create your first playbook
          </Button>
        </div>
      )}

      {/* Playbook grid */}
      {!isLoading && playbooks.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playbooks.map(p => (
            <PlaybookCard
              key={p.id}
              playbook={p}
              onClick={handleCardClick}
              onEdit={pb => { setSelectedPlaybook(pb); setEditOpen(true); }}
              onDelete={pb => { setSelectedPlaybook(pb); setDeleteOpen(true); }}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); }}>
        <DialogContent className="max-h-[88vh] flex flex-col p-0 gap-0 sm:max-w-lg">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
            <DialogTitle>New Playbook</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <PlaybookForm
              onSubmit={handleCreate}
              isLoading={isSaving}
              submitLabel="Create Playbook"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={open => { setEditOpen(open); }}>
        <DialogContent className="max-h-[88vh] flex flex-col p-0 gap-0 sm:max-w-lg">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
            <DialogTitle>Edit Playbook</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {selectedPlaybook && (
              <PlaybookForm
                initialData={{
                  name: selectedPlaybook.name,
                  description: selectedPlaybook.description ?? "",
                  entry_rules: selectedPlaybook.entry_rules,
                  risk_per_trade: selectedPlaybook.risk_per_trade?.toString() ?? "",
                  max_daily_loss: selectedPlaybook.max_daily_loss?.toString() ?? "",
                  preferred_sessions: selectedPlaybook.preferred_sessions,
                  preferred_pairs: selectedPlaybook.preferred_pairs,
                  color: selectedPlaybook.color,
                }}
                onSubmit={handleEdit}
                isLoading={isSaving}
                submitLabel="Update Playbook"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{selectedPlaybook?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This playbook will be deleted. All trades tagged to it will be unlinked but not deleted.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail sheet */}
      <PlaybookDetail
        playbook={selectedPlaybook}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedStats(null); }}
        stats={selectedStats}
      />
    </div>
  );
}
