import { Settings, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface MaintenancePageProps {
  message?: string;
}

export default function MaintenancePage({ message }: MaintenancePageProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-card/50 backdrop-blur-xl border-border/50">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="p-4 rounded-full bg-primary/10 animate-pulse">
                <Settings className="h-12 w-12 text-primary animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <div className="absolute -bottom-1 -right-1 p-2 rounded-full bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Under Maintenance</h1>
            <p className="text-muted-foreground">
              {message || "We are currently performing scheduled maintenance to improve your experience. Please check back soon."}
            </p>
          </div>

          <div className="pt-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              If you need immediate assistance, please contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}