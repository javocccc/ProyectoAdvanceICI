import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite transforma los archivos TSX y actualiza la página al guardar cambios.
export default defineConfig({ plugins: [react()] });
