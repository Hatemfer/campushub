import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import type { UserProfile } from "../types";
import {
  registerUser,
  loginUser,
  logoutUser,
  subscribeToAuthState,
  resetPassword,
} from "../services/auth.service";
import { getUserProfile } from "../services/user.service";

/**
 * Educational & Architectural Notes (University Project Context):
 *
 * 1. Why React Context is Used:
 *    CampusHub is an Ionic React application where auth state governs UI elements across
 *    unrelated tabs, navigation headers, and pages. React Context provides a clean, single
 *    source of truth for reactive authentication state without "prop-drilling" through Ionic
 *    route trees.
 *
 * 2. Why Firebase Auth and Firestore Profiles are Kept Separate:
 *    - Firebase Authentication manages cryptographic identity, JWT tokens, and login/logout sessions.
 *    - Cloud Firestore stores application-level domain records (display name, student/admin role, timestamps).
 *    Keeping them decoupled ensures high cohesion and separation of concerns: identity management
 *    is handled by Google's Auth backend, while authorization policies are bound to our database models.
 *
 * 3. Why the Role Comes from Firestore:
 *    Client-side storage (e.g., localStorage or cookies) is inherently untrusted and editable via browser DevTools.
 *    By resolving roles exclusively from the user's Firestore document (which is guarded by Firestore Security Rules),
 *    the app guarantees that permissions cannot be spoofed or forged on the client.
 *
 * 4. Why the Loading State is Necessary:
 *    When the browser loads or refreshes, Firebase asynchronously restores the user's session from IndexedDB.
 *    During this window, `currentUser` is temporarily null. The `loading` flag prevents premature redirects
 *    to login and avoids visual flickering before the session is definitively determined.
 *
 * 5. Why the Firebase Subscription Must Be Cleaned Up:
 *    `subscribeToAuthState` registers a persistent observer on Firebase's auth stream. If `AuthProvider` unmounts,
 *    failing to invoke the returned unsubscribe function would result in memory leaks and attempts to update
 *    unmounted component state.
 */

export interface AuthContextType {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStudent: boolean;
  error: Error | null;
  register: (email: string, password: string) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  resetUserPassword?: (email: string) => Promise<void>;
  refreshProfile?: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Subscribe to Firebase modular Auth state changes
    const unsubscribe = subscribeToAuthState(async (user) => {
      // Clear any previous transient errors when auth state changes
      if (isMounted) {
        setError(null);
      }

      // Unauthenticated state
      if (!user) {
        if (isMounted) {
          setFirebaseUser(null);
          setUserProfile(null);
          setLoading(false);
        }
        return;
      }

      // Authenticated with Firebase Auth
      if (isMounted) {
        setFirebaseUser(user);
      }

      // Fetch user profile and role from Firestore
      try {
        const profile = await getUserProfile(user.uid);
        if (isMounted) {
          setUserProfile(profile);
        }
      } catch (err) {
        if (isMounted) {
          setUserProfile(null);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Authentication actions delegating to auth.service
  const register = useCallback(async (email: string, password: string): Promise<User> => {
    return registerUser(email, password);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    return loginUser(email, password);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await logoutUser();
  }, []);

  const resetUserPassword = useCallback(async (email: string): Promise<void> => {
    return resetPassword(email);
  }, []);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!firebaseUser) return;
    try {
      const profile = await getUserProfile(firebaseUser.uid);
      setUserProfile(profile);
    } catch (err) {
      console.error("Failed to refresh user profile:", err);
    }
  }, [firebaseUser]);

  // Derived authorization flags based on Firestore user profile role
  const isAuthenticated = firebaseUser !== null;
  const isAdmin = userProfile?.role === "admin";
  const isStudent = userProfile?.role === "student";

  const contextValue = useMemo<AuthContextType>(
    () => ({
      firebaseUser,
      userProfile,
      loading,
      isAuthenticated,
      isAdmin,
      isStudent,
      error,
      register,
      login,
      logout,
      resetUserPassword,
      refreshProfile,
    }),
    [
      firebaseUser,
      userProfile,
      loading,
      isAuthenticated,
      isAdmin,
      isStudent,
      error,
      register,
      login,
      logout,
      resetUserPassword,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to consume the AuthContext safely.
 * Throws an explicit error if invoked outside of an AuthProvider hierarchy.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
