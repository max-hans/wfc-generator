<script>
  import "bulma/css/bulma.css";
  export let name;

  let selectedIndex;

  import Navbar from "./Navbar.svelte";
  import Controls from "./Controls.svelte";
  import Palette from "./Palette.svelte";
  import Canvas from "./Canvas.svelte";

  import tiles from "../data/img/index";

  console.log(tiles);
</script>

<div class="maincontainer">
  <Navbar />
  <div class="content">
    <div class="columns" style="height: 100%">
      <div class="column is-narrow" style="height: 100%">
        <Palette data={tiles} bind:selectedIndex />
      </div>
      <div class="column" style="height: 100%">
        <Canvas data={tiles} {selectedIndex} />
      </div>
    </div>
  </div>
</div>

<style>
  .maincontainer {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
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
