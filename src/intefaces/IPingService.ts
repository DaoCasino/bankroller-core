export interface IPingServiceParams  {
    platformId: string,
    apiRoomAddress: string,
    timeout: number
}

export interface IPingResponce {
    apiRoomAdress: string
}
export interface IPingService {
    requestPing: () => IPingResponce
    isStarted: () => boolean
    on: (event: string, listener: (data: any) => void) => void
}