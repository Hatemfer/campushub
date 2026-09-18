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
  IonToast,
  IonAlert,
  IonSpinner,
} from '@ionic/react';
import {
  arrowBackOutline,
  personOutline,
  mailOutline,
  shieldCheckmarkOutline,
  calendarOutline,
  ticketOutline,
  createOutline,
  keyOutline,
  logOutOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile } from '../../services/user.service';
import { getUserRegisteredEventIds } from '../../services/registration.service';
import './Profile.css';

/**
 * Formats user creation date safely across Timestamp and Date formats.
 */
export const formatJoinDate = (dateVal: unknown): string => {
  if (!dateVal) return 'Recently';
  try {
    const d = typeof (dateVal as { toDate?: () => Date })?.toDate === 'function'
      ? (dateVal as { toDate: () => Date }).toDate()
      : new Date(dateVal as string | number | Date);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'Recently';
  }
};

/**
 * Extracts initials for user avatar badge (e.g. "Jane Doe" -> "JD").
 */
export const getInitials = (name?: string, email?: string): string => {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'CH';
};

/**
 * Student & Administrator Profile Page
 *
 * Provides account identity overview, display name editing, live RSVP statistics,
 * self-service password reset email triggers, and session sign-out controls.
 */
const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, firebaseUser, logout, resetUserPassword, refreshProfile, isAdmin } =
    useAuth();

  const [rsvpCount, setRsvpCount] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showEditNameAlert, setShowEditNameAlert] = useState<boolean>(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState<boolean>(false);
  const [showPasswordResetAlert, setShowPasswordResetAlert] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  /**
   * Loads user activity metrics (e.g. total confirmed registrations).
   */
  const loadUserStats = useCallback(async () => {
    if (!firebaseUser?.uid) return;
    setLoadingStats(true);
    try {
      const registeredIds = await getUserRegisteredEventIds(firebaseUser.uid);
      setRsvpCount(registeredIds.size);
    } catch (err) {
      console.error('Failed to load user registration stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [firebaseUser?.uid]);

  useEffect(() => {
    loadUserStats();
  }, [loadUserStats]);

  /**
   * Handles saving a new display name in Firestore.
   */
  const handleSaveName = async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || !firebaseUser?.uid) return;

    setActionLoading(true);
    try {
      await updateUserProfile(firebaseUser.uid, { name: trimmed });
      if (refreshProfile) {
        await refreshProfile();
      }
      setToastMessage('Display name updated successfully!');
    } catch (err) {
      console.error('Failed to update profile name:', err);
      const msg = err instanceof Error ? err.message : 'Unable to update profile name.';
      setToastMessage(msg);
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Triggers a Firebase password reset email.
   */
  const handleSendPasswordReset = async () => {
    if (!firebaseUser?.email) return;

    setActionLoading(true);
    try {
      if (resetUserPassword) {
        await resetUserPassword(firebaseUser.email);
      }
      setToastMessage(`Password reset link sent to ${firebaseUser.email}`);
    } catch (err) {
      console.error('Password reset error:', err);
      const msg = err instanceof Error ? err.message : 'Unable to send password reset email.';
      setToastMessage(msg);
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Handles user sign-out.
   */
  const handleConfirmLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      setToastMessage('Error logging out. Please try again.');
    }
  };

  const displayName = userProfile?.name ?? firebaseUser?.displayName ?? 'Campus Student';
  const displayEmail = userProfile?.email ?? firebaseUser?.email ?? 'Unknown Email';
  const role = userProfile?.role ?? 'student';
  const memberSince = formatJoinDate(userProfile?.createdAt);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton
              onClick={() => navigate('/home')}
              data-testid="profile-back-btn"
              aria-label="Back to Home"
            >
              <IonIcon slot="start" icon={arrowBackOutline} />
              Home
            </IonButton>
          </IonButtons>
          <IonTitle>My Profile</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="profile-content ion-padding">
        <div className="profile-container">
          {/* User Hero Profile Card */}
          <div className="profile-hero-card" data-testid="profile-hero-card">
            <div className="profile-avatar-circle" data-testid="profile-avatar">
              {getInitials(displayName, displayEmail)}
            </div>

            <div className="profile-hero-info">
              <div className="profile-name-row">
                <h1 className="profile-name" data-testid="profile-display-name">
                  {displayName}
                </h1>
                <IonButton
                  fill="clear"
                  size="small"
                  className="profile-edit-name-btn"
                  onClick={() => setShowEditNameAlert(true)}
                  data-testid="profile-edit-name-btn"
                  aria-label="Edit display name"
                >
                  <IonIcon slot="icon-only" icon={createOutline} />
                </IonButton>
              </div>

              <div className="profile-badges-row">
                <IonBadge
                  color={isAdmin ? 'tertiary' : 'primary'}
                  className="profile-role-badge"
                  data-testid="profile-role-badge"
                >
                  <IonIcon
                    icon={isAdmin ? shieldCheckmarkOutline : personOutline}
                    style={{ marginRight: '4px', verticalAlign: 'middle' }}
                  />
                  {role.toUpperCase()}
                </IonBadge>

                <IonBadge color="success" className="profile-verified-badge">
                  <IonIcon icon={checkmarkCircleOutline} style={{ marginRight: '4px' }} />
                  VERIFIED ACCOUNT
                </IonBadge>
              </div>

              <div className="profile-meta-details">
                <div className="profile-meta-item" data-testid="profile-email">
                  <IonIcon icon={mailOutline} />
                  <span>{displayEmail}</span>
                </div>
                <div className="profile-meta-item" data-testid="profile-member-since">
                  <IonIcon icon={calendarOutline} />
                  <span>Member since {memberSince}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Metrics Section */}
          <div className="profile-section-title">
            <h2>Campus Activity</h2>
          </div>

          <div className="profile-stats-grid">
            <div className="profile-stat-card" data-testid="profile-rsvp-stat-card">
              <div className="profile-stat-icon-wrapper">
                <IonIcon icon={ticketOutline} />
              </div>
              <div className="profile-stat-content">
                <span className="profile-stat-label">Registered Events</span>
                <span className="profile-stat-value" data-testid="profile-rsvp-count">
                  {loadingStats ? <IonSpinner name="dots" /> : rsvpCount}
                </span>
              </div>
              <IonButton
                fill="outline"
                size="small"
                onClick={() => navigate('/home')}
                className="profile-stat-action-btn"
                data-testid="profile-view-rsvps-btn"
              >
                View Schedule
              </IonButton>
            </div>
          </div>

          {/* Security & Account Settings Section */}
          <div className="profile-section-title">
            <h2>Account & Security</h2>
          </div>

          <div className="profile-settings-card">
            {/* Password Reset Tile */}
            <div className="profile-action-item">
              <div className="action-item-icon">
                <IonIcon icon={keyOutline} />
              </div>
              <div className="action-item-text">
                <h3>Password Management</h3>
                <p>Send a secure reset link to your registered email address.</p>
              </div>
              <IonButton
                fill="outline"
                color="medium"
                size="default"
                disabled={actionLoading}
                onClick={() => setShowPasswordResetAlert(true)}
                data-testid="profile-reset-password-btn"
              >
                Reset Password
              </IonButton>
            </div>

            {/* Logout Tile */}
            <div className="profile-action-item profile-logout-item">
              <div className="action-item-icon danger-icon">
                <IonIcon icon={logOutOutline} />
              </div>
              <div className="action-item-text">
                <h3>End Session</h3>
                <p>Sign out of your account on this browser.</p>
              </div>
              <IonButton
                fill="solid"
                color="danger"
                size="default"
                onClick={() => setShowLogoutAlert(true)}
                data-testid="profile-logout-btn"
              >
                Log Out
              </IonButton>
            </div>
          </div>
        </div>

        {/* Edit Name Alert Dialog */}
        <IonAlert
          isOpen={showEditNameAlert}
          onDidDismiss={() => setShowEditNameAlert(false)}
          header="Edit Display Name"
          message="Enter your preferred name for campus events and attendee rosters:"
          inputs={[
            {
              name: 'displayName',
              type: 'text',
              placeholder: 'Your Full Name',
              value: displayName,
            },
          ]}
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
            },
            {
              text: 'Save',
              handler: (data) => {
                if (data.displayName && data.displayName.trim()) {
                  handleSaveName(data.displayName);
                }
              },
            },
          ]}
        />

        {/* Password Reset Confirmation Alert */}
        <IonAlert
          isOpen={showPasswordResetAlert}
          onDidDismiss={() => setShowPasswordResetAlert(false)}
          header="Reset Password"
          message={`Send a password reset email to ${displayEmail}?`}
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
            },
            {
              text: 'Send Email',
              handler: () => {
                handleSendPasswordReset();
              },
            },
          ]}
        />

        {/* Logout Confirmation Alert */}
        <IonAlert
          isOpen={showLogoutAlert}
          onDidDismiss={() => setShowLogoutAlert(false)}
          header="Log Out"
          message="Are you sure you want to end your CampusHub session?"
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
            },
            {
              text: 'Log Out',
              cssClass: 'alert-danger-text',
              handler: () => {
                handleConfirmLogout();
              },
            },
          ]}
        />

        {/* Toast Feedback */}
        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage || ''}
          duration={3000}
          onDidDismiss={() => setToastMessage(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Profile;
