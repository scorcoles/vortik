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
//   pointer.js → Paso 9 · el cursor, en el sistema del remolino, para remover las fibras
//   tilt.js    → Paso 10 · clic y arrastrar (o dos dedos) para inclinar el plano
//   share.js   → compartir una foto del momento
//   sound.js   → el sonido: un grave continuo y algún scratch

import { createStage } from './stage.js';
import { createVortex, RADIUS } from './vortex.js';
import { setupModes } from './modes.js';
import { applyToner } from './toner.js';
import { fillNotes, setupNotesToggle, createFps } from './notes.js';
import { createPointer } from './pointer.js';
import { createTilt } from './tilt.js';
import { setupShare } from './share.js';
import { isPhone } from './device.js';
import { createSound } from './sound.js';

const canvas = document.querySelector('[data-vortik]');
const stage = createStage(canvas, { radius: RADIUS });

let vortex = createVortex();
stage.scene.add(vortex.object);
fillNotes(document.querySelector('[data-notes]'), vortex.info);
setupNotesToggle();
const countFps = createFps();

// Cada vez que cambia el modo: el fondo, el remolino y una clase en <html> (is-portada,
// is-esquema…) para que style.css cambie el pie y ponga, o no, el desgaste del cartón.
let mode = null;
setupModes((name, style) => {
  mode = { name, style };
  stage.setBackground(style.background);
  vortex.setStyle(style);
  // La suavidad de lente: un desenfoque muy leve de todo el canvas (lo hace el navegador).
  // En el móvil no: redibujar el canvas entero con un filtro en cada fotograma es de lo más
  // caro que hay, y en una pantalla tan densa apenas se notaba.
  canvas.style.filter = style.soften && !isPhone() ? `blur(${style.soften}px)` : '';
  // (Sin pisar «is-notes-open»: si el cajetín estaba desplegado, lo sigue estando.)
  const root = document.documentElement;
  const notesOpen = root.classList.contains('is-notes-open');
  root.className = `is-${name}`;
  root.classList.toggle('is-notes-open', notesOpen);
  // La fotocopia se pinta la primera vez que hace falta.
  if (name === 'portada') applyToner(document.querySelector('.toner'));
});

// El botón de compartir: una foto como se ve ahora, en el modo que esté puesto.
setupShare(stage, () => mode);

// Doble clic o doble toque: un vórtice nuevo. Se tira el viejo y se crea otro (con sus
// propios mapas de densidad, fibras y quiebros), pintado en el modo que esté puesto.
function regenerate() {
  stage.scene.remove(vortex.object);
  vortex.dispose();
  vortex = createVortex();
  stage.scene.add(vortex.object);
  vortex.setStyle(mode.style);
}

// El doble toque lo detectamos a mano (dos toques en menos de 300 ms, a menos de 30 px):
// en el móvil, el «dblclick» del navegador no llega siempre (con «touch-action: none», el
// navegador no se encarga de los toques). Con el ratón, igual: dos clics seguidos.
let lastTap = { time: 0, x: 0, y: 0 };
canvas.addEventListener('pointerdown', (e) => {
  if (!e.isPrimary) return;
  const now = performance.now();
  const close = Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30;
  if (now - lastTap.time < 300 && close) {
    regenerate();
    lastTap = { time: 0, x: 0, y: 0 };
  } else {
    lastTap = { time: now, x: e.clientX, y: e.clientY };
  }
});

// El sonido, con el altavoz de arriba a la derecha: apagado hasta que se pulsa.
const sound = createSound();
const soundButton = document.querySelector('[data-sound]');
soundButton?.addEventListener('click', () => {
  const playing = sound.toggle();
  soundButton.classList.toggle('is-on', playing);
  soundButton.setAttribute('aria-pressed', String(playing));
  soundButton.setAttribute('aria-label', playing ? 'Apagar el sonido' : 'Encender el sonido');
});

// El ratón o el dedo: para remover (paso 9) y para inclinar (paso 10).
const pointer = createPointer(canvas, stage.camera);
const tilt = createTilt(canvas);

// Cada fotograma: la inclinación, dónde está el cursor (mientras se inclina, no remueve),
// el remolino avanza dt segundos y el escenario lo pinta.
stage.start((dt) => {
  countFps();
  tilt.update(dt, vortex.tilt);
  const cursor = pointer.update(dt, vortex.spin);
  if (tilt.isDragging()) cursor.active = false;
  vortex.update(dt, cursor);
  sound.update(cursor);
});
