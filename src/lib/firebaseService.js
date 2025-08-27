
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let currentUser = null;
let unsubscribeFirestore = null;

// Function to save settings to Firestore
export const saveGameSettingsToFirestore = async (settingsData) => {
  if (!currentUser) return;

  try {
    const userDocRef = doc(db, 'userSettings', currentUser.uid);
    await setDoc(userDocRef, {
      gameSettings: settingsData,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    console.log('Settings saved to Firestore');
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    throw error; // Re-throw to be handled by caller
  }
};

// Function to load settings from Firestore
export const loadGameSettingsFromFirestore = async () => {
  if (!currentUser) {
    console.log('No user logged in, skipping Firestore load');
    return null;
  }

  try {
    console.log('Loading settings from Firestore for user:', currentUser.uid);
    const userDocRef = doc(db, 'userSettings', currentUser.uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const firestoreData = docSnap.data();
      if (firestoreData.gameSettings) {
        console.log('Settings loaded from Firestore successfully');
        return firestoreData.gameSettings;
      }
    } else {
      console.log('No existing settings document.');
      return null; // Indicate no existing settings
    }
  } catch (error) {
    console.error('Error loading from Firestore:', error.code, error.message);
    throw error; // Re-throw to be handled by caller
  } finally {
  }
  return null;
};

// Function to set up real-time listener for game settings
export const setupGameSettingsListener = (callback) => {
  if (!currentUser) return;

  console.log('Setting up Firestore listener for user:', currentUser.uid);
  const userDocRef = doc(db, 'userSettings', currentUser.uid);

  unsubscribeFirestore = onSnapshot(userDocRef, (doc) => {
    if (doc.exists()) {
      const firestoreData = doc.data();
      if (firestoreData.gameSettings) {
        console.log('Received Firestore update');
        callback(firestoreData.gameSettings);
      }
    }
  }, (error) => {
    console.error('Firestore listener error:', error.code, error.message);
  });
};

export const unsubscribeGameSettings = () => {
  if (unsubscribeFirestore) {
    unsubscribeFirestore();
    unsubscribeFirestore = null;
  }
};

// Listen for auth state changes and update currentUser
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (!user) {
    // User logged out
    unsubscribeGameSettings();
  }
});

// Placeholder for score syncing functions
export const saveScoreToFirestore = async (scoreData) => {
  if (!currentUser) return;

  try {
    const userScoresCollectionRef = collection(db, 'userScores', currentUser.uid, 'games');
    await addDoc(userScoresCollectionRef, {
      ...scoreData,
      timestamp: new Date().toISOString()
    });
    console.log('Score saved to Firestore');
  } catch (error) {
    console.error('Error saving score to Firestore:', error);
    throw error;
  }
};

export const loadScoresFromFirestore = async () => {
  if (!currentUser) {
    console.log('No user logged in, skipping Firestore score load');
    return [];
  }

  try {
    console.log('Loading scores from Firestore for user:', currentUser.uid);
    const userScoresCollectionRef = collection(db, 'userScores', currentUser.uid, 'games');
    const querySnapshot = await getDocs(query(userScoresCollectionRef, orderBy('timestamp', 'desc')));
    const scores = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Scores loaded from Firestore successfully');
    return scores;
  } catch (error) {
    console.error('Error loading scores from Firestore:', error);
    throw error;
  }
};
