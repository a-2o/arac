interface Window {
  electron: {
    onChampionSelected: (callback: (isUserAction: boolean, teamMates: TeamMate[], benchChampions: Champion[]) => void) => void;
    onCardSelection: (callback: (cards: Champion[]) => void) => void;
    onLobbyDeleted: (callback: () => void) => void;
  };
}

interface TeamMate {
  name: string
  cellId: number
  champion: Champion
}

interface Champion {
  id: number
  name: string | null
  iconUrl: string | null
  isComplete: boolean | null
}

interface LCUCredentials {
  address: string,
  port: number,
  username: string,
  password: string,
  protocol: string
}

interface ChampionMap { [key: number]: string } // championId -> name
