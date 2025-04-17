<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import SketchSphere from '$lib/components/SketchSphere.svelte';

  let pages = [];

  onMount(async () => {
    try {
      const response = await fetch('/data/metadata-labeled.json');
      const data = await response.json();
      pages = data;
    } catch (error) {
      console.error('Error loading metadata:', error);
    }
  });

  function handleBegin() {
    goto('/search');
  }
</script>

<div class="splash-container">
  <div class="content">
    <h1>Sketchbook Search</h1>
    <p>Powered by Gemini</p>
    
    <div class="sphere-wrapper">
      <SketchSphere {pages} />
    </div>

    <button on:click={handleBegin} class="begin-button">Begin</button>
  </div>
</div>

<style>
  .splash-container {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    padding: 0;
    position: relative;
    overflow: hidden;
  }

  .content {
    text-align: center;
    padding: 1rem;
    background: rgba(249, 249, 249, 0.8);
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    width: 100vw;
    height: 100vh;
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    color: #333;
    flex-shrink: 0;
  }

  p {
    font-size: 1.2rem;
    margin-bottom: 1rem;
    color: #666;
    flex-shrink: 0;
  }

  .sphere-wrapper {
    flex: 1;
    position: relative;
    min-height: 0;
    overflow: hidden;
  }

  .begin-button {
    padding: 0.5rem 1rem;
    font-size: 1rem;
    background: #666;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;
    width: 120px;
    margin: 1rem auto;
    display: block;
    flex-shrink: 0;
  }

  .begin-button:hover {
    background: #555;
    transform: translateY(-1px);
  }
</style> 