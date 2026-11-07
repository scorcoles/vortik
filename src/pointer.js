// =========================================================================================
// Paso 9 · El cursor: dónde está y a qué velocidad va, en el sistema del remolino
// =========================================================================================
//
// El ratón o el dedo se mueven por la pantalla, pero las fibras viven en el remolino, que
// gira (y más adelante se inclinará). Así que, en cada fotograma:
//   1. lanzamos un rayo desde la cámara a través del cursor y miramos dónde corta el plano
//      del remolino (z = 0): ese es el cursor en el mundo;
//   2. su velocidad: cuánto se ha movido desde el fotograma anterior, por segundo;
//   3. pasamos las dos cosas al sistema del remolino («worldToLocal»), para que motion.js
//      pueda compararlas con sus puntos.
//
// La velocidad es la de la pantalla, no la relativa a las fibras: si dejas el ratón quieto
// no remueve, aunque el remolino gire por debajo.

import * as THREE from 'three';

export function createPointer(canvas, camera) {
  // El cursor en «coordenadas normalizadas»: de -1 a 1 en los dos ejes, como le gusta a
  // Three.js. Y si está sobre el canvas o no.
  const ndc = new THREE.Vector2();
  let inside = false;

  function track(e) {
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    inside = true;
  }
  canvas.addEventListener('pointermove', track);
  canvas.addEventListener('pointerdown', track);
  // Al levantar el dedo o sacar el ratón de la ventana, el cursor deja de remover.
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
    canvas.addEventListener(type, () => (inside = false));
  }

  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const world = new THREE.Vector3();
  const previous = new THREE.Vector3();
  const velocity = new THREE.Vector3();
  const step = new THREE.Vector3();
  const local = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  let fresh = true;

  // Lo que lee motion.js: si remueve, dónde está y a qué velocidad va (en el remolino), y
  // a qué distancia está la cámara (para la perspectiva).
  const state = { active: false, x: 0, y: 0, vx: 0, vy: 0, cameraDistance: 1 };

  // «object» es el grupo del remolino: el sistema al que pasamos el cursor.
  function update(dt, object) {
    if (!inside) {
      state.active = false;
      fresh = true;
      return state;
    }

    raycaster.setFromCamera(ndc, camera);
    if (!raycaster.ray.intersectPlane(plane, world)) return state;

    // La primera vez no hay de dónde venir: velocidad 0, sin un salto desde el último sitio
    // donde estuvo.
    if (fresh) {
      previous.copy(world);
      velocity.set(0, 0, 0);
      fresh = false;
    }

    // La velocidad, suavizada: la mitad de la nueva y la mitad de la anterior. El ratón da
    // saltos irregulares, y sin suavizar la corriente daría tirones.
    step.subVectors(world, previous).divideScalar(dt);
    velocity.lerp(step, 0.5);
    previous.copy(world);

    // Al sistema del remolino. La velocidad, como la diferencia entre dónde está y dónde
    // estará dentro de un segundo, los dos puntos pasados al remolino.
    local.copy(world);
    object.worldToLocal(local);
    ahead.copy(world).add(velocity);
    object.worldToLocal(ahead);

    state.active = true;
    state.x = local.x;
    state.y = local.y;
    state.vx = ahead.x - local.x;
    state.vy = ahead.y - local.y;
    state.cameraDistance = camera.position.z;
    return state;
  }

  return { update };
}
