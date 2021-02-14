<script>
  export let tex, rotation, name;
</script>

{#if tex}
  <img
    class="gridImg"
    src={tex}
    alt={name}
    draggable={false}
    style="transform: rotate({rotation * 90 || 0}deg)"
  />
{:else}
  <div class="gridImg gridPlaceholder" />
{/if}

<style>
  .gridImg {
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
    transition: box-shadow 0.2s;
    z-index: 0;
  }

  .gridPlaceholder {
    background-color: lightgray;
  }
</style>
