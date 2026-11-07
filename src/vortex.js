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
import { createRibbons } from './ribbons.js';
import { createDrops } from './drops.js';

// Una vuelta entera, en radianes.
const TAU = Math.PI * 2;

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
// Paso 3 · Las fibras: líneas que siguen la corriente
// =========================================================================================

// De cuántos puntos está hecha cada fibra.
const POINTS = 64;

// Un número al azar entre a y b.
function random(a, b) {
  return a + Math.random() * (b - a);
}

// Verdadero con probabilidad p: chance(0.3) sale verdadero 3 de cada 10 veces.
function chance(p) {
  return Math.random() < p;
}

// Una fibra es un trozo de la corriente. Para dibujarla basta con saber:
//   angle       en qué ángulo arranca;
//   from, to    a qué radio empieza y a qué radio acaba;
//   turn        cuánto gira de más (o de menos) respecto a la espiral, de punta a punta;
//   wobble      cuánto se ondula (paso 4);
//   waves       cuántas ondas hace a lo largo (paso 4);
//   phase       en qué punto de la onda empieza, para que no ondulen todas a la vez;
//   brightness  lo blanca que es;
//   width       su grosor: 0 = una línea de 1 píxel; si no, una cinta así de ancha (paso 6);
//   lumps       cuántas veces engorda y adelgaza a lo largo, si es una cinta (paso 6);
//   drop        el radio de la gotita de una punta, o 0 si no tiene (paso 6);
//   dropAt      en qué punta está la gotita: 0 = al principio, 1 = al final (paso 6).
//
// Esta función escribe en «out», a partir de la posición «i» (x, y, z seguidos), el punto
// de la fibra que está a la fracción t de su recorrido (0 = principio, 1 = final).
function fiberPoint(fiber, t, out, i) {
  // La ondulación: dos ondas de distinta frecuencia sumadas. Una sola se ve mecánica, como
  // un muelle; con dos, la fibra parece que se ha retorcido sola.
  const s = t * fiber.waves * TAU + fiber.phase;
  const wave = Math.sin(s) + 0.5 * Math.sin(2.7 * s + 1.3);

  // El radio va de «from» a «to», más la ondulación. Nunca dentro del agujero.
  const r = Math.max(HOLE, fiber.from + (fiber.to - fiber.from) * t + fiber.wobble * wave);
  const a = fiber.angle + spiralAngle(r) + fiber.turn * t;

  out[i] = r * Math.cos(a);
  out[i + 1] = r * Math.sin(a);
  out[i + 2] = funnelDepth(r);
}

// =========================================================================================
// Paso 4 · Orgánico: no hay dos zonas iguales
// =========================================================================================
//
// En la portada las fibras no están repartidas por igual: hay sectores llenos y sectores
// casi vacíos. Y no todas son iguales: hay tres familias.

// Un mapa de densidad alrededor del círculo: para cada ángulo, un número entre 0 y 1 que
// dice cuánto se llena esa zona. Lo hacemos sumando unas pocas ondas que dan 1, 2, 3 y 5
// vueltas, cada una empezando en un sitio al azar: sale una curva suave e irregular, con
// grumos y huecos, distinta cada vez que se carga la página.
// «contrast» exagera la diferencia: con 1, suave; con 3, zonas llenas y zonas vacías.
function createDensity(contrast) {
  const waves = [1, 2, 3, 5].map((turns) => ({ turns, phase: random(0, TAU), weight: 1 / turns }));
  const total = waves.reduce((sum, w) => sum + w.weight, 0);

  return (angle) => {
    let v = 0;
    for (const w of waves) v += w.weight * Math.sin(w.turns * angle + w.phase);
    // v / total va de -1 a 1: lo pasamos a 0…1 y lo elevamos para dar contraste.
    return ((v / total + 1) / 2) ** contrast;
  };
}

// Elige un ángulo al azar siguiendo el mapa: probamos ángulos y nos quedamos con uno con
// la probabilidad que diga el mapa. Donde el mapa vale 1 se acepta casi siempre; donde
// vale 0,05, una vez de cada veinte. Así las zonas llenas reciben muchas más fibras.
function pickAngle(density) {
  for (;;) {
    const angle = random(0, TAU);
    if (Math.random() < density(angle)) return angle;
  }
}

// Familia 1 · Pelitos: cortos y finos, pegados al borde del agujero. Casi rectos.
function createHair(angle) {
  return {
    angle,
    from: HOLE,
    // Casi todos muy cortos y unos pocos más largos (al cuadrado, el azar se va hacia 0).
    to: HOLE + 0.015 + 0.13 * Math.random() ** 2,
    turn: 0,
    wobble: 0.002,
    waves: 1,
    phase: random(0, TAU),
    brightness: random(0.25, 0.7),
    // Siempre finos; alguno acaba en una gotita diminuta, en la punta de fuera.
    width: 0,
    lumps: 0,
    drop: chance(0.12) ? random(0.002, 0.004) : 0,
    dropAt: 1,
  };
}

// Familia 2 · Corrientes: largas, bajan en espiral desde fuera hasta el agujero o hasta
// medio camino. Se ondulan un poco.
function createStream(angle) {
  const from = HOLE + (RADIUS - HOLE) * random(0.3, 1);
  const to = Math.random() < 0.5 ? HOLE : Math.max(HOLE, from - random(0.1, 0.45));
  return {
    angle,
    from,
    to,
    turn: random(-0.15, 0.15),
    wobble: random(0.003, 0.02),
    waves: random(1, 3),
    phase: random(0, TAU),
    brightness: random(0.3, 1),
    // Casi todas finas; unas pocas, chorros estrechos. La gotita, en la punta de fuera
    // (la de dentro se pierde en el agujero).
    width: chance(0.05) ? random(0.004, 0.009) : 0,
    lumps: random(1, 3),
    drop: chance(0.15) ? random(0.003, 0.006) : 0,
    dropAt: 0,
  };
}

// Familia 3 · Maraña: el anillo de fuera. Fibras que dan vueltas casi en círculo, muy
// onduladas, que se cruzan unas con otras. Algunas salen disparadas hacia fuera, como
// las salpicaduras de la pintura.
function createTangle(angle) {
  const from = random(0.72, 1.02);
  const splash = chance(0.1);

  // Es aquí donde está la pintura gruesa: alguna lámina ancha (como las de abajo a la
  // derecha en la portada), bastantes chorros y el resto, fibras finas.
  let width = 0;
  if (splash) width = chance(0.5) ? random(0.004, 0.012) : 0;
  else if (chance(0.015)) width = random(0.025, 0.045);
  else if (chance(0.12)) width = random(0.004, 0.012);

  // Las salpicaduras casi siempre acaban en gota; las demás, a veces. Si la fibra es una
  // cinta, la gota es un poco más gorda que ella; si es fina, una gotita.
  const drop = chance(splash ? 0.8 : 0.3) ? (width ? width * random(0.6, 1) : random(0.003, 0.006)) : 0;

  return {
    angle,
    from,
    to: splash ? from + random(0.08, 0.3) : from - random(0, 0.12),
    // Las salpicaduras salen casi rectas; las demás recorren un buen trozo del círculo.
    turn: splash ? random(-0.2, 0.2) : random(0.5, 2.5) * (Math.random() < 0.8 ? -1 : 1),
    wobble: splash ? 0.005 : random(0.008, 0.03),
    waves: splash ? 1 : random(1.5, 3.5),
    phase: random(0, TAU),
    brightness: random(0.5, 1),
    width,
    lumps: random(1, 4),
    drop,
    // Las salpicaduras, en la punta que sale disparada; las demás, en cualquiera.
    dropAt: splash || chance(0.5) ? 1 : 0,
  };
}

// Cuántas fibras de cada familia, y cómo de irregular es su reparto. Cada familia tiene
// su propio mapa: los huecos de los pelitos no coinciden con los de la maraña.
const FAMILIES = [
  { count: 1000, create: createHair, density: createDensity(3) },
  { count: 1100, create: createStream, density: createDensity(2) },
  { count: 350, create: createTangle, density: createDensity(1.5) },
];

function createFibers() {
  const fibers = [];
  for (const family of FAMILIES) {
    for (let n = 0; n < family.count; n++) {
      fibers.push(family.create(pickAngle(family.density)));
    }
  }
  return fibers;
}

// =========================================================================================
// El remolino: las fibras en tres capas de Three.js (pasos 3 y 6) que giran (paso 5)
// =========================================================================================

export function createVortex() {
  const fibers = createFibers();

  // La línea central de todas las fibras, en una sola lista enorme (x, y, z seguidos).
  // Las tres capas (líneas, cintas y gotas) se construyen a partir de ella: cuando el
  // cursor la mueva (paso 7), todas la seguirán.
  const centers = new Float32Array(fibers.length * POINTS * 3);
  const colors = new Float32Array(fibers.length * POINTS * 3);

  // Capa 1 · Las fibras finas, como líneas. Una lista de parejas de puntos que se unen
  // con una línea: (0,1), (1,2), (2,3)… dentro de cada fibra, sin unir el último punto de
  // una con el primero de la siguiente. Las fibras gruesas no se unen: esas son cintas.
  const segments = [];

  fibers.forEach((fiber, f) => {
    const first = f * POINTS;
    for (let p = 0; p < POINTS; p++) {
      const i = (first + p) * 3;
      fiberPoint(fiber, p / (POINTS - 1), centers, i);
      colors[i] = colors[i + 1] = colors[i + 2] = fiber.brightness;
      if (fiber.width === 0 && p < POINTS - 1) segments.push(first + p, first + p + 1);
    }
  });

  // Para la tarjeta gráfica, todas las fibras finas son un solo objeto. Un solo objeto se
  // pinta de una vez, y eso es mucho más rápido que miles de objetos sueltos.
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(centers, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(segments);

  // Líneas semitransparentes que se SUMAN al cruzarse («additive»): donde se juntan
  // muchas fibras, como en el borde del agujero, la luz se acumula y brilla más. Es lo
  // que pasa en la portada.
  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const lines = new THREE.LineSegments(geometry, material);

  // Capas 2 y 3 · Las cintas y las gotas (paso 6).
  const ribbons = createRibbons(fibers, centers, POINTS);
  const drops = createDrops(fibers, centers, POINTS);

  // Se pintan en este orden: primero las líneas, encima la pintura gruesa y encima las gotas.
  lines.renderOrder = 0;
  ribbons.object.renderOrder = 1;
  drops.object.renderOrder = 2;

  // Las tres capas, juntas en un grupo: lo que le hagamos al grupo (girarlo, inclinarlo)
  // les pasa a las tres.
  const object = new THREE.Group();
  object.add(lines, ribbons.object, drops.object);

  // =======================================================================================
  // Paso 5 · Todo gira
  // =======================================================================================

  // Velocidad de giro, en radianes por segundo. En negativo, la espiral parece que se
  // traga las fibras hacia el agujero; en positivo, que las escupe.
  const SPIN = -0.12;

  function update(dt) {
    object.rotation.z += SPIN * dt;
  }

  return { object, update };
}
