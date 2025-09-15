
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDExU8FOTwTBsuu9uuJaFTwwce2-dMbejM",
  authDomain: "teenwellnessapp.firebaseapp.com",
  projectId: "teenwellnessapp",
  storageBucket: "teenwellnessapp.appspot.com",
  messagingSenderId: "458468952403",
  appId: "1:458468952403:web:21d28ce66913e30ec879a6",
  measurementId: "G-65DBWQDJ8S"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
