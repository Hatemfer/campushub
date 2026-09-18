import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { auth } from "./firebase";

/**
 * Registers a new user account with Firebase Authentication using an email and password.
 *
 * Academic Project Context:
 * - Uses the modular Firebase Authentication SDK v12.
 * - Only handles authentication identity creation; user profiles and roles in Firestore
 *   will be stored separately in future milestones.
 *
 * @param email - The user's institutional or personal email address.
 * @param password - The chosen password (must satisfy Firebase length and security criteria).
 * @returns A Promise resolving to the authenticated Firebase User instance.
 * @throws FirebaseError if registration fails (e.g. auth/email-already-in-use, auth/weak-password, auth/invalid-email).
 */
export const registerUser = async (email: string, password: string): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

/**
 * Authenticates an existing user using their email and password credentials.
 *
 * Architectural Note:
 * - This service function is intentionally decoupled from navigation and UI side-effects.
 * - The calling component/controller is responsible for initiating route transitions upon resolution.
 *
 * @param email - The registered user's email address.
 * @param password - The user's account password.
 * @returns A Promise resolving to the authenticated Firebase User instance.
 * @throws FirebaseError if authentication fails (e.g. auth/invalid-credential, auth/user-disabled).
 */
export const loginUser = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

/**
 * Signs out the currently authenticated user from the Firebase Auth instance.
 *
 * Clears authentication tokens stored in client storage (IndexedDB/LocalStorage)
 * and triggers any active auth state change listeners.
 *
 * @returns A Promise that resolves once the sign-out process completes.
 * @throws FirebaseError if sign-out cannot be performed.
 */
export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};

/**
 * Synchronously retrieves the currently authenticated Firebase User.
 *
 * Important Considerations:
 * - On initial application load, this property may be null until Firebase has finished
 *   restoring the user session from persistence.
 * - For reactive updates and component state management, prefer using `subscribeToAuthState`.
 *
 * @returns The current Firebase User object if signed in, or null if no session exists.
 */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

/**
 * Subscribes a callback to listen for Firebase authentication state transitions.
 *
 * Triggered automatically when:
 * 1. Initial auth state is established from local storage on app bootstrap.
 * 2. A user completes sign-in or sign-up.
 * 3. A user signs out.
 * 4. The current user's ID token is refreshed.
 *
 * @param callback - Callback function receiving the current User object or null when logged out.
 * @returns An Unsubscribe function to clean up the listener (e.g., in React useEffect cleanup).
 */
export const subscribeToAuthState = (
  callback: (user: User | null) => void
): Unsubscribe => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Triggers a password reset email via Firebase Authentication.
 *
 * @param email - The user's registered email address.
 */
export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

