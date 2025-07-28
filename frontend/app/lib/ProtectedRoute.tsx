import { useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: 'student' | 'lecturer' | 'admin' | 'lecturer-or-admin';
}

export default function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Don't redirect while auth is loading
    if (loading) return;

    // Redirect to login if not authenticated
    if (!user) {
      navigate('/login');
      return;
    }

    // Check role requirements
    if (requireRole) {
      const hasRequiredRole = 
        requireRole === 'lecturer-or-admin' 
          ? (user.role === 'lecturer' || user.role === 'admin')
          : user.role === requireRole;

      if (!hasRequiredRole) {
        navigate('/dashboard'); // Redirect to dashboard if role doesn't match
        return;
      }
    }
  }, [user, loading, navigate, requireRole]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  // Check role requirements before rendering
  if (requireRole) {
    const hasRequiredRole = 
      requireRole === 'lecturer-or-admin' 
        ? (user.role === 'lecturer' || user.role === 'admin')
        : user.role === requireRole;

    if (!hasRequiredRole) {
      return null; // Will redirect via useEffect
    }
  }

  return <>{children}</>;
}
