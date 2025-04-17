<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  export let currentFile;
  export let onPageSelect;
  export let isLoading = true;

  let textSimilarPages = [];
  let multimodalSimilarPages = [];
  let showMoreText = false;
  let showMoreMultimodal = false;
  let allTextSimilarPages = [];
  let allMultimodalSimilarPages = [];

  async function loadSimilarPages() {
    try {
      const [textSimilarities, multimodalSimilarities] = await Promise.all([
        fetch('/data/text_similarities.json').then(r => r.json()),
        fetch('/data/multimodal_similarities.json').then(r => r.json())
      ]);

      const currentFileJpg = currentFile.replace('.json', '.jpg');
      
      allTextSimilarPages = (textSimilarities[currentFile] || [])
        .sort((a, b) => b.similarity - a.similarity);

      allMultimodalSimilarPages = (multimodalSimilarities[currentFileJpg] || [])
        .map(item => ({
          ...item,
          file: item.file.replace('.jpg', '.json')
        }))
        .sort((a, b) => b.similarity - a.similarity);

      updateDisplayedPages();
    } catch (error) {
      console.error('Error loading similar pages:', error);
    } finally {
      isLoading = false;
    }
  }

  function updateDisplayedPages() {
    textSimilarPages = allTextSimilarPages.slice(0, showMoreText ? 8 : 4);
    multimodalSimilarPages = allMultimodalSimilarPages.slice(0, showMoreMultimodal ? 8 : 4);
  }

  function toggleShowMoreText() {
    showMoreText = !showMoreText;
    updateDisplayedPages();
  }

  function toggleShowMoreMultimodal() {
    showMoreMultimodal = !showMoreMultimodal;
    updateDisplayedPages();
  }

  onMount(() => {
    loadSimilarPages();
  });

  $: if (currentFile) {
    isLoading = true;
    loadSimilarPages();
  }
</script>

<div class="similar-pages">
  {#if isLoading}
    <p>Loading similar pages...</p>
  {:else if textSimilarPages.length === 0 && multimodalSimilarPages.length === 0}
    <p>No similar pages found</p>
  {:else}
    <div class="similar-sections">
      {#if multimodalSimilarPages.length > 0}
        <div class="similar-section">
          <button class="section-header" on:click={toggleShowMoreMultimodal} aria-label={showMoreMultimodal ? 'Show Less' : 'Show More'}>
            {#if allMultimodalSimilarPages.length > 4}
              <div class="icon-btn">
                {#if showMoreMultimodal}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                {:else}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                {/if}
              </div>
            {/if}
            <h4>Similar Visually</h4>
          </button>
          <div class="similar-pages-grid">
            {#each multimodalSimilarPages as similar}
              <div class="similar-page" on:click={() => onPageSelect(similar.file)}>
                <img 
                  src={`/images/${similar.file.replace('.json', '.jpg')}`} 
                  alt="Similar page" 
                />
                <div class="similarity-bar" style="width: {similar.similarity}%"></div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if textSimilarPages.length > 0}
        <div class="similar-section">
          <button class="section-header" on:click={toggleShowMoreText} aria-label={showMoreText ? 'Show Less' : 'Show More'}>
            {#if allTextSimilarPages.length > 4}
              <div class="icon-btn">
                {#if showMoreText}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                {:else}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                {/if}
              </div>
            {/if}
            <h4>Similar Text</h4>
          </button>
          <div class="similar-pages-grid">
            {#each textSimilarPages as similar}
              <div class="similar-page" on:click={() => onPageSelect(similar.file)}>
                <img 
                  src={`/images/${similar.file.replace('.json', '.jpg')}`} 
                  alt="Similar page" 
                />
                <div class="similarity-bar" style="width: {similar.similarity}%"></div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .similar-pages {
    margin-top: 1rem;
    border-top: 1px solid #eee;
    padding-top: 0.75rem;
  }

  .similar-sections {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .similar-section {
    border-top: 1px solid #eee;
    padding-top: 0.75rem;
  }

  .similar-section:first-child {
    border-top: none;
    padding-top: 0;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
  }

  .section-header:hover {
    opacity: 0.8;
  }

  .similar-pages-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .similar-page {
    cursor: pointer;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    aspect-ratio: 1;
  }

  .similar-page:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .similar-page img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .similarity-bar {
    height: 4px;
    background-color: #a8d1ff;
    transition: width 0.3s ease;
  }

  @media (max-width: 768px) {
    .similar-pages-grid {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }

    .similar-page img {
      height: 120px;
    }
  }

  .show-more-btn {
    display: block;
    margin: 1rem auto 0;
    padding: 0.5rem 1rem;
    background-color: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.2s ease;
  }

  .show-more-btn:hover {
    background-color: #e0e0e0;
  }

  .section-header h4 {
    margin: 0;
  }

  .icon-btn {
    padding: 0.25rem;
    background-color: transparent;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    color: #666;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-btn:hover {
    color: #333;
    background-color: #f0f0f0;
  }
</style> 