# Diseño de Advance ICI

La interfaz se concibe como una mesa de seguimiento de expedientes para Dirección ICI. El primer vistazo prioriza los pendientes de colegiatura, la búsqueda y los registros recientes. La captura del portal de la Universidad Central aportó el azul y el naranja como referencia cromática; la composición, el sistema de navegación y los componentes son propios de este proyecto.

## Colores

- Azul de acción `#123fce`: botones y enlaces principales.
- Azul oscuro `#102b61` y azul marino `#13284f`: identidad, títulos y navegación.
- Naranja `#f26822`: marca y señales puntuales de atención.
- Fondo `#f5f7fb`, superficies blancas y línea `#e3e9f1`.
- Verde `#126f54`, rojo `#bd4c3b` y ámbar `#9a6317` identifican los estados de colegiatura junto con texto, no solo con color.

## Tipografía y jerarquía

La interfaz usa IBM Plex Sans, incluido localmente en el proyecto mediante Fontsource, con Arial como respaldo. El título de página se define en `.page-heading h1`; títulos de sección en `.section-heading h2`; texto base en `:root`. La guía y el código indican dónde cambiar tamaños durante la evaluación.

## Composición

En escritorio, una barra lateral marino organiza tres destinos: panel, expedientes y nuevo expediente. El panel reúne una declaración de pendientes, tres cifras operativas, búsqueda, tabla reciente y un bloque de atención. En móvil, la navegación se abre con un botón de menú y la tabla mantiene su desplazamiento horizontal dentro del panel.

## Interacción

Los botones tienen estados de foco visibles, los formularios muestran errores junto al flujo, y los estados de colegiatura se escriben con texto. El modo de demostración se marca explícitamente. Se respetan preferencias de movimiento reducido.

## Archivos de referencia

Los valores CSS viven en `src/styles.css`. La descripción de producto está en `PRODUCT.md`; los contratos de datos están en `src/types/expediente.ts`.
