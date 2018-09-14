export interface GameInstanceInfo {
  playerAddress: string;
  deposit: number;
  playerBalance: number;
  bankrollerBalance: number;
  profit: number;
}
export interface IBankroller {
  id: string;
  getGames: () => { name: string }[];
  uploadGame: (
    name: string,
    files: { fileName: string; fileData: Buffer | string }[]
  ) => Promise<any>;
  getGameInstances: (name: string) => GameInstanceInfo[];
}
