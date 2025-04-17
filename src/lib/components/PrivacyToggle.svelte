<script>
  import { privacyFilter } from '$lib/stores/privacy';
</script>

<div class="privacy-toggle">
  <select bind:value={$privacyFilter}>
    <option value="all">All Pages</option>
    <option value="public">Public Pages</option>
    <option value="private">Private Pages</option>
  </select>
</div>

<style>
  .privacy-toggle {
    display: flex;
    align-items: center;
  }

  select {
    padding: 0.5rem 1rem;
    border: none;
    background: #f0f0f0;
    border-radius: 4px;
    font-size: 0.9rem;
    cursor: pointer;
    color: inherit;
  }

  select:focus {
    outline: none;
  }

  select option {
    background: white;
    color: #333;
  }
</style> 