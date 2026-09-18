# 🎓 CampusHub — Plateforme Universitaire de Gestion et Découverte d'Événements

> **Mini-Projet Académique — Module "IONIC"**  
> **Technologies** : Ionic Framework v9 + React 19 + TypeScript + Vite + Firebase v12 (Auth & Cloud Firestore)  
> **Architecture** : Architecture en couches (Services, Contextes, Pages, Composants) + RBAC (Role-Based Access Control)  
> 🌐 **Application en direct** : [https://campushub-9d0e9.web.app](https://campushub-9d0e9.web.app)

---

## 📌 1. Présentation Générale du Projet

**CampusHub** est une application web et mobile universitaire conçue pour dynamiser la vie de campus. Elle permet aux étudiants de découvrir les activités universitaires (conférences, forums carrières, hackathons, tournois sportifs, festivals artistiques), de réserver leur place en temps réel avec synchronisation d'agenda (`.ics`), tout en fournissant aux administrateurs de l'université un tableau de bord complet de gestion d'événements et de suivi des participants.

---

## 🎯 2. Conformité aux Exigences du Sujet de Cours

| Critère demandé par l'Enseignant | Solution implémentée dans CampusHub | Fichiers clés |
| :--- | :--- | :--- |
| **Connexion avec un backend** | **Firebase v12 Modular SDK** :<br>• **Firebase Authentication** pour l'identité et les sessions JWT.<br>• **Cloud Firestore** pour la base de données temps réel NoSQL avec **transactions atomiques** (`runTransaction`) prévenant le surbooking. | [`src/services/firebase.ts`](file:///Users/motdepassetest/Desktop/campushub/src/services/firebase.ts)<br>[`src/services/registration.service.ts`](file:///Users/motdepassetest/Desktop/campushub/src/services/registration.service.ts) |
| **Authentification & 2 Acteurs** | Deux rôles distincts et étanches gérés en base :<br>1. **Acteur 1 : Étudiant (`student`)**<br>2. **Acteur 2 : Administrateur (`admin`)** | [`src/types/index.ts`](file:///Users/motdepassetest/Desktop/campushub/src/types/index.ts)<br>[`firestore.rules`](file:///Users/motdepassetest/Desktop/campushub/firestore.rules) |
| **Interfaces dédiées pour chaque acteur** | • **Interface Étudiant** : Catalogue d'événements, recherche temps réel, filtres par track, vue personnelle *"Mes Inscriptions"* avec badge dynamique, page détaillée `/events/:id`, bouton Maps, export calendrier Apple/Google/Outlook, page profil `/profile`.<br>• **Interface Administrateur** : Portail `/admin/events` avec KPI d'inscriptions, modales de création et d'édition, confirmation de suppression, et consultation de la liste des étudiants inscrits (roster). | [`src/pages/Home.tsx`](file:///Users/motdepassetest/Desktop/campushub/src/pages/Home.tsx)<br>[`src/pages/events/EventDetails.tsx`](file:///Users/motdepassetest/Desktop/campushub/src/pages/events/EventDetails.tsx)<br>[`src/pages/admin/AdminEvents.tsx`](file:///Users/motdepassetest/Desktop/campushub/src/pages/admin/AdminEvents.tsx)<br>[`src/pages/profile/Profile.tsx`](file:///Users/motdepassetest/Desktop/campushub/src/pages/profile/Profile.tsx) |
| **Design Soigné** | Design responsive (Mobile / Tablette / Bureau), glassmorphisme, barres de progression de capacité, badges thématiques colorés, avatars avec initiales dynamiques, placeholders squelettes animés. | [`src/theme/variables.css`](file:///Users/motdepassetest/Desktop/campushub/src/theme/variables.css)<br>[`src/pages/Home.css`](file:///Users/motdepassetest/Desktop/campushub/src/pages/Home.css)<br>[`src/pages/events/EventDetails.css`](file:///Users/motdepassetest/Desktop/campushub/src/pages/events/EventDetails.css) |
| **Code "Ultra Méga Commenté"** | Chaque fichier source dispose d'en-têtes JSDoc expliquant **pourquoi** les choix architecturaux ont été faits (séparation d'intérêts, atomicité, immutabilité des rôles, sécurité NoSQL). | Tous les fichiers `src/` |

---

## 👥 3. Les Deux Acteurs et Leurs Droits

```
                             ┌──────────────────────┐
                             │ Firebase Auth (UID)  │
                             └──────────┬───────────┘
                                        │
                             ┌──────────▼───────────┐
                             │   Firestore: users   │
                             │      document        │
                             └──────────┬───────────┘
                       ┌────────────────┴────────────────┐
                       ▼                                 ▼
              role: "student"                     role: "admin"
              ───────────────                     ─────────────
      • Consulter les événements          • Tout ce que fait l'étudiant
      • Recherche & filtres par track     • Accès Portail Admin (/admin/events)
      • S'inscrire à un événement         • Tableau de bord KPI temps réel
      • Annuler son inscription           • Créer de nouveaux événements
      • Télécharger l'iCal (.ics)         • Modifier les événements
      • Consulter "Mes Inscriptions"      • Supprimer un événement
      • Gérer son profil (/profile)       • Consulter la liste des inscrits
```

---

## 🔒 4. Sécurité & Modèle de Données (Cloud Firestore)

Les règles serveur dans [`firestore.rules`](file:///Users/motdepassetest/Desktop/campushub/firestore.rules) garantissent :
1. **Principe du Moindre Privilège** : Tout accès non authentifié est strictement refusé.
2. **Isolation des Utilisateurs** : Un utilisateur ne peut écrire que dans son document `users/{userId}`.
3. **Immutabilité du Rôle Étudiant** : Un étudiant ne peut pas modifier son propre champ `role` (empêchant l'élévation verticale de privilège).
4. **Transactions Atomiques Sécurisées** : Lors d'une inscription ou d'une annulation, les étudiants peuvent incrémenter ou décrémenter **uniquement** le compteur `registeredCount` de l'événement sans altérer les autres informations (date, lieu, organisateur).

---

## 🚀 5. Installation et Démarrage Rapide

### Prérequis
- Node.js (v18 ou supérieur recommandé)
- npm ou yarn

### 1. Cloner le projet et installer les dépendances
```bash
git clone https://github.com/Hatemfer/campushub.git
cd campushub
npm install
```

### 2. Configuration des Variables d'Environnement
Créer ou vérifier le fichier `.env.local` à la racine (voir modèle `.env.example`) :
```env
VITE_FIREBASE_API_KEY=votre_api_key
VITE_FIREBASE_AUTH_DOMAIN=campushub-9d0e9.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=campushub-9d0e9
VITE_FIREBASE_STORAGE_BUCKET=campushub-9d0e9.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
VITE_FIREBASE_APP_ID=votre_app_id
```

### 3. Lancer le serveur de développement
```bash
npm run dev
```
L'application s'ouvre sur : `http://localhost:5174` (ou `http://localhost:8100`).

---

## 🔍 6. Qualité du Code & Compilation

Le projet respecte les normes strictes de typage TypeScript et de linting ESLint :

```bash
# Vérifier la qualité du code et les règles ESLint
npm run lint

# Compiler le bundle de production et valider les types TypeScript
npm run build
```

**Résultats de validation** :
- **0 erreur ESLint**.
- **0 erreur TypeScript** en mode strict.
- **Bundle optimisé** prêt pour le déploiement.
