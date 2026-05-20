import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// `base` debe coincidir con el path del repo en GitHub Pages.
// Si el repo se llama distinto, sobrescribir con VITE_BASE en CI.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/Geofire/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  assetsInclude: ['**/*.onnx'],
});
