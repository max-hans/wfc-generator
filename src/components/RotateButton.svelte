<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  let rotation = 0;
</script>

<div class="container">
  <button
    class="button  is-white"
    on:click|preventDefault={() => {
      rotation = (rotation + 1) % 4;
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
