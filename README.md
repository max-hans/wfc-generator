# Wave Function Collapse - Tilemap Generator

![banner](github\screenshot.jpg)

## About

This project is based on the wave function collapse algorithm available [here](https://github.com/mxgmn/WaveFunctionCollapse).

I was intrigued by what is possible with it. There is also a Javascript port of it available [here](https://github.com/kchapelier/wavefunctioncollapse).

Eventhough there are lots of great implementations and showcases i found it difficult to start with my own tilemaps. This is why I created this tool which is still a WIP and not stable at all. My main goal is being able to upload a certain set of tiles and drawing out a map that makes sense.

In [@kchapelier](https://github.com/kchapelier)</a>'s example the data is provided as a JS-object, which works, but is not a very intuitive way to create model definitions.

**This project is still under heavy development.
It is strongly recommended to backup (download) your data from time to time. The structure of how data is handled might change over time. So your data (or at least the config for the tiles) might be unusable at some point.**

## What you can do

The goal of the wfc-generator is to provide a simple environment to create
tile-map-definitions. It also serves as a playground for me to explore the
possibilities of the svelte-framework (more on the stack below). These are
the things you can do:

- Upload your tiles as single images from a folder by clicking **edit palette**. You then have to provide information about the symmetry of each tile.

- You can then create a map of tiles by drawing onto the canvas. The possibilities are still quite limited, by should be enough for small maps.

- You can then download both the data generated for your tiles and the final definition for the tilemap.

## Stack

The whole page was built using [svelteJS](https://svelte.dev/) and BulmaCSS for styling. There is no backend of any sort and no user data is saved.

All data you enter is saved within the browser in localstorage. That's why your images should not be too large, otherwise your browser might do weird stuff to it or just not save it at all.

## Get started

_Note that you will need to have [Node.js](https://nodejs.org) installed._
Install the dependencies...

```bash
cd svelte-app
npm install
```

...then start [Rollup](https://rollupjs.org):

```bash
npm run dev
```
