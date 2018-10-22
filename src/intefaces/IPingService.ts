import { IMessagingProvider } from "dc-messaging"
export interface IPingServiceParams  {
    platformIdHash: string,
    apiRoomAddress: string
}

export interface IPingResponce {
    apiRoomAddress: string
}
export interface IPingService {
    ping: () => IPingResponce
    isStarted: () => boolean
    on: (event: string, listener: (data: any) => void) => void
    emit: (event: string, data: any) => void
    stop: () => void
    start: (transportProvider: IMessagingProvider, params: IPingServiceParams) => IPingService
}