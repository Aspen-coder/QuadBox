import { mount } from 'svelte'
import './app.css'
// import App from './App.svelte' // App is now handled by AuthWrapper
// import Login from './Login.svelte' // Login is now handled by AuthWrapper
import { error } from './stores/errorStore'
import { auth } from './lib/firebase' // Your firebase config
import { onAuthStateChanged } from 'firebase/auth'
import AuthWrapper from './AuthWrapper.svelte'; // Import the new AuthWrapper
// import { injectAnalytics } from '@vercel/analytics/sveltekit'; // Import Vercel Analytics

// injectAnalytics(); // Initialize Vercel Analytics

window.addEventListener('error', (e) => {
  error.set({ message: e.message, stacktrace: e.stack })
})

window.addEventListener('unhandledrejection', (e) => {
  error.set({
    message: (e.reason?.message || 'Unhandled promise rejection'),
    stacktrace: (e.reason?.stack || e.reason)
  })
})

// Mount the AuthWrapper component
const app = mount(AuthWrapper, {
  target: document.getElementById('app'),
});

// export default app // Removed as it's not necessary for mounting