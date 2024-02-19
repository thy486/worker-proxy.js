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
            // rollupTypes: true,
            staticImport: true,
            entryRoot: 'src',
            outDir: 'dist/types',
        }),
    ],
    build: {
        lib: {
            entry: ['src/envs/browser/index.ts', 'src/envs/node/index.ts'],
        },
        ssr: true,
        rollupOptions: {
            output: [
                {
                    entryFileNames: '[format]/[name].js',
                    preserveModules: true,
                    format: 'es',
                },
                {
                    entryFileNames: '[format]/[name].cjs',
                    preserveModules: true,
                    format: 'cjs',
                },
            ],
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
