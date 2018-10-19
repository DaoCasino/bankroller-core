import { IpfsTransportProvider, IMessagingProvider } from 'dc-messaging'
import { IPingServiceParams, IPingService } from "../intefaces/IPingService"
import { PingService, createHash } from "../dapps/PingService"
import { Logger } from 'dc-logging'
import { describe, it } from "mocha"
import { expect } from "chai"
import { inherits } from "util"

import { EventEmitter } from "events"



// const PLATFORM_ID_HASH = '9bb9e6e47a95a8ffa633241d4298f6ff'
/* const logger = new Logger('Ping test')

class ClientService extends EventEmitter {

    private _started: boolean

    start(transportProvider: IMessagingProvider, platformId: string) {
        if (this._started) {
            throw new Error("ClientPingService allready started")
        }

        const platformIdHash = createHash(platformId)

        logger.debug('-- client ping')
        transportProvider.exposeSevice(platformIdHash, this, true)
        logger.debug('---')
        this._started = true

        return this
    }

    eventNames(): string[] {
        return ["platformPong"]
    }

    platformPong() {
        logger.debug("!!!! PlatformPong client")
    }

    isStarted() {
        return this._started
    }
}

describe('PingService test', () => {
    it(`Create 2 ipfs rooms and start services in ${PLATFORM_ID_HASH}`, async () => {
        const provider = await IpfsTransportProvider.createAdditional()

        const clientService = new ClientService().start(provider, PLATFORM_ID_HASH)
        /* tslint:disable-next-line 
        expect(clientService.isStarted()).to.be.true

        const pingService:IPingService = await provider.getRemoteInterface<IPingService>(PLATFORM_ID_HASH)
        const responce = await pingService.requestPing()

        logger.debug(responce)
    })
})
 */

const randomString = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

 describe('PingService test', () => {
     const pingService = []
     const platformId = randomString()
     const apiRoomAddress = [randomString(), randomString()]
     it(`Start ${apiRoomAddress.length} ipfs node with PingService`, async () => {
        const provider = await IpfsTransportProvider.createAdditional()

        for (const i of apiRoomAddress) {
            const params: IPingServiceParams = {
                platformId,
                apiRoomAddress: apiRoomAddress[i]
            }
            const service = new PingService().start(provider, params)
            /* tslint:disable-next-line  */
            expect(service.isStarted()).to.be.true
            pingService.push(service)
        }
    })
 })