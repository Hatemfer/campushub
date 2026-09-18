import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonBadge,
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonSkeletonText,
  IonRefresher,
  IonRefresherContent,
  IonToast,
  IonSegment,
  IonSegmentButton,
  IonLabel,
} from '@ionic/react';
import {
  logOutOutline,
  personCircleOutline,
  calendarOutline,
  refreshOutline,
  searchOutline,
  sparklesOutline,
  shieldCheckmarkOutline,
  bookmarkOutline,
} from 'ionicons/icons';
import { useAuth } from '../contexts/AuthContext';
import { getEvents } from '../services/event.service';
import {
  getUserRegisteredEventIds,
  registerForEvent,
  cancelRegistration,
} from '../services/registration.service';
import EventCard from '../components/events/EventCard';
import type { CampusEvent, EventCategory } from '../types';
import './Home.css';

/**
 * All available category tracks for university event discovery.
 */
const CATEGORIES: Array<{ key: EventCategory | 'all'; label: string }> = [
  { key: 'all', label: 'All Tracks' },
  { key: 'academic', label: 'Academic' },
  { key: 'career', label: 'Career' },
  { key: 'social', label: 'Social' },
  { key: 'sports', label: 'Sports' },
  { key: 'arts', label: 'Arts & Culture' },
  { key: 'workshop', label: 'Workshops' },
];

/**
 * Home Page (Campus Hub Main Dashboard)
 *
 * Core student discovery portal featuring:
 * 1. User welcome banner with role badge.
 * 2. Instant client-side search across events.
 * 3. Thematic category filtering connected to Firestore.
 * 4. Responsive multi-column event card grid with skeleton loading states.
 */
const Home: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, firebaseUser, logout, isAdmin } = useAuth();

  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(new Set());
  const [rsvpLoadingEventId, setRsvpLoadingEventId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [feedMode, setFeedMode] = useState<'all' | 'my-rsvps'>('all');

  /**
   * Fetches events from Firestore, optionally filtered by category.
   */
  const fetchEvents = useCallback(async (cat: EventCategory | 'all') => {
    setLoading(true);
    setError(null);
    try {
      const categoryParam = cat === 'all' ? undefined : cat;
      const data = await getEvents(categoryParam);
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setError('Unable to load campus events. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetches student registrations to badge RSVP'd events.
   */
  const fetchUserRegistrations = useCallback(async () => {
    if (!firebaseUser?.uid) return;
    try {
      const ids = await getUserRegisteredEventIds(firebaseUser.uid);
      setRegisteredEventIds(ids);
    } catch (err) {
      console.error('Failed to fetch student registrations:', err);
    }
  }, [firebaseUser?.uid]);

  useEffect(() => {
    fetchEvents(selectedCategory);
  }, [selectedCategory, fetchEvents]);

  useEffect(() => {
    fetchUserRegistrations();
  }, [fetchUserRegistrations]);

  /**
   * Pull-to-refresh handler for mobile touch interactions.
   */
  const handleRefresh = async (e: CustomEvent) => {
    await Promise.all([fetchEvents(selectedCategory), fetchUserRegistrations()]);
    e.detail.complete();
  };

  /**
   * Toggles student RSVP for a campus event.
   */
  const handleRsvpToggle = async (event: CampusEvent) => {
    if (!firebaseUser) return;

    setRsvpLoadingEventId(event.id);
    const isCurrentlyRegistered = registeredEventIds.has(event.id);

    try {
      if (isCurrentlyRegistered) {
        // Cancel RSVP
        await cancelRegistration(event.id, firebaseUser.uid);
        setRegisteredEventIds((prev) => {
          const next = new Set(prev);
          next.delete(event.id);
          return next;
        });
        setEvents((prev) =>
          prev.map((e) =>
            e.id === event.id
              ? { ...e, registeredCount: Math.max(0, e.registeredCount - 1) }
              : e
          )
        );
        setToastMessage(`Registration cancelled for "${event.title}".`);
      } else {
        // Register for event
        await registerForEvent(event.id, {
          id: firebaseUser.uid,
          name: userProfile?.name ?? firebaseUser.displayName ?? 'Student',
          email: firebaseUser.email ?? '',
        });
        setRegisteredEventIds((prev) => {
          const next = new Set(prev);
          next.add(event.id);
          return next;
        });
        setEvents((prev) =>
          prev.map((e) =>
            e.id === event.id ? { ...e, registeredCount: e.registeredCount + 1 } : e
          )
        );
        setToastMessage(`Confirmed! You are registered for "${event.title}".`);
      }
    } catch (err) {
      console.error('RSVP Error:', err);
      const msg = err instanceof Error ? err.message : 'Unable to update registration. Please try again.';
      setToastMessage(msg);
    } finally {
      setRsvpLoadingEventId(null);
    }
  };

  /**
   * Handles user logout.
   */
  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  /**
   * Filters events based on feedMode (All vs My RSVPs) and search query.
   */
  const filteredEvents = useMemo(() => {
    let list = events;
    if (feedMode === 'my-rsvps') {
      list = list.filter((evt) => registeredEventIds.has(evt.id));
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) return list;

    return list.filter(
      (evt) =>
        evt.title.toLowerCase().includes(query) ||
        evt.description.toLowerCase().includes(query) ||
        evt.location.toLowerCase().includes(query)
    );
  }, [events, feedMode, registeredEventIds, searchQuery]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>CampusHub</IonTitle>
          <IonButtons slot="end">
            <IonButton
              fill="clear"
              color="primary"
              routerLink="/profile"
              data-testid="home-profile-btn"
              aria-label="My Profile"
              style={{ marginRight: '4px' }}
            >
              <IonIcon slot="icon-only" icon={personCircleOutline} style={{ fontSize: '24px' }} />
            </IonButton>
            {isAdmin && (
              <IonButton
                fill="solid"
                color="tertiary"
                routerLink="/admin/events"
                data-testid="home-admin-portal-btn"
                style={{ marginRight: '8px' }}
              >
                <IonIcon slot="start" icon={shieldCheckmarkOutline} />
                Admin Portal
              </IonButton>
            )}
            <IonButton
              fill="clear"
              color="danger"
              onClick={handleLogout}
              data-testid="home-logout-btn"
              aria-label="Log Out"
            >
              <IonIcon slot="start" icon={logOutOutline} />
              Log Out
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="home-content ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh} data-testid="events-refresher">
          <IonRefresherContent />
        </IonRefresher>

        <div className="home-container">
          {/* Hero Welcome Card */}
          <div className="home-hero-card">
            <div className="home-hero-top">
              <div className="home-user-greeting">
                <IonIcon icon={personCircleOutline} aria-hidden="true" />
                <span className="home-user-name">
                  {userProfile?.name ?? firebaseUser?.email ?? 'Campus Student'}
                </span>
              </div>
              <IonBadge
                color={isAdmin ? 'tertiary' : 'light'}
                className="home-role-chip"
                data-testid="user-role-badge"
              >
                {userProfile?.role?.toUpperCase() ?? 'STUDENT'}
              </IonBadge>
            </div>
            <h1 className="home-hero-title">Discover Campus Life</h1>
            <p className="home-hero-subtitle">
              Explore upcoming academic symposiums, career fairs, sports tournaments, and student
              workshops.
            </p>
          </div>

          {/* Primary View Toggle: Explore Events vs My Confirmed RSVPs */}
          <div className="feed-mode-container">
            <IonSegment
              mode="ios"
              value={feedMode}
              onIonChange={(e) => setFeedMode((e.detail.value as 'all' | 'my-rsvps') ?? 'all')}
              className="feed-mode-segment"
              data-testid="feed-mode-segment"
            >
              <IonSegmentButton
                value="all"
                onClick={() => setFeedMode('all')}
                data-testid="feed-mode-all-btn"
              >
                <IonLabel>Explore Events</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton
                value="my-rsvps"
                onClick={() => setFeedMode('my-rsvps')}
                data-testid="feed-mode-my-rsvps-btn"
              >
                <IonLabel>
                  My Events
                  <IonBadge
                    color={feedMode === 'my-rsvps' ? 'light' : 'primary'}
                    className="rsvp-count-pill"
                    data-testid="feed-rsvps-badge"
                  >
                    {registeredEventIds.size}
                  </IonBadge>
                </IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </div>

          {/* Search & Category Filter Controls */}
          <div className="filter-section">
            <IonSearchbar
              value={searchQuery}
              onIonInput={(e) => setSearchQuery(e.detail.value ?? '')}
              placeholder={
                feedMode === 'my-rsvps'
                  ? 'Search within your registered events...'
                  : 'Search by title, topic, or venue...'
              }
              className="home-searchbar"
              data-testid="events-searchbar"
              debounce={200}
            />

            <div className="category-scroll-container" role="tablist" aria-label="Event Categories">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.key;
                return (
                  <IonButton
                    key={cat.key}
                    size="small"
                    fill={isActive ? 'solid' : 'outline'}
                    color={isActive ? 'primary' : 'medium'}
                    className="category-pill-btn"
                    onClick={() => setSelectedCategory(cat.key)}
                    data-testid={`category-filter-${cat.key}`}
                    role="tab"
                    aria-selected={isActive}
                  >
                    {cat.label}
                  </IonButton>
                );
              })}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="error-banner" role="alert" data-testid="events-error-banner">
              <span>{error}</span>
              <IonButton
                size="small"
                fill="outline"
                color="danger"
                onClick={() => fetchEvents(selectedCategory)}
                data-testid="events-retry-btn"
              >
                <IonIcon slot="start" icon={refreshOutline} />
                Retry
              </IonButton>
            </div>
          )}

          {/* Loading Skeletons */}
          {loading && (
            <div className="events-grid" data-testid="events-loading-skeleton">
              {[1, 2, 3, 4].map((n) => (
                <IonCard key={n} className="skeleton-card">
                  <div style={{ height: '140px', background: 'var(--ion-color-step-100, #edf2f7)' }} />
                  <IonCardHeader>
                    <IonSkeletonText animated style={{ width: '30%', height: '16px' }} />
                    <IonSkeletonText animated style={{ width: '80%', height: '22px', margin: '8px 0' }} />
                    <IonSkeletonText animated style={{ width: '50%', height: '14px' }} />
                  </IonCardHeader>
                  <IonCardContent>
                    <IonSkeletonText animated style={{ width: '100%', height: '14px' }} />
                    <IonSkeletonText animated style={{ width: '90%', height: '14px', marginTop: '4px' }} />
                  </IonCardContent>
                </IonCard>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredEvents.length === 0 && (
            <div className="empty-state-card" data-testid="events-empty-state">
              <IonIcon
                icon={
                  feedMode === 'my-rsvps' && !searchQuery
                    ? bookmarkOutline
                    : searchQuery
                    ? searchOutline
                    : calendarOutline
                }
                className="empty-state-icon"
                aria-hidden="true"
              />
              <h3 className="empty-state-title">
                {feedMode === 'my-rsvps' && !searchQuery
                  ? 'No Registered Events Yet'
                  : searchQuery
                  ? 'No matching events found'
                  : 'No events scheduled yet'}
              </h3>
              <p className="empty-state-subtitle">
                {feedMode === 'my-rsvps' && !searchQuery
                  ? "You haven't registered for any campus events yet. Explore upcoming activities and reserve your spot!"
                  : searchQuery
                  ? `We couldn't find any events matching "${searchQuery}". Try a different keyword or clear your filter.`
                  : 'There are currently no events posted in this category. Check back soon for new campus activities!'}
              </p>
              {feedMode === 'my-rsvps' && !searchQuery ? (
                <IonButton
                  size="small"
                  fill="solid"
                  color="primary"
                  style={{ marginTop: '16px' }}
                  onClick={() => setFeedMode('all')}
                  data-testid="empty-state-explore-btn"
                >
                  Explore Campus Events
                </IonButton>
              ) : searchQuery ? (
                <IonButton
                  size="small"
                  fill="outline"
                  style={{ marginTop: '16px' }}
                  onClick={() => setSearchQuery('')}
                  data-testid="empty-state-clear-search-btn"
                >
                  Clear Search
                </IonButton>
              ) : isAdmin ? (
                <IonButton
                  size="small"
                  fill="solid"
                  color="tertiary"
                  style={{ marginTop: '16px' }}
                  routerLink="/admin/events"
                  data-testid="empty-state-admin-manage-btn"
                >
                  <IonIcon slot="start" icon={sparklesOutline} />
                  Create Events (Admin Portal)
                </IonButton>
              ) : null}
            </div>
          )}

          {/* Events Grid */}
          {!loading && filteredEvents.length > 0 && (
            <div className="events-grid" data-testid="events-feed-grid">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onSelect={(evt) => navigate(`/events/${evt.id}`)}
                  isRegistered={registeredEventIds.has(event.id)}
                  onRsvpToggle={handleRsvpToggle}
                  isRsvpLoading={rsvpLoadingEventId === event.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Status Toast Feedback */}
        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage || ''}
          duration={3000}
          onDidDismiss={() => setToastMessage(null)}
          position="bottom"
          data-testid="home-rsvp-toast"
        />
      </IonContent>
    </IonPage>
  );
};

export default Home;
