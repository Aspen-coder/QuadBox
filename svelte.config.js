import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import adapter from '@sveltejs/adapter-vercel'; // Import the Vercel adapter

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    // adapter-auto is a good default for Vercel, but we'll be explicit
    adapter: adapter({
      // Configuration for the Vercel adapter
      // Enable Vercel Analytics injection
      analytics: true,
    }),
  },
  compilerOptions: {
    warningFilter: (warning) => {
      return warning.code.startsWith('a11y-')
    },
  }
}

export default config;
