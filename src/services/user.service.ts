import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { UserProfile, UserRole } from "../types";

/**
 * Architectural Notes & Design Rationale (University Project Context):
 *
 * 1. Why Firebase Auth UID is used as the Firestore Document ID:
 *    - Guarantees a deterministic 1-to-1 relationship between an authentication identity and their database profile.
 *    - Enables O(1) direct document lookups via `doc(db, "users", authUser.uid)` without performing query scans.
 *    - Simplifies Firestore Security Rules by directly comparing `request.auth.uid == userId`.
 *
 * 2. Why Roles are Stored in Firestore:
 *    - Centralizes application access control within our database records alongside user details.
 *    - Enables simple querying, reporting, and management of administrative accounts.
 *    - Allows role modifications by administrators to take effect immediately in database reads/rules.
 *
 * 3. Why Students Cannot Modify Their Own Role:
 *    - Enforces the Principle of Least Privilege and prevents vertical privilege escalation.
 *    - If clients could update their own role, any malicious actor could change their role from "student"
 *      to "admin" and gain unrestricted access to university events, student rosters, and administrative tools.
 *
 * 4. Why Firestore Security Rules are Required Even If the UI Hides Admin Functionality:
 *    - Client applications execute in an untrusted browser environment; JavaScript variables and UI states
 *      can be manipulated or bypassed entirely via direct REST/WebSocket calls to Firestore endpoints.
 *    - Security rules provide server-side, tamper-proof authorization directly at the database engine level.
 */

/**
 * Creates a new user profile document in Firestore at path `users/{userId}`.
 *
 * Crucial Security Constraint:
 * The initial role is strictly hardcoded to "student".
 * Callers cannot supply or override the role parameter during registration.
 *
 * @param userId - The Firebase Authentication UID of the newly registered user.
 * @param name - The student's full or display name.
 * @param email - The student's email address.
 * @returns A Promise that resolves once the document is successfully stored.
 */
export const createUserProfile = async (
  userId: string,
  name: string,
  email: string
): Promise<void> => {
  const userRef = doc(db, "users", userId);
  const defaultRole: UserRole = "student";

  await setDoc(userRef, {
    name,
    email,
    role: defaultRole,
    createdAt: serverTimestamp(),
  });
};

/**
 * Retrieves a user's profile document from Firestore by their Authentication UID.
 *
 * @param userId - The Firebase Authentication UID.
 * @returns A Promise resolving to the UserProfile object, or null if no profile exists.
 */
export const getUserProfile = async (
  userId: string
): Promise<UserProfile | null> => {
  const userRef = doc(db, "users", userId);
  const docSnap = await getDoc(userRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();

  return {
    id: docSnap.id,
    name: data.name,
    email: data.email,
    role: data.role as UserRole,
    createdAt: data.createdAt,
  };
};

/**
 * Updates editable user profile fields in Firestore.
 *
 * Crucial Security Constraint:
 * The TypeScript interface strictly limits updates to `Partial<Pick<UserProfile, "name">>`.
 * The `role` property is neither accepted by TypeScript nor permitted by runtime property extraction,
 * preventing accidental or intentional privilege tampering.
 *
 * @param userId - The Firebase Authentication UID of the user.
 * @param data - The update payload containing only permitted profile attributes (name).
 * @returns A Promise that resolves when the update completes.
 */
export const updateUserProfile = async (
  userId: string,
  data: Partial<Pick<UserProfile, "name">>
): Promise<void> => {
  const userRef = doc(db, "users", userId);

  // Defensive programming: explicitly extract only allowable fields to eliminate rogue attributes
  const sanitizedData: Partial<Pick<UserProfile, "name">> = {};
  if (typeof data.name === "string") {
    sanitizedData.name = data.name;
  }

  await updateDoc(userRef, sanitizedData);
};
