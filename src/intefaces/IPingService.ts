import { IMessagingProvider } from "dc-messaging"
export interface PingServiceParams  {
    platformId: string,
    apiRoomAddress: string,
    blockchainNetwork: string,
    ethAddress: string
}

export interface IPingService {
    ping: () => PingServiceParams
    isStarted: () => boolean
    on: (event: string, listener: (data: any) => void) => void
    emit: (event: string, data: any) => void
    stop: () => void
    start: (transportProvider: IMessagingProvider, params: PingServiceParams) => IPingService
}