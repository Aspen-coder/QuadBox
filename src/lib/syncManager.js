import { getAllCompletedGames, addGame } from './gamedb'
import { auth } from '../lib/firebase'
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  arrayUnion 
} from 'firebase/firestore'

const db = getFirestore()

// Extract YYYY-MM-DD from timestamp
const getDayKey = (ts) => new Date(ts).toISOString().split('T')[0]

export async function syncGames() {
  const user = auth.currentUser
  if (!user) {
    console.log('No user logged in, skipping sync')
    return
  }

  console.log('Starting sync for user:', user.uid)

  // --- 1. Load local (IndexedDB) ---
  const localGames = await getAllCompletedGames()
  const localMap = new Map(localGames.map(g => [g.timestamp, g]))

  // --- 2. Load Firestore ---
  const userColRef = collection(db, 'userScores', user.uid, 'days')
  const snapshot = await getDocs(userColRef)
  const cloudMap = new Map()

  snapshot.forEach(docSnap => {
    const day = docSnap.id
    const data = docSnap.data()
    if (data.scores) {
      data.scores.forEach(score => {
        cloudMap.set(score.timestamp, { ...score, day })
      })
    }
  })

  // --- 3. Find missing locally ---
  for (let [ts, score] of cloudMap) {
    if (!localMap.has(ts)) {
      console.log('Adding missing game from cloud to local:', ts)
      await addGame(score) // push into IndexedDB
    }
  }

  // --- 4. Find missing in cloud ---
  const missingInCloud = []
  for (let [ts, game] of localMap) {
    if (!cloudMap.has(ts)) {
      missingInCloud.push(game)
    }
  }

  if (missingInCloud.length > 0) {
    console.log('Uploading', missingInCloud.length, 'games to cloud...')
    const grouped = {}

    // group by day
    missingInCloud.forEach(game => {
      const day = getDayKey(game.timestamp)
      if (!grouped[day]) grouped[day] = []
      grouped[day].push({
        timestamp: game.timestamp,
        nBack: game.nBack,
        scores: game.scores,
        total: game.total
      })
    })

    // push to Firestore
    for (let day of Object.keys(grouped)) {
      const ref = doc(db, 'userScores', user.uid, 'days', day)
      await setDoc(ref, {
        scores: grouped[day].map(g => ({
          ...g,
          syncedAt: Date.now()
        }))
      }, { merge: true })
    }
  }

  console.log('Sync complete.')
}


export async function saveGameToCloud(game) {
  const user = auth.currentUser
  if (!user) return

  const today = new Date(game.timestamp || Date.now()).toISOString().split('T')[0]
  const dayDocRef = doc(db, 'userScores', user.uid, 'days', today)

  try {
    await setDoc(dayDocRef, {
      scores: arrayUnion({
        timestamp: game.timestamp || Date.now(),
        nBack: game.nBack,
        scores: game.scores,
        total: game.total,
        completedTrials: game.completedTrials,
        status: game.status
      })
    }, { merge: true })
    console.log('Game saved to Firestore:', game.timestamp)
  } catch (err) {
    console.error('Error saving game to Firestore:', err)
  }
}
