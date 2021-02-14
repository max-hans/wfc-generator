<script>
  import { stringify } from "querystring";
  import exampleData from "../scripts/exampledata";
  import { tileToImage } from "../scripts/utils";
</script>

<div class="boxContainer">
  <h3 class="is-3">About</h3>
  <div class="section">
    <h4 class="is-4">about this project</h4>
    <p>
      This project is based on the wave function collapse algorithm available <a
        href="https://github.com/mxgmn/WaveFunctionCollapse">here</a
      >. I was intrigued by what is possible with it. There is also a Javascript
      port of it available
      <a href="https://github.com/kchapelier/wavefunctioncollapse"> here </a>.
    </p>
    <p>
      eventhough there are lots of great implementations and showcases i found
      it difficult to start with my own tilemaps. This is why I created this
      tool which is still a WIP and not stable at all. My main goal is being
      able to upload a certain set of tiles and drawing out a map that makes
      sense.
    </p>
    <p>
      in <a href="https://github.com/kchapelier">@kchapelier</a>'s example the
      data is provided as a JS-object, which works, but is not a very intuitive
      way to create model definitions:
    </p>
    <pre style="height: 200px">{JSON.stringify(exampleData, null, 2)}</pre>
  </div>

  <div class="container">
    <div class="notification is-warning">
      <p>
        This project is still under <strong>heavy</strong> development.
      </p>
      <p>
        It is
        <strong>strongly</strong> recommend to backup (download) your data from time
        to time. The structure of how data is handled might change over time. So
        your data (or at least the config for the tiles) might be unusable at some
        point.
      </p>
    </div>
  </div>

  <div class="section">
    <h4 class="is-4">wfc generator</h4>
    <p>
      The goal of the wfc-generator is to provide a simple environment to create
      tile-map-definitions. It also serves as a playground for me to explore the
      possibilities of the svelte-framework (more on the stack below). These are
      the things you can do:
    </p>

    <ol>
      <li>
        Upload your tiles as single images from a folder by clicking <strong
          >edit palette</strong
        >. You then have to provide information about the symmetry of each
        tileToImage.
      </li>
      <li>
        You can then create a map of tiles by drawing onto the canvas. The
        possibilities are still quite limited, by should be enough for small
        maps.
      </li>
      <li>
        You can then download both the data generated for your tiles and the
        final definition for the tilemap.
      </li>
    </ol>
  </div>

  <div class="section">
    <h4 class="is-4">stack</h4>
    <p>
      The whole page was built using <a href="https://svelte.dev/">SvelteJS</a> and
      BulmaCSS for styling. There is no backend of any sort and no user data is saved.
      All data you enter is saved within the browser in localstorage. That's why
      your images should not be too large, otherwise your browser might do weird
      stuff to it or just not save it at all.
    </p>
  </div>
</div>

<style>
  .boxContainer {
    padding: 28px;
  }
</style>
