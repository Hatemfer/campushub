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
  mailOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

export interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

/**
 * Maps low-level Firebase Authentication error codes to user-friendly messages.
 */
export const formatLoginError = (error: unknown): string => {
  if (!error) return '';
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes('auth/invalid-credential') ||
    message.includes('auth/wrong-password') ||
    message.includes('auth/user-not-found')
  ) {
    return 'Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.';
  }
  if (message.includes('auth/invalid-email')) {
    return 'Veuillez saisir une adresse email valide.';
  }
  if (message.includes('auth/user-disabled')) {
    return 'This student account has been disabled. Please contact campus administration.';
  }
  if (message.includes('auth/too-many-requests')) {
    return 'Trop de tentatives infructueuses. Veuillez patienter avant de réessayer.';
  }
  if (message.includes('auth/network-request-failed')) {
    return 'Network connection error. Please check your internet connection and try again.';
  }
  return message || 'Une erreur de connexion est survenue. Veuillez réessayer.';
};

/**
 * Page de Connexion (Login) de CampusHub
 * 
 * Architecture & Fonctionnement :
 * 1. Authentification Firebase :
 *    Utilise `login(email, password)` issu de `AuthContext`.
 * 2. Formulaire Moderne & Typé :
 *    Labels explicites, placeholders clairs, icônes d'aide visuelle et toggle pour le mot de passe.
 */
const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Form field state
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // UI state
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<LoginFormErrors>({});

  const validateForm = (): boolean => {
    const nextErrors: LoginFormErrors = {};

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      nextErrors.email = 'L’adresse email est requise.';
    } else if (!emailRegex.test(trimmedEmail)) {
      nextErrors.email = 'Veuillez entrer une adresse email valide.';
    }

    if (!password) {
      nextErrors.password = 'Le mot de passe est requis.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await login(email.trim(), password);
      navigate('/home');
    } catch (err) {
      setErrors({
        general: formatLoginError(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="login-content">
        <div className="login-wrapper">
          <div className="login-card">
            {/* Clean Header */}
            <div className="login-header">
              <div className="login-icon-circle">
                <IonIcon icon={schoolOutline} />
              </div>
              <h1 className="login-title">CampusHub</h1>
              <p className="login-subtitle">Connectez-vous à votre espace campus</p>
            </div>

            {/* Error Banner */}
            {errors.general && (
              <div className="login-error-banner" role="alert">
                <IonIcon icon={alertCircleOutline} />
                <span>{errors.general}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="login-form" noValidate data-testid="login-form">
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">
                  Adresse Email
                </label>
                <div className={`input-container ${errors.email ? 'input-error' : ''}`}>
                  <IonIcon icon={mailOutline} className="input-leading-icon" />
                  <input
                    id="login-email"
                    type="email"
                    className="custom-input"
                    value={email}
                    placeholder="nom@campus.edu"
                    disabled={isSubmitting}
                    autoComplete="email"
                    data-testid="login-email-input"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="login-password">
                  Mot de passe
                </label>
                <div className={`input-container ${errors.password ? 'input-error' : ''}`}>
                  <IonIcon icon={lockClosedOutline} className="input-leading-icon" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="custom-input"
                    value={password}
                    placeholder="••••••••"
                    disabled={isSubmitting}
                    autoComplete="current-password"
                    data-testid="login-password-input"
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

              <IonButton
                expand="block"
                type="submit"
                className="login-submit-btn"
                disabled={isSubmitting}
                data-testid="login-submit-btn"
              >
                {isSubmitting ? (
                  <>
                    <IonSpinner name="crescent" style={{ marginRight: '8px', width: '18px', height: '18px' }} />
                    Connexion...
                  </>
                ) : (
                  'Se connecter'
                )}
              </IonButton>
            </form>

            <div className="login-footer">
              <span>Pas encore de compte ?</span>
              <IonButton
                fill="clear"
                size="small"
                className="login-register-link"
                onClick={() => navigate('/register')}
                type="button"
                data-testid="login-register-btn"
              >
                Créer un compte
              </IonButton>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;
