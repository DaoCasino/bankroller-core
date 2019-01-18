import { EventEmitter } from 'events'
import {
  IPingService,
  PingServiceParams
} from '../intefaces/IPingService'
import { IMessagingProvider } from '@daocasino/dc-messaging'
import { Logger } from '@daocasino/dc-logging'

const log = new Logger('PingService')

export class PingService extends EventEmitter implements IPingService {
  private _transportProvider: IMessagingProvider
  private _address: string
  private _params: PingServiceParams
  private _started: boolean
  public static EVENT_PING: string = 'bankrollerPing'
  public static EVENT_PONG: string = 'bankrollerPong'
  public static EVENT_JOIN: string = 'bankrollerJoin'
  public static EVENT_EXIT: string = 'bankrollerExit'

  start(
    transportProvider: IMessagingProvider,
    params: PingServiceParams
  ) {
    if (this._started) {
      throw new Error('PingService allready started')
    }
    this._transportProvider = transportProvider
    this._params = params
    this._address = params.platformId

    transportProvider.exposeSevice(this._address, this, true)

    const pingResponce = this.ping()
    this.on(PingService.EVENT_PING, () => {
      log.debug(`Ping request, emit PONG - ${this._params.apiRoomAddress}`)
      this.emit(PingService.EVENT_PONG, pingResponce)
    })

    this.on('connected', ({ id, address }) => {
      log.debug(`Peer connected, emit remote JOIN - ${this._params.apiRoomAddress}`)
      transportProvider.emitRemote(address, id, PingService.EVENT_JOIN, pingResponce)
    })

    this._started = true
    log.debug(`Ping service started.`)

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

  ping(): PingServiceParams {
    return this._params
  }

  isStarted(): boolean {
    return this._started
  }

  async stop(): Promise<void> {
    log.debug(`Ping service stop, emit EXIT - ${this._params.apiRoomAddress}`)
    this.emit(PingService.EVENT_EXIT, this.ping())
    await this._transportProvider.stopService(this._address)
    this._started = false
  }
}
