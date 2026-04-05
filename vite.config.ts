import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Exemplo: se o link do seu repo for github.com/patrick/meu-questbank
  // o base DEVE ser: '/meu-questbank/'
  base: '/p/', 
});
