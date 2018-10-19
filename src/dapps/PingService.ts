import { EventEmitter } from "events"
import { IPingService, IPingServiceParams, IPingResponce } from "../intefaces/IPingService"
import { IpfsTransportProvider, IMessagingProvider } from "dc-messaging"
import { Logger } from "dc-logging"
import crypto from "crypto"

const log = new Logger("PingService")

export const createHash = (data) => {
    return crypto.createHash("md5").update(data).digest("hex")
}

export class PingService extends EventEmitter implements IPingService {
    private _transportProvider: IMessagingProvider
    private _platformIdHash: string
    private _apiRoomAdress: string
    private _started: boolean
    private _pingInterval: number
    public static EVENT_NAME: string = "platformPong"

    start(transportProvider: IMessagingProvider, { platformId, apiRoomAddress, timeout }: IPingServiceParams) {
        if (this._started) {
            throw new Error("PingService allready started")
        }
        this._transportProvider = transportProvider
        this._platformIdHash = createHash(platformId)
        this._apiRoomAdress = apiRoomAddress

        transportProvider.exposeSevice(this._platformIdHash, this, true)

        const self = this

        const ping = setInterval(() => {
            const request = self.requestPing()
            self.emit(PingService.EVENT_NAME, request)
        }, timeout)

        this._started = true

        return this
    }

    eventNames() {
        return [PingService.EVENT_NAME]
    }

    requestPing(): IPingResponce {
        const responce: IPingResponce = {
            apiRoomAdress: this._apiRoomAdress
        }
        return responce
    }

    isStarted(): boolean {
        return this._started
    }
}