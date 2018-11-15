import os from "os"

import { BlockchainNetwork, setDefaultConfig } from "dc-configs"

import { TransportProviderFactory } from 'dc-messaging'
import Bankroller from "../dapps/Bankroller"
// TODO move to integration tests
import DCWebapi from "dc-webapi"
import { GlobalGameLogicStore } from "dc-core"

import { Logger } from 'dc-logging'
const log = new Logger('Test:')


/*
 * Start bankroller node
 */
const startBankroller = async () => {
  try {
    const factory = new TransportProviderFactory()
    const bankrollerTransportProvider = await factory.create()
    return await new Bankroller().start(bankrollerTransportProvider)
  } catch (error) {
    log.debug(error)
    process.exitCode = 1
    process.kill(process.pid, "SIGTERM")
  }
}




/*
 * Run game test with dc-webapi
 */

// Game settings for different networks
const DAPP_PATH = '../../'+process.env.DAPPS_PATH
const DAPP_FOLDERS = {
  ropsten: "FTE1/",
  local: "ex1/"
}
const WALLET_PWD = "1234"
const playerPrivateKeys = {
  ropsten: "0x6A5AE922FDE5C8EE877E9470F45B8030F60C19038E9116DB8B343782D9593602",
  rinkeby: "0x6A5AE922FDE5C8EE877E9470F45B8030F60C19038E9116DB8B343782D9593602",
  local: "0x82d052c865f5763aad42add438569276c00d3d88a2d062d36b2bae914d58b8c8"
}


const testGame = async blockchainNetwork => {
  // Init web api lib
  const webapi = await new DCWebapi({
    blockchainNetwork,
    platformId: os.hostname()
  }).start()

  // Init player account
  webapi.account.init(WALLET_PWD, playerPrivateKeys[blockchainNetwork])
  const balances = await webapi.account.getBalances()
  log.debug('Balances', balances)

  // Init game
  const p = DAPP_PATH+DAPP_FOLDERS[blockchainNetwork]
  const gameManifest = require(p+'dapp.manifest.js')
  const logic = require(p+gameManifest.logic)

  const game = webapi.createGame({
    name: gameManifest.slug,
    contract: gameManifest.getContract(blockchainNetwork),
    gameLogicFunction: logic,
    rules: gameManifest.rules
  })
  await game.start()
  
  // Find and connect to bankroller
  await game.connect({ playerDeposit: 10, gameData: [0, 0] })
  // game.on('webapi::status', log.debug)


  // Play
  const rolls:any = [
    [1, [1,2,3], [[1,3],[1,3],[1,3]] ],
    [2, [3,2,1], [[2,3],[1,2],[1,2]] ],
    [3, [1,1],   [[1,1],[2,3]] ],
  ]
  for(let i=0; i<rolls.length; i++){
    log.debug(`Play ${i}`)
    const res = await game.play({
      userBet: Number(rolls[i][0]),
      gameData: rolls[i][1],
      rndOpts: rolls[i][2]
    })
    log.debug(`Play ${i} res:`, res)
  }


  log.debug('End game')
  const end = await game.disconnect()
  log.debug('End game res:', end)
}


(async function Run() {
  await startBankroller()

  testGame(process.env.DC_NETWORK)
})()


