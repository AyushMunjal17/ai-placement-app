import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = ({ children, requireEmailVerification = true, requiredRole }) => {
  const { isAuthenticated, user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check email verification for routes that require it
  // Allow access to verify-email page even if email isn't verified
  if (requireEmailVerification && user && !user.isEmailVerified) {
    // Check if this is the verify-email route itself
    if (location.pathname !== '/verify-email') {
      return <Navigate to="/verify-email" replace />
    }
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/problems" replace />
  }

  return children
}

export default ProtectedRoute
