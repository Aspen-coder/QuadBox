<script>
  import App from './App.svelte';
  import Login from './Login.svelte';
  import { auth } from './lib/firebase';
  import { onAuthStateChanged } from 'firebase/auth';
  import { writable } from 'svelte/store';
  import { analytics } from './stores/analyticsStore'; // Import analytics store

  let user = null;
  const isAuthReady = writable(false);

  onAuthStateChanged(auth, async (firebaseUser) => {
    user = firebaseUser;
    $isAuthReady = true;
    if (user) {
      // Trigger full analytics sync when user logs in
      await analytics.syncAllGames();
    }
  });
</script>

{#if $isAuthReady}
  {#if user}
    <App />
  {:else}
    <Login />
  {/if}
{:else}
  <div>Loading authentication...</div>
{/if}
