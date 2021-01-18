<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let max;
  let rotation = 0;
</script>

<div class="container">
  <button
    class="button is-white"
    disabled={max === 0}
    on:click|preventDefault={() => {
      rotation = (rotation + 1) % max;
      console.log(rotation);
      dispatch("rotate", rotation);
    }}> {rotation * 90}° </button>
</div>

<style>
  .container {
    float: right;
    width: 100%;
    text-align: right;
    user-select: none;
  }
</style>
