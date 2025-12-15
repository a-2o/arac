import { Tray, Menu, nativeImage } from 'electron';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eventBus } from './eventBus';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const image = nativeImage.createFromPath(path.join(__dirname, '../../images', 'electron-icon.png'));
const eyeOpen = nativeImage.createFromPath(path.join(__dirname, '../../images', 'eye-open.png'));
const eyeClosed = nativeImage.createFromPath(path.join(__dirname, '../../images', 'eye-closed.png'));

export class TrayManager {

    private static tray: Tray;

    private static onToggleVisibility: () => void;
    private static onReconnectToLcu: () => void;
    private static onQuit: () => void;

    public static init(
        onToggleVisibility: () => void,
        onReconnectToLcu: () => void,
        onQuit: () => void,
    ): void {
        this.onToggleVisibility = onToggleVisibility;
        this.onReconnectToLcu = onReconnectToLcu;
        this.onQuit = onQuit;

        this.tray = new Tray(image, '8fab32d4-0582-4b41-906b-48a38a805069');

        this.tray.setToolTip('ARAC');

        this.updateContextMenu(true);

        eventBus.on('global-visibility-changed', (globalVisibility) => {
            this.updateContextMenu(globalVisibility);
        });
    }

    private static updateContextMenu(globalVisibility: boolean): void {
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Toggle Visibility',
                click: () => this.onToggleVisibility(),
                icon: globalVisibility ? eyeOpen : eyeClosed
            },
            {
                type: 'separator'
            },
            {
                label: 'Reconnect to LCU',
                click: this.onReconnectToLcu
            },
            {
                label: 'Quit',
                click: this.onQuit
            }
        ]);
        this.tray.setContextMenu(contextMenu);
    }

}
