import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  IonFooter,
  IonToast,
  IonSpinner,
  IonSkeletonText,
} from '@ionic/react';
import {
  arrowBackOutline,
  calendarOutline,
  locationOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  bookmarkOutline,
  downloadOutline,
  mapOutline,
  shareSocialOutline,
  imageOutline,
} from 'ionicons/icons';
import { useAuth } from '../../contexts/AuthContext';
import { getEventById } from '../../services/event.service';
import {
  registerForEvent,
  cancelRegistration,
  isUserRegisteredForEvent,
} from '../../services/registration.service';
import { getCategoryColor, formatEventDate } from '../../components/events/EventCard';
import { downloadIcsFile } from '../../utils/calendar';
import type { CampusEvent } from '../../types';
import './EventDetails.css';

/**
 * EventDetails Page
 *
 * Dedicated full-page view for a university event. Features:
 * 1. High-resolution imagery with fallback category gradient.
 * 2. Visual capacity meter with live spot calculation.
 * 3. iCal (.ics) calendar export for syncing with Google Calendar/Apple Calendar.
 * 4. Direct Google Maps navigation link.
 * 5. Fixed action footer supporting 1-click RSVP and cancellation.
 */
const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { firebaseUser, userProfile } = useAuth();

  const [event, setEvent] = useState<CampusEvent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [rsvpLoading, setRsvpLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  /**
   * Loads the event data and the current student's registration status.
   */
  const loadEventDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const eventData = await getEventById(id);
      setEvent(eventData);

      if (eventData && firebaseUser?.uid) {
        const registered = await isUserRegisteredForEvent(eventData.id, firebaseUser.uid);
        setIsRegistered(registered);
      }
    } catch (err) {
      console.error('Failed to load event details:', err);
      setToastMessage('Unable to load event details.');
    } finally {
      setLoading(false);
    }
  }, [id, firebaseUser?.uid]);

  useEffect(() => {
    loadEventDetails();
  }, [loadEventDetails]);

  /**
   * Handles RSVP or cancellation.
   */
  const handleRsvpToggle = async () => {
    if (!event || !firebaseUser) return;

    setRsvpLoading(true);
    try {
      if (isRegistered) {
        await cancelRegistration(event.id, firebaseUser.uid);
        setIsRegistered(false);
        setEvent((prev) =>
          prev
            ? { ...prev, registeredCount: Math.max(0, prev.registeredCount - 1) }
            : null
        );
        setToastMessage(`Registration cancelled for "${event.title}".`);
      } else {
        await registerForEvent(event.id, {
          id: firebaseUser.uid,
          name: userProfile?.name ?? firebaseUser.displayName ?? 'Student',
          email: firebaseUser.email ?? '',
        });
        setIsRegistered(true);
        setEvent((prev) =>
          prev ? { ...prev, registeredCount: prev.registeredCount + 1 } : null
        );
        setToastMessage(`Confirmed! You are registered for "${event.title}".`);
      }
    } catch (err) {
      console.error('RSVP Toggle Error:', err);
      const msg = err instanceof Error ? err.message : 'Error updating RSVP.';
      setToastMessage(msg);
    } finally {
      setRsvpLoading(false);
    }
  };

  /**
   * Triggers download of the event's .ics calendar file.
   */
  const handleAddToCalendar = () => {
    if (!event) return;
    try {
      downloadIcsFile(event);
      setToastMessage('Calendar event (.ics) downloaded!');
    } catch (err) {
      console.error('Failed to download calendar file:', err);
      setToastMessage('Could not download calendar file.');
    }
  };

  /**
   * Shares the event using the Web Share API or copies link to clipboard.
   */
  const handleShare = async () => {
    if (!event) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out ${event.title} on CampusHub!`,
          url: window.location.href,
        });
      } catch {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setToastMessage('Event link copied to clipboard!');
      } catch {
        setToastMessage('Link copying not supported.');
      }
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={() => navigate('/home')} data-testid="event-details-back-btn">
                <IonIcon slot="start" icon={arrowBackOutline} />
                Events
              </IonButton>
            </IonButtons>
            <IonTitle>Event Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding" data-testid="event-details-loading">
          <div className="event-details-container">
            <IonSkeletonText animated style={{ width: '100%', height: '240px', borderRadius: '20px' }} />
            <IonSkeletonText animated style={{ width: '30%', height: '24px', margin: '20px 0 10px 0' }} />
            <IonSkeletonText animated style={{ width: '80%', height: '36px', marginBottom: '20px' }} />
            <IonSkeletonText animated style={{ width: '100%', height: '100px' }} />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!event) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={() => navigate('/home')} data-testid="event-details-back-btn">
                <IonIcon slot="start" icon={arrowBackOutline} />
                Events
              </IonButton>
            </IonButtons>
            <IonTitle>Event Not Found</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ textAlign: 'center', padding: '60px 20px' }} data-testid="event-not-found">
            <IonIcon icon={alertCircleOutline} style={{ fontSize: '64px', color: 'var(--ion-color-danger)' }} />
            <h2>Event Not Found</h2>
            <p style={{ color: 'var(--ion-color-medium)', maxWidth: '400px', margin: '8px auto 24px auto' }}>
              The event you are looking for may have been removed or does not exist.
            </p>
            <IonButton onClick={() => navigate('/home')}>Back to Campus Feed</IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const isFull = event.registeredCount >= event.capacity;
  const spotsLeft = Math.max(0, event.capacity - event.registeredCount);
  const fillPercent = Math.min(100, Math.round((event.registeredCount / event.capacity) * 100));
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    event.location
  )}`;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => navigate('/home')} data-testid="event-details-back-btn">
              <IonIcon slot="start" icon={arrowBackOutline} />
              Events
            </IonButton>
          </IonButtons>
          <IonTitle>{event.title}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleShare} data-testid="event-details-share-btn" aria-label="Share Event">
              <IonIcon icon={shareSocialOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="event-details-content ion-padding">
        <div className="event-details-container">
          {/* Banner */}
          <div className="event-details-banner">
            {event.imageUrl ? (
              <img src={event.imageUrl} alt={event.title} />
            ) : (
              <div className="event-details-banner-fallback">
                <IonIcon icon={imageOutline} />
              </div>
            )}
          </div>

          {/* Header & Badges */}
          <div className="event-details-header">
            <div className="event-details-top-badges">
              <IonBadge
                color={getCategoryColor(event.category)}
                style={{ fontSize: '0.85rem', padding: '6px 14px', borderRadius: '16px' }}
                data-testid="event-details-category-badge"
              >
                {event.category.toUpperCase()}
              </IonBadge>

              {isRegistered && (
                <IonBadge color="success" style={{ fontSize: '0.85rem', padding: '6px 14px', borderRadius: '16px' }}>
                  ✓ REGISTERED
                </IonBadge>
              )}
            </div>

            <h1 className="event-details-title" data-testid="event-details-title">
              {event.title}
            </h1>
          </div>

          {/* Capacity Progress Box */}
          <div className="event-capacity-box">
            <div className="capacity-header-row">
              <span>Attendance Capacity</span>
              <span data-testid="event-details-spots-left">
                {isFull ? 'Event Sold Out' : `${spotsLeft} spots remaining (${event.registeredCount}/${event.capacity})`}
              </span>
            </div>
            <div className="capacity-progress-bar">
              <div
                className={`capacity-progress-fill ${isFull ? 'full' : ''}`}
                style={{ width: `${fillPercent}%` }}
              />
            </div>
          </div>

          {/* Key Details Grid */}
          <div className="event-info-grid">
            {/* Date & Time */}
            <div className="event-info-card">
              <div className="event-info-icon-wrapper">
                <IonIcon icon={calendarOutline} />
              </div>
              <div className="event-info-text">
                <h4>Schedule</h4>
                <p data-testid="event-details-date">{formatEventDate(event.date)}</p>
                <button
                  type="button"
                  className="event-action-link"
                  onClick={handleAddToCalendar}
                  data-testid="add-to-calendar-btn"
                >
                  <IonIcon icon={downloadOutline} />
                  Add to Calendar (.ics)
                </button>
              </div>
            </div>

            {/* Venue Location */}
            <div className="event-info-card">
              <div className="event-info-icon-wrapper">
                <IonIcon icon={locationOutline} />
              </div>
              <div className="event-info-text">
                <h4>Venue</h4>
                <p data-testid="event-details-location">{event.location}</p>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="event-action-link"
                  data-testid="open-in-maps-btn"
                >
                  <IonIcon icon={mapOutline} />
                  Open in Maps
                </a>
              </div>
            </div>
          </div>

          {/* Full Description Section */}
          <div className="event-description-section">
            <h3>About This Event</h3>
            <p data-testid="event-details-description">{event.description}</p>
          </div>
        </div>
      </IonContent>

      {/* Floating Bottom RSVP Bar */}
      <IonFooter className="event-bottom-bar">
        <div className="event-bottom-bar-inner">
          <div className="event-bottom-price">
            <span>Admission</span>
            <strong>Free for Students</strong>
          </div>

          <IonButton
            size="default"
            fill={isRegistered ? 'outline' : 'solid'}
            color={isRegistered ? 'success' : isFull ? 'medium' : 'primary'}
            disabled={rsvpLoading || (isFull && !isRegistered)}
            onClick={handleRsvpToggle}
            className="event-rsvp-primary-btn"
            data-testid="event-details-rsvp-btn"
          >
            {rsvpLoading ? (
              <>
                <IonSpinner name="dots" />
                <span style={{ marginLeft: '8px' }}>Updating...</span>
              </>
            ) : isRegistered ? (
              <>
                <IonIcon slot="start" icon={checkmarkCircleOutline} />
                <span>Registered (Click to Cancel)</span>
              </>
            ) : isFull ? (
              <>
                <IonIcon slot="start" icon={alertCircleOutline} />
                <span>Event Full</span>
              </>
            ) : (
              <>
                <IonIcon slot="start" icon={bookmarkOutline} />
                <span>Register Now</span>
              </>
            )}
          </IonButton>
        </div>
      </IonFooter>

      {/* Toast Feedback */}
      <IonToast
        isOpen={!!toastMessage}
        message={toastMessage ?? ''}
        duration={3000}
        onDidDismiss={() => setToastMessage(null)}
        position="bottom"
      />
    </IonPage>
  );
};

export default EventDetails;
