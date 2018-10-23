import { IMessagingProvider } from "dc-messaging"
export interface PingServiceParams  {
    platformIdHash: string,
    apiRoomAddress: string
}

export interface PingResponce {
    apiRoomAddress: string
}
export interface IPingService {
    ping: () => PingResponce
    isStarted: () => boolean
    on: (event: string, listener: (data: any) => void) => void
    emit: (event: string, data: any) => void
    stop: () => void
    start: (transportProvider: IMessagingProvider, params: PingServiceParams) => IPingService
}