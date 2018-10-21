import { IpfsTransportProvider, DirectTransportProvider } from "dc-messaging"
import { config } from "dc-configs"
import { Eth as Ethereum } from "dc-ethereum-utils"

import { GlobalGameLogicStore, DApp } from "dc-core"
import Bankroller from "../dapps/Bankroller"
import { Logger } from "dc-logging"

const log = new Logger("test1")
const directTransportProvider = new DirectTransportProvider()

const startBankroller = async () => {
  try {
    const bankrollerTransportProvider = await IpfsTransportProvider.create() // directTransportProvider // await IpfsTransportProvider.create()
    return await new Bankroller().start(bankrollerTransportProvider)
  } catch (error) {
    log.debug(error)
    process.exitCode = 1
    process.kill(process.pid, 'SIGTERM')
  }
}

const startGame = async () => {
  try {
    const gameTransportProvider = await IpfsTransportProvider.createAdditional() // directTransportProvider // await IpfsTransportProvider.createAdditional()

    // ropsten env
    let manifestFile = config.DAppsPath + "/FTE1/dapp.manifest.js"
    let privkey =
      "0x6A5AE922FDE5C8EE877E9470F45B8030F60C19038E9116DB8B343782D9593602"
    // local env
    if (process.env.DC_NETWORK === "local") {
      manifestFile = config.DAppsPath + "/ex1/dapp.manifest.js"
      privkey =
        "0xae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f"
    }

    const dappManifest = require(manifestFile)

    const {
      gasPrice: price,
      gasLimit: limit,
      web3HttpProviderUrl: httpProviderUrl,
      contracts,
      platformId,
      walletName,
      blockchainNetwork
    } = config
    const Eth = new Ethereum({
      walletName,
      httpProviderUrl,
      ERC20ContractInfo: contracts.ERC20,
      gasParams: { price, limit }
    })

    // Game loaded to store during bankroller start
    const gameLogicFunction = new GlobalGameLogicStore().getGameLogic(
      dappManifest.slug
    )
    const dappParams = {
      slug: dappManifest.slug,
      platformId,
      blockchainNetwork,
      contract: dappManifest.contract,
      rules: dappManifest.rules,
      roomProvider: gameTransportProvider,
      gameLogicFunction,
      Eth
    }
    await Eth.initAccount(privkey)
    const dapp = new DApp(dappParams)
    const dappInstance = await dapp.startClient()
    return { game: dappInstance, Eth }
  } catch (error) {
    log.debug(error)

    process.exitCode = 1
    process.kill(process.pid, 'SIGTERM')
  }
}

const test1 = async () => {
  await startBankroller()
  const { game, Eth } = await startGame()
  const showFunc = (source, data) => {
    log.debug(`${source} ${new Date().toString()} ${JSON.stringify(data)}`)
  }
  game.onPeerEvent("info", data => showFunc("Bankroller", data))
  game.on("info", data => showFunc("Client", data))

  await game.connect({ playerDeposit: 3, gameData: [0, 0] })
  log.info("Channel opened!")

  const result1 = await game.play({
    userBet: 1,
    gameData: [1]
    // rnd:[[0,3],[0,5]]
  })
  const result2 = await game.play({
    userBet: 1,
    gameData: [2]
  })
  const result3 = await game.play({
    userBet: 1,
    gameData: [3]
  })

  // log.info("Start close channel")

  // await game.disconnect()
  // logger.info("Channel closed!")
}
test1()
