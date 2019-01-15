import Raven from 'raven'

import Bankroller from './dapps/Bankroller'
import { TransportProviderFactory, IpfsTransportProvider } from '@daocasino/dc-messaging'
import { Logger } from '@daocasino/dc-logging'
import { config, TransportType } from '@daocasino/dc-configs'

export * from './intefaces'

const logger = new Logger('Bankroller:')

if (config.default.sentry.dsn !== undefined) {
  Raven.config(config.default.sentry.dsn).install()
  Raven.mergeContext({
    transport: {
      transport: TransportType[config.default.transport],
      network: config.default.blockchainNetwork,
      DAppsPath: config.default.DAppsPath
    }
  })
}

const bankrollerStart = async () => {
  logger.debug('')
  logger.debug('')
  logger.debug('-------------------------------')
  logger.debug('BANKROLLER NODE START          ')
  logger.debug('Bankroller transport:', TransportType[config.default.transport])
  logger.debug('Bankroller network: ', config.default.blockchainNetwork)

  logger.debug('Bankroller private key', config.default.privateKey)
  logger.debug('DApps path', config.default.DAppsPath)
  logger.debug('-------------------------------')
  logger.debug('')
  logger.debug('')

  try {
    const factory = new TransportProviderFactory(config.default.transport)
    const bankrollerTransportProvider = await factory.create()
    return await new Bankroller().start(bankrollerTransportProvider)
  } catch (error) {
    logger.debug(error)
    process.exitCode = 1

    Raven.captureException(error, (sendErr, eventId) => {
      if (sendErr) {
        console.error('Failed to send captured exception to Sentry')
      } else if (process.env.DEBUG !== undefined) {
        console.log('Error wrote with id: ' + eventId)
      }
      process.kill(process.pid, 'SIGTERM')
    })
  }
}

export const start = bankrollerStart
export { IBankroller } from './intefaces/IBankroller'
