import { contextBridge, ipcRenderer } from 'electron';

// Expose the IPC call to the renderer to interact with the main process
contextBridge.exposeInMainWorld('electron', {
    onChampionSelected: (callback: (isUserAction: boolean, teamMates: TeamMate[], benchChampions: Champion[]) => void) =>
        ipcRenderer.on('champion-selected', (event: any, isUserAction: boolean, teamMates: TeamMate[], benchChampions: Champion[]) =>
            callback(isUserAction, teamMates, benchChampions)),
    onCardSelection: (callback: (cards: Champion[]) => void) =>
        ipcRenderer.on('card-selection', (event: any, cards: Champion[]) =>
            callback(cards)),
    onLobbyDeleted: (callback: () => void) =>
        ipcRenderer.on('lobby-deleted', (event: any) =>
            callback()),
});
