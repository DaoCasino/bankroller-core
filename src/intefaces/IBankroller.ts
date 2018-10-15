export interface GameInstanceInfo {
  playerAddress: string
  deposit: number
  playerBalance: number
  bankrollerBalance: number
  profit: number
}
export interface IBankroller {
  id: string
  getGames: () => { name: string }[]
  uploadGame: (
    params: {
      name: string
      files: { fileName: string; fileData: Buffer | string }[]
    }
  ) => Promise<{ status: string }>
  getGameInstances: (name: string) => GameInstanceInfo[]
}
