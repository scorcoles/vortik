// =========================================================================================
// El sonido: un grave continuo y algún scratch de vez en cuando
// =========================================================================================
//
// Todo se genera aquí, con la Web Audio API: no hay archivos de audio. Dos piezas:
//   - el GRAVE: dos ondas casi iguales de unos 49 Hz. Como están un pelo desafinadas,
//     laten despacio (suben y bajan juntas). Encima, la octava, muy baja. Todo pasa por un
//     filtro que solo deja los graves y que se abre y se cierra despacio, como si respirara;
//   - el SCRATCH: un golpe de ruido que pasa por un filtro que sube y baja de frecuencia
//     dos o tres veces muy deprisa. Ese vaivén es lo que hace que suene a disco arrastrado
//     con la mano. Sale solo cada pocos segundos, y también al remover deprisa con el cursor.
//     A veces, en lugar de scratch, un chasquido de vinilo.
//
// Los navegadores no dejan sonar nada sin que se toque algo: empieza con el botón del pie.

// El grave: su frecuencia y cuánto se desafina la segunda onda (el latido).
const DRONE = 49;
const BEAT = 1.004;

// Volumen general, y lo que tarda en entrar y en irse (segundos).
const VOLUME = 0.5;
const FADE = 2;

// Cada cuánto sale un scratch solo: entre y (segundos).
const SCRATCH_EVERY = [6, 16];

// Lo deprisa que tiene que ir el cursor para que remover suene (solo con un gesto rápido de
// verdad), lo menos que pasa entre un scratch del cursor y el siguiente (segundos) y la
// probabilidad de que suene cuando toca: no siempre, para que no parezca un botón.
const STIR_SPEED = 3;
const STIR_GAP = 4;
const STIR_CHANCE = 0.5;

// El volumen de un scratch (el grave es la base: el scratch, un detalle por encima).
const SCRATCH_VOLUME = 0.12;

function random(a, b) {
  return a + Math.random() * (b - a);
}

export function createSound() {
  let ctx = null;
  let master = null;
  let noise = null;
  let on = false;
  let timer = 0;
  let lastStir = 0;

  // Monta el grave y lo deja sonando (con el volumen general a 0).
  function build() {
    ctx = new AudioContext();

    // El volumen general y, antes de los altavoces, un compresor: que nada sature.
    master = ctx.createGain();
    master.gain.value = 0;
    const compressor = ctx.createDynamicsCompressor();
    master.connect(compressor).connect(ctx.destination);

    // El filtro que solo deja los graves, y la «respiración»: una onda lentísima (una vuelta
    // cada 14 segundos) que lo abre y lo cierra.
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 160;
    lowpass.Q.value = 0.8;
    const breath = ctx.createOscillator();
    breath.frequency.value = 1 / 14;
    const breathDepth = ctx.createGain();
    breathDepth.gain.value = 70;
    breath.connect(breathDepth).connect(lowpass.frequency);
    breath.start();
    lowpass.connect(master);

    // Las tres ondas del grave.
    for (const [frequency, type, gain] of [
      [DRONE, 'sine', 0.5],
      [DRONE * BEAT, 'sine', 0.5],
      [DRONE * 2, 'triangle', 0.08],
    ]) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = frequency;
      const level = ctx.createGain();
      level.gain.value = gain;
      osc.connect(level).connect(lowpass);
      osc.start();
    }

    // Un segundo de ruido blanco (números al azar), para los scratches y los chasquidos.
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  // Un scratch: ruido por un filtro que barre arriba y abajo dos o tres veces.
  function scratch(strength = 1) {
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;

    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 6;

    // Las idas y vueltas del disco: cada una, de un tono grave a uno agudo y vuelta, en
    // unas centésimas de segundo.
    const strokes = Math.round(random(2, 4));
    let t = now;
    band.frequency.setValueAtTime(random(250, 450), t);
    for (let k = 0; k < strokes; k++) {
      const half = random(0.035, 0.08);
      band.frequency.exponentialRampToValueAtTime(random(1500, 3200), t + half);
      band.frequency.exponentialRampToValueAtTime(random(250, 500), t + half * 2);
      t += half * 2;
    }

    // Su volumen: entra de golpe y se apaga al acabar las idas y vueltas.
    const level = ctx.createGain();
    level.gain.setValueAtTime(0, now);
    level.gain.linearRampToValueAtTime(SCRATCH_VOLUME * strength, now + 0.01);
    level.gain.setValueAtTime(SCRATCH_VOLUME * strength, t - 0.03);
    level.gain.linearRampToValueAtTime(0, t);

    source.connect(band).connect(level).connect(master);
    source.start(now, random(0, 0.9));
    source.stop(t + 0.05);
  }

  // Un chasquido de vinilo: un golpe de ruido cortísimo y agudo.
  function crackle() {
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 2500;
    const level = ctx.createGain();
    level.gain.setValueAtTime(0.12, now);
    level.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    source.connect(high).connect(level).connect(master);
    source.start(now, random(0, 0.9));
    source.stop(now + 0.03);
  }

  // El siguiente sonido suelto, dentro de unos segundos al azar: casi siempre un scratch,
  // a veces dos o tres chasquidos.
  function schedule() {
    timer = setTimeout(() => {
      if (!on) return;
      if (Math.random() < 0.7) scratch(random(0.6, 1));
      else for (let k = 0; k < Math.round(random(1, 3)); k++) setTimeout(crackle, random(0, 400));
      schedule();
    }, random(...SCRATCH_EVERY) * 1000);
  }

  function start() {
    if (!ctx) build();
    ctx.resume();
    on = true;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(VOLUME, now + FADE);
    schedule();
  }

  function stop() {
    on = false;
    clearTimeout(timer);
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + FADE / 2);
    // Cuando ya no suena, a dormir: que no gaste.
    setTimeout(() => !on && ctx.suspend(), (FADE / 2) * 1000 + 100);
  }

  // Cada fotograma, con el cursor (pointer.js): si se remueve muy deprisa, a veces, un
  // scratch (como mucho uno cada STIR_GAP segundos), más fuerte cuanto más deprisa.
  function update(cursor) {
    if (!on || !cursor.active) return;
    const speed = Math.hypot(cursor.vx, cursor.vy);
    const now = ctx.currentTime;
    if (speed > STIR_SPEED && now - lastStir > STIR_GAP) {
      // Cuenta como intento aunque no suene: así no vuelve a probar en el fotograma
      // siguiente, y la espera de STIR_GAP vale igual.
      lastStir = now;
      if (Math.random() < STIR_CHANCE) scratch(Math.min(1, speed / (STIR_SPEED * 2)));
    }
  }

  return {
    toggle: () => (on ? stop() : start(), on),
    update,
  };
}
