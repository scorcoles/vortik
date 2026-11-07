// ¿Es un móvil? Pantalla táctil o estrecha. En el móvil aligeramos: menos fibras
// (vortex.js), menos resolución (stage.js) y sin la suavidad de lente (main.js), que en un
// móvil pesan mucho más que en un ordenador y apenas se notan en una pantalla pequeña.
export const isPhone = () => window.matchMedia('(max-width: 47.99rem), (pointer: coarse)').matches;
