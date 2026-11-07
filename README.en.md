# vortik

[Español](README.md) · **English**

A whirl of paint fibres spinning around a black hole, swaying with its own inertia, that you can stir and tilt. Made with [Three.js](https://threejs.org) and [Vite](https://vite.dev).

**Demo:** [scorcoles.github.io/vortik](https://scorcoles.github.io/vortik/) · also at [vertik.net/vortik](https://www.vertik.net/vortik/)

- **Move the mouse or your finger** over it: it stirs the fibres, which settle back on their own.
- **Drag** (on a phone, with **two fingers**): tilts the plane. Let go and it levels out again.
- **Pinch** (two fingers, the trackpad or the mouse wheel): squeezes the whirl towards the hole, and it spins faster, like a skater pulling in their arms. Let go and it returns to its size.
- **Double-click** (or double-tap): a new vortex, different every time.
- **← Prev · Next →** in the footer, or the arrow keys: four ways to see it, **noche** (white on black), **cover** (like the record sleeve, worn cardboard and all), **holo** (iridescent, like holographic foil on black) and **wire** (each fibre family in its own colour, with guides and numbers).
- **Share** (top right): a photo of the moment.

An experiment by [VERTIK](https://www.vertik.net). A tribute to the cover of [*Dysnomia*](https://www.youtube.com/watch?v=BiVRDuIUKfA&list=OLAK5uy_l8Qxdj6Uvs5vhsUzVTHRmUoHcGrPncBwA) by Dawn of Midi (2013): a photo of white paint flung by a roller spinning on a drill. The photo isn't used here: everything is generated in code.

---

## Running it

You need [Node.js](https://nodejs.org) (22 or newer). From the project folder:

```bash
npm install
npm run dev
# and open the address it gives you (http://localhost:5173)
```

`npm run build` writes the publishable version to `dist/`: `index.html`, `vortik.js` (with Three.js inside) and `vortik.css`, with relative paths, so it works served from any folder.

## How it works, briefly

- **The shape** is a logarithmic spiral sinking down a funnel into the hole. Each fibre is a stretch of that current.
- **Four fibre families**: the rim (tiny filaments that draw the hole's circle), the bristles (short, match-like, thickening towards the tip), the streams (long, spiralling) and the ring (the outer tangle, where the thick paint is).
- **Nothing is even**: each family is spread by a random density map, and each fibre bends through a few random control points.
- **The thick paint** is ribbons: three vertices per point, lighter at the centre and where there's more paint, and rounded at the ends, like a liquid.
- **The motion**: every point has a spring tying it to its place. The spin speeds up and slows down, and the fibres lag and overshoot, from inertia; a soft wind sways them; and the cursor drags the ones near it.
- **The hole** is a fixed circle drawn over everything, like a black hole's shadow: it looks round even when the plane tilts.

The code comments explain it step by step (in Spanish).

## License

[MIT](LICENSE). Three.js is MIT too.
