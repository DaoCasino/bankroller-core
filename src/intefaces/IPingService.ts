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
    // off: (event: string) => void
    // on: (event: string, listener: (data: any) => void) => void
    // emit: (event: string, data: any) => void
    stop: () => void
    start: (transportProvider: IMessagingProvider, params: PingServiceParams) => IPingService
}
