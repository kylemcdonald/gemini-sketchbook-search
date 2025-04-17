<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { privacyFilter } from '$lib/stores/privacy';
  import SimilarPages from './SimilarPages.svelte';

  export let sketchbookParam = '';  // Will be passed from the parent route
  export let pageParam = '';        // Will be passed from the parent route

  let sketchbooks = [];
  let currentSketchbook = null;
  let currentPageIndex = 0;
  let metadata = [];

  // Helper function to extract page number from filename
  function getPageNum(filename) {
    const match = filename.match(/\/(\d+)\.jpg$/);
    return match ? parseInt(match[1]) : 0;
  }

  // Helper function to find array index for a given page number
  async function findPageIndex(sketchbook, pageNum) {
    // First try to find in metadata
    const index = sketchbook.files.findIndex(file => getPageNum(file) === pageNum);
    if (index !== -1) return index;

    // If not found in metadata, check if image exists
    const imagePath = `/images/${sketchbook.name}/${pageNum}.jpg`;
    try {
      const response = await fetch(imagePath, { method: 'HEAD' });
      if (response.ok) {
        // Add the file to the array and sort
        sketchbook.files.push(imagePath);
        sketchbook.files.sort((a, b) => getPageNum(a) - getPageNum(b));
        return sketchbook.files.findIndex(file => getPageNum(file) === pageNum);
      }
    } catch (e) {
      console.error('Error checking image:', e);
    }
    return -1;
  }

  // Add reactive statement to handle URL parameter changes
  $: if (sketchbookParam && pageParam && sketchbooks.length > 0) {
    const foundSketchbook = sketchbooks.find(s => String(s.name) === String(sketchbookParam));
    if (foundSketchbook) {
      currentSketchbook = foundSketchbook;
      const pageNum = parseInt(pageParam);
      findPageIndex(foundSketchbook, pageNum).then(index => {
        if (index !== -1) {
          currentPageIndex = index;
        }
      });
    }
  }

  onMount(async () => {
    const response = await fetch('/data/metadata-labeled.json');
    metadata = await response.json();
    
    // Convert metadata array to grouped files by sketchbook
    const groupedFiles = metadata.reduce((acc, item) => {
      const [sketchbook] = item.filename.split('/');
      if (!acc[sketchbook]) {
        acc[sketchbook] = [];
      }
      acc[sketchbook].push(`/images/${item.filename.replace('.json', '.jpg')}`);
      return acc;
    }, {});

    // Debug: Log files for sketchbook 7
    if (groupedFiles['sketchbook7']) {
      console.log('Sketchbook 7 files:', groupedFiles['sketchbook7'].map(f => getPageNum(f)).sort((a, b) => a - b));
    }

    sketchbooks = Object.entries(groupedFiles).map(([name, files]) => ({
      name,
      files: files.sort((a, b) => getPageNum(a) - getPageNum(b))
    }));

    if (sketchbooks.length > 0) {
      // If we have URL parameters, use them
      if (sketchbookParam) {
        const foundSketchbook = sketchbooks.find(s => String(s.name) === String(sketchbookParam));
        if (foundSketchbook) {
          currentSketchbook = foundSketchbook;
          if (pageParam) {
            const pageNum = parseInt(pageParam);
            const index = await findPageIndex(foundSketchbook, pageNum);
            console.log('Looking for page', pageNum, 'in sketchbook', foundSketchbook.name);
            console.log('Found index:', index);
            console.log('Available pages:', foundSketchbook.files.map(f => getPageNum(f)));
            if (index !== -1) {
              currentPageIndex = index;
            }
          }
        }
      } else {
        currentSketchbook = sketchbooks[0];
        updateURL();
      }
    }
  });

  function updateURL() {
    if (currentSketchbook) {
      const currentPageNum = getPageNum(currentSketchbook.files[currentPageIndex]);
      goto(`/browse/${currentSketchbook.name}/${currentPageNum}`, { replaceState: true });
    }
  }

  function nextPage() {
    if (currentPageIndex < currentSketchbook.files.length - 1) {
      let nextIndex = currentPageIndex + 1;
      const nextImagePath = currentSketchbook.files[nextIndex];
      const nextMetadataKey = nextImagePath.replace('/images/', '').replace('.jpg', '.json');
      let nextMetadata = metadata.find(item => item.filename === nextMetadataKey);

      // Skip pages that don't match the privacy filter
      while (nextIndex < currentSketchbook.files.length - 1 && 
             $privacyFilter !== 'all' && 
             nextMetadata?.private !== ($privacyFilter === 'private')) {
        nextIndex++;
        const imagePath = currentSketchbook.files[nextIndex];
        const metadataKey = imagePath.replace('/images/', '').replace('.jpg', '.json');
        nextMetadata = metadata.find(item => item.filename === metadataKey);
      }

      currentPageIndex = nextIndex;
      updateURL();
    }
  }

  function previousPage() {
    if (currentPageIndex > 0) {
      let prevIndex = currentPageIndex - 1;
      const prevImagePath = currentSketchbook.files[prevIndex];
      const prevMetadataKey = prevImagePath.replace('/images/', '').replace('.jpg', '.json');
      let prevMetadata = metadata.find(item => item.filename === prevMetadataKey);

      // Skip pages that don't match the privacy filter
      while (prevIndex > 0 && 
             $privacyFilter !== 'all' && 
             prevMetadata?.private !== ($privacyFilter === 'private')) {
        prevIndex--;
        const imagePath = currentSketchbook.files[prevIndex];
        const metadataKey = imagePath.replace('/images/', '').replace('.jpg', '.json');
        prevMetadata = metadata.find(item => item.filename === metadataKey);
      }

      currentPageIndex = prevIndex;
      updateURL();
    }
  }

  function selectSketchbook(sketchbook) {
    currentSketchbook = sketchbook;
    currentPageIndex = 0;
    updateURL();
  }

  function handleKeydown(event) {
    if (event.key === 'ArrowRight') {
      nextPage();
    } else if (event.key === 'ArrowLeft') {
      previousPage();
    }
  }

  function getCurrentPageMetadata() {
    if (!currentSketchbook || !metadata) return null;
    const imagePath = currentSketchbook.files[currentPageIndex];
    const metadataKey = imagePath.replace('/images/', '').replace('.jpg', '.json');
    return metadata.find(item => item.filename === metadataKey);
  }

  function handlePageSelect(file) {
    const [sketchbook, pageNum] = file.split('/');
    goto(`/browse/${sketchbook}/${parseInt(pageNum)}`);
  }

  // Add this reactive statement to handle privacy filter changes
  $: if (metadata.length > 0 && $privacyFilter && currentSketchbook) {
    // Check if current page is visible with new filter
    const currentMetadata = getCurrentPageMetadata();
    if ($privacyFilter !== 'all' && currentMetadata?.private !== ($privacyFilter === 'private')) {
      // Current page is not visible, find next visible page
      let nextIndex = currentPageIndex;
      let found = false;
      
      // First try to find a visible page after current
      while (nextIndex < currentSketchbook.files.length - 1 && !found) {
        nextIndex++;
        const imagePath = currentSketchbook.files[nextIndex];
        const metadataKey = imagePath.replace('/images/', '').replace('.jpg', '.json');
        const pageMetadata = metadata.find(item => item.filename === metadataKey);
        if ($privacyFilter === 'all' || pageMetadata?.private === ($privacyFilter === 'private')) {
          found = true;
        }
      }
      
      // If no visible page found after, try before
      if (!found) {
        nextIndex = currentPageIndex;
        while (nextIndex > 0 && !found) {
          nextIndex--;
          const imagePath = currentSketchbook.files[nextIndex];
          const metadataKey = imagePath.replace('/images/', '').replace('.jpg', '.json');
          const pageMetadata = metadata.find(item => item.filename === metadataKey);
          if ($privacyFilter === 'all' || pageMetadata?.private === ($privacyFilter === 'private')) {
            found = true;
          }
        }
      }
      
      if (found) {
        currentPageIndex = nextIndex;
        updateURL();
      }
    }
  }
</script>

<svelte:window on:keydown={handleKeydown}/>

<div class="browser-container">
  <div class="sketchbook-list">
    <div class="sketchbook-buttons">
      {#each sketchbooks as sketchbook}
        <button
          class:active={currentSketchbook === sketchbook}
          on:click={() => selectSketchbook(sketchbook)}
          style="background-image: url('/thumbnails/{sketchbook.name}.jpg')"
        >
          <span class="sketchbook-number">{sketchbook.name.replace('sketchbook', '')}</span>
        </button>
      {/each}
    </div>
  </div>

  {#if currentSketchbook}
    <div class="viewer">
      <div class="navigation">
        <button 
          on:click={previousPage}
          disabled={currentPageIndex === 0}
        >
          ← Previous
        </button>
        <span class="page-info">
          Page {getPageNum(currentSketchbook.files[currentPageIndex])} of {getPageNum(currentSketchbook.files[currentSketchbook.files.length - 1])}
        </span>
        <button 
          on:click={nextPage}
          disabled={currentPageIndex === currentSketchbook.files.length - 1}
        >
          Next →
        </button>
      </div>

      <div class="content-container">
        <div class="image-container">
          <img 
            src={currentSketchbook.files[currentPageIndex]} 
            alt={`Page ${currentPageIndex + 1} from ${currentSketchbook.name}`}
          />
        </div>
      </div>
    </div>

    <div class="text-container">
      {#if getCurrentPageMetadata()}
        {#if getCurrentPageMetadata().labels.length > 0 || getCurrentPageMetadata().private}
          <div class="labels">
            {#if getCurrentPageMetadata().private}
              <span class="label private">private</span>
            {/if}
            {#each getCurrentPageMetadata().labels as label}
              <span class="label" on:click|stopPropagation={() => goto(`/search?labels=${encodeURIComponent(label)}`)}>{label}</span>
            {/each}
          </div>
        {/if}
        <p>{getCurrentPageMetadata().transcript}</p>

        {#if getCurrentPageMetadata()}
          <div class="similar-pages-container">
            <h3>Similar Pages</h3>
            <SimilarPages 
              currentFile={getCurrentPageMetadata().filename}
              onPageSelect={handlePageSelect}
            />
          </div>
        {/if}
      {:else}
        <p>No text available</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .browser-container {
    display: grid;
    grid-template-columns: 250px minmax(0, 1fr) 300px;
    height: calc(100vh - 25px);
    width: 100%;
    gap: 1rem;
    padding: 1rem;
    padding-right: 1rem;
    box-sizing: border-box;
    overflow: hidden;
    position: fixed;
    top: 50px;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .sketchbook-list {
    width: 100%;
    height: calc(100% - 2rem);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: hidden;
    position: relative;
    margin-top: 1rem;
  }

  .sketchbook-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow-y: auto;
    height: 100%;
    padding-right: 0.5rem;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overscroll-behavior: contain;
  }

  .sketchbook-buttons button {
    width: 100%;
    height: auto;
    aspect-ratio: 5/1;
    border: 2px solid #ddd;
    border-radius: 4px;
    background-size: cover;
    background-position: center;
    cursor: pointer;
    position: relative;
    transition: border-color 0.2s ease;
    padding: 0;
    text-align: left;
    display: flex;
    align-items: center;
  }

  .sketchbook-buttons button:hover {
    border-color: #999;
  }

  .sketchbook-buttons button.active {
    border-color: #666;
  }

  .sketchbook-number {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 30px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 1.2rem;
  }

  .sketchbook-name {
    position: absolute;
    bottom: 0;
    left: 30px;
    right: 0;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 0.5rem;
    font-size: 0.9rem;
    text-align: center;
  }

  .viewer {
    height: calc(100% - 2rem);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: hidden;
    margin-top: 1rem;
  }

  .navigation {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 0;
  }

  .navigation button {
    padding: 0.5rem 1rem;
    border: none;
    background: #f0f0f0;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .navigation button:hover:not(:disabled) {
    background: #e0e0e0;
  }

  .navigation button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .content-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    height: calc(100% - 50px);
    overflow: hidden;
  }

  .image-container {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f0f0;
    border-radius: 8px;
    overflow: hidden;
    height: 100%;
  }

  .image-container img {
    max-width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .text-container {
    width: 100%;
    background: #f0f0f0;
    border-radius: 8px;
    padding: 1rem;
    margin-top: 1rem;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    height: calc(100% - 2rem);
    box-sizing: border-box;
    overscroll-behavior: contain;
  }

  .text-container h3 {
    margin-top: 0;
    margin-bottom: 1rem;
  }

  .text-container p {
    white-space: pre-wrap;
    line-height: 1.5;
    margin-bottom: 1rem;
  }

  .labels {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .label {
    background-color: white;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.9rem;
    color: #666;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .label:hover {
    background-color: #f0f0f0;
  }

  .label.private {
    background-color: #ffebee;
    color: #c62828;
  }

  .similar-pages-container {
    margin-top: 1rem;
  }
</style> 