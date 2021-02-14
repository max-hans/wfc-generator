<script>
  import { createEventDispatcher } from "svelte";
  import { uriToImage } from "../../scripts/utils";

  const dispatch = createEventDispatcher();

  export let data;

  const symmetryList = ["X", "T", "I", "L", "\\"];

  let dropdownOpen = false;
</script>

<!-- src="data:image/gif;base64,R0lGODdhEAAQAMwAAPj7+FmhUYjNfGuxYY -->

<div class="row container">
  <img src={uriToImage(data.type, data.uri)} alt={data.name} />
  <div class="nameContainer">{data.displayName || data.name}</div>

  <div class="dropdown {dropdownOpen ? 'is-active' : ''}">
    <div class="dropdown-trigger">
      <button
        class="button symmetryButton"
        aria-haspopup="true"
        aria-controls="dropdown-menu"
        on:click={() => (dropdownOpen = !dropdownOpen)}
      >
        <span>{data.symmetry !== -1 ? data.symmetry : "none"}</span>
        <span class="icon is-small">
          <i class="fas fa-angle-down" aria-hidden="true" />
        </span>
      </button>
    </div>
    <div class="dropdown-menu" id="dropdown-menu" role="menu">
      <div class="dropdown-content">
        {#each symmetryList as variant}
          <a
            href="#"
            class="dropdown-item"
            on:click={() => {
              dropdownOpen = false;
              const newData = { ...data };
              newData.symmetry = variant;
              dispatch("change", newData);
            }}
          >
            {variant}
          </a>
        {/each}
      </div>
    </div>
  </div>
</div>

<!-- src="data:image/gif;base64,R0lGODdhEAAQAMwAAPj7+FmhUYjNfGuxYY -->
<style>
  img {
    width: 50px;
    height: 50px;
    image-rendering: pixelated;
    margin-right: 0.5rem;
  }

  .container {
    display: flex;
    flex-direction: row;
    padding: 0.5rem;
  }

  .nameContainer {
    display: flex;
    align-items: center;
    flex-grow: 1;
  }

  .dropdown {
    align-self: flex-end;
  }

  .symmetryButton {
    width: 80px;
  }
</style>
