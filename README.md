# vortik

**Español** · [English](README.en.md)

Un remolino de fibras de pintura que gira alrededor de un agujero negro, se mece con su propia inercia y se deja remover e inclinar. Hecho con [Three.js](https://threejs.org) y [Vite](https://vite.dev).

**Demo:** [scorcoles.github.io/vortik](https://scorcoles.github.io/vortik/) · también en [vertik.net/vortik](https://www.vertik.net/vortik/)

- **Mueve el ratón o el dedo** por encima: remueve las fibras, que vuelven solas a su sitio.
- **Arrastra** (en el móvil, con **dos dedos**): inclina el plano. Al soltar, vuelve a plano.
- **Doble clic** (o doble toque): un vórtice nuevo, distinto cada vez.
- **← Prev · Next →** en el pie, o las flechas del teclado: tres maneras de verlo, **noche** (blanco sobre negro), **portada** (como el vinilo, con su cartón gastado) y **esquema** (cada familia de fibras de un color, las guías y los números).
- **Compartir** (arriba a la derecha): una foto del momento.

Un experimento de [VERTIK](https://www.vertik.net). Homenaje a la portada de [*Dysnomia*](https://www.youtube.com/watch?v=BiVRDuIUKfA&list=OLAK5uy_l8Qxdj6Uvs5vhsUzVTHRmUoHcGrPncBwA), de Dawn of Midi (2013): una foto de pintura blanca lanzada por un rodillo que giraba en un taladro. Aquí no se usa la foto: todo se genera con código.

---

## Cómo ejecutarlo

Hace falta [Node.js](https://nodejs.org) (22 o más nuevo). Desde la carpeta del proyecto:

```bash
npm install
npm run dev
# y abre la dirección que te diga (http://localhost:5173)
```

`npm run build` genera en `dist/` la versión para publicar: `index.html`, `vortik.js` (con Three.js dentro) y `vortik.css`, con rutas relativas, así que funciona servida desde cualquier carpeta.

## Cómo funciona, en pocas palabras

- **La forma** es una espiral logarítmica que se hunde en un embudo hacia el agujero. Cada fibra es un trozo de esa corriente.
- **Cuatro familias de fibras**: el borde (filamentos diminutos que dibujan el círculo del agujero), las cerdas (cortas, como cerillas, que engordan hacia la punta), las corrientes (largas, en espiral) y el anillo (la maraña de fuera, donde está la pintura gruesa).
- **Nada es uniforme**: cada familia se reparte según un mapa de densidad al azar, y cada fibra se dobla con unos pocos puntos de control al azar.
- **La pintura gruesa** son cintas: tres vértices por punto, más clara en el centro y donde hay más pintura, y acabada en redondo, como un líquido.
- **El movimiento**: cada punto tiene un muelle que lo une a su sitio. El giro acelera y frena, y las fibras se quedan atrás y se pasan, por inercia; un viento suave las mece; y el cursor arrastra las que tiene cerca.
- **El agujero** es un círculo fijo que se pinta encima de todo, como la sombra de un agujero negro: se ve redondo aunque el plano se incline.

Los comentarios del código lo explican paso a paso.

## Lo que hay en el repo

| Archivo | Qué es |
| --- | --- |
| `index.html` | La página: el canvas, las capas del modo portada, el botón de compartir y el pie. |
| `style.css` | Pantalla completa, el pie, los modos y el desgaste del cartón. |
| `src/main.js` | Junta las piezas. |
| `src/stage.js` | El escenario de Three.js: cámara, tamaño, niebla y el bucle. |
| `src/vortex.js` | La forma, las familias de fibras y el giro. |
| `src/ribbons.js` · `src/drops.js` | Las cintas de pintura gruesa y las gotas y puntas redondas. |
| `src/motion.js` | Muelles, inercia, viento y el cursor. |
| `src/pointer.js` · `src/tilt.js` | El cursor en el sistema del remolino, y la inclinación. |
| `src/modes.js` · `src/guides.js` · `src/notes.js` · `src/toner.js` | Los modos, las guías y el cajetín del esquema, y la fotocopia de la portada. |
| `src/share.js` | La foto para compartir. |

## Licencia

[MIT](LICENSE). Three.js también es MIT.
