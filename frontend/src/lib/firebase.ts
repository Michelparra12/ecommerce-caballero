import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Config pública: las API keys de Firebase Auth están hechas para vivir
// en el cliente (no son secretas — la seguridad real la da Firebase
// Security Rules / el backend verificando el ID token, no ocultar esto).
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

// Evita re-inicializar en cada hot-reload / render.
const app = getApps()[0] ?? initializeApp(firebaseConfig);

export const auth = getAuth(app);
