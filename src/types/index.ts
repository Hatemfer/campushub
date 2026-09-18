import type { Timestamp } from "firebase/firestore";

/**
 * UserRole defines the authorization tiers available in CampusHub:
 * - "student": Standard campus user who can browse events, RSVP, and view university resources.
 * - "admin": Privileged campus administrator with rights to manage events, registrations, and user roles.
 */
export type UserRole = "student" | "admin";

/**
 * UserProfile represents a student or administrator's domain profile stored in Firestore (`users/{userId}`).
 *
 * Key Architectural Distinction (University Context):
 * - Firebase Authentication User (`firebase/auth` User):
 *   Represents identity, authentication credentials (email/password, tokens), and low-level session state.
 *   Managed entirely by Google Identity platform. It lacks domain-specific attributes like roles or student info.
 *
 * - CampusHub Firestore UserProfile (`users/{userId}`):
 *   Represents application-level state and permissions stored in our NoSQL database.
 *   Contains the user's display name, institutional email, assigned application `role` ("student" | "admin"),
 *   and database metadata (`createdAt`). The document ID directly mirrors the Firebase Auth UID.
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Timestamp | Date;
}

/**
 * EventCategory classifies university events into core thematic tracks
 * to facilitate discovery, filtering, and student engagement.
 */
export type EventCategory =
  | "academic"
  | "social"
  | "sports"
  | "career"
  | "arts"
  | "workshop";

/**
 * CampusEvent represents a university event record stored in Firestore (`events/{eventId}`).
 *
 * Architectural & Optimization Highlights:
 * - Denormalized `registeredCount`: Tracks the total confirmed attendees directly on the event document.
 *   This eliminates the need to execute costly count queries on the `registrations` subcollection
 *   when rendering event cards or checking capacity.
 * - `capacity`: Enforces an attendee limit to prevent venue overbooking.
 * - `createdBy`: References the Administrator's Firebase UID for auditability and ownership tracking.
 */
export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  location: string;
  date: Timestamp | Date;
  capacity: number;
  registeredCount: number;
  imageUrl?: string;
  createdBy: string;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

/**
 * Input payload required to create a new campus event.
 * Metadata fields (`id`, `registeredCount`, `createdAt`, `updatedAt`) are managed server-side.
 */
export type CreateEventInput = Omit<
  CampusEvent,
  "id" | "registeredCount" | "createdAt" | "updatedAt"
>;

/**
 * Partial payload for modifying an existing campus event.
 */
export type UpdateEventInput = Partial<CreateEventInput>;

/**
 * EventRegistration represents a student's confirmed RSVP for a specific campus event.
 *
 * Data Architecture Notes (University Project Context):
 * - Top-level collection: `registrations/{eventId}_{userId}`.
 * - Deterministic Document ID: Combining `${eventId}_${userId}` as the document key creates
 *   a natural unique constraint in Firestore, making duplicate registrations physically impossible
 *   and enabling O(1) direct document lookups without query index scans.
 */
export interface EventRegistration {
  id: string; // Formatted as `${eventId}_${userId}`
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  registeredAt: Timestamp | Date;
}

