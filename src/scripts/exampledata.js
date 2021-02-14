export default {
  path: "./data/castle/",
  tilesize: 7,
  tiles: [
    { name: "bridge", symmetry: "I" },
    { name: "ground", symmetry: "X" },
    { name: "river", symmetry: "I" },
    { name: "riverturn", symmetry: "L" },
  ],
  neighbors: [
    { left: "bridge 1", right: "river 1" },
    { left: "bridge 1", right: "riverturn 1" },
    { left: "bridge", right: "road 1" },
    { left: "bridge", right: "roadturn 1" },
    { left: "bridge", right: "t" },
    { left: "bridge", right: "t 3" },
    { left: "bridge", right: "wallroad" },
    { left: "ground", right: "ground" },
  ],
};
