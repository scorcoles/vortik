// =========================================================================================
// Paso 8 · Movimiento: muelles, inercia y un poco de viento
// =========================================================================================
//
// Hasta ahora el remolino giraba entero, como una foto pegada a un disco. Ahora cada punto
// de cada fibra tiene su propia posición y su propia velocidad, y un muelle que lo une a su
// sitio en la espiral (su posición «de reposo»). Si nada lo empuja, se queda quieto en su
// sitio; si algo lo empuja, se aparta, el muelle tira de él y vuelve oscilando un poco.
//
// ¿Qué lo empuja? Dos cosas, de momento (en el paso 9, también el cursor):
//   - la INERCIA: el giro acelera y frena, y las fibras, como los pasajeros de un tiovivo
//     cuando arranca, se quedan atrás al acelerar y se pasan al frenar (la «fuerza de
//     Euler»). Es mayor cuanto más lejos del centro;
//   - el VIENTO: unas ondas suaves que viajan por el remolino y lo mecen todo el rato.
//
// Todo se hace en el sistema del remolino (el que gira): ahí el sitio de reposo de cada
// punto no cambia nunca, y solo calculamos cuánto se aparta de él.

// La rigidez del muelle: fuerte en la raíz de la fibra (la que está agarrada) y floja en
// la punta libre, que así se balancea más y tarda más en pararse.
const STIFF_ROOT = 40;
const STIFF_TIP = 5;

// La amortiguación: 0 = oscila para siempre; 1 = vuelve sin pasarse. Con poco, las puntas
// se mecen un par de veces antes de parar.
const DAMPING = 0.22;

// Cuánto exageramos la inercia: con la de verdad apenas se movería un píxel.
const INERTIA = 3;

// La fuerza del viento.
const WIND = 0.05;

// El viento en el punto (x, y) en el instante t: unas pocas ondas que viajan en distintas
// direcciones y a distintas velocidades. Suave en el espacio (los puntos vecinos reciben
// casi lo mismo, así que la fibra se mueve entera, no cada punto por su lado) y mucho más
// barato que un ruido de verdad, que aquí habría que calcular 80.000 veces por fotograma.
function windAt(x, y, t, out) {
  out[0] = Math.sin(3.1 * y + 0.7 * t) + 0.5 * Math.sin(5.3 * (x + y) - 1.1 * t);
  out[1] = Math.sin(2.7 * x - 0.9 * t) + 0.5 * Math.sin(4.9 * (x - y) + 1.3 * t);
}

// «centers» es la lista con la línea central de todas las fibras (x, y, z seguidos): la
// que se pinta. La copiamos como posiciones de reposo, y a partir de ahora «centers» será
// reposo + desplazamiento.
export function createMotion(fibers, centers) {
  const rest = centers.slice();
  const count = centers.length / 3;

  // Por cada punto: cuánto se ha apartado de su sitio (x, y) y a qué velocidad va (x, y).
  // La profundidad (z) no la movemos: el embudo se queda como está.
  const offset = new Float32Array(count * 2);
  const velocity = new Float32Array(count * 2);

  // Y su muelle: la rigidez y la amortiguación de cada punto. Un muelle de rigidez k oscila
  // a √k radianes por segundo; para que la amortiguación signifique lo mismo en un muelle
  // fuerte que en uno flojo, la medimos en proporción a √k.
  const stiffness = new Float32Array(count);
  const damping = new Float32Array(count);
  for (const fiber of fibers) {
    for (let p = 0; p < fiber.points; p++) {
      const t = p / (fiber.points - 1);
      const towardTip = fiber.dropAt === 1 ? t : 1 - t;
      const k = STIFF_ROOT + (STIFF_TIP - STIFF_ROOT) * towardTip;
      stiffness[fiber.first + p] = k;
      damping[fiber.first + p] = 2 * DAMPING * Math.sqrt(k);
    }
  }

  const wind = [0, 0];

  // Un paso de dt segundos. «alpha» es la aceleración del giro (radianes por segundo, cada
  // segundo) y «time», el reloj, para el viento.
  function update(dt, alpha, time) {
    for (let i = 0; i < count; i++) {
      const i2 = i * 2;
      const i3 = i * 3;
      const x = rest[i3] + offset[i2];
      const y = rest[i3 + 1] + offset[i2 + 1];

      // La inercia (fuerza de Euler): si el giro acelera, cada punto se queda atrás, en
      // contra del giro y más cuanto más lejos del centro. «En contra del giro» en (x, y)
      // es girar (x, y) 90° al revés: (y, -x).
      let fx = INERTIA * alpha * y;
      let fy = -INERTIA * alpha * x;

      windAt(x, y, time, wind);
      fx += WIND * wind[0];
      fy += WIND * wind[1];

      // El muelle tira hacia su sitio (más cuanto más lejos) y la amortiguación frena.
      const k = stiffness[i];
      const c = damping[i];
      const ax = fx - k * offset[i2] - c * velocity[i2];
      const ay = fy - k * offset[i2 + 1] - c * velocity[i2 + 1];

      // Primero la velocidad y luego la posición, con la velocidad nueva (Euler
      // «semi-implícito»): es igual de sencillo que al revés y mucho más estable.
      velocity[i2] += ax * dt;
      velocity[i2 + 1] += ay * dt;
      offset[i2] += velocity[i2] * dt;
      offset[i2 + 1] += velocity[i2 + 1] * dt;

      centers[i3] = rest[i3] + offset[i2];
      centers[i3 + 1] = rest[i3 + 1] + offset[i2 + 1];
    }
  }

  return { update };
}
