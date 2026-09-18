import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

const container = document.getElementById('root');
const root = createRoot(container!);

/**
 * The AuthProvider sits above all components in the React component tree
 * so that any page, route, or navigation component can access the authentication
 * state, user profile, and role verification via useAuth().
 */
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);