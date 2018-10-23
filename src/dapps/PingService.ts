import { EventEmitter } from "events"
import {
  IPingService,
  PingServiceParams,
  PingResponce
} from "../intefaces/IPingService"
import { IMessagingProvider } from "dc-messaging"
import { Logger } from "dc-logging"

const log = new Logger("PingService")

export class PingService extends EventEmitter implements IPingService {
  private _transportProvider: IMessagingProvider
  private _platformIdHash: string
  private _apiRoomAddress: string
  private _started: boolean
  public static EVENT_PING: string = "bankrollerPing"
  public static EVENT_PONG: string = "bankrollerPong"
  public static EVENT_JOIN: string = "bankrollerJoin"
  public static EVENT_EXIT: string = "bankrollerExit"

  start(
    transportProvider: IMessagingProvider,
    { platformIdHash, apiRoomAddress }: PingServiceParams
  ) {
    if (this._started) {
      throw new Error("PingService allready started")
    }
    this._transportProvider = transportProvider
    this._platformIdHash = platformIdHash
    this._apiRoomAddress = apiRoomAddress

    transportProvider.exposeSevice(this._platformIdHash, this, true)

    const pingResponce = this.ping()
    this.on(PingService.EVENT_PING, () => {
      log.debug(`Ping request, emit PONG - ${this._apiRoomAddress}`)
      this.emit(PingService.EVENT_PONG, pingResponce)
    })

    this.on("connected", ({ id, address }) => {
      log.debug(`Peer connected, emit JOIN - ${this._apiRoomAddress}`)
      this.emit(PingService.EVENT_JOIN, pingResponce)
    })


    this._started = true

    return this
  }

  eventNames() {
    return [
      PingService.EVENT_PING,
      PingService.EVENT_PONG,
      PingService.EVENT_JOIN,
      PingService.EVENT_EXIT
    ]
  }

  ping(): PingResponce {
    return { apiRoomAddress: this._apiRoomAddress }
  }

  isStarted(): boolean {
    return this._started
  }

  stop(): void {
    this._started = false
    log.debug(`Service stop, emit EXIT - ${this._apiRoomAddress}`)
    this.emit(PingService.EVENT_EXIT, this.ping())
  }
}
