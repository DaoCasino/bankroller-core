import Bankroller from './dapps/Bankroller'
import { IpfsTransportProvider } from 'dc-messaging'
import { Logger } from 'dc-logging'

const logger = new Logger('Bankroller:')

logger.debug('')
logger.debug('')
logger.debug('-------------------------------')
logger.debug('BANKROLLER NODE START          ')
logger.debug('process.env.DC_NETWORK: ', process.env.DC_NETWORK)
logger.debug('-------------------------------')
logger.debug('')
logger.debug('')

// const rollbar_path = path.resolve('../../tools/rollbar/index.js')
// if (fs.existsSync(rollbar_path)) {
//   require(rollbar_path)()
// }

// process.on("unhandledRejection", (reason, promise) => {
//   console.log("")
//   console.log("")
//   console.log("----------------------------------")
//   console.log("  unhandledRejection - restart    ")
//   console.log("----------------------------------")
//   console.log("")
//   console.log(reason, promise)
//   process.exit()
// })

const startBankroller = async () => {
  try {
    const bankrollerTransportProvider = await IpfsTransportProvider.create()
    await new Bankroller().start(bankrollerTransportProvider)
  } catch (error) {
    logger.debug(error)
    process.exitCode = 1
    process.kill(process.pid, 'SIGTERM')
  }
}

startBankroller()
