// =========================================================================================
// Paso 6 · Grosor (1): las fibras gruesas son cintas
// =========================================================================================
//
// WebGL pinta las líneas de 1 píxel, y no se pueden engordar. Para los chorros gruesos de
// pintura hacemos una cinta: por cada punto de la fibra ponemos tres vértices (un lado, el
// centro y el otro lado) y rellenamos el hueco entre cada trío y el siguiente con cuatro
// triángulos.
//
//     a0 ── a1 ── a2 ── a3        a = un lado de la fibra
//     │  ╲  │  ╲  │  ╲  │
//     m0 ── m1 ── m2 ── m3        m = el centro
//     │  ╲  │  ╲  │  ╲  │
//     b0 ── b1 ── b2 ── b3        b = el otro lado
//
// ¿Por qué el centro? Para la densidad: en la portada la pintura no es transparente, es
// más o menos densa. Donde hay más pintura, más blanca; donde hay menos, más gris. Así que
// pintamos dos degradados:
//   - a lo ancho: el centro claro y los bordes más oscuros, como un hilo con volumen;
//   - a lo largo: los tramos anchos (más pintura) más claros que los estrechos.
//
// Las fibras finas siguen siendo líneas: un triángulo más fino que un píxel parpadea.

import * as THREE from 'three';

const TAU = Math.PI * 2;

// Cuánto más oscuros que el centro son los bordes de la cinta (1 = igual).
const EDGE_SHADE = 0.72;

// Cuánto más oscuro es un tramo estrecho que uno ancho (1 = igual).
const THIN_SHADE = 0.7;

// Una curva suave de 0 a 1 entre «edge0» y «edge1»: 0 antes, 1 después y una «S» entre
// medias. Sirve para que algo aparezca poco a poco en vez de saltar.
function smoothstep(edge0, edge1, x) {
  const k = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return k * k * (3 - 2 * k);
}

// Ancho de la cinta a la fracción t de su recorrido (0 = principio, 1 = final).
// Exportada porque las tapas redondas de las puntas (vortex.js) miden lo mismo.
export function widthAt(fiber, t) {
  // «towardTip» va de 0 en la base a 1 en la punta libre, la de la gota.
  const towardTip = fiber.dropAt === 1 ? t : 1 - t;

  // Engorda y adelgaza a lo largo, como un líquido que no sale igual: dos ondas de
  // distinta frecuencia, para que los tramos anchos y estrechos no se repitan.
  const s = t * fiber.lumps * TAU + fiber.phase * 2;
  const lumps = 1 + 0.4 * Math.sin(s) + 0.2 * Math.sin(2.3 * s + 1.7);

  if (fiber.profile === 'club') {
    // Cerilla: fina en la base y cada vez más gorda hacia la punta libre.
    return fiber.width * (0.2 + 0.8 * towardTip ** 1.5) * lumps;
  }

  // Pintura: un líquido nunca acaba en punta. No se afina hacia los extremos; al
  // contrario, en el último cuarto se condensa y engorda hacia la punta libre, como la
  // pintura que se acumula antes de caer. Nunca baja del 35 % de su ancho.
  const condense = 1 + 0.7 * smoothstep(0.75, 1, towardTip);
  return fiber.width * Math.max(0.35, lumps) * condense;
}

// La densidad a lo largo: 1 donde la cinta está en su ancho normal o más ancha, y hasta
// THIN_SHADE donde se estrecha. Exportada porque las tapas de las puntas la usan también.
export function densityAt(fiber, t) {
  const k = Math.min(widthAt(fiber, t) / fiber.width, 1);
  return THIN_SHADE + (1 - THIN_SHADE) * k;
}

// «centers» es la lista con la línea central de todas las fibras (x, y, z seguidos). Cada
// fibra sabe dónde empieza en ella («first») y cuántos puntos tiene («points»). Las cintas
// se construyen encima.
export function createRibbons(fibers, centers) {
  // Solo las fibras con grosor, y en qué vértice empieza la cinta de cada una (tres
  // vértices por punto: el lado a, el centro m y el lado b).
  const thick = [];
  let vertices = 0;
  for (const fiber of fibers) {
    if (fiber.width === 0) continue;
    thick.push({ fiber, v: vertices });
    vertices += fiber.points * 3;
  }

  const positions = new Float32Array(vertices * 3);
  const colors = new Float32Array(vertices * 3);

  // Cuatro triángulos por cada tramo entre dos puntos: dos entre a y m, dos entre m y b.
  const triangles = [];
  for (const { fiber, v } of thick) {
    for (let p = 0; p < fiber.points - 1; p++) {
      const a0 = v + p * 3;
      const m0 = a0 + 1;
      const b0 = a0 + 2;
      const a1 = a0 + 3;
      const m1 = a0 + 4;
      const b1 = a0 + 5;
      triangles.push(a0, m0, a1, m0, m1, a1, m0, b0, m1, b0, b1, m1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  const colorAttribute = new THREE.BufferAttribute(colors, 3);
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('color', colorAttribute);
  geometry.setIndex(triangles);

  // La pintura gruesa es opaca: tapa lo que tiene detrás. Pero la marcamos «transparent»
  // (con opacidad 1, así que no se transparenta nada). ¿Por qué? Three.js pinta primero
  // todo lo opaco y después todo lo transparente, y «renderOrder» solo ordena dentro de
  // cada grupo. Las líneas finas son transparentes: si las cintas fueran opacas, se
  // pintarían antes que ellas, y las líneas les pasarían por encima.
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });

  const object = new THREE.Mesh(geometry, material);

  // Recalcula los vértices de todas las cintas a partir de las líneas centrales. Ahora se
  // llama una vez; cuando el cursor mueva las fibras (paso 8), en cada fotograma.
  function update() {
    for (const { fiber, v } of thick) {
      const { first, points } = fiber;
      for (let p = 0; p < points; p++) {
        // Hacia dónde va la fibra en este punto: del punto anterior al siguiente (en las
        // puntas, el propio punto hace de anterior o de siguiente).
        const prev = (first + Math.max(p - 1, 0)) * 3;
        const next = (first + Math.min(p + 1, points - 1)) * 3;
        const dx = centers[next] - centers[prev];
        const dy = centers[next + 1] - centers[prev + 1];
        const length = Math.hypot(dx, dy) || 1;

        // La perpendicular a esa dirección (girarla 90°: (dx, dy) → (-dy, dx)), con el
        // largo de medio ancho: un lado se va hacia ella y el otro hacia el contrario. El
        // centro se queda en la línea central.
        const half = widthAt(fiber, p / (points - 1)) / 2;
        const nx = (-dy / length) * half;
        const ny = (dx / length) * half;

        const c = (first + p) * 3;
        const a = (v + p * 3) * 3;
        const m = a + 3;
        const b = a + 6;
        positions[a] = centers[c] + nx;
        positions[a + 1] = centers[c + 1] + ny;
        positions[a + 2] = centers[c + 2];
        positions[m] = centers[c];
        positions[m + 1] = centers[c + 1];
        positions[m + 2] = centers[c + 2];
        positions[b] = centers[c] - nx;
        positions[b + 1] = centers[c + 1] - ny;
        positions[b + 2] = centers[c + 2];
      }
    }
    // Avisamos a Three.js de que la lista ha cambiado y tiene que volver a subirla a la GPU.
    positionAttribute.needsUpdate = true;
  }

  // Pinta cada cinta del color que diga «colorOf(fiber)» (lo elige el modo, paso 7), con
  // los dos degradados de densidad. La GPU funde los colores entre vértice y vértice: por
  // eso, con solo tres por punto, el paso del centro al borde es suave.
  const shaded = new THREE.Color();
  function recolor(colorOf) {
    for (const { fiber, v } of thick) {
      const color = colorOf(fiber);
      for (let p = 0; p < fiber.points; p++) {
        const along = densityAt(fiber, p / (fiber.points - 1));
        const a = v + p * 3;
        shaded.copy(color).multiplyScalar(along * EDGE_SHADE);
        shaded.toArray(colors, a * 3);
        shaded.toArray(colors, (a + 2) * 3);
        shaded.copy(color).multiplyScalar(along);
        shaded.toArray(colors, (a + 1) * 3);
      }
    }
    colorAttribute.needsUpdate = true;
  }

  update();
  return { object, update, recolor };
}
