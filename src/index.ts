import Bankroller from './dapps/Bankroller'
import { TransportProviderFactory, IpfsTransportProvider } from 'dc-messaging'
import { Logger } from 'dc-logging'
import { config, TransportType } from 'dc-configs'

const logger = new Logger('Bankroller:')

const bankrollerStart = async () => {
  let transportType: TransportType = config.default.transport
  if (process.env.DC_TRANSPORT && process.env.DC_TRANSPORT in TransportType) {
    transportType = TransportType[process.env.DC_TRANSPORT]
  }

  logger.debug('')
  logger.debug('')
  logger.debug('-------------------------------')
  logger.debug('BANKROLLER NODE START          ')
  logger.debug('Bankroller transport:', transportType)
  logger.debug('process.env.DC_NETWORK: ', process.env.DC_NETWORK)

  logger.debug('Bankroller private key', process.env.ACCOUNT_PRIVATE_KEY)
  logger.debug('DApps path', process.env.DAPPS_FULL_PATH || process.env.DAPPS_PATH)
  logger.debug('-------------------------------')
  logger.debug('')
  logger.debug('')

  try {
    const factory = new TransportProviderFactory(transportType)
    const bankrollerTransportProvider = await IpfsTransportProvider.create()
    return await new Bankroller().start(bankrollerTransportProvider)
  } catch (error) {
    logger.debug(error)
    process.exitCode = 1
    process.kill(process.pid, 'SIGTERM')
  }
}

if (process.env.START_BANKROLLER) bankrollerStart()
export const start = bankrollerStart
