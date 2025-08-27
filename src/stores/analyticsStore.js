import { writable } from 'svelte/store'
import { addGame } from '../lib/gamedb'
import { formatSeconds } from '../lib/utils'
import { getLastRecentGame, getPlayTimeSince4AM } from '../lib/gamedb'
import { saveScoreToFirestore, loadScoresFromFirestore } from '../lib/firebaseService'

const loadAnalytics = async () => {
  const lastGame = await getLastRecentGame()
  const playTime = await getPlayTimeSince4AM()
  const firebaseScores = await loadScoresFromFirestore()

  return {
    lastGame,
    playTime: playTime > 0 ? formatSeconds(playTime) : null,
    firebaseScores: firebaseScores || [],
  }
}

// Computes total and adds metadata (same logic as addScoreMetadata)
const computeTotal = (game) => {
  const total = { hits: 0, misses: 0, percent: 0, possible: 0, ncalc: 0 }

  for (const tag of game.tags) {
    const s = game.scores[tag]
    s.possible = s.hits + s.misses
    s.percent = s.hits > 0 ? s.hits / s.possible : 0
    total.hits += s.hits
    total.misses += s.misses
  }

  total.possible = total.hits + total.misses
  total.percent = total.hits > 0 ? total.hits / total.possible : 0
  if (total.percent >= 0.4) {
    total.ncalc = game.nBack + (total.percent - 0.5) * 2.5
  }

  return total
}

const createAnalyticsStore = () => {
  const { subscribe, set } = writable({})
  // Initialize with an empty object and then load data asynchronously
  set({ lastGame: null, playTime: null, firebaseScores: [] });
  loadAnalytics().then(analyticsData => set(analyticsData));

  return {
    subscribe,
    scoreTrials: async (gameInfo, scoresheet, status, nBack) => {
      // Build scores object
      const scores = {}
      for (const tag of gameInfo.tags) {
        scores[tag] = { hits: 0, misses: 0 }
      }

      // Count hits/misses
      for (const answers of scoresheet) {
        for (const tag of gameInfo.tags) {
          if (tag in answers) {
            if (answers[tag]) {
              scores[tag].hits++
            } else {
              scores[tag].misses++
            }
          }
        }
      }

      // Build full game object
      const gameObj = {
        ...gameInfo,
        timestamp: Date.now(),
        nBack,
        scores,
        completedTrials: scoresheet.length,
        status
      }

      // Compute totals
      const total = computeTotal(gameObj)
      gameObj.total = total

      // Save locally
      await addGame(gameObj)

      // Save to Firestore
      await saveScoreToFirestore(gameObj)

      // Reload analytics store
      set(await loadAnalytics())
    },
    loadFirebaseScores: async () => {
        const scores = await loadScoresFromFirestore();
        analytics.update(current => ({
            ...current,
            firebaseScores: scores || []
        }));
    }
  }
}

export const analytics = createAnalyticsStore()
