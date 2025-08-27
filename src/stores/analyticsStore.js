import { writable } from 'svelte/store'
import { addGame, getAllCompletedGames } from '../lib/gamedb'
import { formatSeconds } from '../lib/utils'
import { getLastRecentGame, getPlayTimeSince4AM } from '../lib/gamedb'
import { saveScoreToFirestore, loadScoresFromFirestore } from '../lib/firebaseService'
import { getAuth } from 'firebase/auth'

const auth = getAuth(); // Get the Firebase Auth instance

const loadAnalytics = async () => {
  const lastGame = await getLastRecentGame()
  const playTime = await getPlayTimeSince4AM()
  const firebaseScores = await loadScoresFromFirestore()

  return {
    lastGame,
    playTime: playTime > 0 ? formatSeconds(playTime) : null,
    firebaseScores: firebaseScores || [], // Renamed to allGames or something more general soon
  }
}

// Computes total and adds metadata (same logic as addScoreMetadata)
const computeTotal = (game) => {
  const total = { hits: 0, misses: 0, percent: 0, possible: 0, ncalc: 0 }

  // Ensure game.tags is an array, defaulting to an empty array if not present or not an array
  const tagsToProcess = Array.isArray(game.tags) ? game.tags : [];

  for (const tag of tagsToProcess) {
    // Initialize game.scores[tag] if it doesn't exist, to prevent errors for old data
    if (!game.scores[tag]) {
      game.scores[tag] = { hits: 0, misses: 0 };
    }
    total.hits += game.scores[tag].hits
    total.misses += game.scores[tag].misses
    game.scores[tag].possible = game.scores[tag].hits + game.scores[tag].misses
    game.scores[tag].percent = 0
    if (game.scores[tag].hits > 0) {
      game.scores[tag].percent = game.scores[tag].hits / game.scores[tag].possible
    }
  }

  total.possible = total.hits + total.misses
  total.percent = total.hits > 0 ? total.hits / total.possible : 0
  if (total.percent >= 0.4) {
    total.ncalc = game.nBack + (total.percent - 0.5) * 2.5
  }

  return total
}

const createAnalyticsStore = () => {
  const { subscribe, set, update } = writable({})
  // Initialize with an empty object and then load data asynchronously
  set({ lastGame: null, playTime: null, firebaseScores: [] });
  // loadAnalytics().then(analyticsData => set(analyticsData)); // This will be handled by syncAllGames

  const syncAllGames = async () => {
    const user = auth.currentUser;
    if (!user) {
      console.log('No user logged in, skipping score sync.');
      // Load only local data if no user
      const localAnalytics = await loadAnalytics();
      update(current => ({ ...current, ...localAnalytics, allGames: localAnalytics.firebaseScores }));
      return;
    }

    console.log('Starting full score sync...');

    const localGames = await getAllCompletedGames();
    const firebaseGames = await loadScoresFromFirestore();

    const localMap = new Map(localGames.map(game => [game.timestamp, game]));
    const firebaseMap = new Map(firebaseGames.map(game => [game.timestamp, game]));

    // Sync local to Firebase
    for (const [timestamp, game] of localMap) {
      if (!firebaseMap.has(timestamp)) {
        console.log('Uploading game to Firebase:', game.timestamp);
        await saveScoreToFirestore(game);
      }
    }

    // Sync Firebase to local
    for (const [timestamp, game] of firebaseMap) {
      if (!localMap.has(timestamp)) {
        console.log('Adding game from Firebase to local IndexedDB:', game.timestamp);
        await addGame(game);
      }
    }

    // After sync, reload all data (both local and firebase) and update the store
    const updatedLocalGames = await getAllCompletedGames();
    const updatedFirebaseScores = await loadScoresFromFirestore();

    const mergedGamesMap = new Map();

    // Add local games first (or firebase if preferred for initial base)
    updatedLocalGames.forEach(game => mergedGamesMap.set(game.timestamp, game));

    // Add Firebase games, overwriting local if timestamps match
    updatedFirebaseScores.forEach(game => mergedGamesMap.set(game.timestamp, game));

    const allConsolidatedGames = Array.from(mergedGamesMap.values());

    // Recalculate lastGame and playTime based on consolidated games
    const currentPlayTime = await getPlayTimeSince4AM();
    const sortedGames = [...allConsolidatedGames].sort((a, b) => b.timestamp - a.timestamp);
    const lastGameData = sortedGames.length > 0 ? sortedGames[0] : null;

    update(current => ({
      ...current,
      lastGame: lastGameData,
      playTime: currentPlayTime > 0 ? formatSeconds(currentPlayTime) : null,
      allGames: allConsolidatedGames,
      firebaseScores: updatedFirebaseScores // Keep this for now if other components rely on it
    }));
    console.log('Full score sync complete and analytics store updated.');
  };

  return {
    subscribe,
    scoreTrials: async (gameInfo, scoresheet, status, nBack) => {
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

      // Save locally (IndexedDB)
      await addGame(gameObj)

      // Save to Firebase
      await saveScoreToFirestore(gameObj)

      // After saving, trigger a full sync to update all views
      await syncAllGames();
    },
    syncAllGames, // Expose the sync function
  }
}

export const analytics = createAnalyticsStore()

// Initial sync when the store is created
analytics.syncAllGames();
