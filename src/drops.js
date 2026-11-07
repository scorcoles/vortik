// =========================================================================================
// Paso 6 · Grosor (2): gotas y puntas redondas
// =========================================================================================
//
// Un líquido nunca acaba en punta: acaba redondo. Así que en los extremos de las cintas
// ponemos un círculo de su mismo ancho (una «tapa»), y en las puntas que salen disparadas,
// una gota. Las dos cosas son lo mismo: un círculo pequeño, en un punto de una fibra.
//
// Como hay cientos, usamos un InstancedMesh: un solo círculo que la GPU copia muchas veces,
// cada copia («instancia») con su sitio, su tamaño y su color.

import * as THREE from 'three';
import { EDGE_SHADE } from './ribbons.js';

// Para colocar cada copia: un objeto de ayuda al que damos posición y tamaño, y del que
// sacamos la «matriz» (la forma de decirle a la GPU dónde y cómo de grande va).
const helper = new THREE.Object3D();

// «centers» es la lista con la línea central de todas las fibras (x, y, z seguidos).
// «circles» dice, para cada círculo: de qué fibra es, en qué punto de «centers» va, su
// radio y su densidad (1 = el color de su fibra; menos, más oscuro).
//   [{ fiber, point, radius, density }, …]
export function createDrops(centers, circles) {
  // Un círculo de radio 1 hecho con 20 triángulos: a ese tamaño no se le notan los picos.
  const circle = new THREE.CircleGeometry(1, 20);

  // El mismo degradado que las cintas a lo ancho: el centro claro y el borde más oscuro.
  // Si no, en la punta de una cinta se notaría el cambio: su borde oscuro llegaría a un
  // círculo claro. Cada vértice del círculo lleva su tono (el del centro, 1; los del
  // borde, EDGE_SHADE), y la GPU lo multiplica por el color de cada copia.
  const vertexCount = circle.attributes.position.count;
  const shades = new Float32Array(vertexCount * 3);
  for (let k = 0; k < vertexCount; k++) {
    // El vértice del centro es el único que está en (0, 0).
    const atCenter = circle.attributes.position.getX(k) === 0 && circle.attributes.position.getY(k) === 0;
    shades.fill(atCenter ? 1 : EDGE_SHADE, k * 3, k * 3 + 3);
  }
  circle.setAttribute('color', new THREE.BufferAttribute(shades, 3));
  // Opaco, como la pintura de las cintas: si se transparentaran, se vería el círculo
  // donde se monta sobre su cinta. Y, como las cintas, marcado «transparent» con opacidad
  // 1, para que se pinte después de las líneas finas y no le pasen por encima
  // (ribbons.js lo explica).
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, depthWrite: false });
  const object = new THREE.InstancedMesh(circle, material, circles.length);

  // Pone cada círculo en su punto. Como las cintas, ahora una vez y en el paso 8 en cada
  // fotograma.
  function update() {
    circles.forEach(({ point, radius }, k) => {
      const c = point * 3;
      helper.position.set(centers[c], centers[c + 1], centers[c + 2]);
      helper.scale.setScalar(radius);
      helper.updateMatrix();
      object.setMatrixAt(k, helper.matrix);
    });
    object.instanceMatrix.needsUpdate = true;
  }

  // Pinta cada círculo del color de su fibra, el que diga «colorOf(fiber)» (lo elige el
  // modo, paso 7).
  const shaded = new THREE.Color();
  function recolor(colorOf) {
    circles.forEach(({ fiber, density }, k) => object.setColorAt(k, shaded.copy(colorOf(fiber)).multiplyScalar(density)));
    object.instanceColor.needsUpdate = true;
  }

  update();
  return { object, update, recolor };
}
