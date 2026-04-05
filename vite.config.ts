import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // O PONTO antes da barra é a grande mágica aqui!
  base: './', 
});

