// =========================================================================================
// Paso 7 · Las guías del modo wire: lo que no se ve, dibujado
// =========================================================================================
//
// En el modo wire dibujamos encima las reglas con las que se hace el remolino:
//   - el agujero y el borde exterior, dos círculos;
//   - la corriente: unas cuantas espirales «puras», sin ondular, hundiéndose en el embudo;
//   - los mapas de densidad de cada familia (paso 4), como una curva alrededor del borde:
//     donde la curva se aleja, esa familia tiene muchas fibras; donde se pega al borde,
//     casi ninguna.
// Van dentro del grupo del remolino, así que giran con él.

import * as THREE from 'three';
import { RADIUS, HOLE, FAMILIES, spiralAngle, funnelDepth } from './vortex.js';

const TAU = Math.PI * 2;

// Cuántas espirales de guía, y de cuántos puntos se hace cada curva.
const SPIRALS = 12;
const STEPS = 128;

// Los mapas de densidad: desde qué radio se dibujan y cuánto se alejan donde valen 1.
const MAP_BASE = 1.06;
const MAP_SIZE = 0.14;

// Una línea de Three.js a partir de una lista de puntos [x, y, z].
function line(points, color, opacity, closed = false) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  return closed ? new THREE.LineLoop(geometry, material) : new THREE.Line(geometry, material);
}

// Un círculo de radio r, a la profundidad del embudo en ese radio.
function circle(r, color, opacity) {
  const points = [];
  for (let k = 0; k < STEPS; k++) {
    const a = (k / STEPS) * TAU;
    points.push([r * Math.cos(a), r * Math.sin(a), funnelDepth(r)]);
  }
  return line(points, color, opacity, true);
}

export function createGuides() {
  const guides = new THREE.Group();

  // El agujero y el borde.
  guides.add(circle(HOLE, '#ffffff', 0.6), circle(RADIUS, '#ffffff', 0.35));

  // La corriente: espirales del borde al agujero, repartidas por igual.
  for (let n = 0; n < SPIRALS; n++) {
    const start = (n / SPIRALS) * TAU;
    const points = [];
    for (let k = 0; k <= STEPS; k++) {
      const r = RADIUS + (HOLE - RADIUS) * (k / STEPS);
      const a = start + spiralAngle(r);
      points.push([r * Math.cos(a), r * Math.sin(a), funnelDepth(r)]);
    }
    guides.add(line(points, '#ffffff', 0.18));
  }

  // Los mapas de densidad, cada uno del color de su familia.
  for (const family of FAMILIES) {
    const points = [];
    for (let k = 0; k < STEPS; k++) {
      const a = (k / STEPS) * TAU;
      const r = MAP_BASE + MAP_SIZE * family.density(a);
      points.push([r * Math.cos(a), r * Math.sin(a), 0]);
    }
    guides.add(line(points, family.color, 0.9, true));
  }

  guides.visible = false;
  return guides;
}
