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
const apiRoomAddress = [randomString(), randomString()]

class ClientService extends EventEmitter {

    private _started: boolean
    private _peer: IPingService

    start(transportProvider: IMessagingProvider, platformIdHash: string, peer: IPingService) {
        if (this._started) {
            throw new Error("ClientPingService allready started")
        }

        transportProvider.exposeSevice(platformIdHash, this, true)
        this._started = true

        const acceptPing = (event:string, data: IPingResponce) => {
            // console.log(data)
            log.debug({ event, data })
            expect(data.apiRoomAddress).to.be.a('string')
            /* tslint:disable-next-line  */
            expect(apiRoomAddress.includes(data.apiRoomAddress)).to.be.true
        }
        this._peer = peer
        // this.onPeerEvent(PingService.EVENT_JOIN, data => acceptPing(PingService.EVENT_JOIN, data))
        this.onPeerEvent(PingService.EVENT_EXIT, data => acceptPing(PingService.EVENT_EXIT, data))
        this.onPeerEvent(PingService.EVENT_PONG, data => acceptPing(PingService.EVENT_PONG, data))
        this._peer.emit(PingService.EVENT_PING, 'client ping')

        this.onPeerEvent(PingService.EVENT_JOIN, () => {
            console.log('sdfsdfsdf-sdf!!!!23sdfsdf')
        })

        return this
    }


    onPeerEvent(event: string, func: (data: any) => void) {
        this._peer.on(event, func)
    }

    eventNames(): string[] {
        return [PingService.EVENT_JOIN, PingService.EVENT_EXIT, PingService.EVENT_PONG]
    }



    isStarted() {
        return this._started
    }
}

describe('PingService test', () => {
     const pingService = []
     const pingProvider = []
     const timeout = 400
     let clientService
     const platformIdHash= randomString()
     it(`Start ${apiRoomAddress.length} ipfs node with PingService`, async () => {
        for (const address of apiRoomAddress) {
            const provider = await IpfsTransportProvider.createAdditional()
            const params: IPingServiceParams = {
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
        const peer:IPingService = await provider.getRemoteInterface<IPingService>(platformIdHash)
        const service = await new ClientService().start(provider, platformIdHash, peer)
        /* tslint:disable-next-line */
        expect(service.isStarted()).to.be.true
        clientService = service

        await sleep(1000) // magic
    })

    it('Stop PingService', async () => {
        for (const service of pingService) {
            service.stop()
            /* tslint:disable-next-line */
            expect(service.isStarted()).to.be.false
        }

        for (let i = 0; i < apiRoomAddress.length; i++) {
            const provider:IpfsTransportProvider = pingProvider[i]
            // const isStoped = await provider.stop(apiRoomAddress[i])
            /* tslint:disable-next-line */
            // expect(isStoped).to.be.true
        }

        await sleep(1000) // magic
    })

    it('Test join PingService', async () => {
        for (const address of apiRoomAddress) {
            const provider = await IpfsTransportProvider.createAdditional()
            const params: IPingServiceParams = {
                platformIdHash,
                apiRoomAddress: address
            }

            const service: IPingService = new PingService().start(provider, params)
            /* tslint:disable-next-line  */
            expect(service.isStarted()).to.be.true

            await sleep(1000) // magic

            service.stop()
            // provider.stop(address)
        }
    })
 })