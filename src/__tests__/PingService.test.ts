import { IpfsTransportProvider } from "dc-messaging"
import {
  PingServiceParams,
  IPingService,
  PingResponce
} from "../intefaces/IPingService"
import { PingService } from "../dapps/PingService"
import { describe, it } from "mocha"
import { expect } from "chai"
import { Logger } from "dc-logging"

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

class RemoteClient {
  private pingService: IPingService

  start(pingService: IPingService) {
    const acceptPing = (event: string, data: PingResponce) => {
      log.debug({ event, data })

      expect(data.apiRoomAddress).to.be.a("string")
      /* tslint:disable-next-line  */
      expect(apiRoomAddress.includes(data.apiRoomAddress)).to.be.true
    }

    this.pingService = pingService

    this.on(PingService.EVENT_JOIN, data => {
      acceptPing(PingService.EVENT_JOIN, data)
    })
    this.on(PingService.EVENT_EXIT, data =>
      acceptPing(PingService.EVENT_EXIT, data)
    )
    this.on(PingService.EVENT_PONG, data =>
      acceptPing(PingService.EVENT_PONG, data)
    )

    pingService.emit(PingService.EVENT_PING, null)
    return this
  }

  on(event: string, func: (data: any) => void) {
    this.pingService.on(event, func)
  }
}

describe("PingService test", () => {
  const pingService = []
  const pingProvider = []
  const timeout = 400
  let clientService
  const platformIdHash = randomString()
  it(`Start ${apiRoomAddress.length} ipfs node with PingService`, async () => {
    for (const address of apiRoomAddress) {
      const provider = await IpfsTransportProvider.createAdditional()
      const params: PingServiceParams = {
        platformIdHash,
        apiRoomAddress: address
      }
      const service: IPingService = new PingService().start(provider, params)
      /* tslint:disable-next-line  */
      expect(service.isStarted()).to.be.true
      pingService.push(service)
      pingProvider.push(provider)
    }
  })

  it(`Start ipfs node with ClientService`, async () => {
    const provider = await IpfsTransportProvider.createAdditional()
    const peer: IPingService = await provider.getRemoteInterface<IPingService>(
      platformIdHash
    )
    const service = await new RemoteClient().start(peer)
    clientService = service

    setTimeout(() => {
      const remoteProvider = pingProvider[0]
      remoteProvider.emitRemote(platformIdHash, provider.getPeerId(), PingService.EVENT_JOIN, { apiRoomAddress: 'test'})
    }, 1000)

    await sleep(1000)
  })

  it("Stop PingService", async () => {
    for (const service of pingService) {
      service.stop()
      /* tslint:disable-next-line */
      expect(service.isStarted()).to.be.false
    }

    for (const provider of pingProvider) {
      const isStoped = await provider.stop(platformIdHash)
      /* tslint:disable-next-line */
      expect(isStoped).to.be.true
    }

    await sleep(1000) // magic
  })
})
