import Bankroller from './dapps/Bankroller'
import { TransportProviderFactory, IpfsTransportProvider } from '@daocasino/dc-messaging'
import { Logger } from '@daocasino/dc-logging'
import { config, TransportType } from '@daocasino/dc-configs'
export * from './intefaces'

const logger = new Logger('Bankroller:')

const bankrollerStart = async () => {
  logger.debug('')
  logger.debug('')
  logger.debug('-------------------------------')
  logger.debug('BANKROLLER NODE START          ')
  logger.debug('Bankroller transport:', TransportType[config.default.transport])
  logger.debug('process.env.DC_NETWORK: ', config.default.blockchainNetwork)

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
    process.kill(process.pid, 'SIGTERM')
  }
}

export const start = bankrollerStart
