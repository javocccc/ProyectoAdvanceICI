import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite inicia el servidor de desarrollo y prepara la compilación. El plugin
// React transforma los archivos TSX y actualiza la página al guardar cambios.
export default defineConfig({ plugins: [react()] });
