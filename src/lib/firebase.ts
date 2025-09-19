import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB949PJTBxCdiZIfvCkplfAZI2WWfix-MU",
  authDomain: "teenwellnessapp.firebaseapp.com",
  projectId: "teenwellnessapp",
  storageBucket: "teenwellnessapp.appspot.com",
  messagingSenderId: "458468952403",
  appId: "1:458468952403:web:21d28ce66913e30ec879a6"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Set persistence on the client side
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence);
}

export { app, auth };
