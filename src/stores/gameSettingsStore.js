import { settings } from './settingsStore'
import { get, writable } from 'svelte/store'

export const gameSettings = (() => {
  const getGameSettings = () => get(settings).gameSettings[get(settings).mode]
  const internal = writable(getGameSettings())

  // Function to update internal store when settings change
  const updateInternal = () => {
    const current = getGameSettings()
    internal.set(current)
  }

  // Subscribe to local settings changes
  settings.subscribe($settings => {
    const current = $settings.gameSettings[$settings.mode]
    internal.set(current)
  })

  return {
    subscribe: internal.subscribe,
    set: (newSettings) => {
      settings.update(current => ({
        ...current,
        gameSettings: newSettings
      }))
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
    reset: () => {
      // Assuming settingsStore has a way to reset to defaults
      // You might need to implement a reset function in settingsStore.js
      console.warn("Reset function for gameSettings not fully implemented. Implement in settingsStore.js if needed.")
    }
  }
})()