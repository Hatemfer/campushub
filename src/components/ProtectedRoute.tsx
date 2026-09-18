import React from 'react';
import { Navigate } from 'react-router-dom';
import { IonSpinner, IonContent, IonPage } from '@ionic/react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Educational & Architectural Notes (University Project Context):
 *
 * Route Guard Pattern:
 * 1. Session Restoration Window:
 *    When a user refreshes or navigates to a protected route, Firebase Auth asynchronously
 *    restores credentials from local storage. `loading === true` indicates this phase.
 *    Displaying a loading spinner prevents false unauthenticated redirects to `/login`.
 *
 * 2. Unauthenticated Redirect:
 *    If `loading === false` and `isAuthenticated === false`, the guard redirects to `/login`
 *    using `<Navigate to="/login" replace />` to prevent unauthorized access.
 *
 * 3. Role-Based Access Control (RBAC):
 *    If `requireAdmin === true`, the guard checks `isAdmin` derived directly from the user's
 *    Firestore profile. Non-admin students attempting to reach administrative routes are
 *    safely redirected to `/home`.
 */

export interface ProtectedRouteProps {
  children?: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const { loading, isAuthenticated, isAdmin } = useAuth();

  // 1. While Firebase is resolving session state, display a loading spinner
  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              gap: '16px',
            }}
            data-testid="protected-route-loading"
          >
            <IonSpinner name="crescent" color="primary" style={{ width: '40px', height: '40px' }} />
            <span style={{ color: 'var(--ion-color-medium)' }}>Verifying credentials...</span>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // 2. If unauthenticated, redirect to the Login screen
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 3. If route requires administrator privileges and user is not an admin, redirect to /home
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/home" replace />;
  }

  // 4. Authorized: render child components
  return <>{children}</>;
};

export default ProtectedRoute;
