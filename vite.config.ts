/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [],
    build: {
        // lib: {
        //     entry: 'examples/brower/index.ts',
        //     formats: ['es']
        // }
    },
    test: {
        setupFiles: ['@vitest/web-worker'],
        environmentMatchGlobs: [['__tests__/brower/**', 'happy-dom'], ['__tests__/node/**', 'node']]
    }
});
