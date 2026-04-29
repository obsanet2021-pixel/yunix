import { Shield, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';

export default function Unauthorized() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Get the route they tried to access
  const attemptedRoute = location.state?.from?.pathname || 'unknown page';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-center">
            You don't have permission to access <code className="bg-muted px-1 rounded">{attemptedRoute}</code>.
          </p>
          
          {user && (
            <p className="text-sm text-muted-foreground text-center">
              Logged in as: <span className="font-medium">{user.email}</span>
            </p>
          )}

          <div className="flex flex-col gap-2 pt-4">
            <Button 
              onClick={() => navigate('/app/dashboard')}
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => navigate(-1)}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
