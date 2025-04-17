<script>
  import { privacyFilter } from '$lib/stores/privacy';

  function handlePrivacyChange(event) {
    $privacyFilter = event.target.value;
  }
</script>

<div class="privacy-filter">
  <select bind:value={$privacyFilter} on:change={handlePrivacyChange}>
    <option value="all">All Files</option>
    <option value="public">Public Files</option>
    <option value="private">Private Files</option>
  </select>
</div>

<style>
  .privacy-filter {
    margin-right: 1rem;
  }

  select {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
    background-color: white;
  }

  select:focus {
    outline: none;
    border-color: #666;
  }
</style> 