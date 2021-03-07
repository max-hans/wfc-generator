<script>
  import { selectedIndex, tiles, neighbors } from "../Stores/dataStore";

  import JSZip from "jszip";
  import { saveAs } from "file-saver";

  import Palette from "../components/Palette/Palette.svelte";
  import Canvas from "../components/Canvas/Canvas.svelte";

  import { cleanUpTiles } from "../scripts/tileManagement";

  let relations = null;

  const handleDownload = async (tileData, neighborData) => {
    const zip = new JSZip();

    const tilesSmall = tileData.map((elem) => {
      const newElem = { ...elem };
      delete newElem.uri;
      return newElem;
    });

    const dataToDownload = { tiles: tilesSmall, neighbors: neighborData };

    var blob = new Blob([JSON.stringify(dataToDownload)], {
      type: "text/plain;charset=utf-8",
    });

    console.log("data", dataToDownload);
    saveAs(blob, "tiledata.json");
  };

  const handleSubmit = (e) => {
    const data = e.detail;
    const newRelations = cleanUpTiles(data.grid.data, data.tiles);
    neighbors.set(newRelations);
    console.log($neighbors);
  };
</script>

<div class="columns" style="height: 100%; width: 100%;">
  <div class="column is-narrow" style="height: 100%">
    <Palette bind:selectedIndex={$selectedIndex} />
  </div>
  <div class="column" style="height: 100%">
    <!-- {#if $mode === "create"} -->
    <Canvas
      {selectedIndex}
      on:submitGrid={handleSubmit}
      on:changedGrid={() => {
        config = null;
      }}
      on:downloadConfig={handleDownload($tiles, $relations)}
    />
  </div>
</div>
