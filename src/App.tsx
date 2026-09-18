import { Navigate, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Home from './pages/Home';
import Register from './pages/auth/Register';
import Login from './pages/auth/Login';
import AdminEvents from './pages/admin/AdminEvents';
import EventDetails from './pages/events/EventDetails';
import Profile from './pages/profile/Profile';
import ProtectedRoute from './components/ProtectedRoute';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

/**
 * Composant racine de l'application CampusHub.
 * 
 * Architecture & Décisions Techniques :
 * 1. IonReactRouter & IonRouterOutlet :
 *    Assurent la gestion native des transitions de pages et de l'historique de navigation Ionic.
 * 
 * 2. Contrôle d'accès basé sur les rôles (RBAC) via <ProtectedRoute> :
 *    - Routes publiques (/login, /register) : Accessibles sans authentification préalable.
 *    - Routes protégées Étudiant (/home, /profile, /events/:id) : Requiert un token Firebase valide.
 *    - Routes protégées Administrateur (/admin/events) : Vérifie strictement le rôle 'admin'
 *      résolu de façon asynchrone depuis le document Firestore de l'utilisateur.
 * 
 * 3. Redirection par défaut :
 *    La racine '/' redirige vers '/home', qui redirigera vers '/login' si l'utilisateur est non authentifié.
 */
const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonRouterOutlet>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events"
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminEvents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id"
          element={
            <ProtectedRoute>
              <EventDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/home" replace />} />
      </IonRouterOutlet>
    </IonReactRouter>
  </IonApp>
);

export default App;
