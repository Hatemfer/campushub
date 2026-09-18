import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonIcon,
  IonSpinner,
} from '@ionic/react';
import {
  schoolOutline,
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
export const formatAuthError = (error: unknown): string => {
  if (!error) return '';
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('auth/email-already-in-use')) {
    return 'Un compte existe déjà avec cette adresse email. Veuillez vous connecter.';
  }
  if (message.includes('auth/invalid-email')) {
    return 'Veuillez saisir une adresse email valide.';
  }
  if (message.includes('auth/weak-password')) {
    return 'Le mot de passe doit comporter au moins 6 caractères.';
  }
  if (message.includes('auth/network-request-failed')) {
    return 'Erreur de connexion réseau. Veuillez vérifier votre connexion internet.';
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
      nextErrors.name = 'Le nom doit comporter au moins 2 caractères.';
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      nextErrors.email = 'L’adresse email est requise.';
    } else if (!emailRegex.test(trimmedEmail)) {
      nextErrors.email = 'Veuillez entrer une adresse email valide.';
    }

    if (!password) {
      nextErrors.password = 'Le mot de passe est requis.';
    } else if (password.length < 6) {
      nextErrors.password = 'Le mot de passe doit comporter au moins 6 caractères.';
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
    } catch (err) {
      setErrors({
        general: formatAuthError(err),
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
              <div className="form-field">
                <IonItem className="register-item" lines="none">
                  <IonInput
                    fill="outline"
                    label="Nom et Prénom"
                    labelPlacement="floating"
                    type="text"
                    value={name}
                    placeholder="ex. Alexandre Martin"
                    disabled={isSubmitting}
                    autocomplete="name"
                    data-testid="register-name-input"
                    onIonInput={(e) => setName(e.detail.value ?? '')}
                  />
                </IonItem>
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>

              {/* Email Address */}
              <div className="form-field">
                <IonItem className="register-item" lines="none">
                  <IonInput
                    fill="outline"
                    label="Adresse Email"
                    labelPlacement="floating"
                    type="email"
                    value={email}
                    placeholder="etudiant@campus.edu"
                    disabled={isSubmitting}
                    autocomplete="email"
                    data-testid="register-email-input"
                    onIonInput={(e) => setEmail(e.detail.value ?? '')}
                  />
                </IonItem>
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              {/* Password */}
              <div className="form-field">
                <IonItem className="register-item" lines="none">
                  <IonInput
                    fill="outline"
                    label="Mot de passe"
                    labelPlacement="floating"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    placeholder="Au moins 6 caractères"
                    disabled={isSubmitting}
                    autocomplete="new-password"
                    data-testid="register-password-input"
                    onIonInput={(e) => setPassword(e.detail.value ?? '')}
                  />
                  <IonButton
                    fill="clear"
                    slot="end"
                    aria-label={showPassword ? 'Masquer' : 'Afficher'}
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                  >
                    <IonIcon slot="icon-only" icon={showPassword ? eyeOffOutline : eyeOutline} />
                  </IonButton>
                </IonItem>
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>

              {/* Confirm Password */}
              <div className="form-field">
                <IonItem className="register-item" lines="none">
                  <IonInput
                    fill="outline"
                    label="Confirmer le mot de passe"
                    labelPlacement="floating"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    placeholder="Répétez votre mot de passe"
                    disabled={isSubmitting}
                    autocomplete="new-password"
                    data-testid="register-confirm-password-input"
                    onIonInput={(e) => setConfirmPassword(e.detail.value ?? '')}
                  />
                  <IonButton
                    fill="clear"
                    slot="end"
                    aria-label={showConfirmPassword ? 'Masquer' : 'Afficher'}
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    type="button"
                  >
                    <IonIcon slot="icon-only" icon={showConfirmPassword ? eyeOffOutline : eyeOutline} />
                  </IonButton>
                </IonItem>
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
