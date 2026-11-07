// =========================================================================================
// Paso 6 · Grosor (2): las gotitas de las puntas
// =========================================================================================
//
// Cuando la pintura sale disparada, la punta del hilo acaba en una gota redonda. Cada gota
// es un círculo pequeño. Como hay cientos, usamos un InstancedMesh: un solo círculo que la
// GPU copia muchas veces, cada copia («instancia») con su sitio, su tamaño y su color.

import * as THREE from 'three';

// Para colocar cada copia: un objeto de ayuda al que damos posición y tamaño, y del que
// sacamos la «matriz» (la forma de decirle a la GPU dónde y cómo de grande va).
const helper = new THREE.Object3D();

// «centers» es la lista con la línea central de todas las fibras (x, y, z seguidos,
// «points» puntos por fibra). Cada gota va en una de las dos puntas de su fibra.
export function createDrops(fibers, centers, points) {
  // Solo las fibras con gota, y en qué punto de «centers» va.
  const drops = [];
  fibers.forEach((fiber, f) => {
    if (fiber.drop > 0) drops.push({ fiber, point: f * points + fiber.dropAt * (points - 1) });
  });

  // Un círculo de radio 1 hecho con 12 triángulos: a ese tamaño no se le notan los picos.
  const circle = new THREE.CircleGeometry(1, 12);
  const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false });
  const object = new THREE.InstancedMesh(circle, material, drops.length);

  // El color de cada gota, el de su fibra.
  const color = new THREE.Color();
  drops.forEach(({ fiber }, k) => {
    object.setColorAt(k, color.setScalar(fiber.brightness));
  });

  // Pone cada gota en la punta de su fibra. Como las cintas, ahora una vez y en el paso 7
  // en cada fotograma.
  function update() {
    drops.forEach(({ fiber, point }, k) => {
      const c = point * 3;
      helper.position.set(centers[c], centers[c + 1], centers[c + 2]);
      helper.scale.setScalar(fiber.drop);
      helper.updateMatrix();
      object.setMatrixAt(k, helper.matrix);
    });
    object.instanceMatrix.needsUpdate = true;
  }

  update();
  return { object, update };
}
