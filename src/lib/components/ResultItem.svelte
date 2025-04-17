<script>
  import { highlightMatches } from '../utils/search';
  import { goto } from '$app/navigation';
  
  export let item;
  export let searchTerm = '';

  let matchContext;
  let highlightedText;

  $: {
    const textToUse = item.deepSearchExplanation || item.transcript;
    matchContext = getMatchContext(textToUse, searchTerm);
    highlightedText = matchContext ? highlightMatches(matchContext, searchTerm) : textToUse.slice(0, 150) + '...';
  }

  function getMatchContext(text, term) {
    if (!term) return null;
    
    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();
    const matchIndex = lowerText.indexOf(lowerTerm);
    
    if (matchIndex === -1) return null;
    
    const contextSize = 100;
    const start = Math.max(0, matchIndex - contextSize);
    const end = Math.min(text.length, matchIndex + term.length + contextSize);
    
    let excerpt = text.slice(start, end);
    
    if (start > 0) excerpt = '...' + excerpt;
    if (end < text.length) excerpt = excerpt + '...';
    
    return excerpt;
  }

  function handleLabelClick(label) {
    goto(`/search?labels=${encodeURIComponent(label)}`, { replaceState: true });
  }
</script>

<div class="result-item">
  <div class="image-wrapper">
    <div class="image">
      <img src={`/images/${item.filename.replace('.json', '.jpg')}`} alt="Sketchbook page" />
    </div>
  </div>
  <div class="text">
    <div class="labels">
      {#each item.labels as label}
        <span class="label" on:click|stopPropagation={() => handleLabelClick(label)}>{label}</span>
      {/each}
    </div>
    {@html highlightedText}
  </div>
</div>

<style>
  .result-item {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .image-wrapper {
    width: 100%;
    flex-shrink: 0;
  }

  .image {
    position: relative;
    width: 100%;
    padding-bottom: 133.33%; /* 4:3 aspect ratio (1.333) */
  }

  .image img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 4px;
  }

  .text {
    flex-grow: 1;
    overflow: hidden;
    line-height: 1.5;
  }

  .labels {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .label {
    background-color: #f0f0f0;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    color: #666;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .label:hover {
    background-color: #e0e0e0;
  }

  :global(.text mark) {
    background-color: #fff3cd;
    padding: 0.1em 0.2em;
    border-radius: 2px;
  }
</style> 