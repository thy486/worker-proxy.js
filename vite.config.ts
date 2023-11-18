import path from 'path';
import { UserConfig, defineConfig } from 'vite';
import { InlineConfig } from 'vitest';
import dts from 'vite-plugin-dts';

const getParentDirList = (filepath: string): string[] => {
    if (!filepath) {
        return [];
    }
    let pathArr = filepath.split(path.sep);
    if (pathArr[pathArr.length - 1] === '') {
        pathArr = pathArr.slice(0, pathArr.length - 1);
    }
    return pathArr;
};

export const getParentDirNameFactory = (filepath: string): ((dep?: number) => string) => {
    const pathArr = getParentDirList(filepath);
    return (dep = 1) => {
        return pathArr[pathArr.length - 1 - dep];
    };
};

export default defineConfig({
    plugins: [
        dts({
            copyDtsFiles: true,
            exclude: ['examples/**', '__tests__/**'],
            insertTypesEntry: true,
        }),
    ],
    build: {
        lib: {
            entry: ['src/envs/browser/index.ts', 'src/envs/node/index.ts'],
            formats: ['es', 'cjs'],
        },
        rollupOptions: {
            output: {
                entryFileNames(chunkInfo) {
                    const filepath = chunkInfo.facadeModuleId;
                    const getDir = getParentDirNameFactory(filepath);
                    return `[format]/${getDir(1)}/index.js`;
                },
                chunkFileNames: '[format]/chunks/[name]-[hash].js',
            },
            external: ['worker_threads'],
        },
        outDir: path.join(__dirname, 'dist'),
    },
    ['test' as keyof UserConfig]: {
        setupFiles: ['@vitest/web-worker'],
        environmentMatchGlobs: [
            ['__tests__/brower/**', 'happy-dom'],
            ['__tests__/node/**', 'node'],
        ],
    } as InlineConfig,
});
