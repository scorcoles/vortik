// Vortik: un remolino de fibras que gira y se deja remover con el ratón o el dedo.
// Un experimento de VERTIK. Homenaje a la portada de «Dysnomia» (Dawn of Midi, 2013).
//
// Este archivo solo junta las piezas. Cada una vive en su módulo:
//   stage.js   → Paso 1 · el escenario (Three.js, la cámara, el tamaño de la ventana)
//   vortex.js  → Pasos 2 a 5 · la forma del remolino, las fibras, lo orgánico y el giro

import { createStage } from './stage.js';
import { createVortex, RADIUS } from './vortex.js';

const canvas = document.querySelector('[data-vortik]');
const stage = createStage(canvas, { radius: RADIUS });

const vortex = createVortex();
stage.scene.add(vortex.object);

// Cada fotograma: el remolino avanza dt segundos y el escenario lo pinta.
stage.start((dt) => {
  vortex.update(dt);
});
