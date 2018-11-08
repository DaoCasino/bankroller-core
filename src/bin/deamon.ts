import path from "path"
import { spawn } from "child_process"
import { Logger } from "dc-logging"
import deamon from "commander"

const log = new Logger("Deamon:")

function getNetwork(cmd: deamon.Command): string {
  switch (true) {
    case cmd.local:
      return "local"
    case cmd.ropsten:
      return "ropsten"
    case cmd.rinkeby:
      return "rinkeby"
    case cmd.minenet:
      return "mainenet"
    default:
      return "local"
  }
}

function startDeamon(
  network: string,
  privateKey: string,
  options: deamon.Command
): void {
  process.env.DC_NETWORK = network
  process.env.ACCOUNT_PRIVATE_KEY = privateKey
  process.env.DAPPS_FULL_PATH = options.dappPath || path.join(__dirname, '../../data/dapps/')
  process.env.PLATFORM_ID = options.platformid

  require('../index')
}

deamon
  .version(require("../../package.json").version)
  .usage("<command> [options]")
  .description("Deamon for bankroller-core")

deamon
  .command("start <privateKye>")
  .usage("<privateKey> [options]")
  .description("start bankroller-core with params")
  .option("-l, --local", "start bankroller-core with local network")
  .option("-r, --ropsten", "start bankroller-core with ropsten network")
  .option("-n, --rinkeby", "start bankroller-core with rinkeby network")
  .option("-d, --dapp-path <path>", "path to dapp logic in bankroller")
  .option('-p, --platformid <platformid>', 'Input platform id for start')
  .action((privateKey, cmd) => {
    const networt: string = getNetwork(cmd)
    startDeamon(networt, privateKey, cmd)
  })

deamon.parse(process.argv)
