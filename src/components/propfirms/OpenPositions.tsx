import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OpenPosition {
  id: string;
  mt5_ticket: number;
  symbol: string;
  trade_type: string;
  volume: number;
  open_price: number;
  current_price: number | null;
  take_profit: number | null;
  stop_loss: number | null;
  unrealized_pnl: number;
  open_time: string;
  last_updated: string;
}

interface OpenPositionsProps {
  propFirmId: string;
  onSync?: () => void;
}

export function OpenPositions({ propFirmId, onSync }: OpenPositionsProps) {
  const [positions, setPositions] = useState<OpenPosition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPositions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('open_positions')
      .select('*')
      .eq('prop_firm_id', propFirmId)
      .order('open_time', { ascending: false });

    if (!error && data) {
      setPositions(data as OpenPosition[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPositions();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('open-positions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'open_positions',
          filter: `prop_firm_id=eq.${propFirmId}`
        },
        () => {
          fetchPositions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propFirmId]);

  const totalPnL = positions.reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0);

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatPrice = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return value.toFixed(5);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Open Positions</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {positions.length} open position{positions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`text-lg font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {totalPnL >= 0 ? <TrendingUp className="h-4 w-4 inline mr-1" /> : <TrendingDown className="h-4 w-4 inline mr-1" />}
            {formatCurrency(totalPnL)}
          </div>
          {onSync && (
            <Button variant="outline" size="sm" onClick={onSync}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {positions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No open positions
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Entry</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Current</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">TP</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">SL</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => (
                  <TableRow key={position.id}>
                    <TableCell className="font-medium">{position.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={position.trade_type === 'Buy' ? 'default' : 'secondary'}>
                        {position.trade_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{position.volume}</TableCell>
                    <TableCell className="text-right">{formatPrice(position.open_price)}</TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      {formatPrice(position.current_price)}
                    </TableCell>
                    <TableCell className="text-right hidden lg:table-cell text-green-600">
                      {formatPrice(position.take_profit)}
                    </TableCell>
                    <TableCell className="text-right hidden lg:table-cell text-red-600">
                      {formatPrice(position.stop_loss)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${position.unrealized_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(position.unrealized_pnl)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
