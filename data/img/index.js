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
  { data: bridge, name: "bridge", symmetry: "I" },
  { data: ground, name: "ground", symmetry: "X" },
  { data: river, name: "river", symmetry: "I" },
  { data: riverturn, name: "riverturn", symmetry: "L" },
  { data: road, name: "road", symmetry: "I" },
  { data: roadturn, name: "roadturn", symmetry: "L" },
  { data: t, name: "t", symmetry: "T" },
  { data: tower, name: "tower", symmetry: "L" },
  { data: wall, name: "wall", symmetry: "I" },
  { data: wallriver, name: "wallriver", symmetry: "I" },
  { data: wallroad, name: "wallroad", symmetry: "I" },
];
