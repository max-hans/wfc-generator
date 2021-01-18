<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  import RotateButton from "./components/RotateButton.svelte";

  export let data;
  export let active;
  let rotationMax = 0;

  const computeRotationMax = (char) => {
    console.log(char);
    if ("LT".includes(char)) {
      return 4;
    } else if (char === "I") {
      return 2;
    }
    return 0;
  };

  if (data) {
    rotationMax = computeRotationMax(data.symmetry);
  }
</script>

<div
  class="box paletteItem {active ? 'outlined' : ''}"
  on:click={() => {
    dispatch("select");
  }}
>
  {#if data.data}
    <img
      class="paletteImg"
      src={data.data}
      alt={data.name}
      style="transform: rotate({data.rotation * 90}deg);"
    />
  {:else}
    <div class="paletteImg" />
  {/if}
  <div
    style="display: flex; flex-direction: column; justify-content: center; flex-grow: 1; text-align: right"
  >
    <h6 class="is-6 m-0">{data.name}</h6>
    <RotateButton on:rotate max={rotationMax} />
  </div>
</div>

<style>
  .paletteItem {
    display: flex;
    flex-direction: row;
    min-width: 200px;
    image-rendering: pixelated;
    background-color: white;
    border-style: solid;
    border-width: 3px;
    border-color: transparent;
    margin-bottom: 5px;
    transition: border-color 0.2s;
  }

  .paletteItem:hover {
    border-color: lightslategrey;
  }

  .paletteImg {
    width: 64px;
    height: 64px;
  }

  .outlined {
    border-color: #ff4a4a !important;
  }
</style>
