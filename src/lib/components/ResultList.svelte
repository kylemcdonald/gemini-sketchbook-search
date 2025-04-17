<script>
  import ResultItem from './ResultItem.svelte';
  import { highlightMatches } from '../utils/search';
  import { onMount } from 'svelte';
  
  export let results = [];
  export let searchTerm = '';
  export let onSelect;

  let visibleResults = [];
  let containerElement;
  const pageSize = 20;
  let currentPage = 1;
  let isLoading = false;

  function handleScroll() {
    if (isLoading) return;
    
    const container = containerElement;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    if (isNearBottom && visibleResults.length < results.length) {
      isLoading = true;
      currentPage++;
      visibleResults = results.slice(0, currentPage * pageSize);
      isLoading = false;
    }
  }

  $: {
    // Reset pagination when results change
    currentPage = 1;
    visibleResults = results.slice(0, pageSize);
  }

  onMount(() => {
    const container = containerElement;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  });
</script>

<div class="results-container" bind:this={containerElement}>
  <div class="results-grid">
    {#each visibleResults as result (result.filename)}
      <div 
        class="result-item"
        on:click={() => onSelect(result)}
      >
        <ResultItem 
          item={result}
          searchTerm={searchTerm}
        />
      </div>
    {/each}
  </div>
  {#if visibleResults.length < results.length}
    <div class="results-limit">Showing {visibleResults.length} of {results.length} results</div>
  {/if}
</div>

<style>
  .results-container {
    height: calc(100vh - 250px);
    overflow-y: auto;
    padding: 1rem;
    background: #f9f9f9;
  }

  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }

  .result-item {
    cursor: pointer;
    transition: transform 0.2s ease;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .result-item:hover {
    transform: scale(1.01);
  }

  .results-limit {
    text-align: center;
    padding: 1rem;
    color: #666;
    font-style: italic;
  }
</style> 