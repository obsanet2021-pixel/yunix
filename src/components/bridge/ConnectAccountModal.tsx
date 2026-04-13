import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Link2, Eye, EyeOff } from "lucide-react";

interface PropFirm {
  id: string;
  name: string;
  account_type: string;
}

interface ConnectAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propFirms?: PropFirm[];
  onSuccess?: () => void;
}

export function ConnectAccountModal({ open, onOpenChange, propFirms = [], onSuccess }: ConnectAccountModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    account_name: "",
    mt5_login: "",
    investor_password: "",
    mt5_server: "",
    prop_firm_id: ""
  });

  const NONE_PROP_FIRM_VALUE = "__none__";
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.account_name || !formData.mt5_login || !formData.investor_password || !formData.mt5_server) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Encrypt the password before storing
      const { data: encryptedData, error: encryptError } = await supabase.functions.invoke('encrypt-password', {
        body: { password: formData.investor_password }
      });

      if (encryptError) {
        console.error("Encryption error:", encryptError);
        throw new Error("Failed to secure password");
      }

      // Insert into user_accounts table
      // Using type assertion since table was just created and types haven't regenerated
      const { error: insertError } = await (supabase as any)
        .from("user_accounts")
        .insert({
          user_id: user.id,
          account_name: formData.account_name,
          mt5_login: formData.mt5_login,
          mt5_server: formData.mt5_server,
          investor_password_encrypted: encryptedData?.encrypted,
          encryption_iv: encryptedData?.iv,
          prop_firm_id: formData.prop_firm_id || null,
          is_active: true,
          sync_status: 'pending'
        });

      if (insertError) throw insertError;

      toast({
        title: "Account Connected",
        description: "Your MT5 account has been connected. Trades will sync automatically."
      });

      // Reset form
      setFormData({
        account_name: "",
        mt5_login: "",
        investor_password: "",
        mt5_server: "",
        prop_firm_id: ""
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error connecting account:", error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect account",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Connect MT5 Account
          </DialogTitle>
          <DialogDescription>
            Enter your MT5 investor credentials to enable automatic trade syncing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account_name">Account Name *</Label>
            <Input
              id="account_name"
              placeholder="e.g., My FTMO 100K"
              value={formData.account_name}
              onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value }))}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mt5_login">MT5 Login *</Label>
            <Input
              id="mt5_login"
              placeholder="e.g., 12345678"
              value={formData.mt5_login}
              onChange={(e) => setFormData(prev => ({ ...prev, mt5_login: e.target.value }))}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="investor_password">Investor Password *</Label>
            <div className="relative">
              <Input
                id="investor_password"
                type={showPassword ? "text" : "password"}
                placeholder="Read-only investor password"
                value={formData.investor_password}
                onChange={(e) => setFormData(prev => ({ ...prev, investor_password: e.target.value }))}
                disabled={isLoading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use your read-only investor password for security
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mt5_server">MT5 Server *</Label>
            <Input
              id="mt5_server"
              placeholder="e.g., FTMO-Demo"
              value={formData.mt5_server}
              onChange={(e) => setFormData(prev => ({ ...prev, mt5_server: e.target.value }))}
              disabled={isLoading}
            />
          </div>

          {propFirms.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="prop_firm_id">Link to Existing Account (Optional)</Label>
              <Select
                value={formData.prop_firm_id || undefined}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    prop_firm_id: value === NONE_PROP_FIRM_VALUE ? "" : value,
                  }))
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an account to link" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_PROP_FIRM_VALUE}>None</SelectItem>
                  {propFirms.map((firm) => (
                    <SelectItem key={firm.id} value={firm.id}>
                      {firm.name} ({firm.account_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect Account"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
