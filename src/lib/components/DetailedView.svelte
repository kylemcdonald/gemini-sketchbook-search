<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import SimilarPages from './SimilarPages.svelte';
  
  export let item;
  export let onClose;
  export let onBrowse;

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      onClose();
    }
  }

  async function handleLabelClick(label) {
    onClose();
    await goto('/search?labels=' + encodeURIComponent(label), { replaceState: true });
  }

  function handleBrowse(item) {
    const imageFilename = item.filename.replace('.json', '.jpg');
    const [sketchbook, pageNum] = imageFilename.split('/');
    goto(`/browse/${sketchbook}/${parseInt(pageNum)}`);
  }

  function handlePageSelect(file) {
    const [sketchbook, pageNum] = file.split('/');
    goto(`/browse/${sketchbook}/${parseInt(pageNum)}`);
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="overlay" on:click={onClose}>
  <div class="modal" on:click|stopPropagation>
    <button class="close-button" on:click={onClose}>×</button>
    
    <div class="content">
      <div class="image-container">
        <img 
          src={`/images/${item.filename.replace('.json', '.jpg')}`} 
          alt="Sketchbook page" 
        />
      </div>
      
      <div class="text-content">
        <button class="browse-button" on:click={() => onBrowse(item)}>
          Browse from this page
        </button>
        <div class="labels">
          {#each item.labels as label}
            <span class="label" on:click|stopPropagation={() => handleLabelClick(label)}>{label}</span>
          {/each}
        </div>
        <pre>{item.transcript}</pre>

        <SimilarPages 
          currentFile={item.filename}
          onPageSelect={handlePageSelect}
        />
      </div>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal {
    background: white;
    border-radius: 8px;
    width: 95%;
    max-width: 1400px;
    height: 95vh;
    max-height: 95vh;
    position: relative;
    overflow: hidden;
  }

  .close-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: #333;
    z-index: 1;
  }

  .content {
    display: flex;
    gap: 2rem;
    padding: 2rem;
    height: calc(95vh - 4rem);
    overflow-y: auto;
  }

  .image-container {
    flex: 2;
    min-width: 0;
    display: flex;
    align-items: center;
  }

  img {
    width: 100%;
    height: 90vh;
    object-fit: contain;
    border-radius: 4px;
  }

  .text-content {
    flex: 1;
    min-width: 0;
    padding: 1rem;
    height: calc(90vh - 4rem);
    overflow-y: auto;
  }

  .text-content::-webkit-scrollbar {
    width: 8px;
  }

  .text-content::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  .text-content::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  .text-content::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  .browse-button {
    margin-bottom: 1rem;
    padding: 0.5rem 1rem;
    background-color: #4a4a4a;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.2s ease;
  }

  .browse-button:hover {
    background-color: #666;
  }

  .labels {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .label {
    background-color: #f0f0f0;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.9rem;
    color: #666;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .label:hover {
    background-color: #ddd;
  }

  .text-content pre {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: inherit;
    line-height: 1.5;
  }

  @media (max-width: 768px) {
    .content {
      flex-direction: column;
      height: auto;
    }
    
    .image-container {
      flex: none;
    }

    img {
      height: 50vh;
    }
    
    .text-content {
      max-height: 40vh;
    }
  }
</style> 