import { IpfsTransportProvider, TransportFactory, ITransportFactory, IMessagingProvider, TransportType } from "dc-messaging"
import {
  PingServiceParams,
  IPingService
} from "../intefaces/IPingService"
import { PingService } from "../dapps/PingService"
import { describe, it } from "mocha"
import { expect } from "chai"
import { Logger } from "dc-logging"
import { EventEmitter } from "events"

const randomString = () =>
  Math.random()
    .toString(36)
    .substring(2, 15) +
  Math.random()
    .toString(36)
    .substring(2, 15)

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

const log = new Logger("PingService test")
const apiRoomAddress = [randomString(), randomString()]

class RemoteClient extends EventEmitter {
  private pingService: IPingService

  start(pingService: IPingService) {
    const acceptPing = (event: string, data: PingServiceParams) => {
      log.debug({ event, data })

      expect(data.apiRoomAddress).to.be.a("string")
      /* tslint:disable-next-line  */
      expect(apiRoomAddress.includes(data.apiRoomAddress)).to.be.true
    }

    this.pingService = pingService

    this.proxyOn(PingService.EVENT_JOIN, data => {
      acceptPing(PingService.EVENT_JOIN, data)
    })
    this.proxyOn(PingService.EVENT_EXIT, data =>
      acceptPing(PingService.EVENT_EXIT, data)
    )
    this.proxyOn(PingService.EVENT_PONG, data =>
      acceptPing(PingService.EVENT_PONG, data)
    )

    pingService.emit(PingService.EVENT_PING, null)
    return this
  }

  proxyOn(event: string, func: (data: any) => void) {
    this.pingService.on(event, func)
  }
}

const test = (transportProviderFactory: ITransportFactory) => describe(`PingService ${transportProviderFactory.toString()} test`, () => {
  const pingService: IPingService[] = []
  const pingProvider: IMessagingProvider[] = []
  const timeout = 400

  let clientService
  let clientProvider

  const platformId = randomString()
  it(`Start ${apiRoomAddress.length} ipfs node with PingService`, async () => {
    for (const address of apiRoomAddress) {
      const provider = await transportProviderFactory.create()
      const params: PingServiceParams = {
        platformId,
        apiRoomAddress: address,
        blockchainNetwork: randomString(),
        ethAddress: randomString()
      }
      const service: IPingService = new PingService().start(provider, params)
      /* tslint:disable-next-line  */
      expect(service.isStarted()).to.be.true
      pingService.push(service)
      pingProvider.push(provider)
    }
  })

  it(`Start ipfs node with ClientService`, async () => {
    const provider = await transportProviderFactory.create()
    const peer: IPingService = await provider.getRemoteInterface<IPingService>(
      platformId
    )
    const service = await new RemoteClient().start(peer)
    clientService = service
    clientProvider = provider

    log.debug('Client started.')

    await sleep(2000)
  })

  it("Stop PingService", async () => {
    for (const service of pingService) {
      await service.stop()
      /* tslint:disable-next-line */
      expect(service.isStarted()).to.be.false
    }

    await sleep(1000)

    for (const provider of pingProvider) {
      await provider.destroy()
    }
  })

  it('Client leave room', async () => {
    await clientProvider.destroy()
  })
})

const transportProviderFactory = new TransportFactory()
transportProviderFactory.setType(TransportType.IPFS)
test(transportProviderFactory)