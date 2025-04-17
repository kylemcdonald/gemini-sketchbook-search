<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { debounce } from 'lodash-es';
  import DetailedView from './DetailedView.svelte';
  import ResultList from './ResultList.svelte';
  import { goto } from '$app/navigation';
  import { privacyFilter } from '$lib/stores/privacy';
  import { page } from '$app/stores';

  const dispatch = createEventDispatcher();
  let searchTerm = '';
  let metadata = [];
  let currentScore = null;
  let selectedItem = null;
  let searchResults = [];
  let currentIndex = -1;
  let uniqueLabels = [];
  let selectedLabels = [];
  let showAllLabels = false;
  let showDeepSearch = false;
  let isDeepSearching = false;
  let searchDisabled = false;
  let isDeepSearchResults = false;

  function collectUniqueLabels(data, filterResults = false) {
    const labelCounts = new Map();
    const itemsToProcess = filterResults ? searchResults : data;
    itemsToProcess.forEach(item => {
      item.labels.forEach(label => {
        labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
      });
    });
    return Array.from(labelCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label]) => label);
  }

  function toggleLabel(label) {
    const urlParams = new URLSearchParams($page.url.searchParams);
    
    const labelIndex = selectedLabels.indexOf(label);
    if (labelIndex !== -1) {
      selectedLabels = selectedLabels.filter(l => l !== label);
      urlParams.delete('labels');
      if (selectedLabels.length > 0) {
        urlParams.set('labels', selectedLabels.join(','));
      }
    } else {
      selectedLabels = [...selectedLabels, label];
      urlParams.set('labels', selectedLabels.join(','));
    }
    goto(`?${urlParams.toString()}`, { replaceState: true });
    
    searchResults = filterByPrivacy(
      searchTerm 
        ? performExactSearch(searchTerm)
        : metadata.map(item => ({ ...item, score: null }))
    );
  }

  function performExactSearch(term) {
    const searchTermLower = term.toLowerCase();
    return metadata
      .filter(item => 
        item.transcript.toLowerCase().includes(searchTermLower) ||
        item.labels.some(label => label.toLowerCase().includes(searchTermLower))
      )
      .map(item => ({
        ...item,
        score: 0
      }));
  }

  async function handleDeepSearch() {
    if (!searchTerm.trim() || isDeepSearching) return;
    
    isDeepSearching = true;
    try {
      const response = await fetch('/api/deep-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchTerm })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results = await response.json();
      
      const mappedResults = results.map(result => {
        const originalItem = metadata.find(item => item.filename === result.filename);
        return originalItem ? {
          ...originalItem,
          deepSearchExplanation: result.explanation,
          score: 0.8
        } : {
          ...result,
          score: 0.8,
          labels: [],
          private: false,
          transcript: result.explanation
        };
      });
      
      searchResults = filterByPrivacy(mappedResults);
      showDeepSearch = false;
      searchDisabled = false;
      isDeepSearchResults = true;
      
      dispatch('search', searchResults);
    } catch (error) {
      // Error handling without console.error
    } finally {
      isDeepSearching = false;
    }
  }

  function updateSearchResults(term) {
    if (isDeepSearchResults) return;
    
    if (!term || !term.trim()) {
      currentScore = null;
      searchResults = filterByPrivacy(metadata.map(item => ({ ...item, score: null })));
      currentIndex = -1;
      selectedItem = null;
      showDeepSearch = false;
      searchDisabled = false;
      dispatch('search', searchResults);
      return;
    }

    const results = performExactSearch(term);
    currentScore = results.length > 0 ? 0 : null;
    searchResults = filterByPrivacy(results);
    currentIndex = -1;
    selectedItem = null;
    showDeepSearch = results.length === 0;
    if (results.length === 0) {
      searchDisabled = true;
    }
    dispatch('search', searchResults);
  }

  const debouncedSearch = debounce((term) => {
    updateSearchResults(term);
  }, 100);

  onMount(async () => {
    try {
      const response = await fetch('/data/metadata-labeled.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      metadata = await response.json();
      uniqueLabels = collectUniqueLabels(metadata);

      // Initialize with all results
      searchResults = filterByPrivacy(metadata.map(item => ({ ...item, score: null })));
      dispatch('search', searchResults);

      const urlLabels = $page.url.searchParams.get('labels');
      if (urlLabels) {
        selectedLabels = urlLabels.split(',').filter(label => uniqueLabels.includes(label));
        searchResults = filterByPrivacy(metadata.map(item => ({ ...item, score: null })));
        dispatch('search', searchResults);
      }

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    } catch (error) {
      // Error handling without console.error
    }
  });

  function handleKeyDown(event) {
    if (event.key === 'Enter' && showDeepSearch) {
      event.preventDefault();
      handleDeepSearch();
    }
    if (searchResults.length === 0) return;
    
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
      return;
    }
    
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      currentIndex = (currentIndex + 1) % searchResults.length;
      selectedItem = searchResults[currentIndex];
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      currentIndex = currentIndex <= 0 ? searchResults.length - 1 : currentIndex - 1;
      selectedItem = searchResults[currentIndex];
    }
  }

  function filterByPrivacy(items) {
    let filtered = [...items];
    if ($privacyFilter !== 'all') {
      filtered = filtered.filter(item => item.private === ($privacyFilter === 'private'));
    }
    if (selectedLabels.length > 0) {
      filtered = filtered.filter(item => 
        Array.isArray(item.labels) && 
        item.labels.some(label => selectedLabels.includes(label))
      );
    }
    return filtered;
  }

  function handleInput(event) {
    searchTerm = event.target.value;
    if (!searchTerm.trim()) {
      searchDisabled = false;
      isDeepSearchResults = false;
    }
    debouncedSearch(searchTerm);
  }

  function handleItemSelect(item) {
    selectedItem = item;
    currentIndex = searchResults.findIndex(result => result.filename === item.filename);
  }

  function handleCloseDetail() {
    selectedItem = null;
  }

  function handleBrowse(item) {
    const imageFilename = item.filename.replace('.json', '.jpg');
    const [sketchbook, pageNum] = imageFilename.split('/');
    goto(`/browse/${sketchbook}/${parseInt(pageNum)}`);
  }

  $: {
    const urlLabels = $page.url.searchParams.get('labels');
    if (metadata.length > 0) {
      if (urlLabels) {
        const newLabels = urlLabels.split(',').filter(label => uniqueLabels.includes(label));
        if (JSON.stringify(newLabels) !== JSON.stringify(selectedLabels)) {
          selectedLabels = newLabels;
          searchResults = filterByPrivacy(metadata.map(item => ({ ...item, score: null })));
          if (searchTerm) {
            updateSearchResults(searchTerm);
          }
        }
      }
    }
  }

  $: if (metadata.length > 0 && !isDeepSearching && !isDeepSearchResults) {
    let filteredResults;
    if (searchTerm) {
      filteredResults = filterByPrivacy(performExactSearch(searchTerm));
    } else {
      filteredResults = filterByPrivacy(metadata.map(item => ({ ...item, score: null })));
    }
    
    searchResults = [...filteredResults];
    resultCount = searchResults.length;
    dispatch('search', searchResults);
  }

  $: resultCount = searchResults.length;

  $: visibleLabels = (() => {
    const availableLabels = collectUniqueLabels(metadata, true);
    const selectedLabelArray = [...selectedLabels];
    const unselectedLabels = availableLabels.filter(label => !selectedLabels.includes(label));
    const orderedLabels = [...selectedLabelArray, ...unselectedLabels];
    return showAllLabels ? orderedLabels : orderedLabels.slice(0, 12);
  })();
</script>

<div class="search-wrapper">
  <div class="search-input-container">
    <input
      type="text"
      bind:value={searchTerm}
      on:input={handleInput}
      placeholder="Search sketchbook pages..."
      data-score={currentScore}
      data-disabled={searchDisabled}
    />
    {#if showDeepSearch}
      <button
        class="deep-search-button"
        on:click={handleDeepSearch}
        disabled={isDeepSearching}
      >
        {isDeepSearching ? 'Searching...' : 'Deep Search'}
      </button>
    {/if}
  </div>
  <div class="label-filters">
    {#each visibleLabels as label}
      <button
        class="label-button"
        class:selected={selectedLabels.includes(label)}
        on:click|stopPropagation={() => toggleLabel(label)}
      >
        {label}
      </button>
    {/each}
    {#if uniqueLabels.length > 12}
      <button
        class="show-all-button"
        on:click={() => showAllLabels = !showAllLabels}
      >
        {showAllLabels ? 'Show Less' : `Show All (${uniqueLabels.length})`}
      </button>
    {/if}
  </div>
  <div class="result-count">
    {resultCount} result{resultCount === 1 ? '' : 's'}
  </div>
</div>

<ResultList 
  results={searchResults}
  searchTerm={searchTerm}
  onSelect={handleItemSelect}
  key={searchTerm + selectedLabels.length + $privacyFilter}
/>

{#if selectedItem}
  <DetailedView 
    item={selectedItem} 
    onClose={handleCloseDetail}
    onBrowse={handleBrowse}
  />
{/if}

<style>
  :global(:root) {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
    height: 100vh;
    overflow: hidden;
  }

  :global(*) {
    font-family: inherit;
  }

  .search-wrapper {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
    background: white;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  input {
    width: 100%;
    padding: 1rem;
    font-size: 1.1rem;
    border: 2px solid #ddd;
    border-radius: 8px;
    transition: border-color 0.2s ease;
  }

  input:focus {
    outline: none;
    border-color: #666;
  }

  .result-count {
    margin-top: 0.5rem;
    color: #666;
    font-size: 0.9rem;
    text-align: right;
  }

  .label-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 1rem 0;
    background: white;
  }

  .label-button {
    padding: 0.5rem 1rem;
    border: 1px solid #ddd;
    border-radius: 20px;
    background: white;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .label-button:hover {
    background: #f0f0f0;
  }

  .label-button.selected {
    background: #666;
    color: white;
    border-color: #666;
  }

  .show-all-button {
    padding: 0.5rem 1rem;
    border: 1px solid #666;
    border-radius: 20px;
    background: transparent;
    cursor: pointer;
    font-size: 0.9rem;
    color: #666;
    transition: all 0.2s ease;
  }

  .show-all-button:hover {
    background: #f0f0f0;
  }

  .search-input-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .deep-search-button {
    position: absolute;
    right: 10px;
    padding: 0.5rem 1rem;
    background: #666;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.2s ease;
  }

  .deep-search-button:hover {
    background: #555;
  }

  .deep-search-button:disabled {
    background: #999;
    cursor: not-allowed;
  }

  input[data-disabled="true"] {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }
</style> 