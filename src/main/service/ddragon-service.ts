export function getChampionIconUrl(championName: string, gameVersion: string): string {
    return `https://ddragon.leagueoflegends.com/cdn/${gameVersion}/img/champion/${championName}.png`;
}

export async function fetchLatestGameVersion(): Promise<string> {
    const response = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    const versions = await response.json();
    return versions[0]; // first element represents latest game version
}

export async function fetchChampionMap(gameVersion: string): Promise<ChampionMap> {
    const championMap: ChampionMap = {};

    const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${gameVersion}/data/en_US/champion.json`);
    const responseAsJson = await response.json();

    Object.entries(responseAsJson.data).forEach(([_, champion]: [any, any]) => {
        championMap[parseInt(champion.key)] = champion.id;
    });

    return championMap;
}
