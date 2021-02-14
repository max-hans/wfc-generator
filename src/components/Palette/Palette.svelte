<script>
  import PaletteItem from "./PaletteItem.svelte";

  import { tiles, modalOpen } from "../../Stores/dataStore";

  export let selectedIndex = -1;

  const updateRotation = (index, rotationValue) => {
    const newTiles = [...$tiles];
    newTiles[index].rotation = rotationValue;
    tiles.set(newTiles);
  };

  const updateIndex = (index) => {
    selectedIndex = index;
  };
</script>

<div class="paletteContainer p-4">
  <div class="block p-3">
    <h3 class="is-3">Palette</h3>

    <button
      class="button is-fullwidth"
      on:click={() => {
        console.log("press");
        modalOpen.set(true);
      }}
    >
      <span>edit palette</span>
      <ion-icon name="settings-outline" />
    </button>
  </div>
  <div class="block scrollable p-3">
    <PaletteItem
      data={{ displayName: "delete", data: null }}
      active={selectedIndex === -1}
      on:select={() => {
        updateIndex(-1);
      }}
    />

    {#each $tiles as tile, i}
      <PaletteItem
        data={tile}
        active={selectedIndex === i}
        on:select={() => {
          updateIndex(i);
        }}
        on:rotate={(e) => {
          updateRotation(i, e.detail);
        }}
      />
    {/each}
  </div>
</div>

<style>
  .paletteContainer {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .scrollable {
    height: 100%;
    overflow-y: scroll;
    width: 100%;
    flex-grow: 1;
  }
</style>
