// =========================================================================================
// Apretar: la patinadora
// =========================================================================================
//
// Con dos dedos, juntarlos aprieta el remolino hacia el agujero y separarlos lo abre. En
// escritorio, igual con el pellizco del trackpad o con la rueda del ratón. Al soltar,
// vuelve despacio a su tamaño.
//
// Y gira más deprisa cuanto más apretado, como una patinadora que recoge los brazos: el
// momento angular se conserva, así que si el tamaño se reduce, la velocidad sube con el
// cuadrado (al 70 %, el doble de rápido). Eso lo hace vortex.js con el valor de aquí.
//
// Convive con la inclinación (tilt.js): mover los dos dedos inclina, abrirlos o cerrarlos
// aprieta, a la vez.

// Cuánto se puede apretar y abrir (1 = su tamaño).
const MIN = 0.7;
const MAX = 1.25;

// Lo deprisa que vuelve a su tamaño al soltar: cuánto se acerca a 1 cada segundo.
const RETURN = 1.5;

// El muelle que sigue al tamaño pedido: rigidez y amortiguación (1 = sin pasarse).
const STIFFNESS = 25;
const DAMPING = 0.8;

// Cuánto aprieta la rueda: el pellizco del trackpad (llega con «ctrlKey») y la rueda de un
// ratón, que da saltos mucho más grandes.
const PINCH_WHEEL = 0.01;
const MOUSE_WHEEL = 0.0015;

// Lo que espera tras el último giro de rueda antes de volver a su tamaño (segundos).
const WHEEL_HOLD = 0.35;

const clamp = (v) => Math.max(MIN, Math.min(MAX, v));

export function createSqueeze(canvas) {
  // Los dedos que tocan la pantalla ahora mismo.
  const touches = new Map();
  let pinching = false;
  let startDistance = 1;
  let startTarget = 1;
  let wheelHold = 0;

  // El tamaño pedido y el que hay (con su velocidad).
  let target = 1;
  let value = 1;
  let speed = 0;

  // La distancia entre los dos primeros dedos.
  function distance() {
    const [a, b] = [...touches.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) {
      pinching = true;
      startDistance = distance();
      startTarget = target;
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const t = touches.get(e.pointerId);
    if (!t) return;
    t.x = e.clientX;
    t.y = e.clientY;
    // Juntar los dedos (la distancia baja) aprieta; separarlos abre.
    if (pinching && touches.size >= 2) target = clamp(startTarget * (distance() / startDistance));
  });

  function release(e) {
    touches.delete(e.pointerId);
    if (touches.size < 2) pinching = false;
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  // La rueda y el pellizco del trackpad. «passive: false» para poder quitarle al navegador
  // su zoom de la página (preventDefault).
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const k = e.ctrlKey ? PINCH_WHEEL : MOUSE_WHEEL;
      target = clamp(target * Math.exp(-e.deltaY * k));
      wheelHold = WHEEL_HOLD;
    },
    { passive: false },
  );

  // Cada fotograma: si no se está apretando, lo pedido vuelve poco a poco a 1; el tamaño lo
  // sigue con su muelle. Devuelve el tamaño (1 = el suyo; 0,7 = apretado al 70 %).
  const damping = 2 * DAMPING * Math.sqrt(STIFFNESS);
  function update(dt) {
    wheelHold -= dt;
    if (!pinching && wheelHold <= 0) target = 1 + (target - 1) * Math.exp(-RETURN * dt);
    const accel = STIFFNESS * (target - value) - damping * speed;
    speed += accel * dt;
    value += speed * dt;
    return value;
  }

  return { update };
}
