import { EventEmitter } from "events"
import {
  IPingService,
  IPingServiceParams,
  IPingResponce
} from "../intefaces/IPingService"
import { IpfsTransportProvider, IMessagingProvider } from "dc-messaging"
import { Logger } from "dc-logging"
import crypto from "crypto"

const log = new Logger("PingService")

export class PingService extends EventEmitter implements IPingService {
  private _transportProvider: IpfsTransportProvider
  private _platformIdHash: string
  private _apiRoomAddress: string
  private _started: boolean
  public static EVENT_PING: string = "bankrollerPing"
  public static EVENT_PONG: string = "bankrollerPong"
  public static EVENT_JOIN: string = "bankrollerJoin"
  public static EVENT_EXIT: string = "bankrollerExit"

  start(
    transportProvider: IMessagingProvider,
    { platformIdHash, apiRoomAddress }: IPingServiceParams
  ) {
    if (this._started) {
      throw new Error("PingService allready started")
    }
    this._transportProvider = transportProvider as IpfsTransportProvider
    this._platformIdHash = platformIdHash
    this._apiRoomAddress = apiRoomAddress

    transportProvider.exposeSevice(this._platformIdHash, this, true)

    const self = this

    /* const ping = setInterval(() => {
            const request = self.requestPing()
            self.emit(PingService.EVENT_NAME, request)
        }, timeout) */

    const pingResponce = this.ping()
    this.on(PingService.EVENT_PING, () => {
      log.debug("client ping request")
      this.emit(PingService.EVENT_PONG, pingResponce)
    })

    this.on("connected", ({ id, address }) => {
      log.debug(`Peer connected: ${this._transportProvider.getPeerId()} <- ${id}`)
      // setTimeout(() => {
      //   this._transportProvider.emitRemote(
      //     address,
      //     id,
      //     PingService.EVENT_JOIN,
      //     pingResponce
      //     )
      // }, 1000)

      this.emit(PingService.EVENT_JOIN, pingResponce)

      // setTimeout(() => {
      //   this._transportProvider.emitRemote(address, id, PingService.EVENT_JOIN, pingResponce)
      // }, 1000)
    })

    this._started = true

    return this
  }

  eventNames() {
    return [
      PingService.EVENT_PING,
      PingService.EVENT_PONG,
      PingService.EVENT_JOIN,
      PingService.EVENT_EXIT,
      // "connected"
    ]
  }

  ping(): IPingResponce {
    return { apiRoomAddress: this._apiRoomAddress }
  }

  isStarted(): boolean {
    return this._started
  }

  stop(): void {
    this._started = false
    this.emit(PingService.EVENT_EXIT, this.ping())
  }
}
