<script>
  import "bulma/css/bulma.css";
  import Create from "./routes/Create.svelte";
  import Generate from "./routes/Generate/index.svelte";
  import About from "./routes/About.svelte";
  
  import Navbar from "./components/Navbar.svelte";
  import TileDataModal from "./components/TileDataModal/TileDataModal.svelte";

  import { mode } from "./Stores/dataStore";

  const setMode = (newMode) => {
    console.log("switching to -> ", newMode);
    mode.set(newMode);
  };
</script>

<div class="maincontainer">
  <Navbar />

  <div class="content">
    {#if $mode === "create"}
      <Create />
    {:else if $mode === "generate"}
      <Generate />
    {:else if $mode === "about"}
      <About />
    {/if}
  </div>
</div>
<TileDataModal />

<style>
  .maincontainer {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: auto;
  }
  .content {
    flex-grow: 1;
    min-height: 200px;
  }

  .canvasContainer {
    display: flex;
    flex-direction: column;
  }
</style>
