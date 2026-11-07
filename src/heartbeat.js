// =========================================================================================
// El latido: de vez en cuando, «pum-pum»
// =========================================================================================
//
// Cada 20–30 segundos, el remolino late como un corazón: dos golpes seguidos (el segundo,
// más flojo). En cada golpe se acerca de golpe un poco (un zoom repentino) y vuelve, y sus
// fibras reciben un empujón hacia fuera (motion.js) que las hace ondular un instante. Si
// el sonido está encendido, cada golpe suena (sound.js). Unos segundos antes (SOON) se
// avisa, para que el sonido se apague y el latido llegue después de un silencio.
//
// Cada golpe tiene la forma de un latido: sube muy deprisa y baja más despacio. La fórmula
// (t / τ) · e^(1 − t/τ) hace justo eso: vale 0 al empezar, 1 en t = τ y se apaga después.

// Cada cuánto late (segundos), y cuándo late la primera vez.
const EVERY = [20, 30];
const FIRST = [8, 14];

// Los dos golpes: cuándo (segundos desde el primero) y cuánto se acerca en cada uno.
const BEATS = [
  { at: 0, zoom: 0.06 },
  { at: 0.3, zoom: 0.035 },
];

// Cuántos segundos antes del latido se avisa de que viene («onSoon»).
const SOON = 3;

// Lo que tarda cada golpe en llegar a lo más alto (τ, segundos).
const RISE = 0.07;

function random(a, b) {
  return a + Math.random() * (b - a);
}

export function createHeartbeat() {
  let wait = random(...FIRST);
  // Cuánto hace que empezó el último latido (Infinity: ninguno sonando).
  let since = Infinity;
  // Qué golpes de este latido ya se han avisado.
  let fired = 0;
  // Si ya se ha avisado de que viene el próximo latido.
  let warned = false;

  // Lo que se avisa en cada golpe: «onBeat(strength)», con su fuerza (1 el primero). Y
  // «onSoon(seconds)», SOON segundos antes de cada latido (o lo que falte, si es menos).
  const api = { update, onBeat: null, onSoon: null };

  // Cada fotograma: avanza el reloj y devuelve cuánto hay que acercar el remolino ahora
  // (1 = nada; 1,06 = un 6 % más cerca).
  function update(dt) {
    wait -= dt;
    if (!warned && wait <= SOON) {
      warned = true;
      api.onSoon?.(Math.max(0, wait));
    }
    if (wait <= 0) {
      since = 0;
      fired = 0;
      warned = false;
      wait = random(...EVERY);
    }

    if (since === Infinity) return 1;
    since += dt;

    let zoom = 0;
    BEATS.forEach((beat, k) => {
      const t = since - beat.at;
      if (t < 0) return;
      // Al empezar cada golpe, avisamos (para el sonido y el empujón).
      if (k >= fired) {
        fired = k + 1;
        api.onBeat?.(beat.zoom / BEATS[0].zoom);
      }
      zoom += beat.zoom * (t / RISE) * Math.exp(1 - t / RISE);
    });

    // Cuando el último golpe ya se ha apagado, se acabó este latido.
    if (since > BEATS[BEATS.length - 1].at + RISE * 12) since = Infinity;
    return 1 + zoom;
  }

  return api;
}
