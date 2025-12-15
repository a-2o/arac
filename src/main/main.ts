import { app } from 'electron';
import WebSocket from 'ws';
import LCUConnector from 'lcu-connector';
import * as ddragonService from './service/ddragon-service';
import * as lcuService from './service/lcu-service';
import { WindowManager } from './WindowManager';
import { TrayManager } from './TrayManager';
import { eventBus } from './eventBus';

let lcuToken: number = 0;
let wsToken: number = 0;

let cachedGameVersion: string | null = null;
let cachedChampionMap: ChampionMap | null = null;
let cachedCompleteIds: number[] | null = null;

function startApp(): void {
    const gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
        app.quit();
        return;
    }

    app.whenReady().then(() => {
        createMainWindow();
        createSystemTray();
        cacheStaticData();
        connectToLCU();
    });

    app.on('activate', () => { // darwin
        createMainWindow();
        WindowManager.restoreWindow('main');
    });
}

function createMainWindow(): void {
    WindowManager.create('main', () => {
        if (process.platform === 'darwin') {
            WindowManager.closeAuxiliary();
        } else {
            app.quit();
        }
    });
}

function createSystemTray(): void {
    TrayManager.init(
        () => { eventBus.emit('toggle-global-visibility-request') },
        () => { connectToLCU() },
        () => { app.quit() }
    );
}

async function cacheStaticData(): Promise<void> {
    cachedGameVersion = await ddragonService.fetchLatestGameVersion();
    cachedChampionMap = await ddragonService.fetchChampionMap(cachedGameVersion);
}

function connectToLCU(): void {
    const myToken = ++lcuToken;

    var lcu: LCUConnector = new LCUConnector();

    const onLCUConnectorStarted = () => {
        if (myToken !== lcuToken) {
            console.log(`Stopping LCU Connector #${myToken}.`);
            lcu.stop();
            eventBus.removeListener('lcu-connector-started', onLCUConnectorStarted);
        }
    };
    eventBus.on('lcu-connector-started', onLCUConnectorStarted);

    lcu.on('connect', (data: LCUCredentials) => {
        console.log(`LCU Connector #${myToken}: connection established.`);

        retryOnError(async () => {
            cachedCompleteIds = await lcuService.fetchChallengeData(data);
        }, 1000, 30);
        retryOnError(async () => {
            await openWebSocketConnection(data);
        }, 1000, 30);
    });

    lcu.on('disconnect', () => {
        console.log(`LCU Connector #${myToken}: connection interrupted by peer.`);
    });

    console.log(`Starting LCU Connector #${myToken}.`);

    lcu.start();

    eventBus.emit('lcu-connector-started');
}

function openWebSocketConnection(credentials: LCUCredentials): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
        const myToken = ++wsToken;

        console.log(`Opening WS connection #${myToken}.`);

        const ws = new WebSocket(
            `wss://${credentials.address}:${credentials.port}/`,
            'wamp',
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`,
                },
                rejectUnauthorized: false,
            }
        );

        const onWSConnectionOpened = () => {
            if (myToken !== wsToken) {
                ws.close();
                eventBus.removeListener('ws-connection-opened', onWSConnectionOpened);
            }
        };
        eventBus.on('ws-connection-opened', onWSConnectionOpened);

        const onOpen = () => {
            ws.removeListener('open', onOpen);
            ws.removeListener('error', onError);
            resolve(ws);
        };
        const onError = (err: any) => {
            ws.removeListener('open', onOpen);
            ws.removeListener('error', onError);
            ws.close();
            reject(err);
        };

        ws.once('open', onOpen);
        ws.once('error', onError);

        // https://github.com/dysolix/hasagi-types/blob/main/dist/lcu-events.d.ts
        ws.on('open', () => {
            eventBus.emit('ws-connection-opened');

            // 5 Means Subscribe
            ws.send(`[5, "OnJsonApiEvent_lol-lobby-team-builder_champ-select_v1"]`);
            ws.send(`[5, "OnJsonApiEvent_lol-lobby-team-builder_v1_matchmaking"]`);

            console.log(`WS connection #${myToken} established.`);
        });

        ws.on('message', (event) => {
            const [id, data, eventType, uri] = parseEventMessage(event);

            switch (id) {
                case 'OnJsonApiEvent_lol-lobby-team-builder_champ-select_v1':
                    switch (uri) {
                        case '/lol-lobby-team-builder/champ-select/v1/session':
                            switch (eventType) {
                                case 'Create': // lobby creation
                                    if (data.benchEnabled === true) { // ARAM
                                        WindowManager.showWindow('main');
                                    }
                                    break;
                                case 'Update': // lobby update
                                    if (data.benchEnabled === true) { // ARAM
                                        WindowManager.send('main', 'champion-selected',
                                            isUserAction(data),
                                            parseTeamMates(data),
                                            parseBenchChampions(data)
                                        );
                                        WindowManager.showWindow('main');
                                    }
                                    break;
                                case 'Delete': // lobby deletion
                                    WindowManager.hideWindow('main');
                                    WindowManager.send('main', 'lobby-deleted');
                                    break;
                            }
                            break;
                        case '/lol-lobby-team-builder/champ-select/v1/subset-champion-list':
                            switch (eventType) {
                                case 'Create':
                                    WindowManager.send('main', 'card-selection',
                                        parseCards(data)
                                    );
                                    break;
                                case 'Update':
                                    break;
                                case 'Delete':
                                    break;
                            }
                            break;
                    }
                    break;
                case 'OnJsonApiEvent_lol-lobby-team-builder_v1_matchmaking':
                    switch (uri) {
                        case '/lol-lobby-team-builder/v1/matchmaking':
                            switch (eventType) {
                                case 'Create':
                                    switch (data.searchState) {
                                        case 'Searching': // search start
                                            lcuService.fetchChallengeData(credentials)
                                                .then(result => cachedCompleteIds = result);
                                            break;
                                    }
                                    break;
                                case 'Update':
                                    break;
                                case 'Delete':
                                    break;
                            }
                            break;
                    }
                    break;
            }
        });

        ws.on('close', () => {
            console.log(`WS connection #${myToken} closed.`);
            eventBus.removeListener('ws-connection-opened', onWSConnectionOpened);
        });
    });
}

function parseEventMessage(message: any) {
    const [_, id, payload] = JSON.parse(message) as [any, string, any];
    return [id, payload.data, payload.eventType, payload.uri];
}

function isUserAction(eventAsJson: any): boolean {
    return eventAsJson.actions.flat()
        .some((action: any) =>
            action.type === 'pick'
            && action.isAllyAction === true
            && action.actorCellId === eventAsJson.localPlayerCellId
            && action.championId !== 0
        );
}

function parseCards(eventAsJson: any): Champion[] {
    const cards: Champion[] = [];
    eventAsJson.forEach((championId: any) => {
        cards.push({
            id: championId,
            name: null,
            iconUrl: null,
            isComplete: null,
        });
    });
    cards.forEach((card: Champion) => {
        try {
            enrichChampion(card);
        } catch (error: any) {
            console.error('Failed to enrich champion data.', error.response ? error.response.data : error);
        }
    });
    return cards;
}

function parseTeamMates(eventAsJson: any): TeamMate[] {
    const teamMates: TeamMate[] = [];
    eventAsJson.myTeam.forEach((teamMate: any) => {
        teamMates.push(parseTeamMate(teamMate));
    });
    teamMates.forEach((teamMate: TeamMate) => {
        try {
            enrichChampion(teamMate.champion);
        } catch (error: any) {
            console.error('Failed to enrich champion data.', error.response ? error.response.data : error);
        }
    });
    return teamMates;
}

function parseTeamMate(teamMate: any): TeamMate {
    return {
        name: teamMate.name,
        cellId: teamMate.cellId,
        champion: {
            id: teamMate.championId,
            name: null,
            iconUrl: null,
            isComplete: null,
        },
    };
}

function parseBenchChampions(eventAsJson: any): Champion[] {
    const benchChampions: Champion[] = [];
    eventAsJson.benchChampions.forEach((benchChampion: any) => {
        benchChampions.push(parseBenchChampion(benchChampion));
    });
    benchChampions.forEach((benchChampion: Champion) => {
        try {
            enrichChampion(benchChampion);
        } catch (error: any) {
            console.error('Failed to enrich champion data.', error.response ? error.response.data : error);
        }
    });
    return benchChampions;
}

function parseBenchChampion(benchChampion: any): Champion {
    return {
        id: benchChampion.championId,
        name: null,
        iconUrl: null,
        isComplete: null,
    };
}

function enrichChampion(champion: Champion): void {
    const name = cachedChampionMap?.[champion.id] ?? null;
    if (name != null) {
        champion.name = name;
        champion.iconUrl = cachedGameVersion ? ddragonService.getChampionIconUrl(name, cachedGameVersion) : null;
    }
    champion.isComplete = cachedCompleteIds?.includes(champion.id) ?? null;
}

// ToDo: externalize into util
async function retryOnError(
    fn: () => Promise<void>,
    delay: number,
    maxAttempts: number
) {
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            await fn();
            break;
        } catch (err) {
            attempts++;
            await new Promise(res => setTimeout(res, delay));
        }
    }
}

startApp();
