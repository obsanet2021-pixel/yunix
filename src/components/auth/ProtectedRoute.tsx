// ✅ GOOD - Lovable's exact pattern
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // ✅ Show loading state - prevents flash of redirect
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // ✅ Redirect to auth if not logged in, but save attempted location
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
