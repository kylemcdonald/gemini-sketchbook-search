<script>
  import { onMount } from 'svelte';

  export let pages = [];
  
  let container;
  let nodes = [];
  let isRotating = false;
  let renderInterval;
  let mouseX = 0;
  let mouseY = 0;
  let containerRect;

  function initNodes() {
    const radius = 225;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const angleIncrement = (2 * Math.PI) / goldenRatio;
    const nodeNumber = 200;

    nodes = Array.from({ length: nodeNumber }, (_, i) => {
      const indexRatio = i + 0.5;
      const phi = Math.acos(1 - (2 * indexRatio) / nodeNumber);
      const theta = angleIncrement * i;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      return {
        id: `node-${i}`,
        x,
        y,
        z,
        scale: 1,
        zIndex: z,
        imageIndex: i,
        isHovered: false
      };
    });

    isRotating = true;
  }

  function rotateNode(node, angleX, angleY) {
    // First rotate around Y axis
    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);
    const x1 = node.x * cosY + node.z * sinY;
    const y1 = node.y;
    const z1 = node.z * cosY - node.x * sinY;

    // Then rotate around X axis
    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);
    const x2 = x1;
    const y2 = y1 * cosX - z1 * sinX;
    const z2 = z1 * cosX + y1 * sinX;
    
    node.x = x2;
    node.y = y2;
    node.z = z2;
    node.zIndex = z2;
  }

  function handleMouseMove(event) {
    // Calculate mouse position relative to viewport center
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    mouseX = (event.clientX - centerX) / (window.innerWidth / 2);
    mouseY = (event.clientY - centerY) / (window.innerHeight / 2);
  }

  function handleNodeHover(nodeId, isEntering) {
    nodes = nodes.map(node => {
      if (node.id === nodeId) {
        node.isHovered = isEntering;
      }
      return node;
    });
  }

  function startRenderLoop() {
    renderInterval = setInterval(() => {
      if (isRotating) {
        // Calculate rotation angles based on mouse position
        // No base rotation, only mouse-driven movement
        const mouseInfluence = 0.01;
        // Negative mouseX to make sphere move in same direction as mouse
        const angleY = -mouseX * mouseInfluence;
        const angleX = mouseY * mouseInfluence;

        nodes = nodes.map(node => {
          rotateNode(node, angleX, angleY);
          return node;
        });
      }
    }, 1000 / 60);
  }

  onMount(() => {
    initNodes();
    containerRect = container.getBoundingClientRect();
    window.addEventListener('mousemove', handleMouseMove);
    startRenderLoop();

    return () => {
      if (renderInterval) {
        clearInterval(renderInterval);
      }
      window.removeEventListener('mousemove', handleMouseMove);
    };
  });
</script>

<div bind:this={container} class="sphere-container">
  <div class="sphere-wrapper">
    {#each nodes as node (node.id)}
      <div
        class="node"
        style="transform: translate3d({node.x}px, {node.y}px, {node.z}px) scale({node.isHovered ? 1.5 : node.scale});
               z-index: {Math.round(node.zIndex)}"
        on:mouseenter={() => handleNodeHover(node.id, true)}
        on:mouseleave={() => handleNodeHover(node.id, false)}
      >
        <div class="content">
          <img src={`/sphere_images/${node.imageIndex}.jpg`} alt="Sketchbook page" />
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .sphere-container {
    width: 100%;
    height: 100%;
    position: relative;
    perspective: 600px;
    overflow: hidden;
  }

  .sphere-wrapper {
    width: 0;
    height: 0;
    position: absolute;
    left: 50%;
    top: 50%;
    transform-style: preserve-3d;
  }

  .node {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: center;
    pointer-events: auto;
    transition: transform 0.2s ease;
  }

  .content {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 36px;
    height: 36px;
    border-radius: 4px;
    overflow: hidden;
  }

  .content img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style> 