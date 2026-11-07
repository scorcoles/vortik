// =========================================================================================
// Paso 9 · El cursor: dónde está y a qué velocidad va, en el sistema del remolino
// =========================================================================================
//
// El ratón o el dedo se mueven por la pantalla, pero las fibras viven en el remolino, que
// gira y se inclina. Así que, en cada fotograma:
//   1. lanzamos un rayo desde la cámara a través del cursor y lo pasamos al sistema del
//      remolino («worldToLocal»);
//   2. allí, el rayo es una recta que atraviesa el embudo. A la altura z, pasa por
//      (x + sx · z, y + sy · z): «x, y» es donde corta el plano z = 0 y «sx, sy», cuánto se
//      desvía por cada unidad de profundidad. Con eso, motion.js puede comparar cada punto
//      con el cursor A SU PROFUNDIDAD: exacto, aunque el plano esté inclinado;
//   3. la velocidad: cuánto se ha movido el cursor por la pantalla desde el fotograma
//      anterior, por segundo, pasada también al sistema del remolino.
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
  const plane = new THREE.Plane();
  const world = new THREE.Vector3();
  const previous = new THREE.Vector3();
  const velocity = new THREE.Vector3();
  const step = new THREE.Vector3();
  const origin = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const local = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  let fresh = true;

  // Lo que lee motion.js: si remueve, dónde corta el rayo el plano del remolino (x, y),
  // cuánto se desvía con la profundidad (sx, sy) y a qué velocidad va (vx, vy).
  const state = { active: false, x: 0, y: 0, sx: 0, sy: 0, vx: 0, vy: 0 };

  // «frame» es el grupo que gira (spin, en vortex.js): el sistema al que pasamos el cursor.
  function update(dt, frame) {
    if (!inside) {
      state.active = false;
      fresh = true;
      return state;
    }

    // El grupo se acaba de girar e inclinar: que Three.js recalcule dónde está.
    frame.updateWorldMatrix(true, false);
    raycaster.setFromCamera(ndc, camera);

    // El plano del remolino (z = 0 en su sistema), puesto donde está ahora en el mundo.
    plane.set(new THREE.Vector3(0, 0, 1), 0).applyMatrix4(frame.matrixWorld);
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

    // El rayo, en el sistema del remolino: su origen (la cámara) y su dirección (la
    // diferencia entre dos de sus puntos, los dos pasados al remolino).
    origin.copy(raycaster.ray.origin);
    frame.worldToLocal(origin);
    direction.copy(raycaster.ray.origin).add(raycaster.ray.direction);
    frame.worldToLocal(direction).sub(origin);

    // Dónde corta z = 0 y cuánto se desvía por cada unidad de z.
    const toPlane = -origin.z / direction.z;
    state.x = origin.x + direction.x * toPlane;
    state.y = origin.y + direction.y * toPlane;
    state.sx = direction.x / direction.z;
    state.sy = direction.y / direction.z;

    // La velocidad, al sistema del remolino: la diferencia entre dónde está y dónde estará
    // dentro de un segundo, los dos puntos pasados al remolino.
    local.copy(world);
    frame.worldToLocal(local);
    ahead.copy(world).add(velocity);
    frame.worldToLocal(ahead);
    state.vx = ahead.x - local.x;
    state.vy = ahead.y - local.y;

    state.active = true;
    return state;
  }

  return { update };
}
