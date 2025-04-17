<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import { goto } from '$app/navigation';
  import Fuse from 'fuse.js';
  import { debounce } from 'lodash-es';
  import DetailedView from './DetailedView.svelte';

  let multimodalPoints = [];
  let textPoints = [];
  let currentPoints = [];
  let metadata = [];
  let currentView = 'multimodal';
  let containerElement;
  let svgElement;
  let scale = 1;
  let offset = { x: 0, y: 0 };
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let svg;
  let zoomBehavior;
  let searchTerm = '';
  let fuse;
  let filteredPoints = [];
  let selectedItem = null;
  let debugInfo = {
    totalPoints: 0,
    filteredPoints: 0,
    searchResults: 0,
    lastSearchTerm: '',
    searchScores: [],
    metadataMatches: 0
  };

  function updateSearchResults(term) {
    console.log('updateSearchResults called with term:', term);
    if (!term || !term.trim()) {
      console.log('Empty search term, resetting to all points');
      filteredPoints = currentPoints;
      debugInfo = {
        totalPoints: currentPoints.length,
        filteredPoints: currentPoints.length,
        searchResults: 0,
        lastSearchTerm: '',
        searchScores: [],
        metadataMatches: 0
      };
      updatePoints();
      return;
    }

    if (fuse) {
      console.log('Performing search...');
      
      // First try exact matches
      const exactMatches = metadata.filter(item => 
        item.transcript.toLowerCase().includes(term.toLowerCase()) ||
        item.labels.some(label => label.toLowerCase().includes(term.toLowerCase()))
      ).map(item => ({
        ...item,
        score: 0
      }));

      if (exactMatches.length > 0) {
        console.log('Found exact matches:', exactMatches.length);
        const results = exactMatches;
        
        // Update debug info with error handling
        debugInfo = {
          totalPoints: currentPoints.length,
          searchResults: results.length,
          lastSearchTerm: term,
          searchScores: results.slice(0, 5).map(r => ({
            filename: r.filename || 'unknown',
            score: r.score || 0,
            raw: r
          })),
          metadataMatches: 0
        };
        
        // Filter currentPoints based on the search results with better error handling
        filteredPoints = currentPoints.filter(point => {
          if (!point.metadata) {
            console.log('Point without metadata:', point);
            return false;
          }
          
          try {
            const isMatch = results.some(result => {
              if (!result || !result.filename) {
                console.log('Invalid search result:', result);
                return false;
              }
              return result.filename === point.metadata.filename;
            });
            
            if (isMatch) debugInfo.metadataMatches++;
            return isMatch;
          } catch (e) {
            console.error('Error matching point:', point, e);
            return false;
          }
        });
        
        debugInfo.filteredPoints = filteredPoints.length;
        updatePoints();
        return;
      }

      // If no exact matches, fall back to fuzzy search
      console.log('No exact matches, trying fuzzy search...');
      const results = fuse.search(term)
        .filter(result => result.score < 0.7)
        .map(result => result.item);
      
      console.log('Raw Fuse results:', results.slice(0, 3));
      
      // Update debug info with error handling
      debugInfo = {
        totalPoints: currentPoints.length,
        searchResults: results.length,
        lastSearchTerm: term,
        searchScores: results.slice(0, 5).map(r => {
          try {
            return {
              filename: r.filename || 'unknown',
              score: r.score || 0,
              raw: r
            };
          } catch (e) {
            console.error('Error processing search result:', r);
            return {
              filename: 'error',
              score: 0,
              raw: r
            };
          }
        }),
        metadataMatches: 0
      };
      
      // Filter currentPoints based on the search results with better error handling
      filteredPoints = currentPoints.filter(point => {
        if (!point.metadata) {
          console.log('Point without metadata:', point);
          return false;
        }
        
        try {
          const isMatch = results.some(result => {
            if (!result || !result.filename) {
              console.log('Invalid search result:', result);
              return false;
            }
            return result.filename === point.metadata.filename;
          });
          
          if (isMatch) debugInfo.metadataMatches++;
          return isMatch;
        } catch (e) {
          console.error('Error matching point:', point, e);
          return false;
        }
      });
      
      debugInfo.filteredPoints = filteredPoints.length;
      updatePoints();
    } else {
      console.log('Fuse not initialized');
    }
  }

  const debouncedSearch = debounce((term) => {
    console.log('debouncedSearch called with term:', term);
    updateSearchResults(term);
  }, 100);

  function handleInput(event) {
    console.log('handleInput called with value:', event.target.value);
    searchTerm = event.target.value;
    debouncedSearch(searchTerm);
  }

  onMount(async () => {
    try {
      const [multimodalResponse, textResponse, metadataResponse] = await Promise.all([
        fetch('/data/umap_multimodal-image.json'),
        fetch('/data/umap_text.json'),
        fetch('/data/metadata-labeled.json')
      ]);

      if (!multimodalResponse.ok || !textResponse.ok || !metadataResponse.ok) {
        throw new Error('Failed to load data');
      }

      const multimodalData = await multimodalResponse.json();
      const textData = await textResponse.json();
      metadata = await metadataResponse.json();

      console.log('Loaded data:', {
        multimodalPoints: multimodalData.points.length,
        multimodalFilePaths: multimodalData.file_paths?.length,
        textPoints: textData.points.length,
        textFilePaths: textData.file_paths?.length,
        metadata: metadata.length,
        sampleMetadata: metadata.slice(0, 2)
      });

      // Create sets of valid indices for each view
      const multimodalIndices = new Set(multimodalData.points.map((_, i) => i));
      const textIndices = new Set(textData.points.map((_, i) => i));
      
      // Find the intersection of valid indices
      const validIndices = new Set([...multimodalIndices].filter(i => textIndices.has(i)));

      // Create a mapping of original indices to filtered indices
      const indexMapping = new Map();
      let newIndex = 0;
      validIndices.forEach(originalIndex => {
        indexMapping.set(originalIndex, newIndex++);
      });

      // Filter metadata to only include items with valid indices
      metadata = metadata.filter((_, i) => validIndices.has(i));

      // Normalize points to fit within a 1000x1000 viewport
      const normalizePoints = (points) => {
        const xExtent = d3.extent(points, p => p[0]);
        const yExtent = d3.extent(points, p => p[1]);
        const xRange = xExtent[1] - xExtent[0];
        const yRange = yExtent[1] - yExtent[0];
        const scale = 800 / Math.max(xRange, yRange);
        const xCenter = (xExtent[0] + xExtent[1]) / 2;
        const yCenter = (yExtent[0] + yExtent[1]) / 2;
        return points.map(point => [
          (point[0] - xCenter) * scale + 500,
          (point[1] - yCenter) * scale + 500
        ]);
      };

      // Process points with file paths
      multimodalPoints = normalizePoints(multimodalData.points.filter((_, i) => validIndices.has(i)))
        .map((point, i) => {
          const originalIndex = Array.from(validIndices)[i];
          const filePath = multimodalData.file_paths?.[originalIndex];
          console.log('Processing multimodal point:', { filePath, originalIndex });
          const metadataItem = metadata.find(item => item.filename === filePath.replace('.jpg', '.json'));
          return {
            x: point[0],
            y: point[1],
            originalIndex,
            metadata: metadataItem
          };
        });

      textPoints = normalizePoints(textData.points.filter((_, i) => validIndices.has(i)))
        .map((point, i) => {
          const originalIndex = Array.from(validIndices)[i];
          const filePath = textData.file_paths?.[originalIndex];
          console.log('Processing text point:', { filePath, originalIndex });
          const metadataItem = metadata.find(item => item.filename === filePath);
          return {
            x: point[0],
            y: point[1],
            originalIndex,
            metadata: metadataItem
          };
        });

      currentPoints = multimodalPoints;
      filteredPoints = multimodalPoints;

      // Initialize Fuse for search with better error handling
      try {
        fuse = new Fuse(metadata, {
          keys: ['transcript', 'labels'],
          threshold: 0.9,
          includeScore: true,
          minMatchCharLength: 2,
          useExtendedSearch: true
        });
        console.log('Fuse initialized with metadata:', {
          totalItems: metadata.length,
          sampleItem: metadata[0]
        });
      } catch (e) {
        console.error('Error initializing Fuse:', e);
      }

      svg = d3.select(svgElement)
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', [0, 0, 1000, 1000]);

      const g = svg.append('g')
        .attr('class', 'points-group');

      zoomBehavior = d3.zoom()
        .scaleExtent([0.1, 5])
        .on('zoom', (event) => {
          scale = event.transform.k;
          offset = { x: event.transform.x, y: event.transform.y };
          svg.selectAll('.point')
            .attr('cx', d => offset.x + d.x * scale)
            .attr('cy', d => offset.y + d.y * scale);
        });

      svg.call(zoomBehavior);

      const drag = d3.drag()
        .on('start', (event) => {
          isDragging = true;
          dragStart = { x: event.x - offset.x, y: event.y - offset.y };
        })
        .on('drag', (event) => {
          if (!isDragging) return;
          offset = { x: event.x - dragStart.x, y: event.y - dragStart.y };
          svg.selectAll('.point')
            .attr('cx', d => offset.x + d.x * scale)
            .attr('cy', d => offset.y + d.y * scale);
        })
        .on('end', () => {
          isDragging = false;
        });

      svg.call(drag);
      updatePoints();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  });

  function resetZoom() {
    if (svg && zoomBehavior) {
      svg.transition()
        .duration(750)
        .call(zoomBehavior.transform, d3.zoomIdentity);
      scale = 1;
      offset = { x: 0, y: 0 };
    }
  }

  function toggleView() {
    currentView = currentView === 'multimodal' ? 'text' : 'multimodal';
    currentPoints = currentView === 'multimodal' ? multimodalPoints : textPoints;
    updateSearchResults(searchTerm);
    updatePoints();
  }

  function updatePoints() {
    if (!svg) return;

    const g = svg.select('.points-group');
    
    // Sort points by filename to ensure consistent ordering
    const sortedPoints = [...currentPoints].sort((a, b) => {
      const filenameA = a.metadata?.filename || '';
      const filenameB = b.metadata?.filename || '';
      return filenameA.localeCompare(filenameB);
    });

    const points = g.selectAll('.point')
      .data(sortedPoints, d => d.originalIndex);

    const enterSelection = points.enter()
      .append('circle')
      .attr('class', 'point')
      .attr('r', 4)
      .style('fill', d => {
        // If there's no search term, show all points normally
        if (!searchTerm) return d.metadata?.private ? 'rgba(139, 58, 58, 0.7)' : 'rgba(102, 102, 102, 0.7)';
        // If there is a search term, check if this point is in the filtered results
        const isMatch = filteredPoints.some(p => p.originalIndex === d.originalIndex);
        return isMatch 
          ? (d.metadata?.private ? 'rgba(160, 82, 82, 0.9)' : 'rgba(51, 51, 51, 0.9)')
          : (d.metadata?.private ? 'rgba(139, 58, 58, 0.1)' : 'rgba(102, 102, 102, 0.1)');
      })
      .style('cursor', 'pointer')
      .attr('cx', d => offset.x + d.x * scale)
      .attr('cy', d => offset.y + d.y * scale)
      .on('mouseover', (event, d) => {
        if (!isDragging && d.metadata?.filename) {
          d3.select(event.currentTarget)
            .transition()
            .duration(50)
            .attr('r', 8)
            .style('fill', d => {
              const isMatch = filteredPoints.some(p => p.originalIndex === d.originalIndex);
              return isMatch 
                ? (d.metadata?.private ? 'rgba(160, 82, 82, 1)' : 'rgba(51, 51, 51, 1)')
                : (d.metadata?.private ? 'rgba(139, 58, 58, 0.2)' : 'rgba(102, 102, 102, 0.2)');
            });
          
          const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background', 'white')
            .style('border', '1px solid #ddd')
            .style('border-radius', '4px')
            .style('padding', '8px')
            .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)')
            .style('z-index', '1000');

          const imageFilename = d.metadata.filename.replace('.json', '.jpg');
          tooltip.html(`
            <div style="margin-bottom: 8px;">
              <strong>${d.metadata.filename.replace('.json', '')}</strong>
              ${d.metadata.labels.length > 0 ? `
                <div style="margin-top: 4px;">
                  ${d.metadata.labels.map(label => `<span style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px; margin-right: 4px; font-size: 0.8em;">${label}</span>`).join('')}
                </div>
              ` : ''}
            </div>
            <img src="/images/${imageFilename}" alt="Preview" style="max-width: 200px; max-height: 200px; display: block;" onerror="this.style.display='none'" />
          `);

          const rect = event.currentTarget.getBoundingClientRect();
          const tooltipWidth = 220; // Approximate width of tooltip
          const tooltipHeight = 280; // Approximate height of tooltip
          const padding = 10;

          let left = rect.right + padding;
          let top = rect.top;

          // Check if tooltip would go off screen
          if (left + tooltipWidth > window.innerWidth) {
            left = rect.left - tooltipWidth - padding;
          }
          if (top + tooltipHeight > window.innerHeight) {
            top = window.innerHeight - tooltipHeight - padding;
          }

          tooltip
            .style('left', `${left}px`)
            .style('top', `${top}px`);
        }
      })
      .on('mouseout', (event, d) => {
        if (!isDragging) {
          d3.select(event.currentTarget)
            .transition()
            .duration(50)
            .attr('r', 4)
            .style('fill', d => {
              // If there's no search term, show all points normally
              if (!searchTerm) return d.metadata?.private ? 'rgba(139, 58, 58, 0.7)' : 'rgba(102, 102, 102, 0.7)';
              // If there is a search term, check if this point is in the filtered results
              const isMatch = filteredPoints.some(p => p.originalIndex === d.originalIndex);
              return isMatch 
                ? (d.metadata?.private ? 'rgba(160, 82, 82, 0.9)' : 'rgba(51, 51, 51, 0.9)')
                : (d.metadata?.private ? 'rgba(139, 58, 58, 0.1)' : 'rgba(102, 102, 102, 0.1)');
            });
          d3.selectAll('.tooltip').remove();
        }
      })
      .on('click', (event, d) => {
        if (!isDragging && d.metadata) {
          selectedItem = d.metadata;
        }
      });

    points
      .transition()
      .duration(500)
      .attr('cx', d => offset.x + d.x * scale)
      .attr('cy', d => offset.y + d.y * scale)
      .style('fill', d => {
        // If there's no search term, show all points normally
        if (!searchTerm) return d.metadata?.private ? 'rgba(139, 58, 58, 0.7)' : 'rgba(102, 102, 102, 0.7)';
        // If there is a search term, check if this point is in the filtered results
        const isMatch = filteredPoints.some(p => p.originalIndex === d.originalIndex);
        return isMatch 
          ? (d.metadata?.private ? 'rgba(160, 82, 82, 0.9)' : 'rgba(51, 51, 51, 0.9)')
          : (d.metadata?.private ? 'rgba(139, 58, 58, 0.1)' : 'rgba(102, 102, 102, 0.1)');
      });

    points.exit().remove();
  }

  $: if (currentPoints.length > 0) {
    updatePoints();
  }
</script>

<div class="cloud-container" bind:this={containerElement}>
  <div class="controls">
    <div class="search-container">
      <input
        type="text"
        bind:value={searchTerm}
        on:input={handleInput}
        placeholder="Search sketchbook pages..."
        class="search-input"
      />
    </div>
    <div class="view-toggle">
      <button on:click={toggleView} class={currentView === 'multimodal' ? 'active' : ''}>
        Multimodal
      </button>
      <button on:click={toggleView} class={currentView === 'text' ? 'active' : ''}>
        Text
      </button>
    </div>
    <button on:click={resetZoom}>
      Reset Zoom
    </button>
  </div>

  <div class="visualization">
    <svg bind:this={svgElement}></svg>
  </div>
</div>

{#if selectedItem}
  <DetailedView 
    item={selectedItem} 
    onClose={() => selectedItem = null}
    onBrowse={(item) => {
      const imageFilename = item.filename.replace('.json', '.jpg');
      const [sketchbook, pageNum] = imageFilename.split('/');
      goto(`/browse/${sketchbook}/${parseInt(pageNum)}`);
    }}
  />
{/if}

<style>
  .cloud-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    gap: 1rem;
    padding: 1rem;
    box-sizing: border-box;
  }

  .controls {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .search-container {
    flex: 1;
    min-width: 200px;
    max-width: 500px;
    margin-right: 1rem;
  }

  .search-container input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  .view-toggle {
    display: flex;
    gap: 0.5rem;
  }

  .view-toggle button, button {
    padding: 0.5rem 1rem;
    border: none;
    background: #f0f0f0;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .view-toggle button:hover, button:hover {
    background: #e0e0e0;
  }

  .view-toggle button.active {
    background: #666;
    color: white;
  }

  .visualization {
    flex: 1;
    min-height: 0;
    position: relative;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
    aspect-ratio: 1;
    max-height: calc(100vh - 150px);
  }

  .visualization svg {
    width: 100%;
    height: 100%;
  }

  .point {
    fill: #666;
    stroke: white;
    stroke-width: 1;
    transition: fill 0.2s ease;
  }

  .point:hover {
    fill: #999;
    cursor: pointer;
  }

  .point.selected {
    fill: #333;
    stroke: #000;
    stroke-width: 2;
  }

  .point.highlighted {
    fill: #f00;
  }

  .debug-info {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 0.5rem;
    font-size: 0.8rem;
    font-family: monospace;
  }

  .detailed-view {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 1rem;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    max-width: 90%;
    max-height: 90%;
    overflow: auto;
  }

  :global(.tooltip) {
    pointer-events: none;
  }

  :global(.tooltip img) {
    display: block;
    max-width: 200px;
    max-height: 200px;
    object-fit: contain;
  }
</style> 