import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Parse your private key to handle line breaks from .env.local safely
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

const adminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: privateKey,
};

// Prevent duplicate initialization during development hot-reloads
const adminApp = getApps().length === 0 
  ? initializeApp({ credential: cert(adminConfig) }) 
  : getApps()[0];

export const adminAuth = getAuth(adminApp);

