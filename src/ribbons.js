// =========================================================================================
// Paso 6 · Grosor (1): las fibras gruesas son cintas
// =========================================================================================
//
// WebGL pinta las líneas de 1 píxel, y no se pueden engordar. Para los chorros gruesos de
// pintura hacemos una cinta: por cada punto de la fibra ponemos dos vértices, uno a cada
// lado, y rellenamos el hueco entre cada par y el siguiente con dos triángulos.
//
//     a0 ── a1 ── a2 ── a3        a = un lado de la fibra
//     │  ╲  │  ╲  │  ╲  │
//     b0 ── b1 ── b2 ── b3        b = el otro lado
//
// Las fibras finas siguen siendo líneas: un triángulo más fino que un píxel parpadea.

import * as THREE from 'three';

const TAU = Math.PI * 2;

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

// «centers» es la lista con la línea central de todas las fibras (x, y, z seguidos,
// «points» puntos por fibra). Las cintas se construyen encima de ella.
export function createRibbons(fibers, centers, points) {
  // Solo las fibras con grosor, y dónde empieza cada una en «centers».
  const thick = [];
  fibers.forEach((fiber, f) => {
    if (fiber.width > 0) thick.push({ fiber, first: f * points });
  });

  // Dos vértices por punto (el lado a y el lado b).
  const positions = new Float32Array(thick.length * points * 2 * 3);
  const colors = new Float32Array(thick.length * points * 2 * 3);
  // Dos triángulos (seis vértices) por cada tramo entre dos puntos.
  const triangles = new Uint32Array(thick.length * (points - 1) * 6);

  let n = 0;
  thick.forEach(({ fiber }, k) => {
    const v = k * points * 2; // primer vértice de esta cinta
    for (let p = 0; p < points; p++) {
      // Color: el mismo en los dos lados.
      for (let side = 0; side < 2; side++) {
        const c = (v + p * 2 + side) * 3;
        colors[c] = colors[c + 1] = colors[c + 2] = fiber.brightness;
      }
      if (p < points - 1) {
        const a0 = v + p * 2;
        const b0 = a0 + 1;
        const a1 = a0 + 2;
        const b1 = a0 + 3;
        triangles.set([a0, b0, a1, b0, b1, a1], n);
        n += 6;
      }
    }
  });

  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(triangles, 1));

  // La pintura gruesa es opaca: tapa lo que tiene detrás (no se suma como las líneas).
  // Opaca también para que no se note dónde la cinta se monta sobre la tapa de su punta.
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const object = new THREE.Mesh(geometry, material);

  // Recalcula los vértices de todas las cintas a partir de las líneas centrales. Ahora se
  // llama una vez; cuando el cursor mueva las fibras (paso 7), en cada fotograma.
  function update() {
    thick.forEach(({ fiber, first }, k) => {
      const v = k * points * 2;
      for (let p = 0; p < points; p++) {
        // Hacia dónde va la fibra en este punto: del punto anterior al siguiente (en las
        // puntas, el propio punto hace de anterior o de siguiente).
        const prev = (first + Math.max(p - 1, 0)) * 3;
        const next = (first + Math.min(p + 1, points - 1)) * 3;
        const dx = centers[next] - centers[prev];
        const dy = centers[next + 1] - centers[prev + 1];
        const length = Math.hypot(dx, dy) || 1;

        // La perpendicular a esa dirección (girarla 90°: (dx, dy) → (-dy, dx)), con el
        // largo de medio ancho: un lado se va hacia ella y el otro hacia el contrario.
        const half = widthAt(fiber, p / (points - 1)) / 2;
        const nx = (-dy / length) * half;
        const ny = (dx / length) * half;

        const c = (first + p) * 3;
        const a = (v + p * 2) * 3;
        const b = a + 3;
        positions[a] = centers[c] + nx;
        positions[a + 1] = centers[c + 1] + ny;
        positions[a + 2] = centers[c + 2];
        positions[b] = centers[c] - nx;
        positions[b + 1] = centers[c + 1] - ny;
        positions[b + 2] = centers[c + 2];
      }
    });
    // Avisamos a Three.js de que la lista ha cambiado y tiene que volver a subirla a la GPU.
    positionAttribute.needsUpdate = true;
  }

  update();
  return { object, update };
}
