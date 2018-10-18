export interface IPingServiceParams  {
    platformId: string,
    apiRoomAddress: string
}

export interface IPingResponce {
    apiRoomAdress: string
}
export interface IPingService {
    requestPing: () => IPingResponce
}