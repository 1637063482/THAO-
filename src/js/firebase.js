import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCikihHgIJYjRSELe4uIQ-RdcTv017nFFM",
  authDomain: "expense-recording-system-22f7d.firebaseapp.com",
  projectId: "expense-recording-system-22f7d",
  storageBucket: "expense-recording-system-22f7d.firebasestorage.app",
  messagingSenderId: "836634854504",
  appId: "1:836634854504:web:5a3242c212ea1021dde7dd",
  measurementId: "G-0XGWR2Q1R6",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const projectId = firebaseConfig.projectId;

// Auto-connect to local Firebase emulators when running on localhost.
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
}