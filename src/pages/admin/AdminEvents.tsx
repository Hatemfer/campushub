import React, { useState, useEffect, useCallback } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonBadge,
  IonModal,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonAlert,
  IonToast,
  IonSpinner,
} from '@ionic/react';
import {
  addOutline,
  calendarOutline,
  locationOutline,
  peopleOutline,
  trashOutline,
  createOutline,
  peopleCircleOutline,
  arrowBackOutline,
  alertCircleOutline,
  sparklesOutline,
} from 'ionicons/icons';
import { useAuth } from '../../contexts/AuthContext';
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  seedSampleEvents,
} from '../../services/event.service';
import { getEventAttendees } from '../../services/registration.service';
import { getCategoryColor, formatEventDate } from '../../components/events/EventCard';
import type {
  CampusEvent,
  EventCategory,
  CreateEventInput,
  UpdateEventInput,
  EventRegistration,
} from '../../types';
import './AdminEvents.css';

const CATEGORIES: EventCategory[] = [
  'academic',
  'career',
  'social',
  'sports',
  'arts',
  'workshop',
];

/**
 * AdminEvents Page
 *
 * Dedicated administrative dashboard for managing university events:
 * 1. Overview statistics (Total Events, Total Attendee RSVPs, Capacity Alerts).
 * 2. Event Creation & Editing modal workflows with strict validation.
 * 3. Event Deletion with destructive confirmation alert.
 * 4. Live student attendee rosters per event.
 */
const AdminEvents: React.FC = () => {
  const { firebaseUser } = useAuth();

  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form Modal State (null = closed, 'create' | 'edit')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form Fields
  const [formTitle, setFormTitle] = useState<string>('');
  const [formCategory, setFormCategory] = useState<EventCategory>('academic');
  const [formLocation, setFormLocation] = useState<string>('');
  const [formDate, setFormDate] = useState<string>('');
  const [formCapacity, setFormCapacity] = useState<number>(50);
  const [formImageUrl, setFormImageUrl] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');

  // Delete Alert State
  const [eventToDelete, setEventToDelete] = useState<CampusEvent | null>(null);

  // Attendee Roster Modal State
  const [selectedEventForAttendees, setSelectedEventForAttendees] = useState<CampusEvent | null>(null);
  const [attendees, setAttendees] = useState<EventRegistration[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState<boolean>(false);

  // Demo Seeding State
  const [showSeedAlert, setShowSeedAlert] = useState<boolean>(false);
  const [seedingLoading, setSeedingLoading] = useState<boolean>(false);

  /**
   * Fetches the complete event catalog.
   */
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (err) {
      console.error('Error fetching admin events:', err);
      setToastMessage('Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  /**
   * Resets form state to default blank values.
   */
  const resetForm = () => {
    setFormTitle('');
    setFormCategory('academic');
    setFormLocation('');
    setFormDate('');
    setFormCapacity(50);
    setFormImageUrl('');
    setFormDescription('');
    setFormErrors({});
    setEditingEventId(null);
  };

  /**
   * Opens the modal for creating a new event.
   */
  const handleOpenCreate = () => {
    resetForm();
    // Default date: Tomorrow at 10:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setFormDate(tomorrow.toISOString().slice(0, 16));
    setModalMode('create');
  };

  /**
   * Opens the modal for editing an existing event.
   */
  const handleOpenEdit = (event: CampusEvent) => {
    resetForm();
    setEditingEventId(event.id);
    setFormTitle(event.title);
    setFormCategory(event.category);
    setFormLocation(event.location);

    const d = event.date instanceof Date ? event.date : event.date?.toDate?.() ? event.date.toDate() : new Date();
    setFormDate(d.toISOString().slice(0, 16));

    setFormCapacity(event.capacity);
    setFormImageUrl(event.imageUrl ?? '');
    setFormDescription(event.description);
    setModalMode('edit');
  };

  /**
   * Validates form inputs before submission.
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formTitle.trim()) errors.title = 'Event title is required.';
    if (!formLocation.trim()) errors.location = 'Location is required.';
    if (!formDate) errors.date = 'Date and time are required.';
    if (!formDescription.trim()) errors.description = 'Description is required.';
    if (!formCapacity || formCapacity < 1) errors.capacity = 'Capacity must be at least 1.';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handles event submission (Create or Update).
   */
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !firebaseUser) return;

    setFormSubmitting(true);
    try {
      const parsedDate = new Date(formDate);

      if (modalMode === 'create') {
        const payload: CreateEventInput = {
          title: formTitle.trim(),
          category: formCategory,
          location: formLocation.trim(),
          date: parsedDate,
          capacity: Number(formCapacity),
          description: formDescription.trim(),
          imageUrl: formImageUrl.trim() || undefined,
          createdBy: firebaseUser.uid,
        };
        await createEvent(payload, firebaseUser.uid);
        setToastMessage(`Event "${formTitle}" published successfully!`);
      } else if (modalMode === 'edit' && editingEventId) {
        const updatePayload: UpdateEventInput = {
          title: formTitle.trim(),
          category: formCategory,
          location: formLocation.trim(),
          date: parsedDate,
          capacity: Number(formCapacity),
          description: formDescription.trim(),
          imageUrl: formImageUrl.trim() || undefined,
        };
        await updateEvent(editingEventId, updatePayload);
        setToastMessage(`Event "${formTitle}" updated successfully.`);
      }

      setModalMode(null);
      resetForm();
      await loadEvents();
    } catch (err) {
      console.error('Error saving event:', err);
      const msg = err instanceof Error ? err.message : 'Error saving event. Please try again.';
      setToastMessage(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  /**
   * Deletes an event permanently.
   */
  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await deleteEvent(eventToDelete.id);
      setToastMessage(`Event "${eventToDelete.title}" deleted.`);
      setEventToDelete(null);
      await loadEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
      setToastMessage('Failed to delete event.');
    }
  };

  /**
   * Opens the attendee roster modal for an event.
   */
  const handleOpenAttendees = async (event: CampusEvent) => {
    setSelectedEventForAttendees(event);
    setLoadingAttendees(true);
    try {
      const data = await getEventAttendees(event.id);
      setAttendees(data);
    } catch (err) {
      console.error('Error loading attendees:', err);
      setToastMessage('Failed to load attendee roster.');
    } finally {
      setLoadingAttendees(false);
    }
  };

  /**
   * Seeds 5 realistic sample university events into Firestore.
   */
  const handleConfirmSeed = async () => {
    if (!firebaseUser?.uid) return;
    setSeedingLoading(true);
    try {
      await seedSampleEvents(firebaseUser.uid);
      await loadEvents();
      setToastMessage('5 demo university events created successfully!');
    } catch (err) {
      console.error('Failed to seed events:', err);
      const msg = err instanceof Error ? err.message : 'Failed to seed sample events.';
      setToastMessage(msg);
    } finally {
      setSeedingLoading(false);
    }
  };

  // Dashboard Stats Calculations
  const totalRegistrations = events.reduce((acc, curr) => acc + (curr.registeredCount || 0), 0);
  const fullEventsCount = events.filter((e) => e.registeredCount >= e.capacity).length;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton routerLink="/home" routerDirection="back" data-testid="admin-back-btn">
              <IonIcon slot="start" icon={arrowBackOutline} />
              Home
            </IonButton>
          </IonButtons>
          <IonTitle>Admin Event Portal</IonTitle>
          <IonButtons slot="end">
            <IonButton
              fill="outline"
              color="tertiary"
              onClick={() => setShowSeedAlert(true)}
              data-testid="admin-seed-events-btn"
              disabled={seedingLoading}
              style={{ marginRight: '8px' }}
            >
              <IonIcon slot="start" icon={sparklesOutline} />
              Seed Demo Events
            </IonButton>
            <IonButton
              fill="solid"
              color="primary"
              onClick={handleOpenCreate}
              data-testid="admin-create-event-btn"
            >
              <IonIcon slot="start" icon={addOutline} />
              New Event
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="admin-events-content ion-padding">
        <div className="admin-container">
          {/* Stats Bar */}
          <div className="admin-stats-row">
            <div className="admin-stat-card">
              <div className="admin-stat-icon primary">
                <IonIcon icon={calendarOutline} />
              </div>
              <div className="admin-stat-info">
                <h3 data-testid="admin-stat-total-events">{events.length}</h3>
                <p>Campus Events</p>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon success">
                <IonIcon icon={peopleOutline} />
              </div>
              <div className="admin-stat-info">
                <h3 data-testid="admin-stat-total-rsvps">{totalRegistrations}</h3>
                <p>Total Registrations</p>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon warning">
                <IonIcon icon={alertCircleOutline} />
              </div>
              <div className="admin-stat-info">
                <h3 data-testid="admin-stat-full-events">{fullEventsCount}</h3>
                <p>Sold Out Events</p>
              </div>
            </div>
          </div>

          {/* Section Heading */}
          <div className="admin-section-header">
            <h2>Manage University Events</h2>
          </div>

          {/* Events List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }} data-testid="admin-loading">
              <IonSpinner name="crescent" />
              <p style={{ color: 'var(--ion-color-medium)' }}>Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px' }} data-testid="admin-empty-state">
              <IonIcon icon={calendarOutline} style={{ fontSize: '48px', color: 'var(--ion-color-step-400)' }} />
              <h3>No campus events found</h3>
              <p style={{ color: 'var(--ion-color-medium)' }}>
                Click <strong>"New Event"</strong> above to publish your first university event.
              </p>
            </div>
          ) : (
            <div className="admin-events-list" data-testid="admin-events-list">
              {events.map((event) => {
                const isFull = event.registeredCount >= event.capacity;
                return (
                  <div key={event.id} className="admin-event-card" data-testid={`admin-card-${event.id}`}>
                    <div className="admin-card-header-row">
                      <div>
                        <IonBadge color={getCategoryColor(event.category)} style={{ marginBottom: '6px' }}>
                          {event.category.toUpperCase()}
                        </IonBadge>
                        <h3 className="admin-card-title">{event.title}</h3>
                      </div>

                      <IonBadge color={isFull ? 'danger' : 'success'}>
                        {event.registeredCount} / {event.capacity} Confirmed
                      </IonBadge>
                    </div>

                    <div className="admin-card-meta-row">
                      <span>
                        <IonIcon icon={calendarOutline} />
                        {formatEventDate(event.date)}
                      </span>
                      <span>
                        <IonIcon icon={locationOutline} />
                        {event.location}
                      </span>
                    </div>

                    <p style={{ color: 'var(--ion-color-step-700)', margin: '0 0 16px 0', fontSize: '0.9rem' }}>
                      {event.description}
                    </p>

                    <div className="admin-card-actions">
                      <IonButton
                        size="small"
                        fill="outline"
                        color="secondary"
                        onClick={() => handleOpenAttendees(event)}
                        data-testid={`admin-roster-btn-${event.id}`}
                      >
                        <IonIcon slot="start" icon={peopleCircleOutline} />
                        Roster ({event.registeredCount})
                      </IonButton>

                      <IonButton
                        size="small"
                        fill="outline"
                        color="primary"
                        onClick={() => handleOpenEdit(event)}
                        data-testid={`admin-edit-btn-${event.id}`}
                      >
                        <IonIcon slot="start" icon={createOutline} />
                        Edit
                      </IonButton>

                      <IonButton
                        size="small"
                        fill="outline"
                        color="danger"
                        onClick={() => setEventToDelete(event)}
                        data-testid={`admin-delete-btn-${event.id}`}
                      >
                        <IonIcon slot="start" icon={trashOutline} />
                        Delete
                      </IonButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create / Edit Event Modal */}
        <IonModal
          isOpen={modalMode !== null}
          keepContentsMounted={true}
          onDidDismiss={() => setModalMode(null)}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>{modalMode === 'create' ? 'Create Campus Event' : 'Edit Campus Event'}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setModalMode(null)} data-testid="modal-close-btn">
                  Close
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding admin-modal-content">
            <form onSubmit={handleFormSubmit} data-testid="admin-event-form">
              <div className="admin-form-group">
                <label htmlFor="event-title">Event Title *</label>
                <IonInput
                  id="event-title"
                  value={formTitle}
                  onIonInput={(e) => setFormTitle(e.detail.value ?? '')}
                  placeholder="e.g. AI Research Symposium"
                  className="admin-form-input"
                  data-testid="input-event-title"
                />
                {formErrors.title && <div className="admin-form-error">{formErrors.title}</div>}
              </div>

              <div className="admin-form-group">
                <label htmlFor="event-category">Category Track *</label>
                <IonSelect
                  id="event-category"
                  value={formCategory}
                  onIonChange={(e) => setFormCategory(e.detail.value)}
                  className="admin-form-select"
                  data-testid="select-event-category"
                >
                  {CATEGORIES.map((cat) => (
                    <IonSelectOption key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </div>

              <div className="admin-form-group">
                <label htmlFor="event-location">Physical Venue / Location *</label>
                <IonInput
                  id="event-location"
                  value={formLocation}
                  onIonInput={(e) => setFormLocation(e.detail.value ?? '')}
                  placeholder="e.g. Science Building Auditorium 2"
                  className="admin-form-input"
                  data-testid="input-event-location"
                />
                {formErrors.location && <div className="admin-form-error">{formErrors.location}</div>}
              </div>

              <div className="admin-form-group">
                <label htmlFor="event-date">Date & Time *</label>
                <IonInput
                  id="event-date"
                  type="datetime-local"
                  value={formDate}
                  onIonInput={(e) => setFormDate(e.detail.value ?? '')}
                  className="admin-form-input"
                  data-testid="input-event-date"
                />
                {formErrors.date && <div className="admin-form-error">{formErrors.date}</div>}
              </div>

              <div className="admin-form-group">
                <label htmlFor="event-capacity">Attendance Capacity Limit *</label>
                <IonInput
                  id="event-capacity"
                  type="number"
                  min="1"
                  value={formCapacity}
                  onIonInput={(e) => setFormCapacity(Number(e.detail.value))}
                  className="admin-form-input"
                  data-testid="input-event-capacity"
                />
                {formErrors.capacity && <div className="admin-form-error">{formErrors.capacity}</div>}
              </div>

              <div className="admin-form-group">
                <label htmlFor="event-image">Banner Image URL (Optional)</label>
                <IonInput
                  id="event-image"
                  value={formImageUrl}
                  onIonInput={(e) => setFormImageUrl(e.detail.value ?? '')}
                  placeholder="https://example.com/banner.jpg"
                  className="admin-form-input"
                  data-testid="input-event-image"
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="event-description">Event Description *</label>
                <IonTextarea
                  id="event-description"
                  rows={4}
                  value={formDescription}
                  onIonInput={(e) => setFormDescription(e.detail.value ?? '')}
                  placeholder="Provide schedule details, prerequisites, and speaker info..."
                  className="admin-form-input"
                  data-testid="textarea-event-description"
                />
                {formErrors.description && (
                  <div className="admin-form-error">{formErrors.description}</div>
                )}
              </div>

              <IonButton
                type="submit"
                expand="block"
                disabled={formSubmitting}
                data-testid="submit-event-btn"
                style={{ marginTop: '24px' }}
              >
                {formSubmitting ? (
                  <>
                    <IonSpinner name="dots" />
                    <span style={{ marginLeft: '8px' }}>Saving...</span>
                  </>
                ) : modalMode === 'create' ? (
                  'Publish Event'
                ) : (
                  'Save Changes'
                )}
              </IonButton>
            </form>
          </IonContent>
        </IonModal>

        {/* Attendee Roster Modal */}
        <IonModal
          isOpen={selectedEventForAttendees !== null}
          keepContentsMounted={true}
          onDidDismiss={() => setSelectedEventForAttendees(null)}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>Attendee Roster</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setSelectedEventForAttendees(null)}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {selectedEventForAttendees && (
              <div data-testid="roster-modal-content">
                <h3 style={{ margin: '0 0 4px 0' }}>{selectedEventForAttendees.title}</h3>
                <p style={{ color: 'var(--ion-color-medium)', margin: '0 0 20px 0' }}>
                  {attendees.length} / {selectedEventForAttendees.capacity} Confirmed Attendees
                </p>

                {loadingAttendees ? (
                  <div style={{ textAlign: 'center', padding: '24px' }}>
                    <IonSpinner name="crescent" />
                  </div>
                ) : attendees.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <p style={{ color: 'var(--ion-color-medium)' }}>
                      No students have registered for this event yet.
                    </p>
                  </div>
                ) : (
                  <div className="attendee-list" data-testid="attendee-list">
                    {attendees.map((attendee) => (
                      <div key={attendee.id} className="attendee-item">
                        <div>
                          <div className="attendee-name">{attendee.userName}</div>
                          <div className="attendee-email">{attendee.userEmail}</div>
                        </div>
                        <div className="attendee-date">
                          {formatEventDate(attendee.registeredAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </IonContent>
        </IonModal>

        {/* Delete Confirmation Alert */}
        <IonAlert
          isOpen={eventToDelete !== null}
          onDidDismiss={() => setEventToDelete(null)}
          header="Delete Event?"
          message={`Are you sure you want to delete "${eventToDelete?.title}"? This cannot be undone.`}
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
            },
            {
              text: 'Delete Permanently',
              role: 'destructive',
              handler: handleConfirmDelete,
            },
          ]}
          data-testid="admin-delete-alert"
        />

        {/* Seed Sample Events Alert */}
        <IonAlert
          isOpen={showSeedAlert}
          onDidDismiss={() => setShowSeedAlert(false)}
          header="Seed Demo Events"
          message="This will publish 5 realistic university demo events (Career Fair, Robotics Hackathon, Soccer Championship, Quantum Seminar, Arts Festival) with images, dates, and attendee capacities into Firestore. Continue?"
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
            },
            {
              text: 'Seed 5 Events',
              handler: () => {
                handleConfirmSeed();
              },
            },
          ]}
          data-testid="admin-seed-alert"
        />

        {/* Toast Feedback */}
        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage ?? ''}
          duration={3000}
          onDidDismiss={() => setToastMessage(null)}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
};

export default AdminEvents;
