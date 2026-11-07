// =========================================================================================
// Paso 7 · Modos de visualización
// =========================================================================================
//
// El mismo remolino, pintado de otra manera. Cada modo es solo una lista de ajustes:
//   background    el color del fondo;
//   paint         el color de la pintura;
//   palette       'tone': cada fibra, del color de la pintura, más clara u oscura según
//                 su brillo; 'family': cada fibra, del color de su familia; 'holo': cada
//                 fibra, de un color del arcoíris según su ángulo (como una lámina
//                 holográfica);
//   lineOpacity   lo opacas que son las líneas finas;
//   lineBlending  'add': se suman al cruzarse (brillan, y si son muchas se queman);
//                 'normal': la de encima tapa a la de debajo;
//   lineShare     qué parte de las líneas finas se pinta (1 = todas);
//   wireframe     las cintas y las gotas, en alambre: se ven sus triángulos;
//   guides        las guías del modo wire (guides.js);
//   soften        un desenfoque de medio píxel sobre todo, en píxeles: en WebGL los bordes
//                 salen perfectos y el blanco corta; la foto tiene la suavidad de la lente;
//   phone         (si lo tiene) los ajustes que cambian en el móvil;
//   hidden        (si lo tiene) fuera de Prev y Next: solo con su # en la dirección o
//                 desde la consola (vortik.holo()).
//
// Como en vertikis: «Prev» y «Next» en el pie, o las flechas del teclado, pasan de uno a
// otro, y la dirección lleva el modo (#cover, #wire) para poder compartirlo. Wire, siempre
// el último: es el de ver por dentro, no uno más. Holo está escondido: solo con #holo.

export const MODES = {
  // Noche: blanco sobre negro, con las líneas sumándose. El primero que hicimos. El negro,
  // con un punto cálido (algo de marrón): el negro puro, con el blanco encima, corta.
  noche: {
    background: '#100e0b',
    paint: '#fffdf8',
    palette: 'tone',
    lineOpacity: 0.45,
    lineBlending: 'add',
    lineShare: 0.8,
    wireframe: false,
    guides: false,
    soften: 0.35,
    // En el móvil, las líneas sumándose se veían demasiado contundentes (menos resolución y
    // sin la suavidad de lente): menos opacas y menos.
    phone: { lineOpacity: 0.28, lineShare: 0.55 },
  },

  // Cover: como el vinilo. Fondo de cartón gris carbón, pintura blanco roto, menos
  // líneas y sin sumarse (la portada es más aireada que «noche»). El grano y el desgaste
  // del cartón los pone style.css, encima del canvas.
  cover: {
    background: '#2a2926',
    paint: '#e9e6dc',
    palette: 'tone',
    lineOpacity: 0.45,
    lineBlending: 'normal',
    lineShare: 0.4,
    wireframe: false,
    guides: false,
    soften: 0.45,
  },

  // Holo: como una lámina holográfica sobre negro mate. Cada fibra, de un color del
  // arcoíris según dónde está alrededor del agujero (dos vueltas de arcoíris por vuelta
  // de remolino), apagado y metálico, no de neón. Sin sumarse: la lámina no brilla, refleja.
  holo: {
    background: '#0a0a0b',
    paint: '#f2efe8',
    palette: 'holo',
    lineOpacity: 0.55,
    lineBlending: 'normal',
    lineShare: 0.6,
    wireframe: false,
    guides: false,
    soften: 0.35,
    hidden: true,
  },

  // Wire: para ver qué está pasando. Cada familia de su color, las cintas en alambre,
  // menos líneas (para que se distinga algo) y las guías.
  wire: {
    background: '#0e1116',
    paint: '#ffffff',
    palette: 'family',
    lineOpacity: 0.6,
    lineBlending: 'normal',
    lineShare: 0.35,
    wireframe: true,
    guides: true,
    soften: 0,
  },
};

// Todos los modos, y los que pasan Prev y Next (sin los escondidos). El primero es el de
// siempre (sin # en la dirección).
const ALL = Object.keys(MODES);
const ORDER = ALL.filter((name) => !MODES[name].hidden);

// Prepara los modos. «apply(name, style)» se llama cada vez que cambia el modo, y la
// primera vez, con el de la dirección. Devuelve «setMode(name)», para ponerlos a mano.
export function setupModes(apply) {
  let current = ORDER[0];

  function setMode(name) {
    current = MODES[name] ? name : ORDER[0];
    apply(current, MODES[current]);
    // La dirección lleva el modo, sin llenar el historial (el botón «atrás» no se entera).
    const hash = current === ORDER[0] ? '' : `#${current}`;
    if (location.hash !== hash) history.replaceState(null, '', location.pathname + location.search + hash);
  }

  // El anterior (by = -1) o el siguiente (by = 1), dando la vuelta al llegar al final y
  // saltando los escondidos (desde uno escondido, el de al lado en la lista: de holo, Next
  // lleva a wire y Prev a cover).
  function stepMode(by) {
    const n = ALL.length;
    let k = ALL.indexOf(current);
    do k = (k + by + n) % n;
    while (MODES[ALL[k]].hidden);
    setMode(ALL[k]);
  }

  for (const [selector, by] of [['[data-mode-prev]', -1], ['[data-mode-next]', 1]]) {
    for (const el of document.querySelectorAll(selector)) el.addEventListener('click', () => stepMode(by));
  }

  // Flecha izquierda, el anterior; flecha derecha, el siguiente.
  window.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    stepMode(e.key === 'ArrowLeft' ? -1 : 1);
  });

  // Al abrir una dirección con #cover o #wire (o al cambiarla a mano). «portada» y
  // «esquema» eran sus nombres antiguos: los enlaces de antes siguen funcionando.
  const OLD_NAMES = { portada: 'cover', esquema: 'wire' };
  const fromHash = () => {
    const asked = decodeURIComponent(location.hash.slice(1));
    setMode(OLD_NAMES[asked] ?? asked);
  };
  window.addEventListener('hashchange', fromHash);
  fromHash();

  return setMode;
}
