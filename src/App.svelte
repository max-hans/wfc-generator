<script>
  import "bulma/css/bulma.css";
  export let name;

  let selectedIndex;

  import Navbar from "./Navbar.svelte";
  import Controls from "./Controls.svelte";
  import Palette from "./Palette.svelte";
  import Canvas from "./Canvas.svelte";

  import tiles from "../data/img/index";

  const indexToName = (index) => {
    return tiles[index].name;
  };

  console.log(tiles);

  const handleSubmit = ({ detail: tileData }) => {
    console.log(tileData);
    const { grid } = tileData;

    // filter out empty tiles
    const tilesToProcess = grid.filter((tile) => tile.tex > -1);

    // group all tiles of same type
    const sortedByType = tiles
      .map((tileType, i) => {
        return {
          ...tileType,
          occurences: tilesToProcess.filter((gridTile) => gridTile.tex === i),
        };
      })
      .filter((tileType) => !!tileType.occurences.length);

    // get all neighbors for every tyle type
    const relations = sortedByType
      .map((tileType) => {
        const relationsForTileType = tileType.occurences.map((currentTile) => {
          const neighbors = [];

          // get tile next to current tile
          const right = tilesToProcess.find(
            (otherTile) =>
              otherTile.x === currentTile.x + 1 && otherTile.y === currentTile.y
          );
          if (right) {
            neighbors.push({
              left: `${indexToName(currentTile.tex)} ${currentTile.rotation}`,
              right: `${indexToName(right.tex)} ${right.rotation}`,
            });
          }
          // get tile beneath current tile
          const beneath = tilesToProcess.find(
            (otherTile) =>
              otherTile.y === currentTile.y + 1 && otherTile.x === currentTile.x
          );

          // to stay consistent just rotate by 90° and also list as pair of "left / right"
          if (beneath) {
            neighbors.push({
              left: `${indexToName(currentTile.tex)} ${
                (currentTile.rotation + 1) % 4
              }`,
              right: `${indexToName(beneath.tex)} ${
                (beneath.rotation + 1) % 4
              }`,
            });
          }

          return neighbors.filter((neighbor) => !!neighbor);
        });
        return relationsForTileType;
      })
      .filter((type) => type.length > 0);

    // flatten all types, so only relations stay. also remove empty remains
    console.log("relations", relations);
    const relationsFlattened = relations
      .flat()
      .filter((elem) => elem.length > 0)
      .flat();
    console.log("relationsFlattened", relationsFlattened);

    // get rid of duplicates (lazy implementation)
    if (relationsFlattened.length > 0) {
      const relationsCleaned = relationsFlattened
        .map((elem) => JSON.stringify(elem))
        .reduce(function (a, b) {
          if (a.indexOf(b) < 0) a.push(b);
          return a;
        }, [])
        .map((elem) => JSON.parse(elem));

      console.log(relationsCleaned);
    }
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
        <Canvas data={tiles} {selectedIndex} on:submitGrid={handleSubmit} />
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
