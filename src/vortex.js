// =========================================================================================
// Paso 2 · La forma: una espiral que se hunde en un embudo
// =========================================================================================
//
// Todas las fibras siguen la misma corriente. La describimos con dos funciones que, dado
// lo lejos que está un punto del centro (su radio «r»), dicen:
//   - en qué ángulo gira la espiral a ese radio;
//   - a qué profundidad está el embudo a ese radio.
// Así cualquier trozo de fibra, esté donde esté, «sabe» por dónde tiene que ir.

import * as THREE from 'three';

// Radio exterior del remolino. Es nuestra unidad: todo lo demás se mide respecto a él.
export const RADIUS = 1;

// Radio del agujero negro del centro.
const HOLE = 0.25;

// Lo que se hunde el embudo desde el borde hasta el agujero.
const DEPTH = 0.6;

// Cuánto se enrosca la espiral. 0 = fibras rectas hacia el centro; más = más vueltas.
const TWIST = 1.6;

// Espiral logarítmica: cada vez que el radio se reduce a la mitad, la fibra gira el mismo
// ángulo. Es la espiral de las galaxias, de los caracoles y de un desagüe.
function spiralAngle(r) {
  return TWIST * Math.log(RADIUS / r);
}

// El embudo: plano en el borde y cada vez más empinado cerca del agujero, como el agua
// que se va por un desagüe. Vale 0 en el borde y -DEPTH en el agujero.
function funnelDepth(r) {
  const k = (RADIUS / r - 1) / (RADIUS / HOLE - 1);
  return -DEPTH * k;
}

// =========================================================================================
// Paso 3 · Las fibras: muchas líneas que siguen la corriente
// =========================================================================================

// Cuántas fibras hay y de cuántos puntos está hecha cada una.
const FIBERS = 1600;
const POINTS = 40;

// Un número al azar entre a y b.
function random(a, b) {
  return a + Math.random() * (b - a);
}

// Cada fibra es un trozo de la corriente: empieza a un radio, acaba en otro más cerca del
// centro y arranca en un ángulo propio. Con eso basta para calcular todos sus puntos.
function createFiber() {
  // Más fibras por fuera que por dentro: la raíz cuadrada empuja el azar hacia el 1.
  const from = HOLE + (RADIUS - HOLE) * (0.35 + 0.65 * Math.sqrt(Math.random()));
  // La mitad llega hasta el agujero (por eso el borde del agujero es tan denso). El resto
  // se queda a medio camino.
  const to = Math.random() < 0.5 ? HOLE : Math.max(HOLE, from - random(0.1, 0.45));
  return {
    angle: random(0, Math.PI * 2),
    from,
    to,
    // Unas fibras más blancas que otras.
    brightness: random(0.35, 1),
  };
}

// Escribe en «out», a partir de la posición «i» (x, y, z seguidos), el punto de la fibra
// que está a la fracción t de su recorrido (0 = principio, 1 = final).
function fiberPoint(fiber, t, out, i) {
  const r = fiber.from + (fiber.to - fiber.from) * t;
  const a = fiber.angle + spiralAngle(r);
  out[i] = r * Math.cos(a);
  out[i + 1] = r * Math.sin(a);
  out[i + 2] = funnelDepth(r);
}

export function createVortex() {
  const fibers = Array.from({ length: FIBERS }, createFiber);

  // Para la tarjeta gráfica, todas las fibras son un solo objeto: una lista enorme de
  // puntos (x, y, z seguidos) y otra de colores (r, g, b seguidos). Un solo objeto se
  // pinta de una vez, y eso es mucho más rápido que 1600 objetos sueltos.
  const positions = new Float32Array(FIBERS * POINTS * 3);
  const colors = new Float32Array(FIBERS * POINTS * 3);

  // Y una lista de parejas de puntos que se unen con una línea: (0,1), (1,2), (2,3)…
  // dentro de cada fibra, sin unir el último punto de una con el primero de la siguiente.
  const segments = new Uint32Array(FIBERS * (POINTS - 1) * 2);

  let s = 0;
  fibers.forEach((fiber, f) => {
    const first = f * POINTS;
    for (let p = 0; p < POINTS; p++) {
      const i = (first + p) * 3;
      fiberPoint(fiber, p / (POINTS - 1), positions, i);
      colors[i] = colors[i + 1] = colors[i + 2] = fiber.brightness;
      if (p < POINTS - 1) {
        segments[s++] = first + p;
        segments[s++] = first + p + 1;
      }
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(segments, 1));

  // Líneas semitransparentes que se SUMAN al cruzarse («additive»): donde se juntan
  // muchas fibras, como en el borde del agujero, la luz se acumula y brilla más. Es lo
  // que pasa en la portada.
  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const object = new THREE.LineSegments(geometry, material);

  // =======================================================================================
  // Paso 4 · Todo gira
  // =======================================================================================

  // Velocidad de giro, en radianes por segundo. En negativo, la espiral parece que se
  // traga las fibras hacia el agujero; en positivo, que las escupe.
  const SPIN = -0.12;

  function update(dt) {
    object.rotation.z += SPIN * dt;
  }

  return { object, update };
}
