// La configuración de Vite. Solo hace falta para «npm run build»: genera dist/ con nombres
// fijos (vortik.js, con Three.js dentro, y vortik.css), sin códigos de versión en el nombre.
// Así la web de VERTIK (vertik.net/vortik) los copia y los carga siempre por el mismo nombre.
import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas: dist/ funciona sirviéndolo desde cualquier carpeta.
  base: './',
  build: {
    // Three.js va dentro: unos 550 kB (140 kB comprimido). Para una página que es solo
    // esto está bien; que Vite no avise.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        entryFileNames: 'vortik.js',
        chunkFileNames: 'vortik-[name].js',
        assetFileNames: 'vortik[extname]',
      },
    },
  },
});
