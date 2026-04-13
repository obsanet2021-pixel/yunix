-- Create user_accounts table for MT5 bridge connections
CREATE TABLE public.user_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_name TEXT NOT NULL,
  mt5_login TEXT NOT NULL,
  mt5_server TEXT NOT NULL,
  investor_password_encrypted TEXT,
  encryption_iv TEXT,
  prop_firm_id UUID REFERENCES public.prop_firms(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  sync_status TEXT DEFAULT 'pending',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own accounts" 
ON public.user_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own accounts" 
ON public.user_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts" 
ON public.user_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts" 
ON public.user_accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_accounts_updated_at
BEFORE UPDATE ON public.user_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();