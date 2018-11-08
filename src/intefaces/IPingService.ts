import { IMessagingProvider } from "dc-messaging"
export interface PingServiceParams  {
    platformId: string,
    apiRoomAddress: string,
    blockchainNetwork: string,
    ethAddress: string
}

export interface IPingService extends NodeJS.EventEmitter {
    ping: () => PingServiceParams
    isStarted: () => boolean
    stop: () => void
    start: (transportProvider: IMessagingProvider, params: PingServiceParams) => IPingService
}
