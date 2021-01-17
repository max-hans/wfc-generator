<script>
  import { element, null_to_empty } from "svelte/internal";
  import RotateButton from "./components/RotateButton.svelte";
  import PaletteItem from "./PaletteItem.svelte";

  export let data = [];
  export let selectedIndex = -1;

  const updateRotation = (index, rotationValue) => {
    data[index].rotation = rotationValue;
    data = data;
    console.log(data);
  };

  const updateIndex = (index) => {
    selectedIndex = index;
  };
</script>

<div class="paletteContainer p-4">
  <div class="block p-3">
    <h3 class="is-3">Palette</h3>
  </div>
  <div class="block scrollable p-3">
    <PaletteItem
      data={{ name: "delete", data: null }}
      active={selectedIndex === -1}
      on:select={() => {
        updateIndex(-1);
      }}
    />
    {#each data as tile, i}
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
