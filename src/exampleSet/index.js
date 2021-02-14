import bridge from "./bridge.png";
import ground from "./ground.png";
import river from "./river.png";
import riverturn from "./riverturn.png";
import road from "./road.png";
import roadturn from "./roadturn.png";
import t from "./t.png";
import tower from "./tower.png";
import wall from "./wall.png";
import wallriver from "./wallriver.png";
import wallroad from "./wallroad.png";

export default [
  { uri: bridge, name: "bridge.png", symmetry: "I", displayName: "bridge" },
  { uri: ground, name: "ground.png", symmetry: "X", displayName: "ground" },
  { uri: river, name: "river.png", symmetry: "I", displayName: "river" },
  {
    uri: riverturn,
    name: "riverturn.png",
    symmetry: "L",
    displayName: "riverturn",
  },
  { uri: road, name: "road.png", symmetry: "I", displayName: "road" },
  {
    uri: roadturn,
    name: "roadturn.png",
    symmetry: "L",
    displayName: "roadturn",
  },
  { uri: t, name: "t.png", symmetry: "T", displayName: "t" },
  { uri: tower, name: "tower.png", symmetry: "X", displayName: "tower" },
  { uri: wall, name: "wall.png", symmetry: "I", displayName: "wall" },
  {
    uri: wallriver,
    name: "wallriver.png",
    symmetry: "I",
    displayName: "wallriver",
  },
  {
    uri: wallroad,
    name: "wallroad.png",
    symmetry: "I",
    displayName: "wallroad",
  },
];
