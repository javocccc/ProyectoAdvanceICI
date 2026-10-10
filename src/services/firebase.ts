import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

// import.meta.env es la forma en que Vite entrega al código del navegador las
// variables VITE_* del archivo .env. Este módulo es el único que crea Firebase.
// Estos cuatro valores deciden el modo. Una configuración incompleta activa
// la demostración; una configuración presente pero errónea fallará al conectar.
// Storage usa además VITE_FIREBASE_STORAGE_BUCKET.
export const firebaseConfigurado = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_APP_ID,
);

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Evita inicializar Firebase dos veces durante la recarga automática de Vite.
const app = firebaseConfigurado
  ? getApps().length
    ? getApp()
    : initializeApp(config)
  : null;

// Los demás módulos comprueban si cada servicio es null: null significa demo.
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const functions = app ? getFunctions(app, "us-central1") : null;
export const storage = app ? getStorage(app) : null;
