// =========================================================================================
// Paso 7 · El cajetín del modo esquema
// =========================================================================================
//
// Como en el modo wire de vertikis: una ficha abajo a la derecha que dice qué es esto y
// con qué números funciona. Una fila por línea; las familias, con el cuadrito de su color
// (el mismo con el que se pintan en el esquema).

import { RADIUS, HOLE, FAMILIES } from './vortex.js';

// Rellena el cajetín «el» con los números del remolino («info», de createVortex).
export function fillNotes(el, info) {
  const rows = [
    'VORTIK · ESQUEMA',
    'ESPIRAL LOG. + EMBUDO',
    `${info.fibers} FIBRAS · ${(info.points / 1000).toFixed(1)}K PTS`,
    // ω (omega): la velocidad de giro, en radianes por segundo.
    `R ${RADIUS} · AGUJERO ${HOLE} · ω ${info.spin}`,
    ...FAMILIES.map((f) => `<i style="--c: ${f.color}"></i>${f.name} · ${f.count} × ${f.points} PTS`),
    'VERTIK.NET',
  ];
  el.innerHTML = rows.map((row) => `<div>${row}</div>`).join('');
}
