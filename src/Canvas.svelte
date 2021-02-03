<script>
  import { onMount, createEventDispatcher } from "svelte/internal";

  const dispatch = createEventDispatcher();

  export let selectedIndex;
  export let data;

  export let x = 10;
  export let y = 10;

  let grid = [];

  let mouseIsDown = false;

  const createGrid = (width, height) => {
    const newGrid = [];
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        newGrid.push({ tex: -1, x: j, y: i });
      }
    }
    return newGrid;
  };

  onMount(() => {
    grid = createGrid(x, y);
  });

  const updateTiles = (elementIndex, texIndex, rotation) => {
    grid[elementIndex].tex = texIndex;
    grid[elementIndex].rotation = rotation || 0;
    grid = grid;
  };
</script>

<div
  class="gridContainer p-4"
  on:mousedown={() => {
    mouseIsDown = true;
  }}
  on:mouseup={() => {
    mouseIsDown = false;
    console.log(grid);
  }}
  on:mouseleave={() => {
    mouseIsDown = false;
  }}
>
  <div class="block p-3">
    <h3 class="is-3">Canvas</h3>
    <button
      class="button is-outlined"
      on:click={() => dispatch("submitGrid", { grid, resolution: { x, y } })}
      >submit</button
    >
    <button class="button is-outlined is-success" disabled>download</button>
    <button
      class="button is-outlined is-danger"
      on:click={() => {
        grid = createGrid(x, y);
      }}>clear</button
    >
  </div>

  <div class="grid" style="grid-template-columns: repeat({x}, 1fr;">
    {#each grid as gridElem, i}
      <div
        class="gridElement"
        on:mousedown|preventDefault={() => {
          updateTiles(
            i,
            selectedIndex,
            selectedIndex > -1 ? data[selectedIndex].rotation : undefined
          );
        }}
        on:mouseenter={() => {
          if (mouseIsDown) {
            updateTiles(
              i,
              selectedIndex,
              selectedIndex > -1 ? data[selectedIndex].rotation : undefined
            );
          }
        }}
      >
        <div class="gridElementContent">
          {#if gridElem.tex > -1}
            <img
              class="gridImg"
              src={data[gridElem.tex].data}
              alt={gridElem.name}
              draggable={false}
              style="transform: rotate({gridElem.rotation * 90 || 0}deg)"
            />
          {:else}
            <div class="gridImg gridPlaceholder">
              <!-- {gridElem.tex} -->
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .gridContainer {
    width: 100%;
    height: 100%;

    display: flex;
    flex-direction: column;
  }

  .grid {
    display: grid;
    padding-right: 20px;
    width: 100%;
    max-width: 800px;
  }

  .gridElement {
    padding: 0;
    padding-top: 100%;
    position: relative;
  }

  .gridElementContent {
    width: 100%;
    height: 100%;
    padding: 2px;
    position: absolute;
    top: 0;
    left: 0;
  }

  .gridImg {
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
    transition: box-shadow 0.2s;
    z-index: 0;
  }
  .gridElement:hover {
    box-shadow: 0px 0px 5px 5px rgba(0, 0, 0, 0.1);
    transform: scale(1.05);
    z-index: 10000;
  }

  .gridPlaceholder {
    background-color: #fcfcfc;
  }
</style>
