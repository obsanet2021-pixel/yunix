import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, DollarSign, Upload, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PayoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propFirmId: string;
  propFirmName: string;
  currentCyclePnl: number;
  fundedBalance: number;
  onPayoutComplete: () => void;
}

export function PayoutModal({
  open,
  onOpenChange,
  propFirmId,
  propFirmName,
  currentCyclePnl,
  fundedBalance,
  onPayoutComplete
}: PayoutModalProps) {
  const [withdrawnAmount, setWithdrawnAmount] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(withdrawnAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount",
        variant: "destructive"
      });
      return;
    }

    if (amount > currentCyclePnl) {
      toast({
        title: "Amount Exceeds Profit",
        description: "Withdrawal amount cannot exceed your current cycle profit",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload proof if provided
      let proofUrl: string | null = null;
      if (proofFile) {
        const fileExt = proofFile.name.split(".").pop();
        const fileName = `${user.id}/payout-proof-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("prop-firm-screenshots")
          .upload(fileName, proofFile);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from("prop-firm-screenshots")
          .getPublicUrl(fileName);
        proofUrl = publicUrl;
      }

      // Call the close_cycle_and_start_new function
      const { data, error } = await supabase.rpc('close_cycle_and_start_new', {
        _prop_firm_id: propFirmId,
        _withdrawn_amount: amount,
        _payout_proof_url: proofUrl
      });

      if (error) throw error;

      toast({
        title: "Payout Recorded",
        description: `Cycle closed. Withdrawal of $${amount.toLocaleString()} recorded. New cycle started.`
      });

      onPayoutComplete();
      onOpenChange(false);
      setWithdrawnAmount("");
      setProofFile(null);
    } catch (error: any) {
      console.error("Payout error:", error);
      toast({
        title: "Payout Failed",
        description: error.message || "Failed to process payout request",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Request Payout
          </DialogTitle>
          <DialogDescription>
            Record a payout for {propFirmName}. This will close the current cycle and start a new one.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
            <div>
              <div className="text-xs text-muted-foreground">Funded Balance</div>
              <div className="font-mono font-semibold">
                ${fundedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Current Cycle P&L</div>
              <div className={`font-mono font-semibold ${currentCyclePnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {currentCyclePnl >= 0 ? '+' : ''}${currentCyclePnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="withdrawn-amount">Withdrawal Amount ($)</Label>
            <Input
              id="withdrawn-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={currentCyclePnl > 0 ? currentCyclePnl : undefined}
              value={withdrawnAmount}
              onChange={(e) => setWithdrawnAmount(e.target.value)}
              placeholder="Enter amount withdrawn"
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the actual amount you received from the prop firm
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payout-proof">Payout Proof (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="payout-proof"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
              {proofFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setProofFile(null)}
                >
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Upload a screenshot or PDF of your payout confirmation
            </p>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-600 dark:text-amber-400">
              <strong>Important:</strong> This action will close your current cycle, lock all existing trades in this cycle, 
              and start a new cycle with your funded balance reset to ${fundedBalance.toLocaleString()}.
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !withdrawnAmount}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4" />
                  Confirm Payout
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
