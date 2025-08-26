<script>
  import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
  import { auth } from './lib/firebase' // Your firebase config
  import { error } from './stores/errorStore'

  let email = ''
  let password = ''
  let isLogin = true

  async function handleSubmit() {
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
      // The onAuthStateChanged listener in main.js will handle the redirect
    } catch (err) {
      error.set({ 
        message: err.message, 
        stacktrace: err.stack || err.toString() 
      })
    }
  }

  function toggleMode() {
    isLogin = !isLogin
    error.set(null) // Clear any existing errors
  }
</script>

<div class="login-container">
  <div class="login-form">
    <h1>{isLogin ? 'Login' : 'Sign Up'}</h1>
    
    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label for="email">Email:</label>
        <input 
          id="email"
          type="email" 
          bind:value={email} 
          required 
        />
      </div>
      
      <div class="form-group">
        <label for="password">Password:</label>
        <input 
          id="password"
          type="password" 
          bind:value={password} 
          required 
        />
      </div>
      
      <button type="submit">
        {isLogin ? 'Login' : 'Sign Up'}
      </button>
    </form>
    
    <p>
      {isLogin ? "Don't have an account?" : "Already have an account?"}
      <button type="button" on:click={toggleMode} class="link-button">
        {isLogin ? 'Sign Up' : 'Login'}
      </button>
    </p>
  </div>
</div>

<style>
  .login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: #f5f5f5;
  }

  .login-form {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 400px;
  }

  h1 {
    text-align: center;
    margin-bottom: 1.5rem;
    color: #333;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: #555;
    font-weight: 500;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }

  button[type="submit"] {
    width: 100%;
    padding: 0.75rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    margin-bottom: 1rem;
  }

  button[type="submit"]:hover {
    background-color: #0056b3;
  }

  .link-button {
    background: none;
    border: none;
    color: #007bff;
    text-decoration: underline;
    cursor: pointer;
    font-size: inherit;
  }

  .link-button:hover {
    color: #0056b3;
  }

  p {
    text-align: center;
    color: #666;
  }
</style>