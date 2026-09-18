import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { CampusEvent, CreateEventInput, UpdateEventInput, EventCategory } from "../types";

/**
 * Educational & Architectural Notes (University Project Context):
 *
 * Firestore Event Management Layer:
 * 1. Collection Structure:
 *    University events reside in the top-level collection `events/{eventId}`.
 *    Top-level grouping ensures fast queries for student feeds without needing collection-group index overhead.
 *
 * 2. Denormalized Counter (`registeredCount`):
 *    Initialized to 0 on creation. Updated atomically during RSVP operations to permit instant capacity
 *    checks without executing sub-collection aggregations.
 *
 * 3. Sorting & Filtering Optimization:
 *    When filtering by category, in-memory date sorting is performed to prevent Firestore `FAILED_PRECONDITION`
 *    composite index requirements during initial development.
 */

/**
 * Helper to transform a raw Firestore DocumentSnapshot into a typed CampusEvent.
 */
const mapDocToCampusEvent = (id: string, data: Record<string, unknown>): CampusEvent => ({
  id,
  title: String(data.title ?? ''),
  description: String(data.description ?? ''),
  category: data.category as CampusEvent['category'],
  location: String(data.location ?? ''),
  date: data.date as CampusEvent['date'],
  capacity: Number(data.capacity ?? 0),
  registeredCount: Number(data.registeredCount ?? 0),
  imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
  createdBy: String(data.createdBy ?? ''),
  createdAt: data.createdAt as CampusEvent['createdAt'],
  updatedAt: data.updatedAt as CampusEvent['updatedAt'],
});

/**
 * Retrieves campus events, optionally filtered by category.
 *
 * @param category - Optional category filter (e.g. 'academic', 'sports').
 * @returns A Promise resolving to an array of CampusEvent objects sorted by date ascending.
 */
export const getEvents = async (category?: EventCategory): Promise<CampusEvent[]> => {
  const eventsCol = collection(db, "events");

  const q = category
    ? query(eventsCol, where("category", "==", category))
    : query(eventsCol, orderBy("date", "asc"));

  const snapshot = await getDocs(q);
  const events = snapshot.docs.map((docSnap) =>
    mapDocToCampusEvent(docSnap.id, docSnap.data())
  );

  // When filtered by category, apply client-side chronological sort
  if (category) {
    events.sort((a, b) => {
      const timeA = a.date instanceof Date ? a.date.getTime() : a.date?.toMillis?.() ?? 0;
      const timeB = b.date instanceof Date ? b.date.getTime() : b.date?.toMillis?.() ?? 0;
      return timeA - timeB;
    });
  }

  return events;
};

/**
 * Retrieves a single campus event by its unique document ID.
 *
 * @param eventId - The Firestore document ID.
 * @returns A Promise resolving to the CampusEvent or null if not found.
 */
export const getEventById = async (eventId: string): Promise<CampusEvent | null> => {
  const eventRef = doc(db, "events", eventId);
  const docSnap = await getDoc(eventRef);

  if (!docSnap.exists()) {
    return null;
  }

  return mapDocToCampusEvent(docSnap.id, docSnap.data());
};

/**
 * Creates a new campus event document in Firestore.
 *
 * Security & Data Rules:
 * - Only administrators are authorized to invoke this in production (enforced by firestore.rules).
 * - Initial registeredCount is strictly set to 0.
 * - Created timestamp is set using serverTimestamp() to avoid client clock discrepancies.
 *
 * @param input - The event creation details.
 * @param creatorId - The administrator's Firebase UID.
 * @returns The newly created event's Firestore document ID.
 */
export const createEvent = async (
  input: CreateEventInput,
  creatorId: string
): Promise<string> => {
  const eventsCol = collection(db, "events");

  const docRef = await addDoc(eventsCol, {
    ...input,
    createdBy: creatorId,
    registeredCount: 0,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
};

/**
 * Updates an existing campus event's attributes.
 *
 * @param eventId - The Firestore document ID of the event to update.
 * @param input - Partial event fields to update.
 */
export const updateEvent = async (
  eventId: string,
  input: UpdateEventInput
): Promise<void> => {
  const eventRef = doc(db, "events", eventId);

  await updateDoc(eventRef, {
    ...input,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Permanently deletes an event document from Firestore.
 *
 * @param eventId - The Firestore document ID to remove.
 */
export const deleteEvent = async (eventId: string): Promise<void> => {
  const eventRef = doc(db, "events", eventId);
  await deleteDoc(eventRef);
};

/**
 * High-quality sample university events for live demonstration, evaluations, and testing.
 */
export const SAMPLE_CAMPUS_EVENTS: Omit<CreateEventInput, 'createdBy'>[] = [
  {
    title: 'Spring Tech & Career Fair 2026',
    description:
      'Connect with over 45 industry-leading technology companies, startup founders, and research labs. Bring your CV for on-site internship and graduate job interviews.',
    category: 'career',
    location: 'Student Union Grand Ballroom, Building C',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // In 5 days
    capacity: 250,
    imageUrl:
      'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'AI & ROS2 Robotics Hackathon',
    description:
      '48-hour hands-on robotic development sprint. Teams will program autonomous mobile rovers using ROS2, computer vision, and LiDAR obstacle avoidance algorithms.',
    category: 'workshop',
    location: 'Engineering Makerspace Lab, Room 204',
    date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // In 10 days
    capacity: 40,
    imageUrl:
      'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Inter-Department Soccer Championship',
    description:
      'The annual university knockout soccer tournament. Represent your department or come cheer for your classmates on the central athletics field!',
    category: 'sports',
    location: 'University Athletics Stadium',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // In 2 weeks
    capacity: 150,
    imageUrl:
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Quantum Computing & Qiskit Seminar',
    description:
      'Keynote lecture by visiting quantum research scientists exploring quantum superposition, entanglement, and executing real quantum circuits via IBM cloud hardware.',
    category: 'academic',
    location: 'Faculty of Science Amphitheatre A',
    date: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000), // In 18 days
    capacity: 100,
    imageUrl:
      'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Campus Sunset Music & Arts Festival',
    description:
      'An evening of live university indie bands, student art exhibitions, artisan food trucks, and acoustic performances under the central campus quadrangle.',
    category: 'arts',
    location: 'Central Campus Lawn & Quadrangle',
    date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // In 25 days
    capacity: 300,
    imageUrl:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
  },
];

/**
 * Seeds sample university events into Firestore.
 * Executed by an authorized administrator from the Admin Portal or dev tooling.
 *
 * @param creatorId - The administrator's Firebase UID.
 * @returns Array of newly created event document IDs.
 */
export const seedSampleEvents = async (creatorId: string): Promise<string[]> => {
  const createdIds: string[] = [];
  for (const sample of SAMPLE_CAMPUS_EVENTS) {
    const id = await createEvent({ ...sample, createdBy: creatorId }, creatorId);
    createdIds.push(id);
  }
  return createdIds;
};

