const removeFileExt = (filenameWithExtension) => {
  const frags = filenameWithExtension.split(".");
  if (frags.length > 1) {
    frags.pop();
    return frags.join(".");
  } else {
    return frags;
  }
};

export const cleanUpTiles = (grid, tiles) => {
  console.log(grid);
  console.log(tiles);
  const indexToName = (index) => {
    return tiles[index].name;
  };

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
            left: `${removeFileExt(indexToName(currentTile.tex))} ${
              currentTile.rotation
            }`,
            right: `${removeFileExt(indexToName(right.tex))} ${right.rotation}`,
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
            left: `${removeFileExt(indexToName(currentTile.tex))} ${
              (currentTile.rotation + 1) % 4
            }`,
            right: `${removeFileExt(indexToName(beneath.tex))} ${
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

    return relationsCleaned;
  }

  return relationsFlattened;
};
