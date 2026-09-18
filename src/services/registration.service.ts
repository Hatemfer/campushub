import {
  doc,
  collection,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { EventRegistration } from '../types';

/**
 * Generates a deterministic document ID for an event registration.
 *
 * Pattern: `${eventId}_${userId}`
 * Benefit: Prevents duplicate registrations at the database level and enables O(1) point lookups.
 */
export const getRegistrationDocId = (eventId: string, userId: string): string => {
  return `${eventId}_${userId}`;
};

/**
 * Registers an authenticated student for a campus event.
 *
 * Architectural Design:
 * - Executes within a Firestore atomic transaction (`runTransaction`).
 * - Validates that the event exists and has available capacity.
 * - Verifies that the user has not already registered.
 * - Creates the `registrations` document and atomically increments `registeredCount` on the event.
 *
 * @param eventId - The ID of the target event.
 * @param user - The student's ID, display name, and email.
 * @throws Error if the event is missing, full, or if the user is already registered.
 */
export const registerForEvent = async (
  eventId: string,
  user: { id: string; name: string; email: string }
): Promise<void> => {
  const eventRef = doc(db, 'events', eventId);
  const regId = getRegistrationDocId(eventId, user.id);
  const regRef = doc(db, 'registrations', regId);

  await runTransaction(db, async (transaction) => {
    // 1. Fetch current event details
    const eventSnap = await transaction.get(eventRef);
    if (!eventSnap.exists()) {
      throw new Error('Event not found.');
    }

    // 2. Check if student is already registered
    const regSnap = await transaction.get(regRef);
    if (regSnap.exists()) {
      throw new Error('You are already registered for this event.');
    }

    // 3. Verify capacity
    const eventData = eventSnap.data();
    const capacity = eventData.capacity ?? 0;
    const registeredCount = eventData.registeredCount ?? 0;

    if (registeredCount >= capacity) {
      throw new Error('Event is at full capacity.');
    }

    // 4. Create registration record
    transaction.set(regRef, {
      eventId,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      registeredAt: serverTimestamp(),
    });

    // 5. Atomically increment the event's attendee counter
    transaction.update(eventRef, {
      registeredCount: registeredCount + 1,
    });
  });
};

/**
 * Cancels a student's existing registration for an event.
 *
 * Architectural Design:
 * - Executes within an atomic transaction.
 * - Deletes the registration record and safely decrements the event's `registeredCount`.
 *
 * @param eventId - The ID of the target event.
 * @param userId - The student's Firebase UID.
 */
export const cancelRegistration = async (eventId: string, userId: string): Promise<void> => {
  const eventRef = doc(db, 'events', eventId);
  const regId = getRegistrationDocId(eventId, userId);
  const regRef = doc(db, 'registrations', regId);

  await runTransaction(db, async (transaction) => {
    const regSnap = await transaction.get(regRef);
    if (!regSnap.exists()) {
      return; // Already cancelled or not registered
    }

    const eventSnap = await transaction.get(eventRef);

    // 1. Remove registration document
    transaction.delete(regRef);

    // 2. Decrement registeredCount if event exists
    if (eventSnap.exists()) {
      const currentCount = eventSnap.data()?.registeredCount ?? 1;
      transaction.update(eventRef, {
        registeredCount: Math.max(0, currentCount - 1),
      });
    }
  });
};

/**
 * Checks whether a specific student is registered for an event using an O(1) point read.
 */
export const isUserRegisteredForEvent = async (
  eventId: string,
  userId: string
): Promise<boolean> => {
  const regId = getRegistrationDocId(eventId, userId);
  const regRef = doc(db, 'registrations', regId);
  const regSnap = await getDoc(regRef);
  return regSnap.exists();
};

/**
 * Retrieves all registrations belonging to a specific student.
 */
export const getUserRegistrations = async (userId: string): Promise<EventRegistration[]> => {
  const regCol = collection(db, 'registrations');
  const q = query(regCol, where('userId', '==', userId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      eventId: data.eventId,
      userId: data.userId,
      userName: data.userName,
      userEmail: data.userEmail,
      registeredAt: data.registeredAt,
    };
  });
};

/**
 * Retrieves a Set of event IDs for which the student is currently registered.
 * Ideal for quickly badging event cards in the discovery feed.
 */
export const getUserRegisteredEventIds = async (userId: string): Promise<Set<string>> => {
  const registrations = await getUserRegistrations(userId);
  return new Set(registrations.map((r) => r.eventId));
};

/**
 * Retrieves all student registrations for a specific event.
 * Restricted to administrators in Firestore security rules.
 */
export const getEventAttendees = async (eventId: string): Promise<EventRegistration[]> => {
  const regCol = collection(db, 'registrations');
  const q = query(regCol, where('eventId', '==', eventId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      eventId: data.eventId,
      userId: data.userId,
      userName: data.userName,
      userEmail: data.userEmail,
      registeredAt: data.registeredAt,
    };
  });
};

