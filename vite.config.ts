import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Configuration du bundler Vite pour CampusHub (Ionic + React)
 * 
 * - @vitejs/plugin-react : Compilation JSX/TSX et Fast Refresh HMR en environnement de développement.
 * - @vitejs/plugin-legacy : Assure la compatibilité avec les WebViews et navigateurs mobiles plus anciens
 *   pour les applications hybrides Ionic/Capacitor.
 */
export default defineConfig({
  plugins: [
    react(),
    legacy()
  ],
})

