import { useNavigate } from 'react-router-dom';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3, TrendingUp } from 'lucide-react';

export default function DataAnalystDashboard() {
  const navigate = useNavigate();
  const { loading } = useStaffPermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/app/dashboard')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Welcome, Data Analyst</h1>
          <p className="text-muted-foreground">Analytics & Insights Dashboard</p>
        </div>
      </div>

      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle>Your Current Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <BarChart3 className="h-5 w-5 text-blue-400 mt-0.5" />
              <div>
                <p className="font-medium">Weekly reports</p>
                <p className="text-sm text-muted-foreground">Generate trading analytics reports</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <TrendingUp className="h-5 w-5 text-green-400 mt-0.5" />
              <div>
                <p className="font-medium">Performance analysis</p>
                <p className="text-sm text-muted-foreground">Analyze user trading patterns</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle>Analytics Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-auto py-6 justify-start"
              onClick={() => navigate('/app/analytics')}
            >
              <div className="text-left">
                <p className="font-medium">Analytics Dashboard</p>
                <p className="text-sm text-muted-foreground">View trading analytics</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}