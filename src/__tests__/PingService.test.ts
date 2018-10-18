import { IpfsTransportProvider, IMessagingProvider } from 'dc-messaging'
import { IPingServiceParams, IPingService } from "../intefaces/IPingService"
import { Logger } from 'dc-logging'
import { describe, it } from "mocha"
import { expect } from "chai"
import { inherits } from "util"



import { PingService } from "../dapps/PingService"
import { EventEmitter } from "events"

const PLATFORM_ID_HASH = '9bb9e6e47a95a8ffa633241d4298f6ff'
const logger = new Logger('Ping test')

class ClientService extends EventEmitter {

    private _started: boolean

    start(transportProvider: IMessagingProvider, platformIdHash: string) {
        if (this._started) {
            throw new Error("ClientPingService allready started")
        }

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
        /* tslint:disable-next-line */
        expect(clientService.isStarted()).to.be.true

        const pingService:IPingService = await provider.getRemoteInterface<IPingService>(PLATFORM_ID_HASH)
        const responce = await pingService.requestPing()

        logger.debug(responce)
    })
})
