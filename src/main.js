// Vortik: un remolino de fibras que gira y se deja remover con el ratón o el dedo.
// Un experimento de VERTIK. Homenaje a la portada de «Dysnomia» (Dawn of Midi, 2013).
//
// Este archivo solo junta las piezas. Cada una vive en su módulo:
//   stage.js   → Paso 1 · el escenario (Three.js, la cámara, el tamaño de la ventana)
//   vortex.js  → Pasos 2 a 5 · la forma del remolino, las fibras, lo orgánico y el giro
//   ribbons.js → Paso 6 · las fibras gruesas, como cintas
//   drops.js   → Paso 6 · las gotas y las puntas redondas
//   modes.js   → Paso 7 · los modos de visualización (noche, portada, esquema)
//   guides.js  → Paso 7 · las guías del modo esquema
//   toner.js   → Paso 7 · el desgaste de fotocopia del modo portada
//   notes.js   → Paso 7 · el cajetín del modo esquema
//   motion.js  → Paso 8 · muelles, inercia y viento: cada punto se mueve por su cuenta

import { createStage } from './stage.js';
import { createVortex, RADIUS } from './vortex.js';
import { setupModes } from './modes.js';
import { applyToner } from './toner.js';
import { fillNotes } from './notes.js';

const canvas = document.querySelector('[data-vortik]');
const stage = createStage(canvas, { radius: RADIUS });

const vortex = createVortex();
stage.scene.add(vortex.object);
fillNotes(document.querySelector('[data-notes]'), vortex.info);

// Cada vez que cambia el modo: el fondo, el remolino y una clase en <html> (is-portada,
// is-esquema…) para que style.css cambie el pie y ponga, o no, el desgaste del cartón.
setupModes((name, style) => {
  stage.renderer.setClearColor(style.background);
  vortex.setStyle(style);
  // La suavidad de lente: un desenfoque muy leve de todo el canvas (lo hace el navegador).
  canvas.style.filter = style.soften ? `blur(${style.soften}px)` : '';
  document.documentElement.className = `is-${name}`;
  // La fotocopia se pinta la primera vez que hace falta.
  if (name === 'portada') applyToner(document.querySelector('.toner'));
});

// Cada fotograma: el remolino avanza dt segundos y el escenario lo pinta.
stage.start((dt) => {
  vortex.update(dt);
});
