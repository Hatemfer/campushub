import React from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonBadge,
  IonIcon,
} from '@ionic/react';
import {
  calendarOutline,
  locationOutline,
  peopleOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  bookmarkOutline,
} from 'ionicons/icons';
import { IonButton, IonSpinner } from '@ionic/react';
import type { CampusEvent, EventCategory } from '../../types';
import './EventCard.css';

interface EventCardProps {
  event: CampusEvent;
  onSelect?: (event: CampusEvent) => void;
  isRegistered?: boolean;
  onRsvpToggle?: (event: CampusEvent) => void;
  isRsvpLoading?: boolean;
}

/**
 * Maps event categories to Ionic color themes for consistent visual branding.
 */
export const getCategoryColor = (category: EventCategory): string => {
  switch (category) {
    case 'academic':
      return 'primary';
    case 'career':
      return 'warning';
    case 'social':
      return 'tertiary';
    case 'sports':
      return 'success';
    case 'arts':
      return 'danger';
    case 'workshop':
      return 'secondary';
    default:
      return 'medium';
  }
};

/**
 * Safely parses and formats event dates (supporting both Firestore Timestamp and JS Date).
 */
export const formatEventDate = (dateVal: unknown): string => {
  if (!dateVal) return 'Date TBD';
  try {
    const d = typeof (dateVal as { toDate?: () => Date })?.toDate === 'function'
      ? (dateVal as { toDate: () => Date }).toDate()
      : new Date(dateVal as string | number | Date);
    if (isNaN(d.getTime())) return 'Date TBD';
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'Date TBD';
  }
};

/**
 * EventCard Component
 *
 * Visual card representing a campus event. Displays the category track, title,
 * human-readable schedule, physical venue, attendance capacity status, and description.
 */
export const EventCard: React.FC<EventCardProps> = ({
  event,
  onSelect,
  isRegistered = false,
  onRsvpToggle,
  isRsvpLoading = false,
}) => {
  const isFull = event.registeredCount >= event.capacity;
  const spotsLeft = Math.max(0, event.capacity - event.registeredCount);

  return (
    <IonCard
      className="campus-event-card"
      data-testid={`event-card-${event.id}`}
      onClick={() => onSelect?.(event)}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      {event.imageUrl && (
        <div className="event-card-banner">
          <img
            src={event.imageUrl}
            alt={event.title}
            loading="lazy"
            onError={(e) => {
              const parent = (e.target as HTMLElement).parentElement;
              if (parent) parent.style.display = 'none';
            }}
          />
        </div>
      )}

      <IonCardHeader>
        <div className="event-card-top-row">
          <IonBadge
            color={getCategoryColor(event.category)}
            className="event-category-badge"
            data-testid={`event-category-${event.id}`}
          >
            {event.category.toUpperCase()}
          </IonBadge>

          <span
            className={`event-capacity-tag ${isFull ? 'capacity-full' : 'capacity-available'}`}
            data-testid={`event-capacity-${event.id}`}
          >
            <IonIcon
              icon={isFull ? alertCircleOutline : checkmarkCircleOutline}
              aria-hidden="true"
            />
            {isFull ? 'Event Full' : `${spotsLeft} spots left`}
          </span>
        </div>

        <IonCardTitle className="event-card-title">{event.title}</IonCardTitle>

        <IonCardSubtitle className="event-card-meta">
          <span className="event-meta-item">
            <IonIcon icon={calendarOutline} aria-hidden="true" />
            <span>{formatEventDate(event.date)}</span>
          </span>
          <span className="event-meta-item">
            <IonIcon icon={locationOutline} aria-hidden="true" />
            <span>{event.location}</span>
          </span>
          <span className="event-meta-item">
            <IonIcon icon={peopleOutline} aria-hidden="true" />
            <span>
              {event.registeredCount} / {event.capacity} confirmed
            </span>
          </span>
        </IonCardSubtitle>
      </IonCardHeader>

      <IonCardContent>
        <p className="event-card-description">{event.description}</p>

        {onRsvpToggle && (
          <div className="event-card-actions">
            <IonButton
              size="default"
              fill={isRegistered ? 'outline' : 'solid'}
              color={isRegistered ? 'success' : isFull ? 'medium' : 'primary'}
              disabled={isRsvpLoading || (isFull && !isRegistered)}
              aria-disabled={isRsvpLoading || (isFull && !isRegistered)}
              onClick={(e) => {
                if (isRsvpLoading || (isFull && !isRegistered)) return;
                e.stopPropagation();
                onRsvpToggle(event);
              }}
              data-testid={`event-rsvp-btn-${event.id}`}
              className={`event-rsvp-btn ${isRegistered ? 'btn-registered' : ''}`}
            >
              {isRsvpLoading ? (
                <>
                  <IonSpinner name="dots" style={{ width: '20px', height: '20px' }} />
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
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default EventCard;
