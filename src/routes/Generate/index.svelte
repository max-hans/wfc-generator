<script>
  import { selectedIndex, tiles, neighbors, mode } from "../../Stores/dataStore";

  import wfc from "wavefunctioncollapse";

  /* import loadImage from "./loadImage" */

  let w = 10,
    h = 10;

  let model;
  let canvas;

  const start = () => {
    const data = { neighbors: $neighbors, tiles: $tiles, tilesize: 7 };
    
    model = new wfc.SimpleTiledModel(data, null, 10, 10, false);
    const result = model.generate(Math.random);
    console.log(result);

    const ctx = canvas.getContext("2d");
    const imgData = ctx.createImageData(48, 48);
    model.graphics(imgData.data, [0, 0, 255, 255]);
    ctx.putImageData(imgData, 0, 0);
  };

  const iterate = () => {
    if (model) {
      mode.iterate(30, Math.random);
    }
  };
</script>

<div>coming soon =)</div>

<button on:click={start}>go</button>

<button on:click={iterate} disabled={!model}>iterate</button>

<canvas bind:this={canvas} width={32} height={32} />

<style>
  canvas {
    width: 500px;
    height: 500px;
    background-color: #666;
  }
</style>
