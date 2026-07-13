import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute guards a route by checking that:
 *   1. A valid auth token exists in context.
 *   2. The authenticated role matches `requiredRole`.
 *
 * Redirect targets:
 *   - requiredRole="rider"   → unauthenticated/wrong role → /login
 *   - requiredRole="captain" → unauthenticated/wrong role → /captain/login
 *
 * Usage in App.jsx:
 *   <Route path="/rider-home" element={
 *     <ProtectedRoute requiredRole="rider"><RiderHome /></ProtectedRoute>
 *   } />
 */
const ProtectedRoute = ({ children, requiredRole }) => {
  const { token, role } = useAuth();

  const isAuthorized = token && role === requiredRole;

  if (!isAuthorized) {
    const redirectTo = requiredRole === 'captain' ? '/captain/login' : '/login';
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default ProtectedRoute;
