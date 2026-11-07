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
import { createRibbons, widthAt, densityAt } from './ribbons.js';
import { createDrops } from './drops.js';
import { createGuides } from './guides.js';
import { createMotion } from './motion.js';
import { isPhone } from './device.js';

// Una vuelta entera, en radianes.
const TAU = Math.PI * 2;

// Radio exterior del remolino. Es nuestra unidad: todo lo demás se mide respecto a él.
export const RADIUS = 1;

// Radio del agujero negro del centro (en la portada, el rodillo).
export const HOLE = 0.25;

// Lo que se hunde el embudo desde el borde hasta el agujero.
const DEPTH = 0.6;

// La forma de la espiral. La foto de la portada se hizo con un rodillo de pintura girando
// en un taladro: el agujero es el rodillo. Cada gota sale disparada en línea recta,
// tangente al rodillo, desde el punto del borde donde estaba al soltarse; y el rodillo
// sigue girando. En la foto, cada gota salió de un sitio distinto y lleva un tiempo
// distinto volando, y todas juntas dibujan una EVOLVENTE del círculo: la curva que deja
// un hilo al desenrollarse de un carrete del tamaño del agujero.
// Aun así, a la vista queda mejor la espiral logarítmica, así que es la de serie. La
// evolvente, con «?espiral=evolvente» en la dirección, para comparar.
export const SPIRAL = new URLSearchParams(location.search).get('espiral') === 'evolvente' ? 'involute' : 'log';

// Cuánto se enrosca la espiral logarítmica. 0 = fibras rectas hacia el centro; más = más
// vueltas.
const TWIST = 1.6;

// Para un punto a distancia r del centro, en qué ángulo pasa por ahí la espiral.
export function spiralAngle(r) {
  if (SPIRAL === 'log') {
    // Espiral logarítmica: cada vez que el radio se reduce a la mitad, la fibra gira el
    // mismo ángulo. Es la espiral de las galaxias, de los caracoles y de un desagüe.
    return TWIST * Math.log(RADIUS / r);
  }
  // Evolvente: «u» es cuánto hilo se ha desenrollado (medido en radios del carrete). El
  // punto está a r = HOLE · √(1 + u²) del centro, así que u = √((r / HOLE)² − 1), y ha
  // girado u − atan(u). Va en negativo para que se enrosque hacia el mismo lado que la
  // logarítmica.
  const u = Math.sqrt(Math.max((r / HOLE) ** 2 - 1, 0));
  return -(u - Math.atan(u));
}

// El embudo: plano en el borde y cada vez más empinado cerca del agujero, como el agua
// que se va por un desagüe. Vale 0 en el borde y -DEPTH en el agujero.
export function funnelDepth(r) {
  const k = (RADIUS / r - 1) / (RADIUS / HOLE - 1);
  return -DEPTH * k;
}

// =========================================================================================
// Paso 3 · Las fibras: líneas que siguen la corriente
// =========================================================================================

// Un número al azar entre a y b.
function random(a, b) {
  return a + Math.random() * (b - a);
}

// Verdadero con probabilidad p: chance(0.3) sale verdadero 3 de cada 10 veces.
function chance(p) {
  return Math.random() < p;
}

// Los quiebros: una curva al azar, suave e irregular, hecha con unos pocos «puntos de
// control». Cada uno es un desvío al azar entre -size y size; entre uno y el siguiente
// pasamos con una «S» suave (smoothstep). Una onda de senos se repite; esto no: cada
// fibra se abre, se cierra y da un quiebro donde le toca a ella.
function createBends(count, size) {
  return Array.from({ length: count }, () => random(-size, size));
}

function bendAt(bends, t) {
  if (bends.length < 2) return 0;
  // En qué tramo cae t (entre el punto de control «k» y el siguiente) y por dónde va de él.
  const x = t * (bends.length - 1);
  const k = Math.min(Math.floor(x), bends.length - 2);
  const f = x - k;
  const smooth = f * f * (3 - 2 * f);
  return bends[k] + (bends[k + 1] - bends[k]) * smooth;
}

// Una fibra es un trozo de la corriente. Para dibujarla basta con saber (el número de
// puntos de cada una lo pone su familia, en FAMILIES):
//   angle       en qué ángulo arranca;
//   from, to    a qué radio empieza y a qué radio acaba;
//   turn        cuánto gira de más (o de menos) respecto a la espiral, de punta a punta;
//   curl        cuánto se tuerce de más cerca de su punta libre: el ganchito (paso 4);
//   wobble      cuánto se ondula (paso 4);
//   waves       cuántas ondas hace a lo largo (paso 4);
//   bendsR/A    sus quiebros: los puntos de control de cuánto se aparta de la espiral, hacia
//               dentro o fuera (R) y de lado (A) (paso 4; los pone su familia);
//   phase       en qué punto de la onda empieza, para que no ondulen todas a la vez;
//   brightness  lo blanca que es;
//   width       su grosor: 0 = una línea de 1 píxel; si no, una cinta así de ancha (paso 6);
//   profile     cómo cambia su grosor (paso 6): 'paint', fina en las puntas y gorda en
//               medio; 'club', como una cerilla, fina en la base y gorda en la punta libre;
//   lumps       cuántas veces engorda y adelgaza a lo largo, si es una cinta (paso 6);
//   drop        el radio de la gotita de una punta, o 0 si no tiene (paso 6);
//   dropAt      su punta libre, la de la gotita: 0 = al principio, 1 = al final (paso 6).
//
// Esta función escribe en «out», a partir de la posición «i» (x, y, z seguidos), el punto
// de la fibra que está a la fracción t de su recorrido (0 = principio, 1 = final).
function fiberPoint(fiber, t, out, i) {
  // Las ramas (paso 6) recorren solo un trozo de la fórmula de su cinta madre, de
  // span[0] a span[1]: «u» es por dónde van de la madre. Las demás fibras, de 0 a 1.
  const [start, end] = fiber.span ?? [0, 1];
  const u = start + (end - start) * t;

  // La ondulación fina: dos ondas de distinta frecuencia sumadas. Una sola se ve mecánica,
  // como un muelle; con dos, la fibra parece que tiembla sola.
  const s = u * fiber.waves * TAU + fiber.phase;
  const wave = Math.sin(s) + 0.5 * Math.sin(2.7 * s + 1.3);

  // Los quiebros (paso 4): cuánto se aparta la fibra de la espiral, de lado y hacia
  // dentro o fuera, en este punto de su recorrido.
  let bendR = bendAt(fiber.bendsR, u);
  let bendA = bendAt(fiber.bendsA, u);

  // Una rama, además, se va apartando de su madre: nada en la bifurcación y cada vez más,
  // con una «S» suave, hasta su punta. Así primero van juntas y luego se abren en Y.
  if (fiber.fork) {
    const apart = t * t * (3 - 2 * t);
    bendR += fiber.fork.r * apart;
    bendA += fiber.fork.a * apart;
  }

  // El radio va de «from» a «to», más la ondulación y el quiebro. Nunca dentro del agujero.
  const r = Math.max(HOLE, fiber.from + (fiber.to - fiber.from) * u + fiber.wobble * wave + bendR);
  // El ganchito: un giro de más que apenas se nota en la base y crece hacia la punta libre
  // (al cubo: casi nada hasta el último tramo).
  const towardTip = fiber.dropAt === 1 ? u : 1 - u;
  const a = fiber.angle + spiralAngle(r) + fiber.turn * u + fiber.curl * towardTip ** 3 + bendA;

  out[i] = r * Math.cos(a);
  out[i + 1] = r * Math.sin(a);
  out[i + 2] = funnelDepth(r);
}

// =========================================================================================
// Paso 4 · Orgánico: no hay dos zonas iguales
// =========================================================================================
//
// En la portada las fibras no están repartidas por igual: hay sectores llenos y sectores
// casi vacíos. Y no todas son iguales: hay cuatro familias.

// Un mapa de densidad alrededor del círculo: para cada ángulo, un número entre 0 y 1 que
// dice cuánto se llena esa zona. Lo hacemos sumando unas pocas ondas que dan 1, 2, 3 y 5
// vueltas, cada una empezando en un sitio al azar: sale una curva suave e irregular, con
// grumos y huecos, distinta cada vez que se carga la página.
// «contrast» exagera la diferencia: con 1, suave; con 3, zonas llenas y zonas vacías.
// El suelo de los mapas: ninguna zona baja de esta parte de lo que tienen las más llenas.
// Así el reparto es irregular pero sin calvas. La zona CASI vacía y la MUY poblada no
// salen de aquí, sino de la composición (createComposition, más abajo).
const GAP_FLOOR = { desktop: 0.2, phone: 0.2 };

function createDensity(contrast) {
  const floor = isPhone() ? GAP_FLOOR.phone : GAP_FLOOR.desktop;
  const waves = [1, 2, 3, 5].map((turns) => ({ turns, phase: random(0, TAU), weight: 1 / turns }));
  const total = waves.reduce((sum, w) => sum + w.weight, 0);

  return (angle) => {
    let v = 0;
    for (const w of waves) v += w.weight * Math.sin(w.turns * angle + w.phase);
    // v / total va de -1 a 1: lo pasamos a 0…1 y lo elevamos para dar contraste. Y,
    // encima del suelo: de GAP_FLOOR a 1.
    const shape = ((v / total + 1) / 2) ** contrast;
    return floor + (1 - floor) * shape;
  };
}

// Dónde SE VE una fibra: el ángulo del punto medio de su recorrido. No es el ángulo donde
// empieza: una corriente gira en espiral unos 120° hasta el agujero, y una fibra del
// anillo recorre de media unos 50°. Si los mapas miraran dónde empiezan, las zonas
// pobladas y vacías saldrían corridas respecto a donde se ven.
function seenAngle(fiber) {
  const r = (fiber.from + fiber.to) / 2;
  return fiber.angle + spiralAngle(r) + fiber.turn * 0.5;
}

// Elige una fibra siguiendo el mapa de su familia: la creamos en un ángulo al azar y nos
// quedamos con ella con la probabilidad que diga el mapa donde se ve. Donde el mapa vale 1
// se acepta casi siempre; donde vale 0,05, una vez de cada veinte. Así las zonas llenas
// reciben muchas más fibras.
function pickFiber(family) {
  for (;;) {
    const fiber = family.create(random(0, TAU));
    if (Math.random() < family.density(seenAngle(fiber))) return fiber;
  }
}

// Familia 1 · Borde: filamentos diminutos (en la portada, de menos de un milímetro) y
// muchísimos, justo en el borde del agujero. Uno a uno casi no se ven, pero juntos
// dibujan el círculo: son los que hacen que el borde del agujero sea tan nítido.
// (La foto se hizo con un rodillo de pintura girando en un taladro: el agujero es el
// rodillo, y esto es la pintura justo al despegarse de él.)
function createMicro(angle) {
  return {
    angle,
    from: HOLE,
    to: HOLE + random(0.004, 0.018),
    turn: random(-0.05, 0.05),
    curl: 0,
    wobble: 0,
    waves: 1,
    phase: 0,
    brightness: random(0.5, 1),
    width: 0,
    profile: 'paint',
    lumps: 0,
    drop: chance(0.05) ? random(0.0015, 0.0025) : 0,
    dropAt: 1,
  };
}

// Familia 2 · Cerdas: cortas, pegadas al borde del agujero. Más de la mitad son
// «cerillas»: nacen finos en el borde y engordan hasta una puntita redonda. Cada uno se
// tuerce a su manera, alguno con un ganchito al final.
function createHair(angle) {
  const club = chance(0.6);
  const width = club ? random(0.003, 0.009) : 0;
  return {
    angle,
    // No todos nacen justo en el borde.
    from: HOLE + random(0, 0.012),
    // Casi todos muy cortos y unos pocos más largos (al cuadrado, el azar se va hacia 0).
    to: HOLE + 0.03 + 0.2 * Math.random() ** 1.5,
    turn: random(-0.15, 0.15),
    curl: random(-0.35, 0.35),
    wobble: random(0.001, 0.006),
    waves: random(0.5, 1.5),
    phase: random(0, TAU),
    brightness: random(0.4, 0.9),
    width,
    profile: 'club',
    lumps: random(0.5, 2),
    // Las cerillas casi siempre acaban en su gota, del ancho de la punta: así la punta
    // queda redonda. Los finos, a veces, en una gotita diminuta.
    drop: club ? (chance(0.85) ? width * random(0.5, 0.75) : 0) : chance(0.12) ? random(0.002, 0.004) : 0,
    dropAt: 1,
  };
}

// Familia 3 · Corrientes: largas, bajan en espiral desde fuera hasta el agujero o hasta
// medio camino. Se ondulan un poco.
function createStream(angle) {
  const from = HOLE + (RADIUS - HOLE) * random(0.3, 1);
  const to = Math.random() < 0.5 ? HOLE : Math.max(HOLE, from - random(0.1, 0.45));
  // Una de cada tres, cerilla fina: engorda hacia la punta de fuera, que es la libre (la
  // de dentro se pierde en el agujero). El resto, finas. Chorros gruesos, ninguno: la
  // pintura densa pesa más, sale con más inercia y acaba en el anillo de fuera.
  const width = chance(0.35) ? random(0.002, 0.005) : 0;
  const profile = 'club';
  return {
    angle,
    from,
    to,
    turn: random(-0.15, 0.15),
    curl: random(-0.25, 0.25),
    wobble: random(0.003, 0.02),
    waves: random(1, 3),
    phase: random(0, TAU),
    brightness: random(0.3, 1),
    width,
    profile,
    lumps: random(1, 3),
    drop: profile === 'club' && chance(0.7) ? width * random(0.5, 0.75) : chance(0.15) ? random(0.003, 0.006) : 0,
    dropAt: 0,
  };
}

// Familia 4 · Anillo: la maraña de fuera. Fibras que dan vueltas casi en círculo, muy
// onduladas, que se cruzan unas con otras. Algunas salen disparadas hacia fuera, como
// las salpicaduras de la pintura.
function createTangle(angle) {
  const splash = chance(0.1);

  // Es aquí donde está la pintura gruesa: alguna lámina ancha (como las de abajo a la
  // derecha en la portada), bastantes chorros y el resto, fibras finas.
  let width = 0;
  if (splash) width = chance(0.5) ? random(0.003, 0.009) : 0;
  else if (chance(0.015)) width = random(0.02, 0.035);
  else if (chance(0.12)) width = random(0.003, 0.009);

  // La pintura densa no se mezcla con la zona de dentro: las fibras finas del anillo
  // empiezan desde 0,72, pero las cintas, solo en el anillo de fuera, desde 0,84.
  const from = width ? random(0.84, 1.02) : random(0.72, 1.02);

  // Las salpicaduras casi siempre acaban en gota; las demás, a veces. Si la fibra es una
  // cinta, la gota es un poco más gorda que ella; si es fina, una gotita.
  const drop = chance(splash ? 0.8 : 0.3) ? (width ? width * random(0.6, 1) : random(0.003, 0.006)) : 0;

  return {
    angle,
    from,
    // Las cintas apenas se acercan al centro: como mucho, 0,05.
    to: splash ? from + random(0.08, 0.3) : from - random(0, width ? 0.05 : 0.12),
    // Las salpicaduras salen casi rectas; las demás recorren un buen trozo del círculo.
    turn: splash ? random(-0.2, 0.2) : random(0.5, 2.5) * (Math.random() < 0.8 ? -1 : 1),
    wobble: splash ? 0.005 : random(0.008, 0.03),
    waves: splash ? 1 : random(1.5, 3.5),
    phase: random(0, TAU),
    // La pintura gruesa, en gris claro (como en la portada); las fibras finas, más blancas.
    brightness: width ? random(0.55, 0.85) : random(0.5, 1),
    curl: 0,
    width,
    profile: 'paint',
    lumps: random(1, 4),
    drop,
    // Las salpicaduras, en la punta que sale disparada; las demás, en cualquiera.
    dropAt: splash || chance(0.5) ? 1 : 0,
    splash,
    // Las salpicaduras salen casi rectas: sus quiebros, mucho más pequeños; las cintas, la
    // mitad, porque con un quiebro brusco se doblan en «Z» (paso 4).
    bendScale: splash ? 0.15 : width ? 0.5 : 1,
  };
}

// Las familias. De cada una: su nombre y su color en el modo wire (paso 7), cuántas
// fibras tiene, de cuántos puntos está hecha cada una (un filamento del borde no necesita 64: con
// menos puntos, menos trabajo en cada fotograma), sus quiebros (cuántos puntos de control,
// cuánto se aparta hacia dentro o fuera y cuánto de lado; el anillo, el que más) y cómo de
// irregular es su reparto («contrast», el de su mapa de densidad, createDensity). Cada
// familia tiene su propio mapa: los huecos de las cerdas no coinciden con los del
// anillo. Los del borde, casi parejos: tienen que cerrar el círculo.
export const FAMILIES = [
  { name: 'borde', color: '#ffd166', count: 1400, points: 4, bends: [0, 0, 0], create: createMicro, contrast: 0.6 },
  { name: 'cerdas', color: '#ef476f', count: 425, points: 24, bends: [3, 0.006, 0.1], create: createHair, contrast: 1.5 },
  { name: 'corrientes', color: '#06d6a0', count: 638, points: 64, bends: [5, 0.02, 0.12], create: createStream, contrast: 1.2 },
  { name: 'anillo', color: '#4cc9f0', count: 280, points: 64, bends: [7, 0.05, 0.18], create: createTangle, contrast: 1 },
];

// Una rama de una cinta: una copia de su madre que solo recorre su recorrido desde «at»
// hasta el final (span), y que desde ahí se va apartando hacia un lado (fork). Más fina
// que la madre, con su propia gota en la punta. Comparte con la madre la ondulación y los
// quiebros: por eso, en la bifurcación, está justo encima de ella.
function createBranch(parent) {
  const at = random(0.3, 0.65);
  const width = parent.width * random(0.5, 0.75);
  return {
    ...parent,
    span: [at, 1],
    points: Math.max(12, Math.round(parent.points * (1 - at))),
    fork: { a: random(0.08, 0.25) * (chance(0.5) ? 1 : -1), r: random(-0.04, 0.04) },
    width,
    lumps: random(1, 3),
    drop: chance(0.7) ? width * random(0.6, 0.9) : 0,
    dropAt: 1,
    rank: Math.random(),
  };
}

// La composición de cada vórtice, como en la portada: DENTRO y el ANILLO se compensan.
//   - dentro (cerdas y corrientes): muy poblado en un lado y casi vacío en el contrario;
//   - el anillo, al revés: muy poblado (con la pintura gruesa) justo sobre el vacío de
//     dentro, y ralo, con hebras sueltas, donde dentro pesa.
// Donde dentro está vacío, fuera pesa; donde dentro pesa, fuera se aligera. El resto, difuso
// (los mapas de cada familia, con poco contraste). Al borde del agujero no le afecta: el
// círculo tiene que seguir cerrado. Las zonas miran dónde SE VE cada fibra (seenAngle).
const EMPTY_LEFT = 0.05; // lo que queda dentro en la zona vacía: el 5 %
const THIN_LEFT = 0.35; // lo que queda del anillo en su lado ralo: el 35 %
const FULL_BOOST = 3; // las zonas pobladas, tres veces más densas que el resto
const INSIDE_FAMILIES = ['cerdas', 'corrientes'];
const RING_FAMILIES = ['anillo'];

function createComposition() {
  const heavy = random(0, TAU);
  return {
    // Dónde pesa dentro, y dónde se vacía (enfrente, más o menos).
    heavy: { angle: heavy, width: THREE.MathUtils.degToRad(random(50, 75)) },
    light: { angle: heavy + Math.PI + random(-0.4, 0.4), width: THREE.MathUtils.degToRad(random(35, 55)) },
  };
}

// Cuánto se está dentro de una zona: 1 en su mitad de dentro, 0 fuera, y una «S» suave
// entre medias, para que el borde no parezca un corte.
function inside(angle, zone) {
  // La distancia en ángulo al centro de la zona, dando la vuelta por el lado corto.
  const d = Math.abs(((angle - zone.angle + Math.PI * 3) % TAU) - Math.PI);
  if (d >= zone.width) return 0;
  const edge = Math.min(1, Math.max(0, (d - zone.width * 0.5) / (zone.width * 0.5)));
  return 1 - edge * edge * (3 - 2 * edge);
}

// El mapa de densidad «density» de una familia, con la composición encima: «more» es la
// zona donde esa familia se puebla y «less», donde se vacía (hasta «left»). Todo dividido
// entre FULL_BOOST, para que el mapa siga yendo de 0 a 1 (pickFiber lo necesita así).
function shaped(density, more, less, left) {
  return (angle) => {
    const full = 1 + (FULL_BOOST - 1) * inside(angle, more);
    const empty = 1 - (1 - left) * inside(angle, less);
    return (density(angle) * full * empty) / FULL_BOOST;
  };
}

function withComposition(density, composition, name) {
  const { heavy, light } = composition;
  if (INSIDE_FAMILIES.includes(name)) return shaped(density, heavy, light, EMPTY_LEFT);
  // El anillo, al revés: se puebla sobre el vacío de dentro y se aligera donde dentro pesa
  // (las zonas, un poco más anchas: el anillo da más vuelta).
  if (RING_FAMILIES.includes(name)) {
    const wide = (zone) => ({ ...zone, width: zone.width * 1.3 });
    return shaped(density, wide(light), wide(heavy), THIN_LEFT);
  }
  return density;
}

// Crea todas las fibras y apunta en cada una de qué familia es, cuántos puntos tiene y
// dónde empieza («first») en la lista de puntos de todas. Y un número al azar, «rank»,
// para que los modos que pintan menos líneas (paso 7) sepan cuáles quitar.
// En el móvil (pantalla táctil o estrecha), poco más de la mitad de las fibras: se ve
// menos denso en una pantalla pequeña, y son unos 37.000 puntos menos que mover en cada
// fotograma (con todas, en un móvil iba a trompicones).
const PHONE_SHARE = 0.55;

// Y en escritorio, un 15 % menos de las que dice FAMILIES: menos denso, más aireado.
const DESKTOP_SHARE = 0.85;

function createFibers() {
  const fibers = [];
  let first = 0;
  const share = isPhone() ? PHONE_SHARE : DESKTOP_SHARE;
  const composition = createComposition();
  FAMILIES.forEach((family, index) => {
    // Su mapa de densidad, sorteado de nuevo en cada vórtice: así cada uno tiene sus
    // propias variaciones. Y, encima, la composición del vórtice.
    family.density = withComposition(createDensity(family.contrast), composition, family.name);
    // Cuántas tiene en este vórtice (las que dice el cajetín del modo wire, notes.js).
    family.made = Math.round(family.count * share);
    for (let n = 0; n < family.made; n++) {
      const fiber = pickFiber(family);
      fiber.family = index;
      fiber.points = family.points;
      fiber.first = first;
      fiber.rank = Math.random();
      const [bends, sizeR, sizeA] = family.bends;
      const scale = fiber.bendScale ?? 1;
      fiber.bendsR = createBends(bends, sizeR * scale);
      fiber.bendsA = createBends(bends, sizeA * scale);
      first += family.points;
      fibers.push(fiber);

      // Una de cada tres cintas del anillo se divide en dos (paso 6): detrás de ella va su
      // rama, que empieza a mitad de camino.
      if (fiber.width > 0 && family.create === createTangle && !fiber.splash && chance(0.3)) {
        const branch = createBranch(fiber);
        branch.first = first;
        first += branch.points;
        fibers.push(branch);
      }
    }
  });
  return fibers;
}

// Los círculos que van en las puntas de las fibras (paso 6):
//   - las cintas, en sus dos extremos, una tapa redonda de su mismo ancho: un líquido
//     nunca acaba en punta;
//   - las que tienen gota, en su punta libre, la gota (o la tapa, si es más gorda).
function createCircles(fibers) {
  const circles = [];
  fibers.forEach((fiber) => {
    const ends = [fiber.first, fiber.first + fiber.points - 1];
    [0, 1].forEach((end) => {
      const cap = fiber.width > 0 ? widthAt(fiber, end) / 2 : 0;
      const drop = fiber.dropAt === end ? fiber.drop : 0;
      const radius = Math.max(cap, drop);
      // La tapa, con la densidad de la cinta en esa punta, para que no se note el empalme.
      const density = fiber.width > 0 ? densityAt(fiber, end) : 1;
      if (radius > 0) circles.push({ fiber, point: ends[end], radius, density });
    });
  });
  return circles;
}

// =========================================================================================
// El remolino: las fibras en tres capas de Three.js (pasos 3 y 6) que giran (paso 5)
// =========================================================================================

export function createVortex() {
  const fibers = createFibers();
  const last = fibers[fibers.length - 1];
  const totalPoints = last.first + last.points;

  // La línea central de todas las fibras, en una sola lista enorme (x, y, z seguidos).
  // Las tres capas (líneas, cintas y gotas) se construyen a partir de ella: cuando el
  // cursor la mueva (paso 8), todas la seguirán.
  const centers = new Float32Array(totalPoints * 3);
  const colors = new Float32Array(totalPoints * 3);

  for (const fiber of fibers) {
    for (let p = 0; p < fiber.points; p++) {
      fiberPoint(fiber, p / (fiber.points - 1), centers, (fiber.first + p) * 3);
    }
  }

  // Capa 1 · Las fibras finas, como líneas. Una lista de parejas de puntos que se unen
  // con una línea: (0,1), (1,2), (2,3)… dentro de cada fibra, sin unir el último punto de
  // una con el primero de la siguiente. Las fibras gruesas no se unen: esas son cintas.
  // «share» es la parte de las finas que se pinta: 1 = todas; 0,5 = la mitad (paso 7).
  function lineSegments(share) {
    const segments = [];
    for (const fiber of fibers) {
      if (fiber.width > 0 || fiber.rank > share) continue;
      for (let p = 0; p < fiber.points - 1; p++) segments.push(fiber.first + p, fiber.first + p + 1);
    }
    return segments;
  }

  // Para la tarjeta gráfica, todas las fibras finas son un solo objeto. Un solo objeto se
  // pinta de una vez, y eso es mucho más rápido que miles de objetos sueltos.
  const geometry = new THREE.BufferGeometry();
  const centersAttribute = new THREE.BufferAttribute(centers, 3);
  // «Dynamic»: le avisamos a la GPU de que esta lista va a cambiar en cada fotograma.
  centersAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', centersAttribute);
  const colorAttribute = new THREE.BufferAttribute(colors, 3);
  geometry.setAttribute('color', colorAttribute);
  geometry.setIndex(lineSegments(1));

  // Líneas semitransparentes. Cómo se mezclan al cruzarse lo decide cada modo (paso 7).
  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
  });

  const lines = new THREE.LineSegments(geometry, material);

  // Capas 2 y 3 · Las cintas y los círculos de las puntas (paso 6).
  const ribbons = createRibbons(fibers, centers);
  const drops = createDrops(centers, createCircles(fibers));

  // Se pintan en este orden: primero las líneas, encima la pintura gruesa y encima las gotas.
  lines.renderOrder = 0;
  ribbons.object.renderOrder = 1;
  drops.object.renderOrder = 2;

  // Las guías del modo wire (paso 7): el agujero, el borde, la corriente y los mapas.
  const guides = createGuides();

  // Todo junto en un grupo, «spin»: lo que le hagamos al grupo (girarlo) les pasa a todas
  // las capas. Y ese grupo, dentro de otro, «tilt», que lo inclina (paso 10).
  //
  // ¿Por qué dos? Para inclinar sobre el centro del agujero, que está en el fondo del
  // embudo (z = -DEPTH), y no sobre el borde: así el agujero no se mueve al inclinar.
  // «tilt» se pone en el fondo del embudo, y «spin», dentro, se sube otra vez DEPTH: el
  // remolino se queda donde estaba, pero el eje de la inclinación pasa por el agujero.
  const spin = new THREE.Group();
  spin.position.z = DEPTH;
  spin.add(lines, ribbons.object, drops.object, guides);

  const tilt = new THREE.Group();
  tilt.position.z = -DEPTH;
  tilt.add(spin);

  // =======================================================================================
  // Paso 10 · El agujero: un círculo fijo, como la sombra de un agujero negro
  // =======================================================================================
  //
  // La sombra de un agujero negro se ve redonda desde cualquier lado: lo que se inclina y
  // se deforma es el disco de materia que gira a su alrededor. Así que el agujero ya no es
  // solo el hueco que dejan las fibras: es un disco del color del fondo que siempre mira a
  // la cámara y se pinta encima de todo. Lo que el cursor empuje hacia dentro desaparece al
  // cruzar su borde, como tragado, y el borde queda siempre perfecto. Está fuera de «tilt»:
  // no se inclina ni gira.
  const hole = new THREE.Mesh(
    new THREE.CircleGeometry(HOLE, 128),
    // «depthTest: false»: se pinta encima aunque haya fibras delante.
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 1, depthTest: false, depthWrite: false }),
  );
  hole.position.z = -DEPTH;
  hole.renderOrder = 10;

  // Aun así, si no se inclinara nada, al inclinar mucho el plano parecería un círculo
  // pegado encima. Se inclina un poco: esta parte de lo que se inclina el plano (0 = nada,
  // 1 = lo mismo). Como está justo en el eje de la inclinación, no se mueve de su sitio:
  // solo se hace un poco elipse. (Con menos no se nota: un círculo inclinado 12° solo se
  // estrecha un 2 %.)
  const HOLE_TILT = 0.9;

  // En el modo wire, el horizonte dibujado: el borde del agujero.
  const horizon = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 128 }, (_, k) => {
        const a = (k / 128) * Math.PI * 2;
        return new THREE.Vector3(HOLE * Math.cos(a), HOLE * Math.sin(a), 0);
      }),
    ),
    new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthTest: false }),
  );
  horizon.renderOrder = 11;
  hole.add(horizon);

  // Lo que se añade a la escena: el remolino (inclinado y girando) y el agujero.
  const object = new THREE.Group();
  object.add(tilt, hole);

  // Three.js no pinta lo que cree que está fuera de la pantalla, y lo calcula con el
  // tamaño de cada capa al crearla. Como ahora las fibras se mueven, que no lo calcule.
  for (const layer of [lines, ribbons.object, drops.object]) layer.frustumCulled = false;

  // Los muelles y la inercia de cada punto (paso 8).
  const motion = createMotion(fibers, centers);

  // =======================================================================================
  // Paso 5 · Todo gira
  // =======================================================================================

  // Velocidad de giro, en radianes por segundo. En negativo, la espiral parece que se
  // traga las fibras hacia el agujero; en positivo, que las escupe.
  const SPIN = -0.12;

  // El giro respira (paso 8): acelera y frena un poco, con dos ondas lentas de distinta
  // duración, para que el pulso no se repita igual. Al acelerar y frenar, las fibras se
  // quedan atrás y se pasan: eso es lo que se ve como inercia.
  const PULSE = 0.5;
  function spinAt(time) {
    return SPIN * (1 + PULSE * (0.7 * Math.sin(0.6 * time) + 0.3 * Math.sin(1.7 * time + 1)));
  }

  let time = 0;
  let spinSpeed = spinAt(0);

  // «cursor»: dónde está el ratón o el dedo y a qué velocidad va (pointer.js, paso 9).
  function update(dt, cursor) {
    time += dt;

    // El agujero, inclinado un poco con el plano (paso 10).
    hole.rotation.x = tilt.rotation.x * HOLE_TILT;
    hole.rotation.y = tilt.rotation.y * HOLE_TILT;
    const nextSpeed = spinAt(time);
    // La aceleración del giro: cuánto ha cambiado la velocidad, por segundo.
    const alpha = (nextSpeed - spinSpeed) / dt;
    spinSpeed = nextSpeed;
    spin.rotation.z += spinSpeed * dt;

    // Cada punto, con su muelle; y las tres capas, rehechas sobre los puntos movidos.
    motion.update(dt, alpha, time, cursor);
    centersAttribute.needsUpdate = true;
    ribbons.update();
    drops.update();
  }

  // =======================================================================================
  // Paso 7 · Modos de visualización: el mismo remolino, pintado de otra manera
  // =======================================================================================
  //
  // Un modo (modes.js) es una lista de ajustes. Aquí los aplicamos: los colores de las
  // fibras, cómo se mezclan las líneas, cuántas se pintan, si las cintas van en alambre y
  // si se ven las guías.

  const paint = new THREE.Color();
  const color = new THREE.Color();

  function setStyle(style) {
    // El color de cada fibra: en «tone», el color de la pintura del modo, más claro o más
    // oscuro según lo blanca que sea la fibra; en «family», el color de su familia.
    paint.set(style.paint);
    const colorOf =
      style.palette === 'family'
        ? (fiber) => color.set(FAMILIES[fiber.family].color)
        : (fiber) => color.copy(paint).multiplyScalar(fiber.brightness);

    for (const fiber of fibers) {
      colorOf(fiber);
      for (let p = 0; p < fiber.points; p++) color.toArray(colors, (fiber.first + p) * 3);
    }
    colorAttribute.needsUpdate = true;
    ribbons.recolor(colorOf);
    drops.recolor(colorOf);

    // Las líneas: con «add» se SUMAN al cruzarse, y donde se juntan muchas la luz se
    // acumula y brilla (y, si son demasiadas, se quema); con «normal», la de encima tapa a
    // la de debajo, y nunca pasa del color de la pintura.
    material.opacity = style.lineOpacity;
    material.blending = style.lineBlending === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending;
    // Cambiar la mezcla obliga a la GPU a preparar el material otra vez.
    material.needsUpdate = true;
    geometry.setIndex(lineSegments(style.lineShare));

    ribbons.object.material.wireframe = style.wireframe;
    drops.object.material.wireframe = style.wireframe;
    guides.visible = style.guides;
    // El agujero, del color del fondo (y con su borde dibujado en el modo wire).
    hole.material.color.set(style.background);
    horizon.visible = style.guides;
  }

  // Los números del remolino, para el cajetín del modo wire (notes.js).
  const info = { fibers: fibers.length, points: totalPoints, spin: SPIN };

  // «object» va a la escena; «tilt», a tilt.js, para inclinarlo; «spin» es el sistema del
  // remolino, al que pointer.js pasa el cursor.
  // Para tirarlo (al crear uno nuevo, main.js): libera lo que ocupa en la tarjeta gráfica,
  // sus listas de puntos y sus materiales. Si no, cada vórtice nuevo dejaría el viejo ahí.
  function dispose() {
    object.traverse((child) => {
      child.geometry?.dispose();
      child.material?.dispose();
    });
  }

  // «kick»: el empujón del latido (heartbeat.js), para los muelles de cada punto.
  return { object, tilt, spin, update, setStyle, info, dispose, kick: motion.kick };
}
