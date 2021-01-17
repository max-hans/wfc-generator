<script>
  export let initial = 0;
  export let computed = initial;
</script>

<div class="section">
  <button
    class="button"
    on:click={() => {
      computed++;
    }}>+</button
  >
  <button
    class="button"
    on:click={() => {
      computed--;
    }}>-</button
  >
  <slot />
</div>
