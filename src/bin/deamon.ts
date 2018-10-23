import path from 'path'
import { spawn } from 'child_process'
import { Logger } from 'dc-logging'
import deamon from 'commander'

const log = new Logger('Deamon:')

function getNetwork(cmd: deamon.Command): string {
  switch (true) {
    case cmd.local:
      return 'local'
    case cmd.ropsten:
      return 'ropsten'
    case cmd.rinkeby:
      return 'rinkeby'
    case cmd.minenet:
      return 'minenet'
    default:
      return 'local'
  }
}

function startDeamon(
  network: string,
  privateKey: string,
  cmd: deamon.Command
): void {
  process.env.DAPPS_PATH = cmd.dappPath || './data/dapps/'
  process.env.DC_NETWORK = network
  process.env.ACCOUNT_PRIVATE_KEY = privateKey

  const deamonRun = spawn(`npm run start:${network}`, [], {
    cwd: path.join(__dirname, '../..'),
    stdio: 'inherit',
    shell: true
  })

  deamonRun.on('error', error => log.error(error))
  deamonRun.on('exit', code => {
    if (code !== 0) {
      log.error(`App crashed with exit code: ${code}`)
      process.exitCode = code
      process.kill(process.pid, 'SIGTERM')
    }
  })
}

deamon
  .version(require('../../package.json').version)
  .usage('<command> [options]')
  .description('Deamon for bankroller-core')

deamon
  .command('start <privateKye>')
  .usage('<privateKey> [options]')
  .description('start bankroller-core with params')
  .option('-l, --local', 'start bankroller-core with local network')
  .option('-r, --ropsten', 'start bankroller-core with ropsten network')
  .option('-n, --rinkeby', 'start bankroller-core with rinkeby network')
  .option('-d, --dapp-path <path>', 'path to dapp logic in bankroller')
  .action((privateKey, cmd) => {
    const networt: string = getNetwork(cmd)
    startDeamon(networt, privateKey, cmd)
  })

deamon.parse(process.argv)
