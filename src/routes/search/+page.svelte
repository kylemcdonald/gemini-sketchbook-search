<script>
  import Search from '$lib/components/Search.svelte';
  import ResultList from '$lib/components/ResultList.svelte';
  import { onMount } from 'svelte';

  let searchResults = [];
  let isInitialized = false;

  function handleSearch(event) {
    searchResults = event.detail;
    isInitialized = true;
  }

  onMount(() => {
    // The Search component will dispatch initial results
    console.log('Search page mounted');
  });
</script>

<div class="search-container">
  <Search on:search={handleSearch} />
  <ResultList results={searchResults} />
</div>

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
  }

  .search-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 1rem;
    box-sizing: border-box;
    gap: 1rem;
  }
</style> 