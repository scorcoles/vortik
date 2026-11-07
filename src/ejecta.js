// =========================================================================================
// Lo que sale despedido: de vez en cuando, un goterón se suelta del anillo
// =========================================================================================
//
// Como con el rodillo de la foto: cada 15–25 segundos, un goterón de pintura se suelta del
// borde del remolino y sale disparado, en el sentido del giro y hacia fuera. Una vez
// suelto ya no gira con el remolino: sigue recto y se aleja, frenando poco a poco. Detrás
// deja un hilo fino y unas gotitas cada vez más pequeñas (así se rompe un hilo de líquido),
// y se desvanece en dos o tres segundos.
//
// Va en el plano del remolino (dentro de «tilt», no de «spin»): se inclina con él, pero no
// gira con él.

import * as THREE from 'three';

const TAU = Math.PI * 2;

// Cada cuánto sale uno (segundos), y cuándo sale el primero.
const EVERY = [15, 25];
const FIRST = [6, 12];

// Lo que dura en el aire (segundos) y lo que frena (más, frena antes).
const LIFE = [2.2, 3.2];
const DRAG = 1.1;

// Con qué velocidad sale: la mayor parte, en el sentido del giro; un poco, hacia fuera.
const SPEED = [0.7, 1.1];
const ALONG = 0.8;
const OUTWARD = 0.45;

// Cuántos puntos guarda del recorrido para dibujar el hilo, y dónde van las gotitas que
// lo siguen (a cuántos puntos de la cabeza) y su tamaño.
const TRAIL = 24;
const HEAD = 0.022;
const SATELLITES = [
  { at: 5, size: 0.012 },
  { at: 10, size: 0.009 },
  { at: 16, size: 0.006 },
];

function random(a, b) {
  return a + Math.random() * (b - a);
}

export function createEjecta() {
  const object = new THREE.Group();
  const circle = new THREE.CircleGeometry(1, 16);
  const color = new THREE.Color('#ffffff');
  const flights = [];
  let wait = random(...FIRST);

  // Lo que se avisa al soltarse uno (para el sonido, main.js).
  const api = { object, update, setStyle, onEject: null };

  // Suelta uno en un punto al azar del borde. «spinAngle» es lo que ha girado el remolino
  // y «spinSpeed», a qué velocidad gira (su signo dice hacia dónde).
  function launch(spinAngle, spinSpeed) {
    const a = random(0, TAU) + spinAngle;
    const r = random(0.9, 1);
    const p = new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), 0);

    // La tangente al círculo en el sentido del giro, y la dirección hacia fuera.
    const turn = Math.sign(spinSpeed) || -1;
    const speed = random(...SPEED);
    const v = new THREE.Vector3(
      -Math.sin(a) * turn * ALONG + Math.cos(a) * OUTWARD,
      Math.cos(a) * turn * ALONG + Math.sin(a) * OUTWARD,
      0,
    ).multiplyScalar(speed);

    // El hilo: una línea por los últimos puntos del recorrido (al principio, todos en el
    // punto de salida).
    const trail = Array.from({ length: TRAIL }, () => p.clone());
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(trail);
    const lineMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
    const line = new THREE.Line(lineGeometry, lineMaterial);

    // La cabeza y las gotitas: círculos.
    const dropMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
    const head = new THREE.Mesh(circle, dropMaterial);
    head.scale.setScalar(HEAD);
    const satellites = SATELLITES.map(({ size }) => {
      const drop = new THREE.Mesh(circle, dropMaterial);
      drop.scale.setScalar(size);
      return drop;
    });

    for (const part of [line, head, ...satellites]) {
      part.renderOrder = 3;
      part.frustumCulled = false;
      object.add(part);
    }

    flights.push({ p, v, trail, age: 0, life: random(...LIFE), line, lineMaterial, dropMaterial, head, satellites });
    api.onEject?.();
  }

  function remove(flight) {
    object.remove(flight.line, flight.head, ...flight.satellites);
    flight.line.geometry.dispose();
    flight.lineMaterial.dispose();
    flight.dropMaterial.dispose();
  }

  function update(dt, spinAngle, spinSpeed) {
    wait -= dt;
    if (wait <= 0) {
      launch(spinAngle, spinSpeed);
      wait = random(...EVERY);
    }

    for (let k = flights.length - 1; k >= 0; k--) {
      const f = flights[k];
      f.age += dt;
      if (f.age >= f.life) {
        remove(f);
        flights.splice(k, 1);
        continue;
      }

      // Avanza y frena.
      f.v.multiplyScalar(Math.exp(-DRAG * dt));
      f.p.addScaledVector(f.v, dt);

      // El recorrido: el punto nuevo delante y el más viejo fuera.
      const last = f.trail.pop();
      f.trail.unshift(last.copy(f.p));
      f.line.geometry.setFromPoints(f.trail);

      f.head.position.copy(f.trail[0]);
      SATELLITES.forEach(({ at }, i) => f.satellites[i].position.copy(f.trail[at]));

      // Aparece en un instante y se desvanece en el último 40 % de su vida.
      const fadeIn = Math.min(1, f.age / 0.1);
      const fadeOut = Math.min(1, (f.life - f.age) / (f.life * 0.4));
      const opacity = Math.min(fadeIn, fadeOut);
      f.lineMaterial.opacity = opacity * 0.9;
      f.dropMaterial.opacity = opacity;
    }
  }

  // El color: el de la pintura del modo (en wire, el del anillo).
  function setStyle(style, ringColor) {
    color.set(style.palette === 'family' ? ringColor : style.paint);
    for (const f of flights) {
      f.lineMaterial.color.copy(color);
      f.dropMaterial.color.copy(color);
    }
  }

  return api;
}
