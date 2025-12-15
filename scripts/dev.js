import electron from 'electron';
import { spawn } from 'child_process';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function start() {
    const viteServer = await createServer({
        root: path.resolve(__dirname, '../src/renderer'),
        publicDir: path.resolve(__dirname, '../images'),
        plugins: [vue()]
    });

    await viteServer.listen();

    const electronSpawn = spawn(electron, ['--inspect', '.'], {
        env: {
            ...process.env,
            VITE_DEV_SERVER_URL: `http://localhost:${viteServer.config.server.port}`
        },
        stdio: 'inherit'
    });

    electronSpawn.on('close', (code) => {
        viteServer.close();
        process.exit(code);
    });

    process.on('SIGINT', () => {
        electronSpawn.kill('SIGINT');
        viteServer.close();
        process.exit();
    });
}

start();
