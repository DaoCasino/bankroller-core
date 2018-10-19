export interface IPingServiceParams  {
    platformIdHash: string,
    apiRoomAddress: string,
    timeout: number
}

export interface IPingResponce {
    apiRoomAddress: string
}
export interface IPingService {
    requestPing: () => IPingResponce
    isStarted: () => boolean
    on: (event: string, listener: (data: any) => void) => void
}