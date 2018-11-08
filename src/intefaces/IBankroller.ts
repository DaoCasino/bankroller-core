import { IMessagingProvider } from "dc-messaging"

export interface GameInstanceInfo {
  playerAddress: string
  deposit: number
  playerBalance: number
  bankrollerBalance: number
  profit: number
}

export interface GameUpload {
    name: string
    files: { fileName: string; fileData: Buffer | string, fileSize?: number }[],
    reload?: boolean
}

// export interface BankrollerStart {

// }
export interface IBankroller extends NodeJS.EventEmitter {
  id: string
  getGames: () => { name: string }[]
  uploadGame: (params: GameUpload) => Promise<{ status: string }>
  unloadGame: (name: string) => Promise<{ status: string }>
  getGameInstances: (name: string) => GameInstanceInfo[]
  getApiRoomAddress: (ethAddress: string) => string
  getPlatformId: () => string
  isStarted: () => boolean
  start: (provider: IMessagingProvider) => Promise<IBankroller>
  stop: () => Promise<boolean>
}
