<script>
  import { onMount, createEventDispatcher, element } from "svelte/internal";
  import { tiles, grid, selectedIndex } from "../../Stores/dataStore";

  import { tileToImage } from "../../scripts/utils";
  import TileImage from "./TileImage.svelte";

  const dispatch = createEventDispatcher();

  let x = 10;
  let y = 10;

  let mouseIsDown = false;

  let configIsUptoDate = false;

  let drawMode = "pencil";

  let tileSetting;

  const createGrid = (width, height) => {
    const newGrid = [];
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        newGrid.push({ tex: -1, x: j, y: i });
      }
    }
    return { data: newGrid, x: width, y: height };
  };

  onMount(() => {
    console.log($grid);
    if ($grid.data.length === 0) {
      grid.set(createGrid(x, y));
      console.log($grid);
    }
  });

  const updateTiles = (elementIndex, texIndex, rotation) => {
    console.log(elementIndex, texIndex, rotation);
    const newGrid = { ...$grid };
    console.log(newGrid);
    newGrid.data[elementIndex].tex = texIndex;
    newGrid.data[elementIndex].rotation = rotation || 0;
    grid.set(newGrid);
    configIsUptoDate = false;
  };
</script>

<div
  class="gridContainer p-4"
  on:mousedown={() => {
    mouseIsDown = true;
  }}
  on:mouseup={() => {
    mouseIsDown = false;
  }}
  on:mouseleave={() => {
    mouseIsDown = false;
  }}
>
  <div class="block p-3">
    <h3 class="is-3">Canvas</h3>
    <div class="buttonBar">
      <div class="buttonContainer">
        <button
          class="button is-outlined"
          on:click={() => {
            configIsUptoDate = true;
            dispatch("submitGrid", { grid: $grid, tiles: $tiles });
          }}>compute</button
        >
        <button
          class="button is-outlined is-success"
          disabled={!configIsUptoDate}
          on:click={() => {
            configIsUptoDate = true;
            dispatch("downloadConfig", { tiles: $tiles });
          }}>download</button
        >
        <button
          class="button is-outlined is-danger"
          on:click={() => {
            grid.set(createGrid(x, y));
          }}>clear</button
        >
      </div>
    </div>
  </div>
  <div class="canvasContainer">
    <div class="buttonContainer">
      <button
        class="button {drawMode === 'pencil' ? 'is-active' : ''}"
        on:click={() => {
          drawMode = "pencil";
        }}
      >
        <ion-icon name="pencil-outline" />
      </button>

      <button
        class="button {drawMode === 'fill' ? 'is-active' : ''}"
        on:click={() => {
          drawMode = "fill";
        }}
      >
        <ion-icon name="color-fill-outline" />
      </button>

      <button
        class="button {drawMode === 'wand' ? 'is-active' : ''}"
        on:click={() => {
          drawMode = "wand";
        }}
      >
        <ion-icon name="color-wand-outline" />
      </button>
    </div>
    <div class="grid" style="grid-template-columns: repeat({x}, 1fr;">
      {#each $grid.data as gridElem, i}
        <div
          class="gridElement"
          on:mousedown|preventDefault={() => {
            if (drawMode === "pencil") {
              tileSetting = {
                tile: $selectedIndex,
                rotation:
                  $selectedIndex > -1
                    ? $tiles[$selectedIndex].rotation
                    : undefined,
              };
              updateTiles(i, tileSetting.tile, tileSetting.rotation);
            }
          }}
          on:mouseenter={() => {
            if (drawMode === "pencil") {
              if (mouseIsDown) {
                updateTiles(i, tileSetting.tile, tileSetting.rotation);
              }
            }
          }}
          on:click={() => {
            if (drawMode === "wand") {
              const currentTileProps = $grid.data[i];
              console.log(currentTileProps);
              const similarTiles = $grid.data
                .map((elem, i) => {
                  return { ...elem, index: i };
                })
                .filter((elem) => elem.tex === currentTileProps.tex);
              console.log("similar", similarTiles);
              similarTiles.forEach((elem) =>
                updateTiles(
                  elem.index,
                  $selectedIndex,
                  currentTileProps.rotation || -1
                )
              );
            }
          }}
        >
          <div class="gridElementContent">
            <TileImage
              name={gridElem.name}
              tex={gridElem.tex > -1
                ? tileToImage($tiles[gridElem.tex])
                : undefined}
              rotation={gridElem.rotation}
            />
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .gridContainer {
    /* width: 100%; */
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

  .gridElement:hover {
    box-shadow: 0px 0px 5px 5px rgba(0, 0, 0, 0.1);
    transform: scale(1.05);
    z-index: 10000;
  }

  .buttonBar {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .canvasContainer {
  }
</style>
