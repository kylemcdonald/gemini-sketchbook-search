<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import PrivacyToggle from '$lib/components/PrivacyToggle.svelte';
  import '../app.css';

  $: isSplashPage = $page.url.pathname === '/';
  $: currentView = $page.url.pathname.split('/')[1] || 'search';

  function switchView(view) {
    goto(`/${view}`);
  }
</script>

<svelte:head>
  <title>Sketchbook Search</title>
</svelte:head>

{#if !isSplashPage}
  <div class="container">
    <div class="header">
      <a href="/" class="home-link"><b>Sketchbook Search</b> Powered by Gemini</a>
      <div class="nav-buttons">
        <button 
          class:active={currentView === 'search'} 
          on:click={() => switchView('search')}
        >
          Search
        </button>
        <button 
          class:active={currentView === 'browse'} 
          on:click={() => switchView('browse')}
        >
          Browse
        </button>
        <button 
          class:active={currentView === 'cloud'} 
          on:click={() => switchView('cloud')}
        >
          Cloud
        </button>
        <PrivacyToggle />
      </div>
    </div>

    <slot />
  </div>
{:else}
  <slot />
{/if}

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    min-height: 100vh;
    overflow-x: hidden;
  }

  .container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    width: 100%;
  }

  .header {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .home-link {
    color: #333;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;
  }

  .home-link:hover {
    color: #666;
  }

  .nav-buttons {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .nav-buttons button {
    padding: 0.5rem 1rem;
    border: none;
    background: #f0f0f0;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .nav-buttons button:hover {
    background: #e0e0e0;
    transform: translateY(-1px);
  }

  .nav-buttons button.active {
    background: #666;
    color: white;
  }

  .built-with {
    color: #666;
    font-size: 0.9rem;
  }

  :global(main) {
    flex: 1;
    width: 100%;
    padding-top: 1rem;
  }
</style> 