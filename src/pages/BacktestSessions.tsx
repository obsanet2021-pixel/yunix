import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Play, Trash2, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface BacktestSession {
  id: string;
  name: string;
  pair: string;
  balance: number;
  date: string;
  timeframe: string;
}

export default function BacktestSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<BacktestSession[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    name: "",
    pair: "XAUUSD",
    balance: "10000",
    timeframe: "15m",
  });

  useEffect(() => {
    // Load sessions from localStorage
    const saved = localStorage.getItem("backtest-sessions");
    if (saved) {
      setSessions(JSON.parse(saved));
    }
  }, []);

  const saveSession = () => {
    if (!newSession.name.trim()) {
      toast.error("Please enter a session name");
      return;
    }

    const session: BacktestSession = {
      id: Date.now().toString(),
      name: newSession.name,
      pair: newSession.pair,
      balance: parseFloat(newSession.balance),
      date: new Date().toLocaleString(),
      timeframe: newSession.timeframe,
    };

    const updated = [...sessions, session];
    setSessions(updated);
    localStorage.setItem("backtest-sessions", JSON.stringify(updated));
    
    setIsDialogOpen(false);
    setNewSession({ name: "", pair: "XAUUSD", balance: "10000", timeframe: "15m" });
    toast.success("Session created");
  };

  const deleteSession = (id: string) => {
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    localStorage.setItem("backtest-sessions", JSON.stringify(updated));
    toast.success("Session deleted");
  };

  const startSession = (session: BacktestSession) => {
    navigate(`/backtest-replay/${session.id}`);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Backtest</h1>
            <p className="text-muted-foreground mt-2">Your Sessions</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                New Session +
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Session</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Session Name</Label>
                  <Input
                    value={newSession.name}
                    onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                    placeholder="e.g., Gold Strategy Test"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pair</Label>
                  <Select value={newSession.pair} onValueChange={(v) => setNewSession({ ...newSession, pair: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="XAUUSD">XAU/USD</SelectItem>
                      <SelectItem value="EURUSD">EUR/USD</SelectItem>
                      <SelectItem value="GBPUSD">GBP/USD</SelectItem>
                      <SelectItem value="USDJPY">USD/JPY</SelectItem>
                      <SelectItem value="GBPJPY">GBP/JPY</SelectItem>
                      <SelectItem value="DEUINDEX">DEU/INDEX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timeframe</Label>
                  <Select value={newSession.timeframe} onValueChange={(v) => setNewSession({ ...newSession, timeframe: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1m">1 Minute</SelectItem>
                      <SelectItem value="3m">3 Minutes</SelectItem>
                      <SelectItem value="5m">5 Minutes</SelectItem>
                      <SelectItem value="15m">15 Minutes</SelectItem>
                      <SelectItem value="30m">30 Minutes</SelectItem>
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="4h">4 Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Initial Balance ($)</Label>
                  <Input
                    type="number"
                    value={newSession.balance}
                    onChange={(e) => setNewSession({ ...newSession, balance: e.target.value })}
                  />
                </div>
                <Button onClick={saveSession} className="w-full">
                  Create Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {sessions.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground text-lg">No sessions yet. Create your first one!</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <Card key={session.id} className="glow-card hover:border-primary/50 transition-colors">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Name:</span>
                      <span className="font-semibold">{session.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Pair:</span>
                      <span className="font-semibold">{session.pair}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Balance:</span>
                      <span className="font-semibold text-primary">${session.balance.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Date:</span>
                      <span className="text-sm">{session.date}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => startSession(session)} 
                      className="flex-1 gap-2"
                      size="sm"
                    >
                      <Play className="h-4 w-4" />
                      Start
                    </Button>
                    <Button 
                      onClick={() => deleteSession(session.id)} 
                      variant="outline" 
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
