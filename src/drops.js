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

// Para colocar cada copia: un objeto de ayuda al que damos posición y tamaño, y del que
// sacamos la «matriz» (la forma de decirle a la GPU dónde y cómo de grande va).
const helper = new THREE.Object3D();

// «centers» es la lista con la línea central de todas las fibras (x, y, z seguidos).
// «circles» dice, para cada círculo: de qué fibra es, en qué punto de «centers» va y su
// radio.   [{ fiber, point, radius }, …]
export function createDrops(centers, circles) {
  // Un círculo de radio 1 hecho con 20 triángulos: a ese tamaño no se le notan los picos.
  const circle = new THREE.CircleGeometry(1, 20);
  // Opaco, como la pintura de las cintas: si se transparentaran, se vería el círculo
  // donde se monta sobre su cinta.
  const material = new THREE.MeshBasicMaterial({ depthWrite: false });
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
  function recolor(colorOf) {
    circles.forEach(({ fiber }, k) => object.setColorAt(k, colorOf(fiber)));
    object.instanceColor.needsUpdate = true;
  }

  update();
  return { object, update, recolor };
}
