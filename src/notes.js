// =========================================================================================
// Paso 7 · El cajetín del modo wire
// =========================================================================================
//
// Como en el modo wire de vertikis: una ficha abajo a la derecha que dice qué es esto y
// con qué números funciona. Una fila por línea; las familias, con el cuadrito de su color
// (el mismo con el que se pintan en el modo wire).

import { RADIUS, HOLE, FAMILIES, SPIRAL } from './vortex.js';

// Rellena el cajetín «el» con los números del remolino («info», de createVortex).
export function fillNotes(el, info) {
  const rows = [
    'VORTIK · WIRE',
    SPIRAL === 'log' ? 'ESPIRAL LOG. + EMBUDO' : 'EVOLVENTE + EMBUDO',
    'MUELLES + INERCIA + CURSOR',
    // Los fotogramas por segundo, de verdad: los va poniendo createFps (abajo).
    '<span data-fps>—</span> FPS',
    `${info.fibers} FIBRAS · ${(info.points / 1000).toFixed(1)}K PTS`,
    // ω (omega): la velocidad de giro, en radianes por segundo. En minúscula aunque el
    // cajetín vaya en mayúsculas: en mayúscula (Ω) serían ohmios.
    `R ${RADIUS} · AGUJERO ${HOLE} · <span class="notes__keep">ω</span> ${info.spin}`,
    ...FAMILIES.map((f) => `<i style="--c: ${f.color}"></i>${f.name} · ${f.made} × ${f.points} PTS`),
    'VERTIK.NET',
  ];
  el.innerHTML = rows.map((row) => `<div>${row}</div>`).join('');
}

// En el móvil, el cajetín se despliega con «Info», en el pie, justo encima del texto. El
// pie ocupa más o menos líneas según el ancho de la pantalla: lo medimos (y lo volvemos a
// medir cuando cambia) y lo dejamos en --credit-height para que style.css lo coloque encima.
export function setupNotesToggle() {
  const toggle = document.querySelector('[data-notes-toggle]');
  const credit = document.querySelector('.credit');
  if (!toggle || !credit) return;

  const root = document.documentElement;
  new ResizeObserver(() => {
    root.style.setProperty('--credit-height', `${Math.round(credit.getBoundingClientRect().height)}px`);
  }).observe(credit);

  toggle.addEventListener('click', () => {
    const open = !root.classList.contains('is-notes-open');
    root.classList.toggle('is-notes-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Cerrar info' : 'Info';
  });
}

// El contador de fotogramas por segundo del cajetín: cuenta los fotogramas y, cada medio
// segundo, escribe cuántos han salido por segundo. Se llama en cada fotograma. Mide con el
// reloj del navegador y no con el dt del bucle, que está limitado (stage.js): por debajo de
// 20 fps, con dt, marcaría de más.
export function createFps() {
  const el = document.querySelector('[data-fps]');
  let frames = 0;
  let since = performance.now();
  return () => {
    frames++;
    const now = performance.now();
    const elapsed = (now - since) / 1000;
    if (elapsed < 0.5) return;
    if (el) el.textContent = Math.round(frames / elapsed);
    frames = 0;
    since = now;
  };
}
