import esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isProd = process.env.NODE_ENV === "production";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const builds = [
    {
        name: "main",
        entry: path.resolve(__dirname, "../build/main/main.js"),
        outFile: path.resolve(__dirname, "../dist-electron/main/main.js"),
        format: "esm",
    },
    {
        name: "preload",
        entry: path.resolve(__dirname, "../build/preload/preload.js"),
        outFile: path.resolve(__dirname, "../dist-electron/preload/preload.js"),
        format: "cjs"
    },
];

builds.forEach(({ name, entry, outFile, format }) => {
    esbuild
        .build({
            entryPoints: [entry],
            bundle: true,
            platform: "node",
            target: ["node20"],
            outfile: outFile,
            sourcemap: !isProd,
            minify: isProd,
            external: ["electron", "lcu-connector", "ws", "axios"],
            format: format,
        })
        .then(() => console.log(`[esbuild] ${name} built successfully`))
        .catch((err) => {
            console.error(`[esbuild] ${name} build failed`, err);
            process.exit(1);
        });
});
