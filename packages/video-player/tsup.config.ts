import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/buffer-void.ts'],
    format: ['esm', 'cjs', 'iife'],
    globalName: "BufferVoid",
    splitting: false,
    sourcemap: true,
    clean: true,
    dts: true,
    platform: "browser",
    target: "es2022"
})