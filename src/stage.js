// =========================================================================================
// Paso 1 · El escenario: una escena de Three.js, en negro, que ocupa la ventana
// =========================================================================================
//
// Three.js necesita tres cosas para pintar:
//   - un «renderer», que dibuja en el <canvas> con la tarjeta gráfica (WebGL);
//   - una «scene», la caja donde metemos lo que se ve;
//   - una «camera», el punto de vista desde el que se mira la escena.

import * as THREE from 'three';

// Apertura de la cámara, en grados. Poca apertura = poca deformación, como un teleobjetivo.
const FOV = 35;

// Qué parte del lado corto de la pantalla ocupa el remolino. 0.7 = el 70 %: queda un 15 %
// de negro a cada lado. Es el «aire con los bordes».
const FILL = 0.7;

// «radius» es el radio exterior del remolino: la cámara se aleja lo justo para que quepa.
export function createStage(canvas, { radius }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  // En pantallas retina hay 2 píxeles reales por cada píxel CSS: pintamos al doble para
  // que las fibras se vean finas y nítidas (como mucho ×2, para no gastar de más).
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();

  // La cámara mira de frente hacia el fondo del embudo (hacia z negativa).
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // «false»: no toques el CSS del canvas, ya ocupa la ventana desde style.css.
    renderer.setSize(w, h, false);
    camera.aspect = w / h;

    // A distancia 1, la cámara ve tan(FOV / 2) hacia arriba desde el centro. En vertical el
    // lado corto es el ancho, que es la altura × aspect. Alejamos la cámara hasta que el
    // borde del remolino quede en FILL de ese lado corto.
    const halfView = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const shortSide = Math.min(1, camera.aspect);
    camera.position.z = radius / (FILL * halfView * shortSide);
    camera.updateProjectionMatrix();
  }

  resize();
  window.addEventListener('resize', resize);

  // El bucle: el navegador nos llama unas 60 veces por segundo. En cada vuelta pasamos a
  // «onFrame» los segundos desde la anterior (dt), movemos lo que toque y pintamos.
  function start(onFrame) {
    let last = performance.now();
    renderer.setAnimationLoop((now) => {
      // Si la pestaña estuvo escondida, dt sería enorme y todo daría un salto: lo limitamos.
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      onFrame(dt);
      renderer.render(scene, camera);
    });
  }

  return { scene, camera, renderer, start };
}
