// =========================================================================================
// Compartir: una foto de cómo está ahora el remolino
// =========================================================================================
//
// Como en vertikis: el botón de arriba a la derecha abre el menú de compartir del sistema
// con una foto del momento y «VERTIK.NET» en una esquina. Donde no se puede compartir una
// imagen (Firefox de escritorio, por ejemplo), el botón no aparece.
//
// Dos cosas que no pasaban en vertikis:
//   - WebGL borra su imagen en cuanto el navegador la enseña. Así que, al pulsar, pintamos
//     un fotograma y lo copiamos en el acto, sin esperar a nada.
//   - Parte de lo que se ve no está en el canvas: el cartón y la fotocopia del modo
//     portada son capas de HTML, y la suavidad de lente es un filtro CSS. Las rehacemos
//     en la foto, para que salga como se ve.

import { tonerTile } from './toner.js';

// Una imagen a partir de una dirección (las del cartón son SVG metidos en el CSS).
function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

// La dirección de la imagen de fondo de un elemento (o de su ::before / ::after), sacada
// del CSS: «url("…")» → «…».
function backgroundOf(el, pseudo) {
  const value = getComputedStyle(el, pseudo).backgroundImage;
  const match = /url\("?(.*?)"?\)$/.exec(value);
  return match ? match[1] : null;
}

// «stage»: el escenario (stage.js). «current()»: el modo que está puesto, { name, style }.
export function setupShare(stage, current) {
  const button = document.querySelector('[data-share]');
  if (!button) return;

  // ¿Este navegador sabe compartir imágenes? Se pregunta con una imagen de prueba.
  const canShareImages = (() => {
    try {
      const probe = new File([new Uint8Array(1)], 'probe.png', { type: 'image/png' });
      return !!navigator.canShare?.({ files: [probe] });
    } catch {
      return false;
    }
  })();
  button.hidden = !canShareImages;
  if (!canShareImages) return;

  // Las imágenes del cartón, cargadas desde ya: al pulsar no da tiempo a esperarlas.
  const wear = document.querySelector('.wear');
  const grain = loadImage(backgroundOf(wear, '::before'));
  const stains = loadImage(backgroundOf(wear, '::after'));

  function snapshot() {
    const { name, style } = current();
    const canvas = stage.renderer.domElement;
    // Pintamos un fotograma ahora mismo, para copiarlo antes de que WebGL lo borre.
    stage.render();

    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const o = out.getContext('2d');
    const dpr = canvas.width / window.innerWidth;

    o.fillStyle = style.background;
    o.fillRect(0, 0, out.width, out.height);
    // La suavidad de lente, como en pantalla.
    if (style.soften && canvas.style.filter) o.filter = `blur(${style.soften * dpr}px)`;
    o.drawImage(canvas, 0, 0);
    o.filter = 'none';

    if (name === 'portada') {
      // El cartón: el grano en mosaico y las manchas a toda la foto, mezclados con
      // «soft-light» como en style.css; los bordes, algo más oscuros; y la fotocopia.
      o.globalCompositeOperation = 'soft-light';
      if (grain.complete) {
        const pattern = o.createPattern(grain, 'repeat');
        pattern.setTransform(new DOMMatrix().scale(dpr));
        o.globalAlpha = 0.55;
        o.fillStyle = pattern;
        o.fillRect(0, 0, out.width, out.height);
      }
      if (stains.complete) {
        o.globalAlpha = 0.4;
        const side = Math.max(out.width, out.height);
        o.drawImage(stains, (out.width - side) / 2, (out.height - side) / 2, side, side);
      }
      o.globalCompositeOperation = 'source-over';
      o.globalAlpha = 1;
      const edge = o.createRadialGradient(
        out.width / 2, out.height / 2, Math.min(out.width, out.height) * 0.35,
        out.width / 2, out.height / 2, Math.max(out.width, out.height) * 0.75,
      );
      edge.addColorStop(0, 'rgba(0, 0, 0, 0)');
      edge.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
      o.fillStyle = edge;
      o.fillRect(0, 0, out.width, out.height);
      const toner = tonerTile();
      if (toner) {
        o.globalAlpha = 0.35;
        o.fillStyle = o.createPattern(toner, 'repeat');
        o.fillRect(0, 0, out.width, out.height);
        o.globalAlpha = 1;
      }
    }

    // «VERTIK.NET» arriba a la izquierda, del color de la pintura a media luz.
    const size = Math.max(11, Math.min(window.innerWidth, window.innerHeight) * 0.03) * dpr;
    o.font = `${size}px ui-monospace, Menlo, Consolas, monospace`;
    o.textBaseline = 'top';
    o.globalAlpha = 0.5;
    o.fillStyle = style.paint;
    const margin = Math.max(12 * dpr, size * 1.2);
    o.fillText('VERTIK.NET', margin, margin);
    o.globalAlpha = 1;

    // Síncrono (sin toBlob) para no perder el gesto del usuario antes de compartir.
    const bin = atob(out.toDataURL('image/png').split(',')[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], 'vortik.png', { type: 'image/png' });
  }

  button.addEventListener('click', async () => {
    // Solo la imagen: con título o texto, «Copiar» de Chrome guarda dos cosas.
    try {
      await navigator.share({ files: [snapshot()] });
    } catch (err) {
      // Cerrar el menú sin compartir no es un fallo; cualquier otro error sí: fuera botón.
      if (err?.name !== 'AbortError') button.hidden = true;
    }
  });

  // Para probarlo desde la consola: vortik.snapshot() da la foto sin compartirla.
  window.vortik = { ...window.vortik, snapshot };
}
