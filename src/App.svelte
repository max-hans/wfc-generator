<script>
  import "bulma/css/bulma.css";

  import JSZip from "jszip";
  import { nanoid } from "nanoid";
  import { saveAs } from "file-saver";

  import Navbar from "./Navbar.svelte";
  import Controls from "./Controls.svelte";
  import Palette from "./Palette.svelte";
  import Canvas from "./Canvas.svelte";

  import { cleanUpTiles } from "./tileManagement";
  import tiles from "../data/img/index";

  let selectedIndex;

  let config = null;

  const downloadFiles = async (tileData, neighborData) => {
    const zip = new JSZip();

    const dataToDownload = { tiles: tileData, neighbors: neighborData };

    var blob = new Blob([JSON.stringify(dataToDownload)], {
      type: "text/plain;charset=utf-8",
    });

    console.log("data", dataToDownload);
    /* 
    await Promise.all(
      codeUrls.map(async (code, i) => {
        const resp = await fetch(code);
        const blob = await resp.blob();
        downloadFilename = `download-${i}.png`;
        zip.file(downloadFilename, blob);
      })
    );

    const now = new Date();
    const dateString = dateFormat(now, "yymmdd-hh-mm");
    const uuid = nanoid();
    const archiveName = `${dateString}-${uuid}.zip`;

    const projectDetails = {
      ...selectedOption,
      userText,
      timestamp: Date.now(),
      archiveName,
    };

    zip.file("settings.json", JSON.stringify(projectDetails));
    const archive = await zip.generateAsync({
      type: "blob",
    });*/
    saveAs(blob, "tiledata.json");
  };

  const handleSubmit = ({ detail: tileData }) => {
    console.log(tileData);
    const { grid } = tileData;
    const relations = cleanUpTiles(tiles, grid);

    config = relations;
    console.log(relations);
  };
</script>

<div class="maincontainer">
  <Navbar />
  <div class="content">
    <div class="columns" style="height: 100%">
      <div class="column is-narrow" style="height: 100%">
        <Palette data={tiles} bind:selectedIndex />
      </div>
      <div class="column" style="height: 100%">
        <Canvas
          data={tiles}
          {selectedIndex}
          on:submitGrid={handleSubmit}
          on:changedGrid={() => {
            config = null;
          }}
          on:downloadConfig={() => {
            downloadFiles(tiles, config);
          }}
        />
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
