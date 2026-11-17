import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' 로 두면 어떤 하위 폴더에 올려도(정적 호스팅, USB, 학교 서버) 그대로 동작합니다.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', assetsInlineLimit: 0 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
} as any);
