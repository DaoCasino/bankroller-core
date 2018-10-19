import { IpfsTransportProvider, IMessagingProvider } from 'dc-messaging'
import { IPingServiceParams, IPingService, IPingResponce } from "../intefaces/IPingService"
import { PingService } from "../dapps/PingService"
import { describe, it } from "mocha"
import { expect } from "chai"
import { EventEmitter } from "events"
import { Logger } from "dc-logging"

const randomString = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms)
    })
}

const log = new Logger("PingService test")

class ClientService extends EventEmitter {

    private _started: boolean
    private _peer: IPingService

    async start(transportProvider: IMessagingProvider, platformIdHash: string, peer: IPingService) {
        if (this._started) {
            throw new Error("ClientPingService allready started")
        }

        transportProvider.exposeSevice(platformIdHash, this, true)
        this._started = true

        this._peer = peer
        this.onPeerEvent(PingService.EVENT_NAME, this.acceptPing)

        return this
    }

    onPeerEvent(event: string, func: (data: any) => void) {
        this._peer.on(event, func)
    }

    eventNames(): string[] {
        return [PingService.EVENT_NAME]
    }

    acceptPing(data: IPingResponce) {
        // console.log(data)
        log.debug(data)
        expect(data.apiRoomAdress).to.be.a('string')
    }

    isStarted() {
        return this._started
    }
}

describe('PingService test', () => {
     const pingService = []
     const timeout = 400
     let clientService
     const platformIdHash= randomString()
     const apiRoomAddress = [randomString(), randomString()]
     it(`Start ${apiRoomAddress.length} ipfs node with PingService`, async () => {
        for (const address of apiRoomAddress) {
            const provider = await IpfsTransportProvider.createAdditional()
            const params: IPingServiceParams = {
                platformIdHash,
                apiRoomAddress: address,
                timeout
            }
            const service: IPingService = new PingService().start(provider, params)
            /* tslint:disable-next-line  */
            expect(service.isStarted()).to.be.true
            pingService.push(service)
        }
    })

    it(`Start ipfs node with ClientService`, async () => {
        const provider = await IpfsTransportProvider.createAdditional()
        const peer:IPingService = await provider.getRemoteInterface<IPingService>(platformIdHash)
        const service = await new ClientService().start(provider, platformIdHash, peer)
        /* tslint:disable-next-line */
        expect(service.isStarted()).to.be.true
        clientService = service

        await sleep(4000) // magic
    })
 })