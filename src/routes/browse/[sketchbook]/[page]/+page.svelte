<script>
  import { page } from '$app/stores';
  import BrowserView from '$lib/components/BrowserView.svelte';
</script>

<BrowserView 
  sketchbookParam={$page.params.sketchbook} 
  pageParam={$page.params.page}
/> 