import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import Login from './Login.svelte' // You'll need to create this component
import { error } from './stores/errorStore'
import { auth } from './lib/firebase' // Your firebase config
import { onAuthStateChanged } from 'firebase/auth'
// import { syncGames } from './lib/syncManager' // Function to sync games

window.addEventListener('error', (e) => {
  error.set({ message: e.message, stacktrace: e.stack })
})

window.addEventListener('unhandledrejection', (e) => {
  error.set({
    message: (e.reason?.message || 'Unhandled promise rejection'),
    stacktrace: (e.reason?.stack || e.reason)
  })
})

let app

// Wait for auth state to be determined before mounting
onAuthStateChanged(auth, async (user) => {
  // Unmount existing app if it exists
  if (app) {
    app.$destroy()
  }

  if (user) {
    // User is logged in, mount main app
    // await syncGames() // Removed as syncGames is handled by analyticsStore and App.svelte
    app = mount(App, {
      target: document.getElementById('app'),
    })
  } else {
    // User is not logged in, mount login component
    app = mount(Login, {
      target: document.getElementById('app'),
    })
  }
})

export default app