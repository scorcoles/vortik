// =========================================================================================
// Paso 10 · Inclinar el plano
// =========================================================================================
//
// Con el ratón: clic y arrastrar. En el móvil: dos dedos (uno solo remueve las fibras).
// El plano se inclina como un plato que agarras: arrastrar hacia abajo acerca el borde de
// arriba; hacia la derecha, acerca el de la izquierda. Al soltar, vuelve despacio a plano.
// Cuanto más se inclina, más cuesta, como si tirases de una goma.
//
// No movemos el plano directamente al ángulo pedido: el ángulo lo sigue con un muelle,
// así tiene algo de peso (arranca suave y se pasa un poco al pararse).

import * as THREE from 'three';

// Lo más que se inclina, en grados. Más allá de unos 30° deja de parecer real: el disco
// se lee como una pegatina y el agujero redondo, como un círculo pegado encima.
const MAX_TILT = THREE.MathUtils.degToRad(30);

// Cuánto se inclina por cada pantalla arrastrada (en radianes por alto de pantalla).
const SENSITIVITY = 2.4;

// Lo deprisa que vuelve a plano al soltar: cuánto se acerca a 0 cada segundo.
const RETURN = 0.7;

// El muelle que sigue al ángulo pedido: su rigidez y su amortiguación (1 = sin pasarse).
const STIFFNESS = 30;
const DAMPING = 0.75;

export function createTilt(canvas) {
  // Los punteros que están tocando la pantalla ahora mismo (ratón con botón pulsado, o
  // cada dedo), por su número.
  const pointers = new Map();
  let dragging = false;

  // Dónde empezó el arrastre y qué inclinación había entonces.
  const start = { x: 0, y: 0 };
  const base = { x: 0, y: 0 };

  // La inclinación pedida y la que hay (con su velocidad), alrededor del eje x y del y.
  const target = { x: 0, y: 0 };
  const angle = { x: 0, y: 0 };
  const speed = { x: 0, y: 0 };

  // El punto medio de los punteros que tocan: con dos dedos, el centro entre ellos.
  function center() {
    let x = 0;
    let y = 0;
    for (const p of pointers.values()) {
      x += p.x;
      y += p.y;
    }
    return { x: x / pointers.size, y: y / pointers.size };
  }

  // ¿Este gesto es para inclinar? Ratón con el botón pulsado, o dos dedos o más.
  function wantsTilt(e) {
    return e.pointerType === 'mouse' ? pointers.size > 0 : pointers.size >= 2;
  }

  function begin() {
    dragging = true;
    Object.assign(start, center());
    Object.assign(base, target);
    canvas.classList.add('is-tilting');
  }

  function end() {
    dragging = false;
    canvas.classList.remove('is-tilting');
  }

  canvas.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // Que los movimientos sigan llegando aunque el puntero salga del canvas. (Si el
    // navegador ya no conoce ese puntero, lanza un error: no pasa nada, seguimos.)
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // nada
    }
    // Si ya se estaba inclinando (un dedo más), se empieza de nuevo desde el centro nuevo.
    if (wantsTilt(e)) begin();
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (!dragging) return;
    const c = center();
    // Lo que pide la mano no tiene tope (bueno: tres veces el máximo, para que al volver
    // no tarde una eternidad); el tope lo pone la goma, en update().
    const clamp = (v) => Math.max(-3 * MAX_TILT, Math.min(3 * MAX_TILT, v));
    // Arrastrar en horizontal gira alrededor del eje vertical (y), y en vertical,
    // alrededor del horizontal (x).
    target.y = clamp(base.y + ((c.x - start.x) / window.innerHeight) * SENSITIVITY);
    target.x = clamp(base.x + ((c.y - start.y) / window.innerHeight) * SENSITIVITY);
  });

  function release(e) {
    pointers.delete(e.pointerId);
    if (!dragging) return;
    // Con el ratón, al soltar el botón. Con los dedos, al quedar menos de dos.
    if (e.pointerType === 'mouse' || pointers.size < 2) end();
    // Si quedan dos o más dedos, se sigue desde donde están.
    else begin();
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  // Cada fotograma: si no se arrastra, lo pedido vuelve poco a poco a plano; el ángulo lo
  // sigue con su muelle, y se lo damos al grupo «object».
  const damping = 2 * DAMPING * Math.sqrt(STIFFNESS);
  function update(dt, object) {
    if (!dragging) {
      const k = Math.exp(-RETURN * dt);
      target.x *= k;
      target.y *= k;
    }
    // La goma: con poco, la inclinación es la que pide la mano; cuanto más se pide, más
    // cuesta, y nunca pasa de MAX_TILT. La tangente hiperbólica (tanh) hace justo eso:
    // tanh(x) ≈ x para x pequeño, y se acerca a 1 sin llegar nunca. Se aplica a la
    // inclinación total (los dos ejes juntos), no a cada eje: si no, en diagonal se
    // sumarían y pasaría de MAX_TILT.
    const asked = Math.hypot(target.x, target.y);
    const scale = asked > 0 ? (MAX_TILT * Math.tanh(asked / MAX_TILT)) / asked : 0;
    for (const axis of ['x', 'y']) {
      const wanted = target[axis] * scale;
      const accel = STIFFNESS * (wanted - angle[axis]) - damping * speed[axis];
      speed[axis] += accel * dt;
      angle[axis] += speed[axis] * dt;
    }
    object.rotation.x = angle.x;
    object.rotation.y = angle.y;
  }

  return { update, isDragging: () => dragging };
}
