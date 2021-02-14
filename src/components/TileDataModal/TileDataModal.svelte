<script>
  import { saveAs } from "file-saver";
  import { imgToDataURI } from "../../scripts/utils";
  import { validateConfig } from "./validation";
  import { modalOpen, tiles } from "../../Stores/dataStore";
  import TiledataRow from "./TiledataRow.svelte";
  let files = [];
  let configFileUpload;

  const updateTile = (index, newTile) => {
    const newTiles = [...$tiles];
    newTiles[index] = newTile;
    tiles.set(newTiles);
    console.log($tiles);
  };

  const clearConfig = () => {
    if (confirm("do you really want to delete the config?")) {
      tiles.set([]);
    }
  };
  const downloadConfig = () => {
    const blob = new Blob([JSON.stringify($tiles)], {
      type: "text/plain;charset=utf-8",
    });

    console.log("data", blob);
    saveAs(blob, "config.json");
  };

  $: if (files.length > 0) {
    console.log(files);

    Promise.all(
      Array.from(files)
        .filter(
          (elem) => elem.type === "image/jpeg" || elem.type === "image/png"
        )
        .map(async (elem) => {
          const { name, type, size } = elem;
          const uri = await imgToDataURI(elem);

          return {
            name,
            type,
            size,
            symmetry: "0",
            displayName: name.split(".")[0],
            uri,
          };
        })
    ).then((tilesUploaded) => {
      console.log(tilesUploaded);
      tiles.set(tilesUploaded);
    });
  }

  $: if (configFileUpload) {
    const fr = new FileReader();

    fr.onload = function (e) {
      const result = e.target.result;
      console.log(result);
      const data = JSON.parse(result);
      console.log(data);
      const errors = validateConfig(data);
      console.log(errors);
      if (errors.length === 0) {
        tiles.set(data);
      }
    };
    fr.readAsText(configFileUpload.item(0));
  }
</script>

<div class="modal {$modalOpen ? 'is-active' : ''}">
  <div class="modal-background" />
  <div class="modal-card">
    <section class="modal-card-body">
      <div class="title-container">
        <h3 class="title is-3">edit palette</h3>
      </div>
      <div class="section">
        <h4 class="title is-4">tiledata</h4>
        <div class="row buttonContainer">
          <div class="file withMargin">
            <label class="file-label">
              <input
                class="file-input "
                type="file"
                name="resume"
                webkitdirectory
                mozdirectory
                bind:files
              />
              <span class="file-cta">
                <span class="file-icon">
                  <ion-icon name="arrow-up-outline" />
                </span>
                <span class="file-label"> upload images </span>
              </span>
            </label>
          </div>

          <div class="file withMargin">
            <label class="file-label">
              <input
                class="file-input "
                type="file"
                name="resume"
                bind:files={configFileUpload}
              />
              <span class="file-cta">
                <span class="file-icon">
                  <ion-icon name="arrow-up-outline" />
                </span>
                <span class="file-label"> upload config </span>
              </span>
            </label>
          </div>

          <button
            class="button is-outlined is-success withMargin"
            on:click={downloadConfig}>download config</button
          >

          <button
            class="button is-outlined is-danger withMargin"
            on:click={clearConfig}>clear config</button
          >
        </div>
      </div>
      <section class="section">
        <h4 class="title is-4">tiles</h4>
        {#each $tiles as tile, index}
          <TiledataRow
            data={tile}
            on:change={(e) => updateTile(index, e.detail)}
          />
        {/each}
      </section>

      <section class="section">
        <h4 class="title is-4">raw data</h4>
        <pre class="codeContainer">{JSON.stringify($tiles, null, 2)}</pre>
      </section>
    </section>
  </div>
  <button
    class="modal-close is-large"
    aria-label="close"
    on:click={() => {
      modalOpen.set(false);
    }}
  />
</div>

<!-- bind:files={fileList} -->
<style>
  .modal-card {
    min-width: 500px;
    width: 80%;
  }

  .title-container {
    display: flex;
    flex-direction: row;
  }

  .codeContainer {
    height: 400px;
  }

  .buttonContainer {
    display: flex;
    flex-direction: row;
  }

  .withMargin {
    margin: 5px;
  }
</style>
