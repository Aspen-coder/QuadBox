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

let appContainer = document.getElementById('app');
let currentAppInstance = null;

// Wait for auth state to be determined before mounting
onAuthStateChanged(auth, async (user) => {
  // Destroy existing app if it exists
  if (currentAppInstance) {
    currentAppInstance.$destroy();
    currentAppInstance = null;
    // Clear the container's innerHTML to ensure a clean slate
    appContainer.innerHTML = '';
  }

  if (user) {
    // User is logged in, mount main app
    currentAppInstance = new App({
      target: appContainer,
      props: {
        // Any props for App.svelte
      }
    });
  } else {
    // User is not logged in, mount login component
    currentAppInstance = new Login({
      target: appContainer,
      props: {
        // Any props for Login.svelte
      }
    });
  }
});

// export default app // Removed as it's not necessary for mounting