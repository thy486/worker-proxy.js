/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [],
    build: {
        // lib: {
        //     entry: 'src/tests/brower/index.ts',
        //     formats: ['es']
        // }
    },
    test: {
        setupFiles: ['@vitest/web-worker'],
        environmentMatchGlobs: [['__tests__/brower/**', 'jsdom'], ['__tests__/node/**', 'node']]
    }
});
