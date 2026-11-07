// =========================================================================================
// Paso 7 · El desgaste de fotocopia (modo portada)
// =========================================================================================
//
// Como en el modo evil de vertikis: un mosaico de motas que se repite por toda la pantalla.
//   - polvo fino por todas partes, motas claras y oscuras (unas se ven sobre el cartón y
//     otras sobre la pintura);
//   - zonas gastadas, nubes de motas oscuras: ahí al tóner le falta tinta;
//   - rayas verticales rotas, como las que deja el tambor de la fotocopiadora.
// Se dibuja una sola vez en un <canvas> aparte, a la resolución real de la pantalla (para
// que cada mota sea un píxel de verdad), y se pone de fondo de la capa .toner.

// tile     lado del mosaico, en píxeles CSS;
// dust     cuántas motas de polvo, por píxel;
// patches  cuántas zonas gastadas, y patch: cuántas motas en cada una;
// reach    lo grande que es una zona gastada (entre y, en píxeles CSS);
// streaks  cuántas rayas, y gap: cada cuánto se rompen.
const TONER = { tile: 640, dust: 0.012, patches: 6, patch: 3000, reach: [30, 100], streaks: 5, gap: 18 };

// Los colores de las motas: el de la pintura y el negro.
const LIGHT = '230, 226, 214';
const DARK = '0, 0, 0';

function random(a, b) {
  return a + Math.random() * (b - a);
}

let done = false;

// Pinta el mosaico y lo pone de fondo de «el». Solo la primera vez que se pide.
export function applyToner(el) {
  if (done) return;
  done = true;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = Math.round(TONER.tile * dpr);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Una mota de w × h píxeles, de un color y algo transparente. Si se sale del mosaico,
  // aparece por el otro lado: así, al repetirse, no se ven las costuras.
  function speck(x, y, w, h, rgb) {
    ctx.fillStyle = `rgba(${rgb}, ${random(0.25, 0.9)})`;
    ctx.fillRect((x + size) % size, (y + size) % size, w, h);
  }

  // Polvo fino: la mitad claro y la mitad oscuro.
  for (let n = 0; n < size * size * TONER.dust; n++) {
    speck(random(0, size), random(0, size), 1, 1, Math.random() < 0.5 ? LIGHT : DARK);
  }

  // Zonas gastadas: motas oscuras alrededor de un centro. La suma de dos azares hace que
  // haya muchas por dentro y cada vez menos hacia el borde, que se deshace.
  for (let p = 0; p < TONER.patches; p++) {
    const cx = random(0, size);
    const cy = random(0, size);
    const reach = random(...TONER.reach) * dpr;
    for (let n = 0; n < TONER.patch * dpr * dpr; n++) {
      const a = random(0, Math.PI * 2);
      const d = reach * (Math.random() + Math.random());
      speck(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1, 1, DARK);
    }
  }

  // Rayas del tambor: claras, verticales, a trozos y temblando un poco de lado a lado.
  for (let n = 0; n < TONER.streaks; n++) {
    const x = random(0, size);
    for (let y = 0; y < size; y += 1 + Math.random() * TONER.gap * dpr) {
      speck(x + random(-1, 1), y, 1, 1 + Math.random() * 5 * dpr, LIGHT);
    }
  }

  el.style.backgroundImage = `url(${canvas.toDataURL()})`;
  // El mosaico tiene dpr veces más píxeles que su tamaño CSS: se muestra a su tamaño CSS.
  el.style.backgroundSize = `${TONER.tile}px`;
}
