// =========================================================================================
// Paso 7 · Modos de visualización
// =========================================================================================
//
// El mismo remolino, pintado de otra manera. Cada modo es solo una lista de ajustes:
//   background    el color del fondo;
//   paint         el color de la pintura;
//   palette       'tone': cada fibra, del color de la pintura, más clara u oscura según
//                 su brillo; 'family': cada fibra, del color de su familia;
//   lineOpacity   lo opacas que son las líneas finas;
//   lineBlending  'add': se suman al cruzarse (brillan, y si son muchas se queman);
//                 'normal': la de encima tapa a la de debajo;
//   lineShare     qué parte de las líneas finas se pinta (1 = todas);
//   wireframe     las cintas y las gotas, en alambre: se ven sus triángulos;
//   guides        las guías del esquema (guides.js).
//
// Como en vertikis: «Prev» y «Next» en el pie, o las flechas del teclado, pasan de uno a
// otro, y la dirección lleva el modo (#portada, #esquema) para poder compartirlo.

export const MODES = {
  // Noche: blanco sobre negro, con las líneas sumándose. El primero que hicimos.
  noche: {
    background: '#000000',
    paint: '#ffffff',
    palette: 'tone',
    lineOpacity: 0.4,
    lineBlending: 'add',
    lineShare: 1,
    wireframe: false,
    guides: false,
  },

  // Portada: como el vinilo. Fondo de cartón gris carbón, pintura blanco roto, menos
  // líneas y sin sumarse (la portada es más aireada que «noche»). El grano y el desgaste
  // del cartón los pone style.css, encima del canvas.
  portada: {
    background: '#2a2926',
    paint: '#e6e2d6',
    palette: 'tone',
    lineOpacity: 0.55,
    lineBlending: 'normal',
    lineShare: 0.5,
    wireframe: false,
    guides: false,
  },

  // Esquema: para ver qué está pasando. Cada familia de su color, las cintas en alambre,
  // menos líneas (para que se distinga algo) y las guías.
  esquema: {
    background: '#0e1116',
    paint: '#ffffff',
    palette: 'family',
    lineOpacity: 0.6,
    lineBlending: 'normal',
    lineShare: 0.35,
    wireframe: true,
    guides: true,
  },
};

// El orden en que pasan Prev y Next. El primero es el de siempre (sin # en la dirección).
const ORDER = Object.keys(MODES);

// Prepara los modos. «apply(name, style)» se llama cada vez que cambia el modo, y la
// primera vez, con el de la dirección.
export function setupModes(apply) {
  let current = ORDER[0];

  function setMode(name) {
    current = MODES[name] ? name : ORDER[0];
    apply(current, MODES[current]);
    // La dirección lleva el modo, sin llenar el historial (el botón «atrás» no se entera).
    const hash = current === ORDER[0] ? '' : `#${current}`;
    if (location.hash !== hash) history.replaceState(null, '', location.pathname + location.search + hash);
  }

  // El anterior (by = -1) o el siguiente (by = 1), dando la vuelta al llegar al final.
  function stepMode(by) {
    const n = ORDER.length;
    setMode(ORDER[(ORDER.indexOf(current) + by + n) % n]);
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

  // Al abrir una dirección con #portada o #esquema (o al cambiarla a mano).
  const fromHash = () => setMode(decodeURIComponent(location.hash.slice(1)));
  window.addEventListener('hashchange', fromHash);
  fromHash();
}
