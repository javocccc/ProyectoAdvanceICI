import { copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const generarFallback404: Plugin = {
  name: 'generar-fallback-404',
  apply: 'build',
  async closeBundle() {
    const carpetaSalida = resolve(process.cwd(), 'dist');
    await copyFile(resolve(carpetaSalida, 'index.html'), resolve(carpetaSalida, '404.html'));
  },
};

// Vite inicia el servidor de desarrollo y prepara la compilación. El plugin
// React transforma los archivos TSX y actualiza la página al guardar cambios.
export default defineConfig({ plugins: [react(), generarFallback404] });
