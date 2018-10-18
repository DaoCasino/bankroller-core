import { EventEmitter } from "events"
import { IPingService, IPingServiceParams, IPingResponce } from "../intefaces/IPingService"
import { IpfsTransportProvider, IMessagingProvider } from "dc-messaging"
import { Logger } from "dc-logging"
import crypto from "crypto"

// const logger = new Logger("PingService")

const createHash = (data) => {
    return crypto.createHash("md5").update(data).digest("hex")
}

export class PingService extends EventEmitter implements IPingService {
    private _transportProvider: IMessagingProvider
    private _platformIdHash: string
    private _apiRoomAdress: string
    private _started: boolean
    private _pingInterval: number

    start(transportProvider: IMessagingProvider, { platformId, apiRoomAddress }: IPingServiceParams) {
        if (this._started) {
            throw new Error("PingService allready started")
        }
        this._transportProvider = transportProvider
        this._platformIdHash = createHash(platformId)
        this._apiRoomAdress = apiRoomAddress

        transportProvider.exposeSevice(this._platformIdHash, this, true)
        this._started = true

        return this
    }

    eventNames(): string[] {
        return ["requestPing"]
    }

    requestPing(): IPingResponce {
        const responce: IPingResponce = {
            apiRoomAdress: this._apiRoomAdress
        }
        this.emit("platformPong", responce)
        return responce
    }

    isStarted(): boolean {
        return this._started
    }
}