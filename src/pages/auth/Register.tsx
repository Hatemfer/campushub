import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
} from '@ionic/react';
import {
  schoolOutline,
  personOutline,
  mailOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createUserProfile } from '../../services/user.service';
import './Register.css';

/**
 * Educational & Architectural Notes (University Project Context):
 *
 * Registration Flow (Two-Phase Identity & Profile Architecture):
 * 1. Step 1 - Authentication Identity:
 *    `register(email, password)` interacts with Firebase Authentication.
 *    Firebase verifies credential validity, checks for email collision, securely hashes the password,
 *    and generates a cryptographically unique User ID (`uid`).
 *
 * 2. Step 2 - Domain Profile Creation:
 *    Once the Firebase User is created, its `user.uid` is immediately passed to `createUserProfile(uid, name, email)`.
 *    This establishes the Firestore record at `users/{uid}` with a default, non-elevated `role: "student"`.
 *    The client NEVER specifies or requests an 'admin' role, guaranteeing zero privilege escalation during registration.
 *
 * 3. Step 3 - Session & Navigation:
 *    With identity and profile established, the user is safely navigated to the authenticated destination (`/home`).
 */

export interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

/**
 * Converts low-level Firebase Authentication error codes into human-friendly messages.
 */
export const formatFirebaseError = (error: unknown): string => {
  if (!error) return '';
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('auth/email-already-in-use')) {
    return 'Cette adresse email est déjà associée à un compte existant.';
  }
  if (message.includes('auth/invalid-email')) {
    return 'Le format de l’adresse email est invalide.';
  }
  if (message.includes('auth/weak-password')) {
    return 'Le mot de passe doit comporter au moins 6 caractères.';
  }
  if (message.includes('auth/network-request-failed')) {
    return 'Connexion au serveur impossible. Vérifiez votre connexion Internet.';
  }
  if (message.includes('auth/too-many-requests')) {
    return 'Trop de requêtes. Veuillez patienter un instant.';
  }
  return message || 'Une erreur inattendue est survenue lors de l’inscription.';
};

/**
 * Modern Register Page Component with Split Showcase
 */
const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  // Form field state
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  // UI state
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      nextErrors.name = 'Le nom complet est requis.';
    } else if (trimmedName.length < 2) {
      nextErrors.name = 'Le nom doit contenir au moins 2 caractères.';
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      nextErrors.email = 'L’adresse email est requise.';
    } else if (!emailRegex.test(trimmedEmail)) {
      nextErrors.email = 'Veuillez saisir une adresse email valide.';
    }

    if (!password) {
      nextErrors.password = 'Le mot de passe est requis.';
    } else if (password.length < 6) {
      nextErrors.password = 'Le mot de passe doit contenir au moins 6 caractères.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'La confirmation du mot de passe est requise.';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Les mots de passe ne correspondent pas.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const user = await register(email.trim(), password);
      await createUserProfile(user.uid, name.trim(), email.trim());
      navigate('/home');
    } catch (err: unknown) {
      setErrors({
        general: formatFirebaseError(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="register-content">
        <div className="register-wrapper">
          <div className="register-card">
            {/* Clean Header */}
            <div className="register-header">
              <div className="register-icon-circle">
                <IonIcon icon={schoolOutline} />
              </div>
              <h1 className="register-title">CampusHub</h1>
              <p className="register-subtitle">Créer un compte étudiant</p>
            </div>

            {/* General error alert banner */}
            {errors.general && (
              <div className="register-error-banner" role="alert">
                <IonIcon icon={alertCircleOutline} />
                <span>{errors.general}</span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleRegister} className="register-form" noValidate data-testid="register-form">
              {/* Full Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="register-name">
                  Nom et Prénom
                </label>
                <div className={`input-container ${errors.name ? 'input-error' : ''}`}>
                  <IonIcon icon={personOutline} className="input-leading-icon" />
                  <input
                    id="register-name"
                    type="text"
                    className="custom-input"
                    value={name}
                    placeholder="ex. Alexandre Martin"
                    disabled={isSubmitting}
                    autoComplete="name"
                    data-testid="register-name-input"
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>

              {/* Email Address */}
              <div className="form-group">
                <label className="form-label" htmlFor="register-email">
                  Adresse Email
                </label>
                <div className={`input-container ${errors.email ? 'input-error' : ''}`}>
                  <IonIcon icon={mailOutline} className="input-leading-icon" />
                  <input
                    id="register-email"
                    type="email"
                    className="custom-input"
                    value={email}
                    placeholder="etudiant@campus.edu"
                    disabled={isSubmitting}
                    autoComplete="email"
                    data-testid="register-email-input"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label" htmlFor="register-password">
                  Mot de passe
                </label>
                <div className={`input-container ${errors.password ? 'input-error' : ''}`}>
                  <IonIcon icon={lockClosedOutline} className="input-leading-icon" />
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    className="custom-input"
                    value={password}
                    placeholder="Au moins 6 caractères"
                    disabled={isSubmitting}
                    autoComplete="new-password"
                    data-testid="register-password-input"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} />
                  </button>
                </div>
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label className="form-label" htmlFor="register-confirm-password">
                  Confirmer le mot de passe
                </label>
                <div className={`input-container ${errors.confirmPassword ? 'input-error' : ''}`}>
                  <IonIcon icon={lockClosedOutline} className="input-leading-icon" />
                  <input
                    id="register-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="custom-input"
                    value={confirmPassword}
                    placeholder="Répétez votre mot de passe"
                    disabled={isSubmitting}
                    autoComplete="new-password"
                    data-testid="register-confirm-password-input"
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Masquer' : 'Afficher'}
                  >
                    <IonIcon icon={showConfirmPassword ? eyeOffOutline : eyeOutline} />
                  </button>
                </div>
                {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
              </div>

              {/* Register Submit Button */}
              <IonButton
                expand="block"
                type="submit"
                className="register-submit-btn"
                disabled={isSubmitting}
                data-testid="register-submit-btn"
              >
                {isSubmitting ? (
                  <>
                    <IonSpinner name="crescent" style={{ marginRight: '8px', width: '18px', height: '18px' }} />
                    Création du compte...
                  </>
                ) : (
                  'Créer mon compte'
                )}
              </IonButton>
            </form>

            {/* Navigation link to Login */}
            <div className="register-footer">
              <span>Vous avez déjà un compte ?</span>
              <IonButton
                fill="clear"
                size="small"
                className="register-login-link"
                onClick={() => navigate('/login')}
                type="button"
                data-testid="register-login-btn"
              >
                Se connecter
              </IonButton>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Register;
