import { settings } from './settingsStore'
import { get } from 'svelte/store'
import { writable } from 'svelte/store'
import { auth } from '../lib/firebase' // Your firebase config
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

const db = getFirestore()
let unsubscribeFirestore = null

export const gameSettings = (() => {
  const getGameSettings = () => get(settings).gameSettings[get(settings).mode]
  const internal = writable(getGameSettings())
  let isLoading = writable(false)
  let currentUser = null

  // Function to save settings to Firestore
  const saveToFirestore = async (settingsData) => {
    if (!currentUser) return
    
    try {
      isLoading.set(true)
      const userDocRef = doc(db, 'userSettings', currentUser.uid)
      await setDoc(userDocRef, {
        gameSettings: settingsData,
        lastUpdated: new Date().toISOString()
      }, { merge: true })
      console.log('Settings saved to Firestore')
    } catch (error) {
      console.error('Error saving to Firestore:', error)
    } finally {
      isLoading.set(false)
    }
  }

  // Function to load settings from Firestore
  const loadFromFirestore = async () => {
    if (!currentUser) return
    
    try {
      isLoading.set(true)
      const userDocRef = doc(db, 'userSettings', currentUser.uid)
      const docSnap = await getDoc(userDocRef)
      
      if (docSnap.exists()) {
        const firestoreData = docSnap.data()
        if (firestoreData.gameSettings) {
          // Update the settings store with Firestore data
          settings.update(current => ({
            ...current,
            gameSettings: firestoreData.gameSettings
          }))
          console.log('Settings loaded from Firestore')
        }
      } else {
        // Document doesn't exist, save current settings to Firestore
        await saveToFirestore(get(settings).gameSettings)
      }
    } catch (error) {
      console.error('Error loading from Firestore:', error)
    } finally {
      isLoading.set(false)
    }
  }

  // Function to set up real-time listener
  const setupFirestoreListener = () => {
    if (!currentUser) return
    
    const userDocRef = doc(db, 'userSettings', currentUser.uid)
    unsubscribeFirestore = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const firestoreData = doc.data()
        if (firestoreData.gameSettings) {
          // Update local store with Firestore changes
          settings.update(current => ({
            ...current,
            gameSettings: firestoreData.gameSettings
          }))
        }
      }
    }, (error) => {
      console.error('Firestore listener error:', error)
    })
  }

  // Listen for auth state changes
  onAuthStateChanged(auth, async (user) => {
    // Clean up previous listener
    if (unsubscribeFirestore) {
      unsubscribeFirestore()
      unsubscribeFirestore = null
    }

    currentUser = user
    
    if (user) {
      // User logged in - load their settings and set up listener
      await loadFromFirestore()
      setupFirestoreListener()
    } else {
      // User logged out - reset to local settings
      currentUser = null
      console.log('User logged out, using local settings')
    }
  })

  // Subscribe to local settings changes
  settings.subscribe($settings => {
    const current = $settings.gameSettings[$settings.mode]
    internal.set(current)
    
    // Save to Firestore when settings change (debounced)
    if (currentUser) {
      clearTimeout(saveTimeout)
      saveTimeout = setTimeout(() => {
        saveToFirestore($settings.gameSettings)
      }, 1000) // 1 second delay to avoid too frequent saves
    }
  })

  let saveTimeout

  return {
    subscribe: internal.subscribe,
    loading: { subscribe: isLoading.subscribe },
    set: () => {
      settings.update()
    },
    setField: (field, value) => {
      settings.update(current => {
        const currentMode = current.mode
        return {
          ...current,
          gameSettings: {
            ...current.gameSettings,
            [currentMode]: {
              ...current.gameSettings[currentMode],
              [field]: value
            }
          }
        }
      })
    },
    // Manual save function
    save: () => {
      if (currentUser) {
        saveToFirestore(get(settings).gameSettings)
      }
    },
    // Manual load function
    load: loadFromFirestore,
    // Check if user is connected to Firebase
    isConnected: () => !!currentUser
  }
})()

// Clean up listener when page unloads
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (unsubscribeFirestore) {
      unsubscribeFirestore()
    }
  })
}