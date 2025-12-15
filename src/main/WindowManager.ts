import { app, BrowserWindow, screen } from 'electron';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eventBus } from './eventBus';

type WindowType = 'main' | 'settings' | 'about';

interface WindowState {
    window: BrowserWindow;
    targetVisibility: boolean;
    actualVisibility: boolean;
    position: number[];
}

const isDev = !app.isPackaged;
const isDebug = process.argv.includes('--inspect') || process.argv.includes('--inspect-brk');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const offScreen: [number, number] = [-10000, -10000];

let globalVisibility: boolean = true;

export class WindowManager {

    private static windows: Map<WindowType, WindowState> = new Map();

    public static create(
        type: WindowType,
        onClosed: () => void = () => { }
    ): void {
        if (!this.isCreationRequired(type)) {
            return;
        }

        const displays = screen.getAllDisplays();
        const primaryDisplay = displays[0];
        const { x, y, width, height } = primaryDisplay.bounds;

        const windowMap: Record<WindowType, [string, number[], Electron.BrowserWindowConstructorOptions]> = {
            main: [
                'index.html',
                [x, y],
                {
                    x: offScreen[0],
                    y: offScreen[1],
                    width: width,
                    height: height,
                    show: false,
                    frame: false,
                    transparent: true,
                    skipTaskbar: true,
                    focusable: false,
                    webPreferences: {
                        preload: path.join(__dirname, '../preload', 'preload.js'),
                        contextIsolation: true,
                        nodeIntegration: false,
                        backgroundThrottling: false
                    }
                }
            ],
            settings: [
                'settings.html',
                [x, y],
                {
                    webPreferences: {
                        preload: path.join(__dirname, '../preload', 'preload-settings.js'),
                        contextIsolation: true,
                        nodeIntegration: false
                    }
                }
            ],
            about: [
                'about.html',
                [x, y],
                {
                    webPreferences: {
                        preload: path.join(__dirname, '../preload', 'preload-about.js'),
                        contextIsolation: true,
                        nodeIntegration: false
                    }
                }
            ],
        };
        const [entryFile, initialPosition, options] = windowMap[type];

        const window = new BrowserWindow(options);

        window.once('ready-to-show', () => {
            window.show();
        });

        this.windows.set(type, {
            window: window,
            targetVisibility: false,
            actualVisibility: false,
            position: initialPosition
        });

        window.setIgnoreMouseEvents(true);
        
        setInterval(() => {
            window.setAlwaysOnTop(true, 'normal');
        }, 2000)

        if (isDev) {
            window.loadURL(`${process.env.VITE_DEV_SERVER_URL}/${entryFile}`);
        } else {
            window.loadFile(path.join(__dirname, '../../dist', entryFile));
        }
        if (isDebug) {
            window.webContents.openDevTools();
        }

        eventBus.on('toggle-global-visibility-request', () => {
            this.toggleGlobalVisibility();
        });

        window.on('closed', () => {
            onClosed();
            this.windows.delete(type);
        });
    }

    public static send(type: WindowType, channel: string, ...args: any[]): boolean {
        const windowState = this.getWindowState(type);
        if (!windowState) return false;
        const window = windowState.window;
        if (!this.isWindowAlive(window)) return false;
        window.webContents.send(channel, ...args);
        return true;
    }

    public static showWindow(type: WindowType): void {
        const windowState = this.getWindowState(type);
        if (!windowState) return;
        windowState.targetVisibility = true;
        this.computeVisibility(windowState);
    }

    public static hideWindow(type: WindowType): void {
        const windowState = this.getWindowState(type);
        if (!windowState) return;
        windowState.targetVisibility = false;
        this.computeVisibility(windowState);
    }

    public static restoreWindow(type: WindowType): void {
        const windowState = this.getWindowState(type);
        if (!windowState) return;
        const window = windowState.window;
        if (!this.isWindowAlive(window)) return;
        if (!window.isMinimized()) return;
        window.restore();
    }

    public static focusWindow(type: WindowType): void {
        const windowState = this.getWindowState(type);
        if (!windowState) return;
        const window = windowState.window;
        if (!this.isWindowAlive(window)) return;
        window.focus();
    }

    public static closeAuxiliary(): void {
        this.windows.forEach((windowState, type) => {
            if (type === 'main') return;
            if (!windowState) return;
            const window = windowState.window;
            if (!this.isWindowAlive(window)) return;
            window.close();
        });
    }

    private static computeVisibility(windowState: WindowState): void {
        const visibility = globalVisibility && windowState.targetVisibility;
        if (!this.isWindowAlive(windowState.window)) return;
        if (visibility) {
            if (!windowState.actualVisibility) {
                windowState.window.setPosition(windowState.position[0], windowState.position[1]);
                windowState.actualVisibility = !windowState.actualVisibility;
            }
        } else {
            if (windowState.actualVisibility) {
                windowState.position = windowState.window.getPosition();
                windowState.window.setPosition(offScreen[0], offScreen[1]);
                windowState.actualVisibility = !windowState.actualVisibility;
            };
        }
    }

    private static toggleGlobalVisibility(): void {
        globalVisibility = !globalVisibility;
        this.windows.forEach((windowState, _) => {
            if (!windowState) return;
            this.computeVisibility(windowState);
        });
        eventBus.emit('global-visibility-changed', globalVisibility);
    }

    private static isWindowAlive(win?: BrowserWindow): win is BrowserWindow {
        return !!win && !win.isDestroyed();
    }

    private static getWindowState(type: WindowType): WindowState | undefined {
        return this.windows.get(type);
    }

    private static isCreationRequired(type: WindowType): boolean {
        const windowState = this.getWindowState(type);
        if (!windowState) return true;
        const window = windowState.window;
        return !this.isWindowAlive(window);
    }

}
