import { writable, get } from 'svelte/store'
import { auth } from '../lib/firebase'
import { 
  getFirestore, 
  doc, 
  collection, 
  getDoc, 
  setDoc, 
  updateDoc, 
  getDocs,
  arrayUnion, 
  onSnapshot 
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

const db = getFirestore()
let unsubscribeFirestore = null

export const scores = (() => {
  const internal = writable({})
  let currentUser = null

  // Save a new score to Firestore (batched per day)
  const saveScore = async (score) => {
    if (!currentUser) return

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const dayDocRef = doc(db, 'userScores', currentUser.uid, 'days', today)

    try {
      await setDoc(dayDocRef, {
        scores: arrayUnion({
          ...score,
          timestamp: Date.now()
        }),
        lastUpdated: new Date().toISOString()
      }, { merge: true })
      console.log('Score saved to Firestore')
    } catch (error) {
      console.error('Error saving score:', error)
    }
  }

  // Load all scores for the current user
  const loadScores = async () => {
    if (!currentUser) return

    try {
      const userDocRef = collection(db, 'userScores', currentUser.uid, 'days')
      // Could add query here (limit, orderBy) if needed
      const docsSnap = await getDocs(userDocRef)

      let allScores = {}
      docsSnap.forEach(doc => {
        allScores[doc.id] = doc.data().scores || []
      })

      internal.set(allScores)
      console.log('Scores loaded from Firestore')
    } catch (error) {
      console.error('Error loading scores:', error)
    }
  }

  // Listen for real-time score updates
  const setupFirestoreListener = () => {
    if (!currentUser) return

    const userColRef = collection(db, 'userScores', currentUser.uid, 'days')
    unsubscribeFirestore = onSnapshot(userColRef, (snapshot) => {
      let allScores = {}
      snapshot.forEach(doc => {
        allScores[doc.id] = doc.data().scores || []
      })
      internal.set(allScores)
    }, (error) => {
      console.error('Firestore listener error:', error)
    })
  }

  // Auth state handling
  onAuthStateChanged(auth, async (user) => {
    if (unsubscribeFirestore) {
      unsubscribeFirestore()
      unsubscribeFirestore = null
    }

    currentUser = user

    if (user) {
      await loadScores()
      setupFirestoreListener()
    } else {
      currentUser = null
      internal.set({})
      console.log('User logged out, cleared scores')
    }
  })

  return {
    subscribe: internal.subscribe,
    save: saveScore,
    load: loadScores,
    isConnected: () => !!currentUser
  }
})()

// Clean up on unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (unsubscribeFirestore) unsubscribeFirestore()
  })
}
